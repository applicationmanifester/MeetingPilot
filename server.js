import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import {
  getWorkspaces,
  createWorkspace,
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getActions,
  getActionById,
  createAction,
  updateAction,
  deleteAction,
  getAuditLogs,
  getWebhooks,
  createWebhook,
  calculateAnalytics,
  generateMeetingSummaryMarkdown,
  rolloverMeetingActions,
  seedDemoData,
  isUsingSupabase
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Initial seed if empty
seedDemoData(false).catch(err => console.error('Seed error:', err));

const actionStatuses = ['Open', 'In progress', 'Blocked', 'Done'];
const priorities = ['Low', 'Medium', 'High', 'Urgent'];
const categories = ['General', 'Engineering', 'Budget / Spend', 'Operations', 'Compliance', 'Client'];

function validateAction(b) {
  if (b.status !== undefined && !actionStatuses.includes(b.status)) return `status must be one of: ${actionStatuses.join(', ')}`;
  if (b.priority !== undefined && !priorities.includes(b.priority)) return `priority must be one of: ${priorities.join(', ')}`;
  if (b.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.due_date)) return 'due_date must be YYYY-MM-DD';
  return null;
}

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('ISO date YYYY-MM-DD. Resolve relative dates like "Friday" yourself.');
const RO = { readOnlyHint: true };

