# MeetingPilot

> **Turn meetings into momentum.**  
> A lightweight action-management SaaS driven by Claude via the Model Context Protocol (MCP).  
> **100% No-AI Guarantee:** Zero AI models, zero AI SDKs, and zero AI API keys inside the application. Claude does the thinking; MeetingPilot does the persistent storage, status tracking, and human-in-the-loop editing.

---

## ⚡ What MeetingPilot Does

1. **Creates Real Records from Claude**: A request typed in Claude instantly creates meetings and structured action items in MeetingPilot via MCP.
2. **Lets Humans Edit Everything**: Open the live web dashboard to edit titles, reassign owners, push due dates, toggle completion with one click, or delete records.
3. **Keeps the Result Live**: Real-time synchronization across Claude and the web dashboard.
4. **Strictly Zero AI Inside**: No Anthropic, OpenAI, or other AI keys are in the codebase. All intelligence is powered by the customer's own Claude subscription over standard MCP.

---

## 🛠️ MCP Tools Exposed

MeetingPilot implements both **Streamable HTTP** (`POST /mcp`) and **Server-Sent Events** (`GET /sse`):

| Tool | Purpose | Read-Only? |
|---|---|:---:|
| `create_meeting` | Save meeting title, date, attendees, and notes | No |
| `add_action_item` | Create a trackable action item (owner, due date, priority, status) | No |
| `list_meetings` | Retrieve recent meetings, newest first | Yes |
| `list_action_items` | Filter action items by status, owner, or meeting ID | Yes |
| `update_action_item` | Update title, owner, due date, priority, or status | No |
| `delete_action_item` | Permanently remove an action item | No |
| `update_meeting` | Edit meeting title, notes, date, or attendees | No |
| `delete_meeting` | Delete meeting (preserves unlinked action items) | No |
| `get_dashboard_summary`| Returns aggregated metrics (totals, status breakdown, overdue items)| Yes |

---

## 🚀 Connecting to Claude

### Option A: claude.ai (Web Connectors)
1. In Claude, navigate to **Settings → Connectors** (or **Add Remote MCP Server**).
2. Enter your live URL: `https://YOUR-APP-DOMAIN/mcp`.
3. Leave OAuth fields blank (MeetingPilot runs in authless mode for public evaluators).
4. Prompt Claude:
   > *"Create a meeting called 'Weekly Product Sync' with attendees Bhargav, Priya, and Alex. Add an action for Priya to send the release plan by Friday (High priority), and an action for Alex to confirm QA sign-off (Urgent priority)."*

### Option B: Claude Code CLI
Run one command in your terminal:
```bash
claude mcp add --transport http meetingpilot https://YOUR-APP-DOMAIN/mcp
```

### Option C: Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "meetingpilot": {
      "type": "http",
      "url": "https://YOUR-APP-DOMAIN/mcp"
    }
  }
}
```

---

## ⚡ Supabase Cloud Backend (PostgreSQL + Realtime)

MeetingPilot supports **Supabase** as its cloud database backend. When configured, both the Claude MCP server and the Firebase-hosted dashboard interact with Supabase PostgreSQL with live Realtime subscription updates!

### 1. Set Up Supabase Database
1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase project dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](file:///supabase/schema.sql). This will:
   - Create tables: `workspaces`, `meetings`, `actions`, `audit_logs`, `webhooks`
   - Configure Row Level Security (RLS) open policies
   - Enable Supabase Realtime replication on `actions` and `meetings`
   - Insert initial seed workspaces and sample executive syncs

### 2. Configure Backend Credentials
Add your Supabase project keys to `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key
```

### 3. Connect from the Live Web Dashboard
On the live web app ([https://meetingpilot-app.web.app](https://meetingpilot-app.web.app)):
- Click the **"Backend"** pill in the top header.
- Enter your Supabase Project URL and Anon Key.
- Click **Save Supabase Connection**. The dashboard will instantly sync with Supabase and listen for real-time changes!

---

## 💻 Running Locally

Requirements: Node.js 20+

```bash
cd meetingpilot
npm install
npm start
```

- Web Dashboard: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`
- MCP Streamable HTTP Endpoint: `http://localhost:3000/mcp`
- MCP SSE Endpoint: `http://localhost:3000/sse`

---

## 🌐 Deploying to the Internet (Render)

MeetingPilot uses SQLite with WAL mode.

1. Push this directory to your GitHub repository:
   ```bash
   git remote add origin https://github.com/applicationmanifester/MeetingPilot.git
   git push -u origin main
   ```
2. In **Render** (render.com):
   - Click **New → Web Service**.
   - Connect your `meetingpilot` repository.
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_VERSION` = `20`
     - *(Optional)* `DATABASE_PATH` = `/var/data/meetingpilot.db` (if using Render Persistent Disk)
3. Hit **Deploy**. Your app is live with HTTPS within 2 minutes!

---

## 📊 Business Model & Economics

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
