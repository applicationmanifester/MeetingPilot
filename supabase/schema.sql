-- ==============================================================================
-- MeetingPilot Supabase PostgreSQL Schema
-- Zero AI inside · Official PostgreSQL schema for MeetingPilot
-- ==============================================================================

-- 1. Create Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date TEXT DEFAULT '',
  attendees TEXT[] DEFAULT '{}',
  decisions TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safeguard for existing meetings tables
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS decisions TEXT[] DEFAULT '{}';

-- 3. Create Actions Table
CREATE TABLE IF NOT EXISTS public.actions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id TEXT REFERENCES public.meetings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner TEXT DEFAULT 'Unassigned',
  due_date TEXT DEFAULT '',
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Open',
  amount NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'prod-eng',
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Webhooks Table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Row Level Security. The Node server uses a server-only Supabase key.
-- Do not grant public/anon CRUD access to the shared demo tables.
-- ==============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Public Access Meetings" ON public.meetings;
DROP POLICY IF EXISTS "Public Access Actions" ON public.actions;
DROP POLICY IF EXISTS "Public Access Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public Access Webhooks" ON public.webhooks;

-- ==============================================================================
-- Default Workspaces & Seed Data
-- ==============================================================================
INSERT INTO public.workspaces (id, name, created_at)
VALUES 
  ('prod-eng', 'Product & Engineering', NOW()),
  ('finance-ops', 'Finance & Operations', NOW()),
  ('exec', 'Executive Leadership', NOW())
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Meetings
INSERT INTO public.meetings (id, workspace_id, title, meeting_date, attendees, decisions, notes, created_at)
VALUES 
  ('mtg-seed-1', 'prod-eng', 'Weekly Architecture & Launch Sync', CURRENT_DATE::text, ARRAY['Bhargav', 'Priya', 'Alex'], ARRAY['Approved dual-engine SQLite and Supabase architecture', 'Standardized date fields to ISO 8601 YYYY-MM-DD'], 'Discussed MVP launch criteria, MCP connector reliability, and live demo recording.', NOW()),
  ('mtg-seed-2', 'finance-ops', 'Monthly Spend & Vendor Approval Review', (CURRENT_DATE - 3)::text, ARRAY['Bhargav', 'Sarah', 'Karthik'], ARRAY['Authorized 1-year reserved compute reservation for 34% cost reduction'], 'Evaluated compute infrastructure costs and software licenses.', NOW()),
  ('mtg-seed-3', 'exec', 'Q4 OKR & Executive Velocity Sync', CURRENT_DATE::text, ARRAY['Bhargav', 'Leadership Team'], ARRAY['Mandated zero unassigned commitments on executive action items'], 'Reviewed Say-Do ratios across departments; prioritized 97.5% gross margin target.', NOW())
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Action Items
INSERT INTO public.actions (id, workspace_id, meeting_id, title, description, owner, due_date, priority, status, amount, category, created_at, updated_at)
VALUES
  ('act-seed-1', 'prod-eng', 'mtg-seed-1', 'Finalize MCP Streamable HTTP & SSE transport endpoints', 'Ensure backward-compatible support for Claude Code, Claude Desktop, and webhooks.', 'Bhargav', (CURRENT_DATE + 2)::text, 'High', 'Open', 0, 'Engineering', NOW(), NOW()),
  ('act-seed-2', 'prod-eng', 'mtg-seed-1', 'Execute cross-platform regression test suite', 'Run automated end-to-end verification across Chrome, Safari, and Claude MCP clients.', 'Priya', (CURRENT_DATE + 2)::text, 'Urgent', 'In progress', 0, 'Engineering', NOW(), NOW()),
  ('act-seed-3', 'finance-ops', 'mtg-seed-2', 'Authorize AWS / Supabase compute reservation', 'Sign off on $12,400 annual reservation to reduce baseline server costs by 34%.', 'Sarah', (CURRENT_DATE - 2)::text, 'High', 'Open', 12400, 'Budget / Spend', NOW(), NOW()),
  ('act-seed-4', 'exec', 'mtg-seed-3', 'Record 5-minute Volopay challenge walkthrough video', 'Cover who you are, best work, economics, and live Claude MCP demo.', 'Bhargav', CURRENT_DATE::text, 'High', 'Done', 0, 'Compliance', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Audit Logs
INSERT INTO public.audit_logs (id, workspace_id, action, actor, details, created_at)
VALUES
  ('aud-seed-1', 'prod-eng', 'create_action_item', 'Claude via MCP', 'Created action "Finalize MCP Streamable HTTP & SSE transport endpoints"', NOW()),
  ('aud-seed-2', 'prod-eng', 'record_meeting_decision', 'Claude via MCP', 'Recorded decision "Approved dual-engine SQLite and Supabase architecture"', NOW()),
  ('aud-seed-3', 'exec', 'toggle_status', 'Human via Dashboard', 'Marked "Record 5-minute Volopay challenge walkthrough video" as Done', NOW())
ON CONFLICT (id) DO NOTHING;
