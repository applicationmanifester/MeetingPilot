import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const now = () => new Date().toISOString();
const id = () => randomUUID();

// Check if Supabase credentials exist
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const useSupabase = Boolean(supabaseUrl && supabaseKey);
let supabase = null;
let sqliteDb = null;

if (useSupabase) {
  console.log(`[MeetingPilot DB] Initializing Supabase Cloud Client (${supabaseUrl})`);
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
} else {
  console.log('[MeetingPilot DB] No Supabase credentials found, running with local SQLite engine');
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'meetingpilot.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');

  // Schema initialization for SQLite
  sqliteDb.exec(`
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

  // Ensure decisions column on meetings
  const cols = sqliteDb.prepare("PRAGMA table_info(meetings)").all();
  if (!cols.some(c => c.name === 'decisions')) {
    sqliteDb.exec("ALTER TABLE meetings ADD COLUMN decisions TEXT DEFAULT ''");
  }
}

function normalizeMeeting(row) {
  if (!row) return null;
  let attendees = [];
  if (Array.isArray(row.attendees)) {
    attendees = row.attendees;
  } else if (typeof row.attendees === 'string' && row.attendees.trim()) {
    attendees = row.attendees.split(',').map(s => s.trim()).filter(Boolean);
  }
  let decisions = [];
  if (Array.isArray(row.decisions)) {
    decisions = row.decisions;
  } else if (typeof row.decisions === 'string' && row.decisions.trim()) {
    decisions = row.decisions.split('\n').map(s => s.trim()).filter(Boolean);
  }
  return { ...row, attendees, decisions };
}

// -----------------------------------------------------------------------------
// Workspaces
// -----------------------------------------------------------------------------
export async function getWorkspaces() {
  if (useSupabase) {
    const { data, error } = await supabase.from('workspaces').select('*').order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return sqliteDb.prepare('SELECT * FROM workspaces ORDER BY name ASC').all();
}

export async function createWorkspace({ id: wsId, name }) {
  const entry = { id: wsId || id(), name, created_at: now() };
  if (useSupabase) {
    const { data, error } = await supabase.from('workspaces').insert(entry).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  sqliteDb.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(entry.id, entry.name, entry.created_at);
  return entry;
}

// -----------------------------------------------------------------------------
// Meetings
// -----------------------------------------------------------------------------
export async function getMeetings(workspaceId = null) {
  if (useSupabase) {
    let q = supabase.from('meetings').select('*').order('meeting_date', { ascending: false });
    if (workspaceId && workspaceId !== 'all') {
      q = q.eq('workspace_id', workspaceId);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map(normalizeMeeting);
  }
  let sql = 'SELECT * FROM meetings';
  const params = [];
  if (workspaceId && workspaceId !== 'all') {
    sql += ' WHERE workspace_id = ?';
    params.push(workspaceId);
  }
  sql += ' ORDER BY meeting_date DESC, created_at DESC';
  return sqliteDb.prepare(sql).all(...params).map(normalizeMeeting);
}

export async function getMeetingById(meetingId) {
  if (useSupabase) {
    const { data, error } = await supabase.from('meetings').select('*').eq('id', meetingId).single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return normalizeMeeting(data);
  }
  return normalizeMeeting(sqliteDb.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId));
}

export async function createMeeting(input, actor = 'Claude via MCP') {
  const meetingId = id();
  const ws = input.workspace_id || 'prod-eng';
  const attendeesList = Array.isArray(input.attendees) ? input.attendees : (typeof input.attendees === 'string' ? input.attendees.split(',').map(s=>s.trim()).filter(Boolean) : []);
  const decisionsList = Array.isArray(input.decisions) ? input.decisions : (typeof input.decisions === 'string' ? input.decisions.split('\n').map(s=>s.trim()).filter(Boolean) : []);
  const entry = {
    id: meetingId,
    workspace_id: ws,
    title: input.title,
    meeting_date: input.meeting_date || null,
    attendees: attendeesList,
    notes: input.notes || '',
    decisions: decisionsList,
    created_at: now()
  };

  if (useSupabase) {
    const { data, error } = await supabase.from('meetings').insert(entry).select().single();
    if (error) throw new Error(error.message);
    await logAudit(ws, 'meeting', meetingId, 'created', `Meeting "${input.title}" created`, actor);
    return normalizeMeeting(data);
  }

  sqliteDb.prepare(`INSERT INTO meetings (id,workspace_id,title,meeting_date,attendees,notes,decisions,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(entry.id, entry.workspace_id, entry.title, entry.meeting_date, attendeesList.join(', '), entry.notes, decisionsList.join('\n'), entry.created_at);
  await logAudit(ws, 'meeting', meetingId, 'created', `Meeting "${input.title}" created`, actor);
  return normalizeMeeting(sqliteDb.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId));
}

