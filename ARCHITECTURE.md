# MeetingPilot — Architecture and Implementation Notes

> **Enterprise Meeting Action Management Powered by Claude via Model Context Protocol (MCP)**  
> **Core Architectural Principle:** *"AI Thinks. Software Persists. Humans Control."*

---

## 1. High-Level Architecture Diagram

### Visual Architectural Topology

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                               HUMAN-IN-THE-LOOP                                    │
│       Executive / Product Manager / Team Member (Web Browser / Mobile PWA)         │
│                           https://meetingpilot-app.web.app                        │
└──────────────────────────┬─────────────────────────────────────▲──────────────────┘
                           │                                     │
           Inline Edits, Due Dates, Approvals          Live Dashboard, Say-Do Metric,
           One-Click Task Completion, Filters         Decision Register, Overdue Alerts
                           │                                     │
                           ▼                                     │
┌────────────────────────────────────────────────────────────────┴──────────────────┐
│                            FRONTEND HOSTING LAYER                                 │
│         Firebase Hosting (Global Edge CDN · High-Performance Responsive SPA)       │
└──────────────────────────┬────────────────────────────────────────────────────────┘
                           │
                 REST API Calls (/api/*)
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         MEETINGPILOT CORE BACKEND ENGINE                          │
│                   Node.js Express 4.x (Port 3001) · Zero AI Inside                │
│                                                                                   │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │  MCP Protocol Handlers│  │  Zod Validation Engine│  │ Security & Rate Limit │  │
│  │  Streamable HTTP /mcp │  │  Strict Tool Schema   │  │ 120 req/min API Limit │  │
│  │  Server-Sent Events   │  │  Argument Enforcement │  │ 90 req/min MCP Limit  │  │
│  └───────────▲───────────┘  └───────────┬───────────┘  └───────────────────────┘  │
│              │                          │                                         │
│              │                          ▼                                         │
│  ┌───────────┴───────────┐  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │  15 Enterprise Tools  │  │  Deterministic Logic  │  │  Verifiable Audit Log │  │
│  │  Meetings, Actions,   │  │  Say-Do Ratio Velocity│  │  Actor Attribution:   │  │
│  │  Decisions, Analytics │  │  Status Calculations  │  │  Claude vs Human User │  │
│  └───────────────────────┘  └───────────┬───────────┘  └───────────────────────┘  │
└──────────────────────────┬──────────────┴─────────────────────────────────────────┘
                           │
      ┌────────────────────┴────────────────────┐
      │                                         │
      ▼ (Primary Cloud Persistence)             ▼ (Automatic Local Failover)
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│       SUPABASE CLOUD POSTGRESQL     │   │         SQLITE WAL STORAGE          │
│   Project: magysstkgdiyqvmfbjjc     │   │   File: ./data/meetingpilot.db      │
│   Multi-User Cloud Relational DB    │   │   Write-Ahead Logging Local Cache   │
│   Row Level Security & Realtime     │   │   100% Offline Resilient Execution  │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
                           ▲
                           │
             Model Context Protocol (JSON-RPC 2.0)
             Public Secure Cloudflare Tunnel
             https://yourself-fascinating-detection-began.trycloudflare.com/mcp
                           │
┌──────────────────────────┴────────────────────────────────────────────────────────┐
│                        COGNITIVE REASONING LAYER (AI PARTNER)                     │
│               Anthropic Claude (Desktop / claude.ai / Claude Code CLI)            │
│   • Ingests messy, unstructured meeting notes & conversational transcripts        │
│   • Extracts action items, owners, deadlines, priority levels, and decisions     │
│   • Autonomously invokes MeetingPilot MCP tools based on conversational intent    │
│   • Customer Bring-Your-Own-AI (BYO-AI) Model: ₹0 inference cost to MeetingPilot │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End Data Flow

The MeetingPilot data pipeline enforces clean separation between non-deterministic cognitive reasoning (Claude) and deterministic relational storage (MeetingPilot):

```
[Meeting Sync / Audio / Notes]
              │
              ▼
    1. Conversational Prompt  ────► User gives raw notes to Claude Desktop / claude.ai
              │
              ▼
    2. Intent Extraction      ────► Claude parses context, disambiguating tasks, owners, & decisions
              │
              ▼
    3. MCP Tool Formulation   ────► Claude constructs JSON-RPC 2.0 payload matching tool schemas
              │
              ▼
    4. Secure Network Transit ────► Streamable HTTP POST /mcp via Cloudflare tunnel (Bearer Auth)
              │
              ▼
    5. Schema Validation      ────► MeetingPilot validates parameters using strict Zod schemas
              │
              ▼
    6. Atomic Persistence     ────► Record written to Supabase Cloud PostgreSQL (or SQLite fallback)
              │
              ▼
    7. Audit Attribution      ────► Change logged in audit_logs attributing actor ("claude_mcp")
              │
              ▼
    8. Real-Time UI Sync      ────► Web dashboard (meetingpilot-app.web.app) displays new items
              │
              ▼
    9. Human-in-the-Loop      ────► Human teammate modifies deadline, priority, or clicks complete
              │
              ▼
   10. Closed-Loop Feedback   ────► Claude queries get_dashboard_summary and reflects the human edit
```

### Detailed Flow Steps
1. **Conversational Ingestion:** The user feeds natural conversational text into Claude (e.g., *"We had an architecture sync with Bhargav, Priya, and Alex. We agreed on Supabase PostgreSQL. Priya must verify QA by Friday and Alex must write docs by Monday"*).
2. **Cognitive Disambiguation:** Claude identifies distinct business entities: 1 meeting, 1 consensus decision, and 2 separate commitments with assignees and due dates.
3. **MCP Tool Invocation:** Claude invokes `create_meeting`, `record_meeting_decision`, and `add_action_item` over standard JSON-RPC 2.0.
4. **Transport & Security:** Invocations pass through Cloudflare edge protection to our Node.js engine with rate-limiting verification (120 req/min API, 90 req/min MCP).
5. **Validation & Storage:** The server validates input types via Zod, writes records to Supabase Cloud PostgreSQL, and inserts audit log entries.
6. **Live Human Oversight:** The live Firebase web app (`meetingpilot-app.web.app`) immediately renders the new records.
7. **Human Edit & Two-Way Sync:** A human teammate can adjust Priya's due date or check off Alex's task. When the user asks Claude for a status briefing, Claude calls `get_team_analytics`, reads the updated database in real time, and accurately reports the new Say-Do completion ratio.

---

## 3. Division of Responsibilities: Volopay vs. Partners

To build an enterprise-grade product without bloated infrastructure, MeetingPilot cleanly demarcates boundaries between the core platform, fintech workflows, and external partners:

| Layer / Domain | Component | Primary Responsibility |
| :--- | :--- | :--- |
| **Volopay / MeetingPilot Core** | **Meeting & Action Engine** | System of record for all meetings, attendee rosters, and commitments. |
| **Volopay / MeetingPilot Core** | **Executive Decision Register** | Dedicated persistence for high-level agreements, decoupled from task tickets. |
| **Volopay / MeetingPilot Core** | **Velocity & Say-Do Analytics** | Mathematical calculation of team follow-through velocity ($Completed \div Total$). |
| **Volopay / MeetingPilot Core** | **Human-in-the-Loop Web App** | Responsive dashboard for inline editing, reassignment, status toggling, and review. |
| **Volopay Fintech Integration** | **Spend Approvals & Budgets** | Connecting action items tagged with spend amounts to corporate approval workflows. |
| **AI Partner (Anthropic / Claude)** | **Cognitive Intelligence** | Speech/text comprehension, summarization, entity extraction, and MCP orchestration. |
| **Cloud Partner (Supabase)** | **Managed Persistence** | PostgreSQL cloud database, row-level security, connection pooling, and replication. |
| **Edge Partner (Firebase)** | **Frontend Delivery** | Global Edge CDN hosting, SSL termination, and static asset distribution. |
| **Network Partner (Cloudflare)** | **Secure Edge Tunneling** | Exposing local microservices over zero-trust HTTPS without open inbound firewall ports. |

---

## 4. Tools & Technologies Used

### Backend & Protocol Stack
- **Node.js (v24.14 LTS):** High-throughput asynchronous runtime.
- **Express 4.x:** REST API routing, static file serving, and security middleware.
- **Model Context Protocol SDK (`@modelcontextprotocol/sdk` v1.12+):** Official Anthropic MCP specification supporting dual transports:
  - *Streamable HTTP* (`POST /mcp`): Modern HTTP transport recommended by Anthropic.
  - *Server-Sent Events* (`GET /sse`): Real-time streaming transport for legacy connectors.
- **Zod (v3.25):** Runtime type validation enforcing strict input schemas on all 15 MCP tools.
- **Rate Limiting Middleware:** Custom sliding-window rate limiters protecting against denial-of-service spikes.

### Database & Storage Stack
- **Supabase Cloud PostgreSQL (`@supabase/supabase-js` v2.119):** Cloud database for production multi-user workspaces.
- **`better-sqlite3` (v11.10):** Embedded SQLite database utilizing Write-Ahead Logging (WAL) for instant local fallback.

### Frontend & Visual Stack
- **Firebase Hosting:** Global CDN deployment delivering the single-page application at `https://meetingpilot-app.web.app`.
- **Vanilla JavaScript & CSS3:** Zero external heavy framework overhead (no React/Angular virtual DOM latency).
- **Custom Vector Branding:** Hand-crafted inline SVG supersonic pilot logo and multi-resolution favicon suite (`.svg`, `.png`, `.ico`).

### Tooling & Artifact Generation
- **`pptxgenjs` (v4.0):** Programmatic generation of the 10-slide 16:9 widescreen PowerPoint pitch deck.
- **`docx` (v9.2):** Programmatic generation of the executive two-page strategy document for Microsoft Word.
- **Google Chrome Headless:** Pixel-perfect rendering of the strategy brief into a strict 2-page A4 PDF.

---

## 5. Architectural Assumptions

1. **"Bring Your Own AI" (BYO-AI):** The customer utilizes their existing Claude subscription (Claude Desktop, claude.ai, or Claude Code). MeetingPilot provides zero LLM inference, eliminating variable API token overhead.
2. **Relational System of Record:** Business records (deadlines, owners, priority, status) must be stored in deterministic relational tables rather than vector databases or prompt context windows to eliminate hallucination.
3. **Workspace Multi-Tenancy:** Records are logically grouped by Workspace (e.g., `Product & Engineering`, `Executive Leadership`, `Sales & Marketing`).
4. **Human Agency Priority:** AI can propose, structure, and query commitments, but humans retain final authority to edit, reassign, postpone, or delete tasks.
5. **Secure Transport Pre-Requisite:** Remote MCP connections require HTTPS/TLS compliance for all production JSON-RPC handshakes.

---

## 6. What Was Built vs. Proposed Production System

To ensure transparency, here is a direct comparison between the **working live prototype** and the **proposed enterprise production system**:

| Capability | What We Built (Live Working System) | Proposed Production System (Scale-Out) |
| :--- | :--- | :--- |
| **MCP Implementation** | **15 Fully Working Tools** over Streamable HTTP & SSE transports; verified live in Claude. | 15 Tools + Automated Background Worker for periodic deadline escalation. |
| **Authentication** | **Bearer Token Auth** (`MCP_API_TOKEN`) with public demo open mode. | **OAuth 2.0 / OpenID Connect** with user-delegated tokens and SAML SSO (Okta/Azure AD). |
| **Database Architecture** | **Live Supabase PostgreSQL** cloud database with automatic local SQLite WAL failover. | Multi-tenant PostgreSQL with isolated customer schemas and automated geo-replication. |
| **Hosting & Deployment** | **Firebase Edge Hosting** (Frontend) + **Cloudflare Tunnel** (Backend microservice). | **Google Cloud Run / Kubernetes (EKS)** auto-scaling containers behind Cloudflare Load Balancers. |
| **Rate Limiting** | In-memory sliding-window rate limiter (120 API / 90 MCP req/min). | **Distributed Redis Cluster** (Upstash / ElastiCache) across multiple availability zones. |
| **Fintech / Card Integration** | Basic spend approval tracking tools (`create_spend_approval`, `approve_action`). | **Direct Volopay Core API Bridge:** Automated virtual card provisioning upon meeting approval. |
| **Third-Party Notifications** | Webhook dispatch endpoints for outgoing event payloads. | **Native Bi-Directional Slack & MS Teams Apps** with interactive approval buttons. |

---

## 7. Limitations of the Current Prototype

1. **Shared Token Model:** The current live MCP endpoint uses a single bearer token or open demo mode rather than individual per-user OAuth tokens.
2. **Single Server Process:** The Node.js backend runs as a single process, utilizing an in-memory rate limiter rather than an external distributed cache.
3. **Manual Audio Transcription:** The prototype accepts text transcripts or typed summaries pasted into Claude; native microphone streaming requires an external speech-to-text bridge.

---

## 8. Next Steps & Development Roadmap

### Phase 1: Enterprise Security & Volopay Integration (Q1 2027)
- **Volopay Spend Bridge:** Connect `create_spend_approval` directly to Volopay's Card Issuing APIs to automatically generate single-use virtual cards for approved meeting budgets.
- **OAuth 2.0 Auth Server:** Implement OAuth 2.0 PKCE flow so each Claude user connects under their individual enterprise identity.
- **Enterprise SSO:** Integrate SAML 2.0 / SCIM directory sync for automatic employee onboarding and offboarding.

### Phase 2: Asynchronous Omnichannel Ecosystem (Q2 2027)
- **Slack & Teams Native Apps:** Allow managers to approve spend requests or mark tasks complete directly from interactive Slack message blocks.
- **Google Calendar / Outlook Two-Way Sync:** Automatically ingest scheduled meeting rosters 5 minutes before calls begin.
- **Automated Recurring Sync Rollover:** Automatically migrate incomplete commitments into next week's meeting agenda.

---

## 9. Verification & Submission Checklist

- [x] **Live Frontend:** [https://meetingpilot-app.web.app](https://meetingpilot-app.web.app) (Firebase Hosting)
- [x] **Live Remote MCP:** `https://yourself-fascinating-detection-began.trycloudflare.com/mcp` (Cloudflare Tunnel)
- [x] **Live Database:** Supabase Cloud PostgreSQL (`magysstkgdiyqvmfbjjc`)
- [x] **GitHub Repository:** [https://github.com/applicationmanifester/MeetingPilot](https://github.com/applicationmanifester/MeetingPilot) (Branch `main`)
- [x] **10-Slide Pitch Deck:** `MeetingPilot_Pitch_Deck.pptx` (PowerPoint format)
- [x] **Two-Page Strategy Brief:** `MeetingPilot_Strategy_Document.pdf` & `.docx`
- [x] **Architecture Documentation:** `ARCHITECTURE.md` (Complete implementation guide)

