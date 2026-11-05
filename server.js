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

// Ensure database schema and migrations
db.exec(`
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'prod-eng',
  title TEXT NOT NULL,
  meeting_date TEXT,
  attendees TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'prod-eng',
  meeting_id TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  amount REAL DEFAULT NULL,
  category TEXT DEFAULT 'General',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'prod-eng',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'Human',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

// Safe column migrations for existing databases
function ensureColumn(table, col, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
  }
}
ensureColumn('meetings', 'workspace_id', "TEXT NOT NULL DEFAULT 'prod-eng'");
ensureColumn('actions', 'workspace_id', "TEXT NOT NULL DEFAULT 'prod-eng'");
ensureColumn('actions', 'amount', 'REAL DEFAULT NULL');
ensureColumn('actions', 'category', "TEXT DEFAULT 'General'");

const now = () => new Date().toISOString();
const id = () => randomUUID();
const actionStatuses = ['Open', 'In progress', 'Blocked', 'Done'];
const priorities = ['Low', 'Medium', 'High', 'Urgent'];
const categories = ['General', 'Engineering', 'Budget / Spend', 'Operations', 'Compliance', 'Client'];

// Audit logging helper
function logAudit(workspaceId, entityType, entityId, action, details, actor = 'Human via Dashboard') {
  try {
    const entryId = id();
    const timestamp = now();
    db.prepare(`INSERT INTO audit_logs (id, workspace_id, entity_type, entity_id, action, details, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(entryId, workspaceId || 'prod-eng', entityType, entityId, action, details, actor, timestamp);
    notifyWebhooks({ entityType, entityId, action, details, actor, timestamp });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Webhook notification dispatch
async function notifyWebhooks(payload) {
  try {
    const hooks = db.prepare('SELECT url FROM webhooks').all();
    for (const h of hooks) {
      fetch(h.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[MeetingPilot Alert] ${payload.actor} performed ${payload.action} on ${payload.entityType}: ${payload.details}`,
          ...payload
        })
      }).catch(() => {});
    }
  } catch {}
}

// Analytics calculator: Say-Do Ratio, velocity, financial commitments
function calculateAnalytics(workspaceId = null) {
  let actionsSql = 'SELECT * FROM actions';
  let meetingsSql = 'SELECT * FROM meetings';
  const params = [];
  if (workspaceId && workspaceId !== 'all') {
    actionsSql += ' WHERE workspace_id = ?';
    meetingsSql += ' WHERE workspace_id = ?';
    params.push(workspaceId);
  }
  const allActions = db.prepare(actionsSql).all(...params);
  const allMeetings = db.prepare(meetingsSql).all(...params);

  const total = allActions.length;
  const done = allActions.filter(a => a.status === 'Done').length;
  const inProgress = allActions.filter(a => a.status === 'In progress').length;
  const open = allActions.filter(a => a.status === 'Open').length;
  const blocked = allActions.filter(a => a.status === 'Blocked').length;

  const today = new Date().toISOString().split('T')[0];
  const overdue = allActions.filter(a => a.due_date && a.due_date < today && a.status !== 'Done');

  // Say-Do Ratio = percentage of commitments delivered
  const sayDoRatio = total > 0 ? Math.round((done / total) * 100) : 100;

  // Financial spend approvals / commitments (sum of amount)
  const totalFinancialAmount = allActions.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const pendingFinancialAmount = allActions.filter(a => a.status !== 'Done').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  // Breakdown by owner
  const byOwner = {};
  for (const a of allActions) {
    const o = a.owner || 'Unassigned';
    if (!byOwner[o]) byOwner[o] = { total: 0, done: 0, overdue: 0 };
    byOwner[o].total++;
    if (a.status === 'Done') byOwner[o].done++;
    if (a.due_date && a.due_date < today && a.status !== 'Done') byOwner[o].overdue++;
  }

  return {
    totalMeetings: allMeetings.length,
    totalActions: total,
    sayDoRatio,
    done,
    inProgress,
    open,
    blocked,
    overdueCount: overdue.length,
    totalFinancialAmount,
    pendingFinancialAmount,
    byOwner,
    overdueActions: overdue
  };
}

// Seed comprehensive enterprise / team data
function seedDemoData(clearExisting = false) {
  if (clearExisting) {
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM actions').run();
    db.prepare('DELETE FROM meetings').run();
    db.prepare('DELETE FROM workspaces').run();
  }

  // Ensure standard company workspaces
  const defaultWorkspaces = [
    { id: 'prod-eng', name: 'Product & Engineering' },
    { id: 'finance-ops', name: 'Finance & Spend Approvals' },
    { id: 'exec', name: 'Executive Leadership' }
  ];
  for (const w of defaultWorkspaces) {
    const exists = db.prepare('SELECT id FROM workspaces WHERE id=?').get(w.id);
    if (!exists) {
      db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(w.id, w.name, now());
    }
  }

  const meetingCount = db.prepare('SELECT COUNT(*) n FROM meetings').get().n;
  if (meetingCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    const friday = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const nextMon = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const pastWed = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const ts = now();

    // 1. Product & Engineering Meeting
    const m1 = id();
    db.prepare(`INSERT INTO meetings (id, workspace_id, title, meeting_date, attendees, notes, created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(m1, 'prod-eng', 'Weekly Product & Architecture Sync', today, 'Bhargav, Priya, Alex', 'Discussed MVP launch criteria, MCP connector reliability, and live demo recording.', ts);

    const a1 = id();
    db.prepare(`INSERT INTO actions (id, workspace_id, meeting_id, title, description, owner, due_date, priority, status, amount, category, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(a1, 'prod-eng', m1, 'Send release plan to stakeholders', 'Share timeline, test cases, and rollback procedures.', 'Priya', friday, 'High', 'In progress', null, 'Engineering', ts, ts);

    const a2 = id();
    db.prepare(`INSERT INTO actions (id, workspace_id, meeting_id, title, description, owner, due_date, priority, status, amount, category, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(a2, 'prod-eng', m1, 'Confirm QA sign-off on staging', 'Verify MCP streamable endpoints and human edit workflows.', 'Alex', nextMon, 'Urgent', 'Open', null, 'Engineering', ts, ts);

    // 2. Finance & Spend Approvals (Volopay context!)
    const m2 = id();
    db.prepare(`INSERT INTO meetings (id, workspace_id, title, meeting_date, attendees, notes, created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(m2, 'finance-ops', 'Monthly Budget & Corporate Spend Review', pastWed, 'Bhargav, Rohan, Sarah', 'Reviewed vendor renewals, cloud infrastructure costs, and corporate card limits.', ts);

    const a3 = id();
    db.prepare(`INSERT INTO actions (id, workspace_id, meeting_id, title, description, owner, due_date, priority, status, amount, category, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(a3, 'finance-ops', m2, 'Approve Datadog observability annual contract', 'Vendor renewal for cloud monitoring tier with 15% annual discount.', 'Sarah', friday, 'High', 'Open', 12000, 'Budget / Spend', ts, ts);

    const a4 = id();
    db.prepare(`INSERT INTO actions (id, workspace_id, meeting_id, title, description, owner, due_date, priority, status, amount, category, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(a4, 'finance-ops', m2, 'Reconcile Q3 corporate card expense accounts', 'Audit receipt submissions and department spend deviations.', 'Rohan', pastWed, 'Medium', 'Done', 4500, 'Budget / Spend', ts, ts);

    // Initial audit logs for realism
    logAudit('prod-eng', 'meeting', m1, 'created', 'Captured Weekly Product Sync', 'Claude via MCP');
    logAudit('prod-eng', 'action', a1, 'created', 'Assigned release plan to Priya', 'Claude via MCP');
    logAudit('prod-eng', 'action', a2, 'created', 'Assigned QA sign-off to Alex', 'Claude via MCP');
    logAudit('finance-ops', 'meeting', m2, 'created', 'Captured Budget & Corporate Spend Review', 'Claude via MCP');
    logAudit('finance-ops', 'action', a3, 'created', 'Added $12,000 Datadog spend approval for Sarah', 'Claude via MCP');
    logAudit('finance-ops', 'action', a4, 'status_changed', 'Marked $4,500 expense reconciliation as Done', 'Human via Dashboard');
  }
}
seedDemoData(false);

function meetingRow(row) {
  if (!row) return null;
  return { ...row, attendees: row.attendees ? row.attendees.split(',').map(s => s.trim()).filter(Boolean) : [] };
}
function actionRow(row) { return row || null; }

function createMeeting(input, actor = 'Claude via MCP') {
  const meetingId = id();
  const ws = input.workspace_id || 'prod-eng';
  db.prepare(`INSERT INTO meetings (id,workspace_id,title,meeting_date,attendees,notes,created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(meetingId, ws, input.title, input.meeting_date || null, (input.attendees || []).join(', '), input.notes || '', now());
  const created = meetingRow(db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId));
  logAudit(ws, 'meeting', meetingId, 'created', `Meeting "${input.title}" created`, actor);
  return created;
}

function createAction(input, actor = 'Claude via MCP') {
  const actionId = id(), timestamp = now();
  const ws = input.workspace_id || 'prod-eng';
  const amt = input.amount !== undefined && input.amount !== '' && input.amount !== null ? Number(input.amount) : null;
  const cat = input.category || (amt ? 'Budget / Spend' : 'General');
  db.prepare(`INSERT INTO actions (id,workspace_id,meeting_id,title,description,owner,due_date,priority,status,amount,category,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(actionId, ws, input.meeting_id || null, input.title, input.description || '',
      input.owner || '', input.due_date || null, input.priority || 'Medium', input.status || 'Open', amt, cat, timestamp, timestamp);
  const created = actionRow(db.prepare('SELECT * FROM actions WHERE id=?').get(actionId));
  logAudit(ws, 'action', actionId, 'created', `Action "${input.title}" created for ${input.owner || 'team'}`, actor);
  return created;
}

function updateAction(actionId, patch, actor = 'Human via Dashboard') {
  const existing = db.prepare('SELECT * FROM actions WHERE id=?').get(actionId);
  if (!existing) return null;
  const allowed = ['workspace_id', 'meeting_id', 'title', 'description', 'owner', 'due_date', 'priority', 'status', 'amount', 'category'];
  const next = { ...existing };
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      if (key === 'amount') {
        next.amount = patch.amount !== '' && patch.amount !== null ? Number(patch.amount) : null;
      } else {
        next[key] = patch[key] || (['meeting_id', 'due_date'].includes(key) ? null : '');
      }
    }
  }
  db.prepare(`UPDATE actions SET workspace_id=?,meeting_id=?,title=?,description=?,owner=?,due_date=?,priority=?,status=?,amount=?,category=?,updated_at=? WHERE id=?`)
    .run(next.workspace_id, next.meeting_id, next.title, next.description, next.owner, next.due_date, next.priority, next.status, next.amount, next.category, now(), actionId);
  const updated = actionRow(db.prepare('SELECT * FROM actions WHERE id=?').get(actionId));

  const changes = [];
  if (patch.status && patch.status !== existing.status) changes.push(`status ${existing.status} → ${patch.status}`);
  if (patch.due_date && patch.due_date !== existing.due_date) changes.push(`due date → ${patch.due_date}`);
  if (patch.owner && patch.owner !== existing.owner) changes.push(`owner → ${patch.owner}`);
  const details = changes.length ? `Updated ${changes.join(', ')}` : `Edited action "${existing.title}"`;
  logAudit(next.workspace_id, 'action', actionId, 'updated', details, actor);
  return updated;
}

function updateMeeting(meetingId, patch, actor = 'Human via Dashboard') {
  const existing = db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId);
  if (!existing) return null;
  const next = { ...existing };
  if (patch.workspace_id !== undefined) next.workspace_id = patch.workspace_id || 'prod-eng';
  if (patch.title !== undefined && String(patch.title).trim()) next.title = String(patch.title).trim();
  if (patch.meeting_date !== undefined) next.meeting_date = patch.meeting_date || null;
  if (patch.notes !== undefined) next.notes = patch.notes || '';
  if (patch.attendees !== undefined)
    next.attendees = (Array.isArray(patch.attendees) ? patch.attendees : String(patch.attendees).split(',')).map(s => String(s).trim()).filter(Boolean).join(', ');
  db.prepare('UPDATE meetings SET workspace_id=?,title=?,meeting_date=?,attendees=?,notes=? WHERE id=?')
    .run(next.workspace_id, next.title, next.meeting_date, next.attendees, next.notes, meetingId);
  const updated = meetingRow(db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId));
  logAudit(next.workspace_id, 'meeting', meetingId, 'updated', `Meeting "${next.title}" updated`, actor);
  return updated;
}

function generateMeetingSummaryMarkdown(meetingId) {
  const m = db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId);
  if (!m) return null;
  const actions = db.prepare('SELECT * FROM actions WHERE meeting_id=?').all(meetingId);
  const attendeesList = m.attendees ? m.attendees : 'Team';
  let md = `*${m.title}* (${m.meeting_date || 'Undated'})\n`;
  md += `👥 *Attendees:* ${attendeesList}\n`;
  if (m.notes) md += `📝 *Notes:* ${m.notes}\n`;
  md += `\n*Action Items & Commitments (${actions.length}):*\n`;
  if (actions.length === 0) {
    md += `• _No action items logged._\n`;
  } else {
    for (const a of actions) {
      const statusIcon = a.status === 'Done' ? '✅' : a.status === 'In progress' ? '⏳' : a.status === 'Blocked' ? '🚫' : '⭕';
      const owner = a.owner ? `@${a.owner}` : 'unassigned';
      const due = a.due_date ? `(Due ${a.due_date})` : '';
      const amt = a.amount ? `[$${Number(a.amount).toLocaleString()}] ` : '';
      md += `${statusIcon} *[${a.status}]* ${a.title} ${amt}— ${owner} ${due}\n`;
    }
  }
  return md;
}

function rolloverMeetingActions(fromMeetingId, newTitle, newDate, actor = 'Human via Dashboard') {
  const oldMeeting = db.prepare('SELECT * FROM meetings WHERE id=?').get(fromMeetingId);
  if (!oldMeeting) return null;
  const newMeetingId = id();
  const title = newTitle || `${oldMeeting.title} (Follow-up)`;
  const date = newDate || new Date().toISOString().split('T')[0];
  const ts = now();

  // Create new follow-up meeting
  db.prepare(`INSERT INTO meetings (id, workspace_id, title, meeting_date, attendees, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(newMeetingId, oldMeeting.workspace_id, title, date, oldMeeting.attendees, `Follow-up to "${oldMeeting.title}". Rolled over active commitments.`, ts);
  
  // Find incomplete actions in old meeting
  const openActions = db.prepare(`SELECT id, title FROM actions WHERE meeting_id=? AND status != 'Done'`).all(fromMeetingId);
  for (const a of openActions) {
    db.prepare('UPDATE actions SET meeting_id=?, updated_at=? WHERE id=?').run(newMeetingId, ts, a.id);
  }

  logAudit(oldMeeting.workspace_id, 'meeting', newMeetingId, 'rollover', `Rolled over ${openActions.length} open commitment(s) from "${oldMeeting.title}" into "${title}"`, actor);
  return {
    newMeeting: meetingRow(db.prepare('SELECT * FROM meetings WHERE id=?').get(newMeetingId)),
    rolledOverCount: openActions.length
  };
}

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

  server.tool('create_meeting', 'Save a meeting record in MeetingPilot. Optionally specify workspace_id (e.g. prod-eng, finance-ops, exec).', {
    title: z.string().min(1),
    meeting_date: DATE.optional(),
    attendees: z.array(z.string()).optional(),
    notes: z.string().optional(),
    workspace_id: z.string().optional()
  }, async input => {
    const meeting = createMeeting(input, 'Claude via MCP');
    return { content: [{ type: 'text', text: JSON.stringify(meeting, null, 2) }] };
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
    if (input.meeting_id && !db.prepare('SELECT id FROM meetings WHERE id=?').get(input.meeting_id))
      return { isError: true, content: [{ type: 'text', text: 'Meeting not found. Create or look up the meeting first.' }] };
    const action = createAction(input, 'Claude via MCP');
    return { content: [{ type: 'text', text: JSON.stringify(action, null, 2) }] };
  });

  server.tool('list_meetings', 'List saved meetings, newest first. Filter by workspace_id if provided.', {
    workspace_id: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional()
  }, RO, async ({ workspace_id, limit = 30 }) => {
    const clauses = [], params = [];
    if (workspace_id && workspace_id !== 'all') { clauses.push('workspace_id=?'); params.push(workspace_id); }
    params.push(limit);
    const sql = `SELECT * FROM meetings ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ?`;
    const rows = db.prepare(sql).all(...params).map(meetingRow);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  });

  server.tool('list_action_items', 'List action items with filters: status, owner, category, meeting_id, workspace_id.', {
    status: z.enum(actionStatuses).optional(),
    owner: z.string().optional(),
    category: z.enum(categories).optional(),
    meeting_id: z.string().optional(),
    workspace_id: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional()
  }, RO, async ({ status, owner, category, meeting_id, workspace_id, limit = 100 }) => {
    const clauses = [], params = [];
    if (status) { clauses.push('status=?'); params.push(status); }
    if (owner) { clauses.push('LOWER(owner)=LOWER(?)'); params.push(owner); }
    if (category) { clauses.push('category=?'); params.push(category); }
    if (meeting_id) { clauses.push('meeting_id=?'); params.push(meeting_id); }
    if (workspace_id && workspace_id !== 'all') { clauses.push('workspace_id=?'); params.push(workspace_id); }
    params.push(limit);
    const sql = `SELECT * FROM actions ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY
      CASE status WHEN 'Blocked' THEN 0 WHEN 'Open' THEN 1 WHEN 'In progress' THEN 2 ELSE 3 END,
      due_date IS NULL, due_date ASC LIMIT ?`;
    const rows = db.prepare(sql).all(...params);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
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
    const updated = updateAction(actionId, patch, 'Claude via MCP');
    if (!updated) return { isError: true, content: [{ type: 'text', text: 'Action item not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
  });

  server.tool('delete_action_item', 'Permanently delete an action item by ID.', {
    id: z.string()
  }, async ({ id: actionId }) => {
    const existing = db.prepare('SELECT * FROM actions WHERE id=?').get(actionId);
    if (!existing) return { content: [{ type: 'text', text: 'Action item not found.' }] };
    db.prepare('DELETE FROM actions WHERE id=?').run(actionId);
    logAudit(existing.workspace_id, 'action', actionId, 'deleted', `Deleted action "${existing.title}"`, 'Claude via MCP');
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
    const m = updateMeeting(meetingId, patch, 'Claude via MCP');
    if (!m) return { isError: true, content: [{ type: 'text', text: 'Meeting not found.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(m, null, 2) }] };
  });

  server.tool('delete_meeting', 'Permanently delete a meeting by ID.', {
    id: z.string()
  }, async ({ id: meetingId }) => {
    const existing = db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId);
    if (!existing) return { content: [{ type: 'text', text: 'Meeting not found.' }] };
    db.prepare('DELETE FROM meetings WHERE id=?').run(meetingId);
    logAudit(existing.workspace_id, 'meeting', meetingId, 'deleted', `Deleted meeting "${existing.title}"`, 'Claude via MCP');
    return { content: [{ type: 'text', text: `Deleted meeting ${meetingId}.` }] };
  });

  server.tool('get_dashboard_summary', 'Get counts of meetings and actions, status totals, and overdue items.', {}, RO, async () => {
    const summary = calculateAnalytics('all');
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  });

  server.tool('get_team_analytics', 'Get executive metrics: Say-Do Ratio (completion %), spend commitments ($), overdue counts, and accountability by owner.', {
    workspace_id: z.string().optional()
  }, RO, async ({ workspace_id }) => {
    const analytics = calculateAnalytics(workspace_id);
    return { content: [{ type: 'text', text: JSON.stringify(analytics, null, 2) }] };
  });

  server.tool('list_audit_log', 'Get recent change audit history showing what changed and whether Claude or a human made the change.', {
    workspace_id: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional()
  }, RO, async ({ workspace_id, limit = 20 }) => {
    const clauses = [], params = [];
    if (workspace_id && workspace_id !== 'all') { clauses.push('workspace_id=?'); params.push(workspace_id); }
    params.push(limit);
    const sql = `SELECT * FROM audit_logs ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ?`;
    const rows = db.prepare(sql).all(...params);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  });

  server.tool('list_workspaces', 'List available company departments/workspaces.', {}, RO, async () => {
    const rows = db.prepare('SELECT * FROM workspaces ORDER BY name ASC').all();
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  });

  server.tool('get_meeting_summary_markdown', 'Generate a clean Slack/Markdown formatted summary of a meeting, attendees, and all action items.', {
    meeting_id: z.string()
  }, RO, async ({ meeting_id }) => {
    const md = generateMeetingSummaryMarkdown(meeting_id);
    if (!md) return { isError: true, content: [{ type: 'text', text: 'Meeting not found.' }] };
    return { content: [{ type: 'text', text: md }] };
  });

  server.tool('rollover_meeting_actions', 'Roll over incomplete action items from an old meeting into a new follow-up meeting agenda.', {
    from_meeting_id: z.string(),
    new_title: z.string().optional(),
    new_meeting_date: DATE.optional()
  }, async ({ from_meeting_id, new_title, new_meeting_date }) => {
    const result = rolloverMeetingActions(from_meeting_id, new_title, new_meeting_date, 'Claude via MCP');
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
app.get('/health', (_req, res) => res.json({
  ok: true,
  app: 'MeetingPilot',
  aiInside: false,
  protocols: ['streamable-http', 'sse'],
  endpoints: { mcp: '/mcp', sse: '/sse' },
  version: '1.2.0'
}));

app.post('/api/seed-sample', (req, res) => {
  seedDemoData(req.query.clear === 'true');
  res.json({ ok: true, message: 'Sample company data populated.' });
});

// Workspaces
app.get('/api/workspaces', (_req, res) => {
  res.json(db.prepare('SELECT * FROM workspaces ORDER BY name ASC').all());
});
app.post('/api/workspaces', (req, res) => {
  if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Workspace name is required.' });
  const wsId = req.body.id || req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  db.prepare('INSERT OR REPLACE INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(wsId, req.body.name.trim(), now());
  res.status(201).json({ id: wsId, name: req.body.name.trim() });
});

// Meetings
app.get('/api/meetings', (req, res) => {
  const ws = req.query.workspace_id;
  let sql = 'SELECT * FROM meetings';
  const params = [];
  if (ws && ws !== 'all') { sql += ' WHERE workspace_id=?'; params.push(ws); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params).map(meetingRow));
});
app.post('/api/meetings', (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Meeting title is required.' });
  res.status(201).json(createMeeting(req.body, 'Human via Dashboard'));
});
app.patch('/api/meetings/:id', (req, res) => {
  const m = updateMeeting(req.params.id, req.body || {}, 'Human via Dashboard');
  if (!m) return res.status(404).json({ error: 'Meeting not found.' });
  res.json(m);
});
app.delete('/api/meetings/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Meeting not found.' });
  db.prepare('DELETE FROM meetings WHERE id=?').run(req.params.id);
  logAudit(existing.workspace_id, 'meeting', req.params.id, 'deleted', `Deleted meeting "${existing.title}"`, 'Human via Dashboard');
  res.json({ deleted: true });
});

app.get('/api/meetings/:id/summary-markdown', (req, res) => {
  const md = generateMeetingSummaryMarkdown(req.params.id);
  if (!md) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ markdown: md });
});

app.post('/api/meetings/:id/rollover', (req, res) => {
  const result = rolloverMeetingActions(req.params.id, req.body?.new_title, req.body?.new_date, 'Human via Dashboard');
  if (!result) return res.status(404).json({ error: 'Meeting not found' });
  res.json(result);
});

// Actions
app.get('/api/actions', (req, res) => {
  const ws = req.query.workspace_id;
  let sql = `SELECT a.*, m.title AS meeting_title, w.name AS workspace_name
    FROM actions a
    LEFT JOIN meetings m ON m.id=a.meeting_id
    LEFT JOIN workspaces w ON w.id=a.workspace_id`;
  const params = [];
  if (ws && ws !== 'all') {
    sql += ' WHERE a.workspace_id=?';
    params.push(ws);
  }
  sql += ' ORDER BY a.updated_at DESC';
  res.json(db.prepare(sql).all(...params));
});
app.post('/api/actions', (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Action title is required.' });
  const bad = validateAction(req.body); if (bad) return res.status(400).json({ error: bad });
  res.status(201).json(createAction(req.body, 'Human via Dashboard'));
});
app.patch('/api/actions/:id', (req, res) => {
  const bad = validateAction(req.body || {}); if (bad) return res.status(400).json({ error: bad });
  const updated = updateAction(req.params.id, req.body || {}, 'Human via Dashboard');
  if (!updated) return res.status(404).json({ error: 'Action not found.' });
  res.json(updated);
});
app.delete('/api/actions/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM actions WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Action not found.' });
  db.prepare('DELETE FROM actions WHERE id=?').run(req.params.id);
  logAudit(existing.workspace_id, 'action', req.params.id, 'deleted', `Deleted action "${existing.title}"`, 'Human via Dashboard');
  res.json({ deleted: true });
});

app.get('/api/actions/export-csv', (req, res) => {
  const ws = req.query.workspace_id;
  let sql = `SELECT a.id, a.title, a.status, a.priority, a.owner, a.due_date, a.amount, a.category, m.title AS meeting_title, w.name AS workspace_name
    FROM actions a
    LEFT JOIN meetings m ON m.id=a.meeting_id
    LEFT JOIN workspaces w ON w.id=a.workspace_id`;
  const params = [];
  if (ws && ws !== 'all') { sql += ' WHERE a.workspace_id=?'; params.push(ws); }
  sql += ' ORDER BY a.updated_at DESC';
  const rows = db.prepare(sql).all(...params);

  let csv = 'ID,Title,Status,Priority,Owner,Due Date,Amount,Category,Meeting,Department\r\n';
  for (const r of rows) {
    csv += `"${r.id}","${(r.title||'').replace(/"/g, '""')}","${r.status}","${r.priority}","${r.owner||''}","${r.due_date||''}","${r.amount||''}","${r.category||''}","${(r.meeting_title||'').replace(/"/g, '""')}","${r.workspace_name||''}"\r\n`;
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="meetingpilot-commitments.csv"');
  res.send(csv);
});

// Executive Analytics
app.get('/api/analytics', (req, res) => {
  res.json(calculateAnalytics(req.query.workspace_id || 'all'));
});

// Audit Logs
app.get('/api/audit-logs', (req, res) => {
  const ws = req.query.workspace_id;
  let sql = 'SELECT * FROM audit_logs';
  const params = [];
  if (ws && ws !== 'all') { sql += ' WHERE workspace_id=?'; params.push(ws); }
  sql += ' ORDER BY created_at DESC LIMIT 50';
  res.json(db.prepare(sql).all(...params));
});

// Webhooks
app.get('/api/webhooks', (_req, res) => {
  res.json(db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all());
});
app.post('/api/webhooks', (req, res) => {
  if (!req.body?.url?.startsWith('http')) return res.status(400).json({ error: 'Valid HTTP/HTTPS URL required.' });
  const hookId = id();
  db.prepare('INSERT INTO webhooks (id, url, created_at) VALUES (?, ?, ?)').run(hookId, req.body.url.trim(), now());
  res.status(201).json({ id: hookId, url: req.body.url.trim() });
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
      'list_workspaces'
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
app.listen(port, () => console.log(`MeetingPilot listening on http://localhost:${port}`));
