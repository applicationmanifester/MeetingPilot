import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'meetingpilot.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, meeting_date TEXT,
  attendees TEXT DEFAULT '', notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY, meeting_id TEXT, title TEXT NOT NULL,
  description TEXT DEFAULT '', owner TEXT DEFAULT '',
  due_date TEXT, priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open', created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE SET NULL
);
`);
const now = () => new Date().toISOString();
const id = () => randomUUID();
const actionStatuses = ['Open', 'In progress', 'Blocked', 'Done'];
const priorities = ['Low', 'Medium', 'High', 'Urgent'];

function seedDemoData(clearExisting = false) {
  if (clearExisting) {
    db.prepare('DELETE FROM actions').run();
    db.prepare('DELETE FROM meetings').run();
  }
  const meetingCount = db.prepare('SELECT COUNT(*) n FROM meetings').get().n;
  if (meetingCount === 0) {
    const meetingId = id();
    const today = new Date().toISOString().split('T')[0];
    const friday = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const nextMon = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const ts = now();
    db.prepare(`INSERT INTO meetings (id,title,meeting_date,attendees,notes,created_at) VALUES (?,?,?,?,?,?)`)
      .run(meetingId, 'Weekly Product Sync', today, 'Bhargav, Priya, Alex', 'Discussed MVP launch criteria, Claude MCP connector reliability, and live demo recording.', ts);
    db.prepare(`INSERT INTO actions (id,meeting_id,title,description,owner,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id(), meetingId, 'Send release plan to stakeholders', 'Share timeline, test cases, and rollback procedures.', 'Priya', friday, 'High', 'In progress', ts, ts);
    db.prepare(`INSERT INTO actions (id,meeting_id,title,description,owner,due_date,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id(), meetingId, 'Confirm QA sign-off on staging', 'Verify MCP streamable endpoints and human edit workflows.', 'Alex', nextMon, 'Urgent', 'Open', ts, ts);
  }
}
seedDemoData(false);

function meetingRow(row) {
  if (!row) return null;
  return { ...row, attendees: row.attendees ? row.attendees.split(',').map(s => s.trim()).filter(Boolean) : [] };
}
function actionRow(row) { return row || null; }
function createMeeting(input) {
  const meetingId = id();
  db.prepare(`INSERT INTO meetings (id,title,meeting_date,attendees,notes,created_at) VALUES (?,?,?,?,?,?)`)
    .run(meetingId, input.title, input.meeting_date || null, (input.attendees || []).join(', '), input.notes || '', now());
  return meetingRow(db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId));
}
function createAction(input) {
  const actionId = id(), timestamp = now();
  db.prepare(`INSERT INTO actions (id,meeting_id,title,description,owner,due_date,priority,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(actionId, input.meeting_id || null, input.title, input.description || '',
      input.owner || '', input.due_date || null, input.priority || 'Medium', input.status || 'Open', timestamp, timestamp);
  return actionRow(db.prepare('SELECT * FROM actions WHERE id=?').get(actionId));
}
function updateAction(actionId, patch) {
  const existing = db.prepare('SELECT * FROM actions WHERE id=?').get(actionId);
  if (!existing) return null;
  const allowed = ['meeting_id','title','description','owner','due_date','priority','status'];
  const next = { ...existing };
  for (const key of allowed) if (patch[key] !== undefined) next[key] = patch[key] || (['meeting_id','due_date'].includes(key) ? null : '');
  db.prepare(`UPDATE actions SET meeting_id=?,title=?,description=?,owner=?,due_date=?,priority=?,status=?,updated_at=? WHERE id=?`)
    .run(next.meeting_id, next.title, next.description, next.owner, next.due_date, next.priority, next.status, now(), actionId);
  return actionRow(db.prepare('SELECT * FROM actions WHERE id=?').get(actionId));
}
function updateMeeting(meetingId, patch) {
  const existing = db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId);
  if (!existing) return null;
  const next = { ...existing };
  if (patch.title !== undefined && String(patch.title).trim()) next.title = String(patch.title).trim();
  if (patch.meeting_date !== undefined) next.meeting_date = patch.meeting_date || null;
  if (patch.notes !== undefined) next.notes = patch.notes || '';
  if (patch.attendees !== undefined)
    next.attendees = (Array.isArray(patch.attendees) ? patch.attendees : String(patch.attendees).split(',')).map(s => String(s).trim()).filter(Boolean).join(', ');
  db.prepare('UPDATE meetings SET title=?,meeting_date=?,attendees=?,notes=? WHERE id=?')
    .run(next.title, next.meeting_date, next.attendees, next.notes, meetingId);
  return meetingRow(db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId));
}
function validateAction(b) {
  if (b.status !== undefined && !actionStatuses.includes(b.status)) return `status must be one of: ${actionStatuses.join(', ')}`;
  if (b.priority !== undefined && !priorities.includes(b.priority)) return `priority must be one of: ${priorities.join(', ')}`;
  if (b.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.due_date)) return 'due_date must be YYYY-MM-DD';
  return null;
}
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('ISO date YYYY-MM-DD. Resolve relative dates like "Friday" yourself.');
const RO = { readOnlyHint: true };
function buildMcpServer() {
  const server = new McpServer(
    { name: 'meetingpilot', version: '1.0.0' },
    {
      instructions: 'MeetingPilot stores meetings and the action items that come out of them. You do the thinking, summarizing, and writing. MeetingPilot persists, lists, updates, and keeps commitments live. Tools: create_meeting, add_action_item, list_meetings, list_action_items, update_action_item, delete_action_item, update_meeting, delete_meeting, get_dashboard_summary. There is no AI model inside MeetingPilot.'
    }
  );
  server.tool('create_meeting', 'Save a meeting record in MeetingPilot. Use this after the user asks to capture a meeting.', {
    title: z.string().min(1), meeting_date: DATE.optional(),
    attendees: z.array(z.string()).optional(), notes: z.string().optional()
  }, async input => {
    const meeting = createMeeting(input);
    return { content: [{ type: 'text', text: JSON.stringify(meeting, null, 2) }] };
  });
  server.tool('add_action_item', 'Create a follow-up action item, optionally linked to a meeting.', {
    title: z.string().min(1), description: z.string().optional(), owner: z.string().optional(),
    due_date: DATE.optional(), priority: z.enum(priorities).optional(),
    status: z.enum(actionStatuses).optional(), meeting_id: z.string().optional()
  }, async input => {
    if (input.meeting_id && !db.prepare('SELECT id FROM meetings WHERE id=?').get(input.meeting_id))
      return { isError: true, content: [{ type: 'text', text: 'Meeting not found. Create or look up the meeting first.' }] };
    const action = createAction(input);
    return { content: [{ type: 'text', text: JSON.stringify(action, null, 2) }] };
  });
  server.tool('list_meetings', 'List saved meetings, newest first.', {
    limit: z.number().int().min(1).max(100).optional()
  }, RO, async ({ limit = 30 }) => {
    const rows = db.prepare('SELECT * FROM meetings ORDER BY created_at DESC LIMIT ?').all(limit).map(meetingRow);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  });
  server.tool('list_action_items', 'List action items. Filter by status, owner or meeting ID when useful.', {
    status: z.enum(actionStatuses).optional(), owner: z.string().optional(),
    meeting_id: z.string().optional(), limit: z.number().int().min(1).max(200).optional()
  }, RO, async ({ status, owner, meeting_id, limit = 100 }) => {
    const clauses = [], params = [];
    if (status) { clauses.push('status=?'); params.push(status); }
    if (owner) { clauses.push('LOWER(owner)=LOWER(?)'); params.push(owner); }
    if (meeting_id) { clauses.push('meeting_id=?'); params.push(meeting_id); }
    params.push(limit);
    const sql = `SELECT * FROM actions ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY
      CASE status WHEN 'Blocked' THEN 0 WHEN 'Open' THEN 1 WHEN 'In progress' THEN 2 ELSE 3 END,
      due_date IS NULL, due_date ASC LIMIT ?`;
    const rows = db.prepare(sql).all(...params);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  });
  server.tool('update_action_item', 'Edit an existing action item by its ID. Only supplied fields are changed.', {
    id: z.string(), title: z.string().optional(), description: z.string().optional(),
    owner: z.string().optional(), due_date: DATE.nullable().optional(),
    priority: z.enum(priorities).optional(), status: z.enum(actionStatuses).optional()
  }, async ({ id: actionId, ...patch }) => {
    const updated = updateAction(actionId, patch);
    if (!updated) return { isError: true, content: [{ type: 'text', text: 'Action item not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  });
  server.tool('delete_action_item', 'Permanently delete an action item by its ID.', {
    id: z.string()
  }, async ({ id: actionId }) => {
    const result = db.prepare('DELETE FROM actions WHERE id=?').run(actionId);
    return { content: [{ type: 'text', text: result.changes ? `Deleted action item ${actionId}.` : 'Action item not found.' }] };
  });
  server.tool('update_meeting', 'Edit a meeting by ID (title, date, attendees, notes). Only supplied fields change.', {
    id: z.string(), title: z.string().optional(), meeting_date: DATE.nullable().optional(),
    attendees: z.array(z.string()).optional(), notes: z.string().optional()
  }, async ({ id: meetingId, ...patch }) => {
    const m = updateMeeting(meetingId, patch);
    if (!m) return { isError: true, content: [{ type: 'text', text: 'Meeting not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(m, null, 2) }] };
  });
  server.tool('delete_meeting', 'Permanently delete a meeting by ID. Its action items are kept but unlinked.', {
    id: z.string()
  }, async ({ id: meetingId }) => {
    const r = db.prepare('DELETE FROM meetings WHERE id=?').run(meetingId);
    return { content: [{ type: 'text', text: r.changes ? `Deleted meeting ${meetingId}.` : 'Meeting not found.' }] };
  });
  server.tool('get_dashboard_summary', 'Get counts of meetings and action items by status, plus overdue actions.', {}, RO, async () => {
    const totalMeetings = db.prepare('SELECT COUNT(*) n FROM meetings').get().n;
    const totalActions = db.prepare('SELECT COUNT(*) n FROM actions').get().n;
    const statuses = db.prepare('SELECT status, COUNT(*) count FROM actions GROUP BY status').all();
    const overdue = db.prepare(`SELECT * FROM actions WHERE due_date < date('now') AND status != 'Done' ORDER BY due_date`).all();
    return { content: [{ type: 'text', text: JSON.stringify({ totalMeetings, totalActions, statuses, overdue }, null, 2) }] };
  });
  return server;
}

function authorized(req) {
  const token = process.env.MCP_API_TOKEN;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}
app.get('/health', (_req, res) => res.json({
  ok: true,
  app: 'MeetingPilot',
  aiInside: false,
  protocols: ['streamable-http', 'sse'],
  endpoints: { mcp: '/mcp', sse: '/sse' },
  version: '1.0.0'
}));
app.post('/api/seed-sample', (req, res) => {
  seedDemoData(req.query.clear === 'true');
  res.json({ ok: true });
});
app.get('/api/meetings', (_req, res) => {
  res.json(db.prepare('SELECT * FROM meetings ORDER BY created_at DESC').all().map(meetingRow));
});
app.post('/api/meetings', (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Meeting title is required.' });
  res.status(201).json(createMeeting(req.body));
});
app.patch('/api/meetings/:id', (req, res) => {
  const m = updateMeeting(req.params.id, req.body || {});
  if (!m) return res.status(404).json({ error: 'Meeting not found.' });
  res.json(m);
});
app.delete('/api/meetings/:id', (req, res) => {
  const r = db.prepare('DELETE FROM meetings WHERE id=?').run(req.params.id);
  res.status(r.changes ? 200 : 404).json({ deleted: Boolean(r.changes) });
});
app.get('/api/actions', (_req, res) => {
  res.json(db.prepare(`SELECT a.*, m.title AS meeting_title FROM actions a LEFT JOIN meetings m ON m.id=a.meeting_id ORDER BY a.updated_at DESC`).all());
});
app.post('/api/actions', (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Action title is required.' });
  const bad = validateAction(req.body); if (bad) return res.status(400).json({ error: bad });
  res.status(201).json(createAction(req.body));
});
app.patch('/api/actions/:id', (req, res) => {
  const bad = validateAction(req.body || {}); if (bad) return res.status(400).json({ error: bad });
  const updated = updateAction(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Action not found.' });
  res.json(updated);
});
app.delete('/api/actions/:id', (req, res) => {
  const result = db.prepare('DELETE FROM actions WHERE id=?').run(req.params.id);
  res.status(result.changes ? 200 : 404).json({ deleted: Boolean(result.changes) });
});
app.get('/api/summary', (_req, res) => {
  const totalMeetings = db.prepare('SELECT COUNT(*) n FROM meetings').get().n;
  const actions = db.prepare('SELECT status, COUNT(*) count FROM actions GROUP BY status').all();
  res.json({ totalMeetings, totalActions: db.prepare('SELECT COUNT(*) n FROM actions').get().n, statuses: actions });
});

// Streamable HTTP MCP endpoint. Stateless mode keeps requests safe across server instances.
app.post('/mcp', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized. Supply a valid Bearer token.' });
  const mcp = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); mcp.close(); });
  try {
    await mcp.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!res.headersSent) res.status(500).json({ error: 'MCP request failed.' });
  }
});
app.get('/mcp', async (req, res) => {
  if (!authorized(req)) return res.status(401).end();
  res.json({
    name: 'MeetingPilot MCP Server',
    status: 'active',
    transport: 'streamable-http',
    authentication: 'none',
    endpoints: {
      streamableHttp: '/mcp (POST)',
      serverSentEvents: '/sse (GET)'
    },
    tools: [
      'create_meeting',
      'add_action_item',
      'list_meetings',
      'list_action_items',
      'update_action_item',
      'delete_action_item',
      'update_meeting',
      'delete_meeting',
      'get_dashboard_summary'
    ],
    note: 'To connect Claude, add remote MCP server URL pointing to POST /mcp.'
  });
});
app.delete('/mcp', async (req, res) => {
  if (!authorized(req)) return res.status(401).end();
  res.status(405).send('Stateless MCP endpoint.');
});

// Legacy Server-Sent Events (SSE) MCP endpoint for clients expecting SSE
const sseSessions = new Map();
app.get('/sse', async (req, res) => {
  if (!authorized(req)) return res.status(401).end();
  const mcp = buildMcpServer();
  const transport = new SSEServerTransport('/messages', res);
  sseSessions.set(transport.sessionId, { transport, mcp });
  res.on('close', () => {
    transport.close();
    mcp.close();
    sseSessions.delete(transport.sessionId);
  });
  await mcp.connect(transport);
});

app.post('/messages', async (req, res) => {
  if (!authorized(req)) return res.status(401).end();
  const sessionId = req.query.sessionId;
  const session = sseSessions.get(sessionId);
  if (!session) {
    return res.status(404).send('Session not found or expired');
  }
  await session.transport.handlePostMessage(req, res, req.body);
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  // JSON 404 for probes (e.g. /.well-known/oauth-*) so Claude sees authless server, not HTML.
  if (req.path.startsWith('/.well-known') || req.path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(req.path))
    return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`MeetingPilot listening on http://localhost:${port}`));