export async function updateMeeting(meetingId, patch, actor = 'Human via Dashboard') {
  const existing = await getMeetingById(meetingId);
  if (!existing) return null;

  const updates = {};
  if (patch.workspace_id !== undefined) updates.workspace_id = patch.workspace_id || 'prod-eng';
  if (patch.title !== undefined && String(patch.title).trim()) updates.title = String(patch.title).trim();
  if (patch.meeting_date !== undefined) updates.meeting_date = patch.meeting_date || null;
  if (patch.notes !== undefined) updates.notes = patch.notes || '';
  if (patch.attendees !== undefined) {
    updates.attendees = Array.isArray(patch.attendees) ? patch.attendees : String(patch.attendees).split(',').map(s => s.trim()).filter(Boolean);
  }
  if (patch.decisions !== undefined) {
    updates.decisions = Array.isArray(patch.decisions) ? patch.decisions : String(patch.decisions).split('\n').map(s => s.trim()).filter(Boolean);
  }

  const nextWs = updates.workspace_id || existing.workspace_id;

  if (useSupabase) {
    const { data, error } = await supabase.from('meetings').update(updates).eq('id', meetingId).select().single();
    if (error) throw new Error(error.message);
    await logAudit(nextWs, 'meeting', meetingId, 'updated', `Meeting "${data.title}" updated`, actor);
    return normalizeMeeting(data);
  }

  const attendeesStr = updates.attendees ? updates.attendees.join(', ') : (existing.attendees || []).join(', ');
  const decisionsStr = updates.decisions ? updates.decisions.join('\n') : (existing.decisions || []).join('\n');
  sqliteDb.prepare('UPDATE meetings SET workspace_id=?,title=?,meeting_date=?,attendees=?,notes=?,decisions=? WHERE id=?')
    .run(
      updates.workspace_id ?? existing.workspace_id,
      updates.title ?? existing.title,
      updates.meeting_date !== undefined ? updates.meeting_date : existing.meeting_date,
      attendeesStr,
      updates.notes ?? existing.notes,
      decisionsStr,
      meetingId
    );
  await logAudit(nextWs, 'meeting', meetingId, 'updated', `Meeting "${updates.title || existing.title}" updated`, actor);
  return getMeetingById(meetingId);
}