// Build Model Context Protocol Server with all Tools
function buildMcpServer() {
  const server = new McpServer(
    { name: 'meetingpilot', version: '1.2.0' },
    {
      instructions: 'MeetingPilot stores meetings, action items, financial commitments, and team audit logs. You do the thinking, summarizing, and writing. MeetingPilot persists, lists, tracks Say-Do velocity, and keeps team commitments live. Tools: create_meeting, add_action_item, list_meetings, list_action_items, update_action_item, delete_action_item, update_meeting, delete_meeting, get_dashboard_summary, get_team_analytics, list_audit_log, list_workspaces. There is no AI model inside MeetingPilot.'
    }
  );

  server.tool('create_meeting', 'Save a meeting record in MeetingPilot. Optionally specify workspace_id, notes, and agreed decisions.', {
    title: z.string().min(1),
    meeting_date: DATE.optional(),
    attendees: z.array(z.string()).optional(),
    notes: z.string().optional(),
    decisions: z.array(z.string()).optional(),
    workspace_id: z.string().optional()
  }, async input => {
    const meeting = await createMeeting(input, 'Claude via MCP');
    return { content: [{ type: 'text', text: JSON.stringify(meeting, null, 2) }] };
  });

  server.tool('record_meeting_decision', 'Record an agreed key decision during a meeting, separate from action items.', {
    meeting_id: z.string(),
    decision: z.string().min(1).describe('Decision agreed by the team')
  }, async ({ meeting_id, decision }) => {
    const m = await getMeetingById(meeting_id);
    if (!m) return { isError: true, content: [{ type: 'text', text: 'Meeting not found.' }] };
    const decisions = Array.isArray(m.decisions) ? m.decisions : [];
    decisions.push(decision);
    const updated = await updateMeeting(meeting_id, { decisions }, 'Claude via MCP');
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  });

  server.tool('add_action_item', 'Create a follow-up action item. Supports owner, due_date, priority, optional amount ($ spend approval), and category.', {
    title: z.string().min(1),
    description: z.string().optional(),
    owner: z.string().optional(),
    due_date: DATE.optional(),
    priority: z.enum(priorities).optional(),
    status: z.enum(actionStatuses).optional(),
    amount: z.number().optional(),
    category: z.enum(categories).optional(),
    meeting_id: z.string().optional(),
    workspace_id: z.string().optional()
  }, async input => {
    if (input.meeting_id) {
      const exists = await getMeetingById(input.meeting_id);
      if (!exists) {
        return { isError: true, content: [{ type: 'text', text: 'Meeting not found. Create or look up the meeting first.' }] };
      }
    }
    const action = await createAction(input, 'Claude via MCP');
    return { content: [{ type: 'text', text: JSON.stringify(action, null, 2) }] };
  });

  server.tool('list_meetings', 'List saved meetings, newest first. Filter by workspace_id if provided.', {
    workspace_id: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional()
  }, RO, async ({ workspace_id, limit = 30 }) => {
    const rows = await getMeetings(workspace_id);
    return { content: [{ type: 'text', text: JSON.stringify(rows.slice(0, limit), null, 2) }] };
  });

  server.tool('list_action_items', 'List action items with filters: status, owner, category, meeting_id, workspace_id.', {
    status: z.enum(actionStatuses).optional(),
    owner: z.string().optional(),
    category: z.enum(categories).optional(),
    meeting_id: z.string().optional(),
    workspace_id: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional()
  }, RO, async ({ status, owner, category, meeting_id, workspace_id, limit = 100 }) => {
    const rows = await getActions({ status, owner, category, meeting_id, workspace_id });
    return { content: [{ type: 'text', text: JSON.stringify(rows.slice(0, limit), null, 2) }] };
  });

  server.tool('update_action_item', 'Edit an action item by ID. Attributed in the team audit log.', {
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    owner: z.string().optional(),
    due_date: DATE.nullable().optional(),
    priority: z.enum(priorities).optional(),
    status: z.enum(actionStatuses).optional(),
    amount: z.number().nullable().optional(),
    category: z.enum(categories).optional()
  }, async ({ id: actionId, ...patch }) => {
    const updated = await updateAction(actionId, patch, 'Claude via MCP');
    if (!updated) return { isError: true, content: [{ type: 'text', text: 'Action item not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  });

  server.tool('delete_action_item', 'Permanently delete an action item by ID.', {
    id: z.string()
  }, async ({ id: actionId }) => {
    const ok = await deleteAction(actionId, 'Claude via MCP');
    if (!ok) return { content: [{ type: 'text', text: 'Action item not found.' }] };
    return { content: [{ type: 'text', text: `Deleted action item ${actionId}.` }] };
  });

  server.tool('update_meeting', 'Edit meeting title, date, attendees, notes, or workspace.', {
    id: z.string(),
    title: z.string().optional(),
    meeting_date: DATE.nullable().optional(),
    attendees: z.array(z.string()).optional(),
    notes: z.string().optional(),
    workspace_id: z.string().optional()
  }, async ({ id: meetingId, ...patch }) => {
    const m = await updateMeeting(meetingId, patch, 'Claude via MCP');
    if (!m) return { isError: true, content: [{ type: 'text', text: 'Meeting not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(m, null, 2) }] };
  });

  server.tool('delete_meeting', 'Permanently delete a meeting by ID.', {
    id: z.string()
  }, async ({ id: meetingId }) => {
    const ok = await deleteMeeting(meetingId, 'Claude via MCP');
    if (!ok) return { content: [{ type: 'text', text: 'Meeting not found.' }] };
    return { content: [{ type: 'text', text: `Deleted meeting ${meetingId}.` }] };
  });

  server.tool('get_dashboard_summary', 'Get counts of meetings and actions, status totals, and overdue items.', {}, RO, async () => {
    const summary = await calculateAnalytics('all');
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  });

  server.tool('get_team_analytics', 'Get executive metrics: Say-Do Ratio (completion %), spend commitments ($), overdue counts, and accountability by owner.', {
    workspace_id: z.string().optional()
  }, RO, async ({ workspace_id }) => {
    const analytics = await calculateAnalytics(workspace_id);
    return { content: [{ type: 'text', text: JSON.stringify(analytics, null, 2) }] };
  });

  server.tool('list_audit_log', 'Get recent change audit history showing what changed and whether Claude or a human made the change.', {
    workspace_id: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional()
  }, RO, async ({ workspace_id, limit = 20 }) => {
    const rows = await getAuditLogs(workspace_id, limit);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  });

  server.tool('list_workspaces', 'List available company departments/workspaces.', {}, RO, async () => {
    const rows = await getWorkspaces();
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  });

  server.tool('get_meeting_summary_markdown', 'Generate a clean Slack/Markdown formatted summary of a meeting, attendees, and all action items.', {
    meeting_id: z.string()
  }, RO, async ({ meeting_id }) => {
    const md = await generateMeetingSummaryMarkdown(meeting_id);
    if (!md) return { isError: true, content: [{ type: 'text', text: 'Meeting not found.' }] };
    return { content: [{ type: 'text', text: md }] };
  });

  server.tool('rollover_meeting_actions', 'Roll over incomplete action items from an old meeting into a new follow-up meeting agenda.', {
    from_meeting_id: z.string(),
    new_title: z.string().optional(),
    new_meeting_date: DATE.optional()
  }, async ({ from_meeting_id, new_title, new_meeting_date }) => {
    const result = await rolloverMeetingActions(from_meeting_id, new_title, new_meeting_date, 'Claude via MCP');
    if (!result) return { isError: true, content: [{ type: 'text', text: 'Meeting not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  return server;
}

function authorized(req) {
  const token = process.env.MCP_API_TOKEN;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

// REST API Endpoints
app.get('/health', async (_req, res) => res.json({
  ok: true,
  app: 'MeetingPilot',
  aiInside: false,
  database: isUsingSupabase() ? 'Supabase PostgreSQL' : 'SQLite WAL',
  protocols: ['streamable-http', 'sse'],
  endpoints: { mcp: '/mcp', sse: '/sse' },
  version: '1.2.0'
}));

app.post('/api/seed-sample', async (req, res) => {
  try {
    await seedDemoData(req.query.clear === 'true');
    res.json({ ok: true, message: 'Sample company data populated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Workspaces
app.get('/api/workspaces', async (_req, res) => {
  try {
    res.json(await getWorkspaces());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspaces', async (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Workspace name is required.' });
  try {
    const wsId = req.body.id || req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created = await createWorkspace({ id: wsId, name: req.body.name.trim() });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Meetings
app.get('/api/meetings', async (req, res) => {
  try {
    res.json(await getMeetings(req.query.workspace_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings', async (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Meeting title is required.' });
  try {
    const created = await createMeeting(req.body, 'Human via Dashboard');
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/meetings/:id', async (req, res) => {
  try {
    const m = await updateMeeting(req.params.id, req.body || {}, 'Human via Dashboard');
    if (!m) return res.status(404).json({ error: 'Meeting not found.' });
    res.json(m);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const ok = await deleteMeeting(req.params.id, 'Human via Dashboard');
    if (!ok) return res.status(404).json({ error: 'Meeting not found.' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meetings/:id/summary-markdown', async (req, res) => {
  try {
    const md = await generateMeetingSummaryMarkdown(req.params.id);
    if (!md) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ markdown: md });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings/:id/rollover', async (req, res) => {
  try {
    const result = await rolloverMeetingActions(req.params.id, req.body?.new_title, req.body?.new_date, 'Human via Dashboard');
    if (!result) return res.status(404).json({ error: 'Meeting not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actions
app.get('/api/actions', async (req, res) => {
  try {
    res.json(await getActions({ workspace_id: req.query.workspace_id }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/actions', async (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Action title is required.' });
  const bad = validateAction(req.body);
  if (bad) return res.status(400).json({ error: bad });
  try {
    const created = await createAction(req.body, 'Human via Dashboard');
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/actions/:id', async (req, res) => {
  const bad = validateAction(req.body || {});
  if (bad) return res.status(400).json({ error: bad });
  try {
    const updated = await updateAction(req.params.id, req.body || {}, 'Human via Dashboard');
    if (!updated) return res.status(404).json({ error: 'Action not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/actions/:id', async (req, res) => {
  try {
    const ok = await deleteAction(req.params.id, 'Human via Dashboard');
    if (!ok) return res.status(404).json({ error: 'Action not found.' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/actions/export-csv', async (req, res) => {
  try {
    const rows = await getActions({ workspace_id: req.query.workspace_id });
    let csv = 'ID,Title,Status,Priority,Owner,Due Date,Amount,Category,Meeting,Department\r\n';
    for (const r of rows) {
      csv += `"${r.id}","${(r.title||'').replace(/"/g, '""')}","${r.status}","${r.priority}","${r.owner||''}","${r.due_date||''}","${r.amount||''}","${r.category||''}","${(r.meeting_title||'').replace(/"/g, '""')}","${r.workspace_name||''}"\r\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="meetingpilot-commitments.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Executive Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    res.json(await calculateAnalytics(req.query.workspace_id || 'all'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs
app.get('/api/audit-logs', async (req, res) => {
  try {
    res.json(await getAuditLogs(req.query.workspace_id, 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhooks
app.get('/api/webhooks', async (_req, res) => {
  try {
    res.json(await getWebhooks());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/webhooks', async (req, res) => {
  if (!req.body?.url?.startsWith('http')) return res.status(400).json({ error: 'Valid HTTP/HTTPS URL required.' });
  try {
    res.status(201).json(await createWebhook(req.body.url.trim()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MCP: Streamable HTTP POST Endpoint
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

// MCP Browser GET info endpoint
app.get('/mcp', async (req, res) => {
  if (!authorized(req)) return res.status(401).end();
  res.json({
    name: 'MeetingPilot MCP Server',
    status: 'active',
    database: isUsingSupabase() ? 'Supabase PostgreSQL' : 'SQLite WAL',
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
      'get_dashboard_summary',
      'get_team_analytics',
      'list_audit_log',
      'list_workspaces',
      'get_meeting_summary_markdown',
      'rollover_meeting_actions'
    ],
    note: 'To connect Claude, add remote MCP server URL pointing to POST /mcp.'
  });
});

app.delete('/mcp', async (req, res) => {
  if (!authorized(req)) return res.status(401).end();
  res.status(405).send('Stateless MCP endpoint.');
});

// Legacy Server-Sent Events (SSE) MCP endpoint
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

// Static files & SPA fallback
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/.well-known') || req.path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(req.path))
    return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`MeetingPilot listening on http://localhost:${port} [DB: ${isUsingSupabase() ? 'Supabase' : 'SQLite'}]`));
