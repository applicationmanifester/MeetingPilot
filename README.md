# MeetingPilot

**Turn meetings into momentum.** MeetingPilot is a small action-management SaaS controlled through Claude using MCP. Claude performs the interpretation and writing; MeetingPilot performs persistence, retrieval, editing and display. There are no AI models, AI SDKs, or AI API keys in this application.

## What works

- Public web dashboard for viewing, creating, editing and deleting action items.
- Persistent SQLite storage.
- Streamable HTTP MCP endpoint at `/mcp`.
- MCP tools: `create_meeting`, `add_action_item`, `list_meetings`, `list_action_items`, `update_action_item`, `delete_action_item`, `get_dashboard_summary`.
- Search and status filtering in the dashboard.
- Optional bearer-token protection for the MCP endpoint (off by default; see Connect Claude).
- Meetings and action items both viewable/editable in the dashboard; `update_meeting` / `delete_meeting` MCP tools.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`. Health check: `http://localhost:3000/health`. MCP endpoint: `http://localhost:3000/mcp`.

## Connect Claude

1. Deploy MeetingPilot to a public HTTPS URL.
2. In Claude, open **Settings → Connectors** (the exact menu wording can vary by Claude plan/client).
3. Add a custom connector / remote MCP server.
4. Enter `https://YOUR-DOMAIN/mcp`.
5. Leave OAuth Client ID/Secret empty. claude.ai connects to authless servers; user-pasted bearer tokens are not supported there, so do NOT set `MCP_API_TOKEN` on the demo deployment (it is for Claude Code/API clients sending an `Authorization` header).
6. Enable the MeetingPilot tools and try:  
   `Create a meeting called Weekly Product Sync for today. Add an action for Priya to send the release plan by Friday, high priority, and an action for Alex to confirm QA sign-off.`

Claude connector support and custom-connector availability depend on the Claude account/plan. Use Anthropic's current documentation for the exact UI flow.

## Deploy on Render (recommended for this demo)

This app uses SQLite. For durable production-like persistence, attach a Render persistent disk.

1. Push this folder to a GitHub repository.
2. In Render, create a **Web Service** from that repository.
3. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
4. Add a persistent disk mounted at `/var/data`.
5. Set environment variables:
   - `NODE_VERSION=20`
   - `DATABASE_PATH=/var/data/meetingpilot.db`
   - Do not set `MCP_API_TOKEN` if connecting from claude.ai (authless).
6. Deploy and test `/health`, the dashboard, and `/mcp`.

`render.yaml` is included as a starting blueprint; configure the persistent disk in the Render dashboard if the blueprint does not provision it automatically.

## Security and production hardening

This is a deadline-focused MVP, not a hardened multi-tenant product. Before onboarding real customers:
- Add user accounts and tenant-scoped records.
- Require authentication for dashboard write APIs.
- Use per-user OAuth or scoped MCP tokens; never share a single tenant-wide secret.
- Add rate limits, audit logs, backups, input validation and retention controls.
- Use PostgreSQL for multi-instance deployments.
- Add CSRF/origin protections and operational monitoring.

The optional MCP bearer token protects MCP calls only. The dashboard/API is currently a demo workspace and must not contain confidential customer data until authentication and tenant isolation are implemented.

## Demo script

1. Open dashboard and show empty/seeded action list.
2. In Claude, ask it to create a meeting and two action items.
3. Refresh dashboard: show that records persisted.
4. Edit an owner or due date manually in MeetingPilot.
5. Ask Claude to mark an action as Done; show the dashboard updates.
6. Show dashboard summary.

## Business model hypothesis

Target: small product teams, agencies, founders and operations teams that need a lightweight action register without adopting a full project-management suite.

Illustrative pricing to validate:
- Free: 1 workspace, 2 meetings/month.
- Solo: ₹499/month.
- Team: ₹1,499/month for 5 seats.
- Business: ₹3,999/month for 20 seats.

Core value: fewer forgotten commitments, clear owners and deadlines, and a familiar Claude-first workflow. Validate willingness to pay with 10–15 customer interviews before treating these prices as proven.