export async function deleteMeeting(meetingId, actor = 'Human via Dashboard') {
  const existing = await getMeetingById(meetingId);
  if (!existing) return false;

  if (useSupabase) {
    const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
    if (error) throw new Error(error.message);
    await logAudit(existing.workspace_id, 'meeting', meetingId, 'deleted', `Meeting "${existing.title}" deleted`, actor);
    return true;
  }

  sqliteDb.prepare('DELETE FROM meetings WHERE id=?').run(meetingId);
  await logAudit(existing.workspace_id, 'meeting', meetingId, 'deleted', `Meeting "${existing.title}" deleted`, actor);
  return true;
}

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
export async function getActions(filter = {}) {
  const { workspace_id, meeting_id, status, category, owner } = filter;
  if (useSupabase) {
    let q = supabase.from('actions').select('*, workspaces:workspace_id(name), meetings:meeting_id(title)').order('created_at', { ascending: false });
    if (workspace_id && workspace_id !== 'all') q = q.eq('workspace_id', workspace_id);
    if (meeting_id) q = q.eq('meeting_id', meeting_id);
    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category', category);
    if (owner) q = q.ilike('owner', `%${owner}%`);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map(row => ({
      ...row,
      workspace_name: row.workspaces?.name || row.workspace_id,
      meeting_title: row.meetings?.title || null
    }));
  }

  let sql = `
    SELECT a.*, w.name AS workspace_name, m.title AS meeting_title
    FROM actions a
    LEFT JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN meetings m ON a.meeting_id = m.id
    WHERE 1=1
  `;
  const params = [];
  if (workspace_id && workspace_id !== 'all') {
    sql += ' AND a.workspace_id = ?';
    params.push(workspace_id);
  }
  if (meeting_id) {
    sql += ' AND a.meeting_id = ?';
    params.push(meeting_id);
  }
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  if (category) {
    sql += ' AND a.category = ?';
    params.push(category);
  }
  if (owner) {
    sql += ' AND a.owner LIKE ?';
    params.push(`%${owner}%`);
  }
  sql += ' ORDER BY a.created_at DESC';
  return sqliteDb.prepare(sql).all(...params);
}

export async function getActionById(actionId) {
  if (useSupabase) {
    const { data, error } = await supabase
      .from('actions')
      .select('*, workspaces:workspace_id(name), meetings:meeting_id(title)')
      .eq('id', actionId)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    if (!data) return null;
    return {
      ...data,
      workspace_name: data.workspaces?.name || data.workspace_id,
      meeting_title: data.meetings?.title || null
    };
  }
  return sqliteDb.prepare(`
    SELECT a.*, w.name AS workspace_name, m.title AS meeting_title
    FROM actions a
    LEFT JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN meetings m ON a.meeting_id = m.id
    WHERE a.id=?
  `).get(actionId) || null;
}

