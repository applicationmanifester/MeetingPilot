# MeetingPilot — 5-Minute Pitch Video Script & Cue Sheet

> **Pitch Video Rules Checklist:**
> - Length: Under 5 minutes (target 4:20 - 4:45)
> - Must cover: 1) Who you are, 2) Your best work, 3) Why this business will win, 4) Live demo, 5) The economics.
> - Must show: Real deployed app (`https://meetingpilot-app.web.app`), real Claude MCP connector (`https://b617ed4c4494b3.lhr.life/mcp`), Decision Register, Say-Do ratio tracking, and human editing in the UI.

---

## ⏱️ Video Cue Sheet & Script

### Part 1: Who I Am (0:00 – 0:35)
**Visual:** Webcam / face on camera, professional setup.

> "Hi everyone, I'm **Bhargav G K**. I'm a QA and Customer Support Analyst at Infor in Bengaluru with over three years of experience specializing in enterprise ERP systems, order-to-cash workflows, and billing operations. I'm also a certified Project Management Professional (PMP). 
> 
> Outside my day job, I love building focused, highly practical software. Some of my favorite projects include **Billit**, an automated invoicing application, **Aurafisky**, a high-performance weather PWA, and **Inaviato**, a live flight-tracking tool.
> 
> Having spent years in project management and customer operations, I've observed a massive, universal friction point: meetings create commitments, but those commitments almost immediately get lost between messy notes, Slack threads, and forgotten docs."

---

### Part 2: The Problem & The Business (0:35 – 1:15)
**Visual:** Show slide or MeetingPilot landing screen at `https://meetingpilot-app.web.app`.

> "Meetings are only valuable if decisions turn into execution. Today, teams spend hours in syncs, but after the call ends, nobody wants to spend 20 minutes manually filing Jira tickets or updating complex Asana boards. 
> 
> That's why I built **MeetingPilot**. 
> 
> MeetingPilot is an enterprise meeting accountability SaaS built on top of the Model Context Protocol (MCP). 
> 
> Crucially, **there is zero AI inside MeetingPilot**. There are no OpenAI or Anthropic API keys in the codebase, no background token costs, and no hallucination risk in our database. Claude does 100% of the thinking, summarization, and intent extraction, while MeetingPilot handles what software does best: ultra-fast persistence, search, status tracking, Decision Registers, Say-Do ratio velocity tracking, and a live web dashboard where humans retain full control."

---

### Part 3: Live Interactive Demo (1:15 – 3:00)
**Visual:** Screen recording showing MeetingPilot dashboard on the left and Claude on the right (split screen).

> **Step 1: The Live Workspace & Connection Handshake (1:15 – 1:35)**  
> *"Here is the live MeetingPilot dashboard running on Firebase at `meetingpilot-app.web.app`. Notice our live connection status: `Backend: Online (15 tools)`. I can click '🧪 Test Handshake' and instantly verify round-trip latency to our live MCP endpoint."*
> 
> **Step 2: Driving from Claude via MCP (1:35 – 2:15)**  
> *"Now let's switch to Claude. We've connected MeetingPilot via Claude's official custom connector settings. I will give Claude raw conversational notes from an architecture sync:*
> 
> *[Type or paste into Claude]*:  
> **'Create a meeting in Product & Engineering called Weekly Architecture Sync with attendees Bhargav, Priya, and Alex. Record this key decision: Approved dual-engine SQLite and Supabase architecture. Then add an action for Priya to complete QA testing by Friday (Urgent priority), and an action for Alex to publish release documentation by Monday.'**
> 
> *"Notice Claude analyzing the prompt, choosing MeetingPilot's `create_meeting`, `record_meeting_decision`, and `add_action_item` tools, and executing the calls directly."*
> 
> **Step 3: Real-Time Sync & Human In The Loop (2:15 – 2:45)**  
> *"Now back in MeetingPilot—without manual re-entry—the meeting, the consensus decision in our Decision Register, and both action items are immediately live!*
> 
> *Notice our Say-Do Ratio metric: it accurately calculates our delivery velocity, and our overdue alert notifies us if any deadline is breached. 
> 
> And because software must serve humans, we can edit everything. Let's say Priya asks for extra time: I can click **Edit** right here, adjust her due date, or reassign it. Or with one click on the checkmark, mark Alex's release documentation as **Completed**.*
> 
> **Step 4: Claude Sees The Changes (2:45 – 3:00)**  
> *"Now I ask Claude: 'What is our current Say-Do ratio and action status?' Claude calls `get_team_analytics`, reads the updated database in real-time, and tells me Alex's item is already Done and our completion rate updated. Claude is the brain; MeetingPilot is the single source of truth."*

---

### Part 4: Why This Business Will Win (3:00 – 3:45)
**Visual:** Bulleted slide / camera.

> "Why will MeetingPilot win against bloated project management tools?
> 
> 1. **Zero Behavioral Friction:** Users don't need to learn a new tool or fill out 10 form fields. They talk naturally to Claude where they are already working.
> 2. **Meeting Decision Register:** We separate high-level agreed decisions from operational task tickets, so organizational rationale is never lost.
> 3. **The 'Bring Your Own AI' Architecture:** Because customers use their own Claude subscriptions, they keep full ownership of their data context and prompt privacy, while we avoid the catastrophic unit economics of running server-side LLMs."

---

### Part 5: The Economics & Margins (3:45 – 4:30)
**Visual:** Economics slide / visual breakdown.

> "Let's talk about the business model and unit economics:
> 
> **Revenue Model:** Subscription SaaS:
> - **Free Tier:** 1 workspace, up to 3 meetings per month.
> - **Solo:** ₹499/month ($6/mo).
> - **Team (up to 5 seats):** ₹1,499/month ($18/mo).
> - **Business (up to 20 seats):** ₹3,999/month ($48/mo).
> 
> **The Cost Advantage:**
> Most AI wrappers pay $0.05 to $0.20 per query in OpenAI/Anthropic API fees, crushing their gross margins down to 40% or worse. 
> 
> MeetingPilot pays **₹0 in AI inference costs**.
> Our only operating cost is hosting: a small container with persistent storage running at approximately ₹600 ($7) per month. 
> 
> At a modest initial cohort of **100 team customers on the ₹1,499 plan**:
> - **Gross Monthly Revenue:** ₹1,49,900 (~$1,800/mo)
> - **Hosting Cost:** ~₹600
> - **Payment Gateway Fees (2%):** ~₹3,000
> - **Net Monthly Margin:** Over **97.5% gross margin**.
> 
> This lean infrastructure allows us to stay profitable from customer number ten, offering an unbeatable price to small agencies, product teams, and startups."

---

### Part 6: Close (4:30 – 4:50)
**Visual:** Camera.

> "MeetingPilot demonstrates the true promise of the Model Context Protocol: letting frontier AI models provide the intelligence, while lightweight, focused web applications provide dependable, editable execution.
> 
> You can try MeetingPilot right now at `meetingpilot-app.web.app`, connect it to your Claude in 30 seconds via our live MCP endpoint, and see it in action.
> 
> Thank you!"

---

## 📋 Quick Cheat-Sheet for Recording
- [ ] Have the live deployed dashboard open: `https://meetingpilot-app.web.app`.
- [ ] Have Claude (claude.ai or Claude Desktop) open in an adjacent window.
- [ ] Test the connection once before recording (run a quick handshake test, then click "Seed demo data").
- [ ] Keep a stopwatch handy on your phone to stay right at the ~4:30 mark.
