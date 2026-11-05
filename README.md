# MeetingPilot

> **Turn meetings into momentum.**  
> Enterprise meeting accountability and action-management SaaS driven by Claude via the Model Context Protocol (MCP).  
> **100% No-AI Guarantee:** Zero AI models, zero AI SDKs, and zero AI API keys inside the application. Claude does the thinking; MeetingPilot provides the persistent storage, Say-Do ratio velocity tracking, decision registers, and human-in-the-loop control.

---

## ⚡ Live Deployments & Endpoints

- **Live Web Dashboard:** [https://meetingpilot-app.web.app](https://meetingpilot-app.web.app) (Firebase Hosting)
- **Live Verified MCP Endpoint:** `https://yourself-fascinating-detection-began.trycloudflare.com/mcp` (Cloudflare Tunnel · Streamable HTTP + SSE)
- **Live Health Endpoint:** `https://yourself-fascinating-detection-began.trycloudflare.com/health`
- **GitHub Repository:** [https://github.com/applicationmanifester/MeetingPilot](https://github.com/applicationmanifester/MeetingPilot)

---

## ⚡ What MeetingPilot Does

1. **Captures Real Records from Claude**: A request typed in Claude instantly creates meetings, records agreed key decisions, and creates structured action items in MeetingPilot via MCP.
2. **Lets Humans Edit Everything**: Open the live web dashboard to edit titles, reassign owners, push due dates, toggle completion with one click, or delete records.
3. **Dedicated Decision Register**: Separates consensus decisions agreed by the team from operational task tickets, ensuring the "why" is never lost.
4. **Accurate Say-Do Ratio Analytics**: Measures organizational follow-through ($Completed \div Total$). Displays `—` when no commitments exist (never claiming a misleading 100% on zero actions) and highlights overdue risks.
5. **Strictly Zero AI Inside**: No Anthropic, OpenAI, or other AI keys are in the codebase. All intelligence is powered by the customer's own Claude subscription over standard MCP.

---

## 🛠️ Complete MCP Tool Catalogue (15 Tools)

MeetingPilot implements both **Streamable HTTP** (`POST /mcp`) and **Server-Sent Events** (`GET /sse`):

| Tool | Purpose | Annotations / Read-Only |
|---|---|:---:|
| `create_meeting` | Save meeting title, date, attendees, notes, and agreed decisions | Write |
| `record_meeting_decision` | Record an agreed key decision during a meeting, separate from action items | Write |
| `add_action_item` | Create a trackable commitment (owner, due date, priority, status, category, amount) | Write |
| `list_meetings` | Retrieve recent meetings, newest first (optional filter by workspace) | Read-Only |
| `list_action_items` | Filter action items by status, owner, category, meeting ID, or workspace | Read-Only |
| `update_action_item` | Update title, owner, due date, priority, status, or amount (attributed in audit log) | Write |
| `delete_action_item` | Permanently remove an action item | Write |
| `update_meeting` | Edit meeting title, notes, date, attendees, or decisions | Write |
| `delete_meeting` | Delete meeting record (unlinks action items safely) | Write |
| `get_dashboard_summary`| Returns aggregated totals, status breakdown, and overdue counts | Read-Only |
| `get_team_analytics` | Executive metrics: Say-Do Ratio (%), overdue counts, unassigned counts, and owner breakdown | Read-Only |
| `list_audit_log` | Verifiable audit log attributing changes to Claude via MCP vs. human teammates | Read-Only |
| `list_workspaces` | List company departments / workspaces | Read-Only |
| `get_meeting_summary_markdown` | Generate a clean Slack/Markdown formatted summary of a meeting and all actions | Read-Only |
| `rollover_meeting_actions` | Roll over incomplete action items from an old meeting into a new follow-up agenda | Write |

---

## 🚀 Connecting to Claude

### Option A: claude.ai (Official Custom Connector)
1. Open Claude and go to **Customize / Settings → Connectors**.
2. Select **Add custom connector**.
3. Connector Name: `MeetingPilot`
4. MCP Server URL: `https://yourself-fascinating-detection-began.trycloudflare.com/mcp`
5. Click **Add** and connect it. Enable MeetingPilot tools in your chat!
6. Prompt Claude:
   > *"Create a meeting in Product & Engineering called 'Weekly Architecture Sync' with attendees Bhargav, Priya, and Alex. Record this decision: 'Approved dual-engine SQLite and Supabase architecture'. Add an action for Priya to complete QA testing by Friday."*

### Option B: Claude Code CLI
Run this single command in terminal:
```bash
claude mcp add --transport http meetingpilot https://yourself-fascinating-detection-began.trycloudflare.com/mcp
```

### Option C: Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "meetingpilot": {
      "type": "http",
      "url": "https://yourself-fascinating-detection-began.trycloudflare.com/mcp"
    }
  }
}
```
      "url": "https://YOUR-RENDER-SERVICE.onrender.com/mcp"
    }
  }
}
```

---

## ⚡ Supabase Cloud Backend (PostgreSQL)

MeetingPilot supports **dual database engines**:
1. **Local SQLite WAL mode** (built-in, zero setup required).
2. **Supabase Cloud PostgreSQL** for hosted persistence. The dashboard reads and writes through the Node backend so Claude and the UI share one database.

### 1. Set Up Supabase Database
1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase project dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This will:
   - Create tables: `workspaces`, `meetings` (with `decisions` column), `actions`, `audit_logs`, `webhooks`
   - Enable Row Level Security without public CRUD policies; the hosted Node service uses a server-only key
   - Insert initial seed workspaces and sample executive syncs

### 2. Configure Backend Credentials
Add your Supabase project keys to `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-secret-key
```

Keep `SUPABASE_SERVICE_ROLE_KEY` in Render's environment settings. Do not enter it in the browser or commit it. The dashboard's **Config** control accepts only a backend URL; it never stores database credentials.

### 3. Deploy the Node service
1. Create a Render web service from this repository and use `meetingpilot/render.yaml`.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in the service's Environment settings.
3. Deploy, then confirm `/health` reports `Supabase PostgreSQL`.
4. Use the same Render service URL for the web dashboard and the `/mcp` connector.

The current Supabase project still has its earlier permissive public policies. Apply the policy cleanup in `supabase/schema.sql` only after the hosted service has its server-only key configured, so the app does not lose database access during setup.

---

## 💻 Running Locally

Requirements: Node.js 20+

```bash
cd meetingpilot
npm install
npm start
```

- Web Dashboard: `http://localhost:3001`
- Health Check: `http://localhost:3001/health`
- MCP Streamable HTTP Endpoint: `http://localhost:3001/mcp`
- MCP SSE Endpoint: `http://localhost:3001/sse`

---

## 📊 Business Model & Unit Economics

- **Target Customers:** Small software teams, digital agencies, consultancies, and founder-led startups (5–25 people) who need dependable follow-through without heavyweight project-management suites.
- **Pricing:**
  - **Free:** 1 workspace, up to 3 meetings/month
  - **Solo:** ₹499/month ($6/mo)
  - **Team (5 seats):** ₹1,499/month ($18/mo)
  - **Business (20 seats):** ₹3,999/month ($48/mo)
- **Unit Economics Advantage:**
  - Zero AI inference / token costs (customer brings their own Claude).
  - Server costs are fixed and minimal (~₹600 / $7 per month).
  - At 100 team customers on ₹1,499/mo = ₹1,49,900 monthly revenue with **>97% gross margin**.