export async function createAction(input, actor = 'Claude via MCP') {
  const actionId = id();
  const timestamp = now();
  const ws = input.workspace_id || 'prod-eng';
  const amt = input.amount !== undefined && input.amount !== '' && input.amount !== null ? Number(input.amount) : null;
  const cat = input.category || (amt ? 'Budget / Spend' : 'General');

  const entry = {
    id: actionId,
    workspace_id: ws,
    meeting_id: input.meeting_id || null,
    title: input.title,
    description: input.description || '',
    owner: input.owner || '',
    due_date: input.due_date || null,
    priority: input.priority || 'Medium',
    status: input.status || 'Open',
    amount: amt,
    category: cat,
    created_at: timestamp,
    updated_at: timestamp
  };

  if (useSupabase) {
    const { data, error } = await supabase.from('actions').insert(entry).select().single();
    if (error) throw new Error(error.message);
    await logAudit(ws, 'action', actionId, 'created', `Action "${input.title}" created for ${input.owner || 'team'}`, actor);
    return getActionById(actionId);
  }

  sqliteDb.prepare(`
    INSERT INTO actions (id,workspace_id,meeting_id,title,description,owner,due_date,priority,status,amount,category,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(entry.id, entry.workspace_id, entry.meeting_id, entry.title, entry.description, entry.owner, entry.due_date, entry.priority, entry.status, entry.amount, entry.category, entry.created_at, entry.updated_at);
  
  await logAudit(ws, 'action', actionId, 'created', `Action "${input.title}" created for ${input.owner || 'team'}`, actor);
  return getActionById(actionId);
}

export async function updateAction(actionId, patch, actor = 'Human via Dashboard') {
  const existing = await getActionById(actionId);
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
  next.updated_at = now();

  if (useSupabase) {
    const { data, error } = await supabase.from('actions').update({
      workspace_id: next.workspace_id,
      meeting_id: next.meeting_id,
      title: next.title,
      description: next.description,
      owner: next.owner,
      due_date: next.due_date,
      priority: next.priority,
      status: next.status,
      amount: next.amount,
      category: next.category,
      updated_at: next.updated_at
    }).eq('id', actionId).select().single();
    if (error) throw new Error(error.message);
  } else {
    sqliteDb.prepare(`
      UPDATE actions SET workspace_id=?,meeting_id=?,title=?,description=?,owner=?,due_date=?,priority=?,status=?,amount=?,category=?,updated_at=?
      WHERE id=?
    `).run(next.workspace_id, next.meeting_id, next.title, next.description, next.owner, next.due_date, next.priority, next.status, next.amount, next.category, next.updated_at, actionId);
  }

  const changes = [];
  if (patch.status && patch.status !== existing.status) changes.push(`status ${existing.status} → ${patch.status}`);
  if (patch.due_date && patch.due_date !== existing.due_date) changes.push(`due date → ${patch.due_date}`);
  if (patch.owner && patch.owner !== existing.owner) changes.push(`owner → ${patch.owner}`);
  const details = changes.length ? `Updated ${changes.join(', ')}` : `Edited action "${existing.title}"`;
  await logAudit(next.workspace_id, 'action', actionId, 'updated', details, actor);

  return getActionById(actionId);
}

export async function deleteAction(actionId, actor = 'Human via Dashboard') {
  const existing = await getActionById(actionId);
  if (!existing) return false;

  if (useSupabase) {
    const { error } = await supabase.from('actions').delete().eq('id', actionId);
    if (error) throw new Error(error.message);
    await logAudit(existing.workspace_id, 'action', actionId, 'deleted', `Action "${existing.title}" deleted`, actor);
    return true;
  }

  sqliteDb.prepare('DELETE FROM actions WHERE id=?').run(actionId);
  await logAudit(existing.workspace_id, 'action', actionId, 'deleted', `Action "${existing.title}" deleted`, actor);
  return true;
}

// -----------------------------------------------------------------------------
// Audit Logs
// -----------------------------------------------------------------------------
export async function logAudit(workspaceId, entityType, entityId, action, details, actor = 'Human via Dashboard') {
  try {
    const entry = {
      id: id(),
      workspace_id: workspaceId || 'prod-eng',
      entity_type: entityType,
      entity_id: entityId,
      action,
      details,
      actor,
      created_at: now()
    };

    if (useSupabase) {
      await supabase.from('audit_logs').insert({
        id: entry.id,
        workspace_id: entry.workspace_id,
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
        created_at: entry.created_at
      });
    } else {
      sqliteDb.prepare(`
        INSERT INTO audit_logs (id, workspace_id, entity_type, entity_id, action, details, actor, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(entry.id, entry.workspace_id, entry.entity_type, entry.entity_id, entry.action, entry.details, entry.actor, entry.created_at);
    }

    notifyWebhooks({ entityType, entityId, action, details, actor, timestamp: entry.created_at });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export async function getAuditLogs(workspaceId = null, limit = 50) {
  if (useSupabase) {
    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (workspaceId && workspaceId !== 'all') q = q.eq('workspace_id', workspaceId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }
  let sql = 'SELECT * FROM audit_logs';
  const params = [];
  if (workspaceId && workspaceId !== 'all') {
    sql += ' WHERE workspace_id = ?';
    params.push(workspaceId);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return sqliteDb.prepare(sql).all(...params);
}

// -----------------------------------------------------------------------------
// Webhooks
// -----------------------------------------------------------------------------
export async function getWebhooks() {
  if (useSupabase) {
    const { data, error } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return sqliteDb.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
}

export async function createWebhook(url) {
  const entry = { id: id(), url, created_at: now() };
  if (useSupabase) {
    const { data, error } = await supabase.from('webhooks').insert(entry).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  sqliteDb.prepare('INSERT INTO webhooks (id, url, created_at) VALUES (?, ?, ?)').run(entry.id, entry.url, entry.created_at);
  return entry;
}

export async function deleteWebhook(webhookId) {
  if (useSupabase) {
    const { error } = await supabase.from('webhooks').delete().eq('id', webhookId);
    if (error) throw new Error(error.message);
    return true;
  }
  sqliteDb.prepare('DELETE FROM webhooks WHERE id=?').run(webhookId);
  return true;
}

async function notifyWebhooks(payload) {
  try {
    const hooks = await getWebhooks();
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

// -----------------------------------------------------------------------------
// Analytics
// -----------------------------------------------------------------------------
export async function calculateAnalytics(workspaceId = null) {
  const allActions = await getActions({ workspace_id: workspaceId });
  const allMeetings = await getMeetings(workspaceId);

  const total = allActions.length;
  const done = allActions.filter(a => a.status === 'Done').length;
  const inProgress = allActions.filter(a => a.status === 'In progress').length;
  const open = allActions.filter(a => a.status === 'Open').length;
  const blocked = allActions.filter(a => a.status === 'Blocked').length;
  const unassigned = allActions.filter(a => !a.owner || a.owner.trim() === '' || a.owner === 'Unassigned').length;

  const today = new Date().toISOString().split('T')[0];
  const overdue = allActions.filter(a => a.due_date && a.due_date < today && a.status !== 'Done');

  const withDueDate = allActions.filter(a => a.due_date);
  const onTime = allActions.filter(a => a.status === 'Done' && (!a.due_date || a.due_date >= today)).length;
  const onTimeRate = withDueDate.length > 0 ? Math.round((onTime / withDueDate.length) * 100) : null;

  // Say-Do Ratio (Completion Rate): NULL when total is 0! (Never claim 100% with 0 items)
  const sayDoRatio = total > 0 ? Math.round((done / total) * 100) : null;

  const totalFinancialAmount = allActions.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const pendingFinancialAmount = allActions.filter(a => a.status !== 'Done').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const byOwner = {};
  for (const a of allActions) {
    const o = a.owner && a.owner.trim() ? a.owner.trim() : 'Unassigned';
    if (!byOwner[o]) byOwner[o] = { total: 0, done: 0, overdue: 0 };
    byOwner[o].total++;
    if (a.status === 'Done') byOwner[o].done++;
    if (a.due_date && a.due_date < today && a.status !== 'Done') byOwner[o].overdue++;
  }

  return {
    reportingPeriod: 'Q4 2026 (Live Workspace)',
    totalMeetings: allMeetings.length,
    totalActions: total,
    sayDoRatio, // null if total === 0
    completionRate: sayDoRatio,
    onTimeRate,
    done,
    inProgress,
    open,
    blocked,
    unassigned,
    overdueCount: overdue.length,
    totalFinancialAmount,
    pendingFinancialAmount,
    byOwner,
    overdueActions: overdue
  };
}

// -----------------------------------------------------------------------------
// Markdown Summary & Rollover
// -----------------------------------------------------------------------------
export async function generateMeetingSummaryMarkdown(meetingId) {
  const m = await getMeetingById(meetingId);
  if (!m) return null;
  const actions = await getActions({ meeting_id: meetingId });
  const attendeesList = m.attendees?.length ? m.attendees.join(', ') : 'Team';
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

export async function rolloverMeetingActions(fromMeetingId, newTitle, newDate, actor = 'Human via Dashboard') {
  const oldMeeting = await getMeetingById(fromMeetingId);
  if (!oldMeeting) return null;

  const title = newTitle || `${oldMeeting.title} (Follow-up)`;
  const date = newDate || new Date().toISOString().split('T')[0];

  const newMeeting = await createMeeting({
    workspace_id: oldMeeting.workspace_id,
    title,
    meeting_date: date,
    attendees: oldMeeting.attendees,
    notes: `Follow-up to "${oldMeeting.title}". Rolled over active commitments.`
  }, actor);

  const openActions = (await getActions({ meeting_id: fromMeetingId })).filter(a => a.status !== 'Done');
  for (const a of openActions) {
    await updateAction(a.id, { meeting_id: newMeeting.id }, actor);
  }

  await logAudit(oldMeeting.workspace_id, 'meeting', newMeeting.id, 'rollover', `Rolled over ${openActions.length} open commitment(s) from "${oldMeeting.title}" into "${title}"`, actor);
  return {
    newMeeting,
    rolledOverCount: openActions.length
  };
}

// -----------------------------------------------------------------------------
// Seed Demo Data
// -----------------------------------------------------------------------------
export async function seedDemoData(clearExisting = false) {
  if (useSupabase) {
    if (clearExisting) {
      await supabase.from('audit_logs').delete().neq('id', '');
      await supabase.from('actions').delete().neq('id', '');
      await supabase.from('meetings').delete().neq('id', '');
      await supabase.from('workspaces').delete().neq('id', '');
    }
    const defaultWorkspaces = [
      { id: 'prod-eng', name: 'Product & Engineering' },
      { id: 'finance-ops', name: 'Finance & Spend Approvals' },
      { id: 'exec', name: 'Executive Leadership' }
    ];
    for (const w of defaultWorkspaces) {
      await supabase.from('workspaces').upsert({ id: w.id, name: w.name, created_at: now() });
    }
  } else {
    if (clearExisting) {
      sqliteDb.prepare('DELETE FROM audit_logs').run();
      sqliteDb.prepare('DELETE FROM actions').run();
      sqliteDb.prepare('DELETE FROM meetings').run();
      sqliteDb.prepare('DELETE FROM workspaces').run();
    }
    const defaultWorkspaces = [
      { id: 'prod-eng', name: 'Product & Engineering' },
      { id: 'finance-ops', name: 'Finance & Spend Approvals' },
      { id: 'exec', name: 'Executive Leadership' }
    ];
    for (const w of defaultWorkspaces) {
      const exists = sqliteDb.prepare('SELECT id FROM workspaces WHERE id=?').get(w.id);
      if (!exists) {
        sqliteDb.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(w.id, w.name, now());
      }
    }
  }

  const existingMeetings = await getMeetings();
  if (existingMeetings.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    const friday = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const nextMon = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const pastWed = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

    const m1 = await createMeeting({
      workspace_id: 'prod-eng',
      title: 'Weekly Product & Architecture Sync',
      meeting_date: today,
      attendees: ['Bhargav', 'Priya', 'Alex'],
      notes: 'Discussed MVP launch criteria, MCP connector reliability, and live demo recording.'
    }, 'Claude via MCP');

    await createAction({
      workspace_id: 'prod-eng',
      meeting_id: m1.id,
      title: 'Send release plan to stakeholders',
      description: 'Share timeline, test cases, and rollback procedures.',
      owner: 'Priya',
      due_date: friday,
      priority: 'High',
      status: 'In progress',
      category: 'Engineering'
    }, 'Claude via MCP');

    await createAction({
      workspace_id: 'prod-eng',
      meeting_id: m1.id,
      title: 'Confirm QA sign-off on staging',
      description: 'Verify MCP streamable endpoints and human edit workflows.',
      owner: 'Alex',
      due_date: nextMon,
      priority: 'Urgent',
      status: 'Open',
      category: 'Engineering'
    }, 'Claude via MCP');

    const m2 = await createMeeting({
      workspace_id: 'finance-ops',
      title: 'Monthly Budget & Corporate Spend Review',
      meeting_date: pastWed,
      attendees: ['Bhargav', 'Rohan', 'Sarah'],
      notes: 'Reviewed vendor renewals, cloud infrastructure costs, and corporate card limits.'
    }, 'Claude via MCP');

    await createAction({
      workspace_id: 'finance-ops',
      meeting_id: m2.id,
      title: 'Approve Datadog observability annual contract',
      description: 'Vendor renewal for cloud monitoring tier with 15% annual discount.',
      owner: 'Sarah',
      due_date: friday,
      priority: 'High',
      status: 'Open',
      amount: 12000,
      category: 'Budget / Spend'
    }, 'Claude via MCP');

    await createAction({
      workspace_id: 'finance-ops',
      meeting_id: m2.id,
      title: 'Reconcile Q3 corporate card expense accounts',
      description: 'Audit receipt submissions and department spend deviations.',
      owner: 'Rohan',
      due_date: pastWed,
      priority: 'Medium',
      status: 'Done',
      amount: 4500,
      category: 'Budget / Spend'
    }, 'Claude via MCP');
  }
}

export function isUsingSupabase() {
  return useSupabase;
}

