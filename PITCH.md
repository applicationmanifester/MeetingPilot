# MeetingPilot — 5-minute pitch video script

## 0:00–0:35 — Who I am
Hi, I'm Bhargav G K, a QA and customer-support analyst at Infor in Bengaluru with 3+ years in ERP order-to-cash and billing, and a PMP. I build practical web apps on the side: Billit (invoicing), Aurafisky (weather PWA) and Inaviato (live flight tracker). I chose a problem I understand: meetings create commitments, but those commitments often get lost between notes, chat and task trackers.

## 0:35–1:15 — The problem and product
Meetings are only useful when decisions turn into action. Teams need a reliable record of what was agreed, who owns each next step and when it is due. MeetingPilot is a focused action-management workspace. The user talks to Claude; MeetingPilot stores and manages the resulting work.

## 1:15–2:55 — Live demo
[Open the deployed MeetingPilot dashboard.]
This is the live workspace. It shows meetings, action items, owners, priorities, due dates and statuses.

[Switch to Claude with the MeetingPilot connector enabled.]
I'll ask Claude: “Capture a meeting called Weekly Product Sync. Add an action for Priya to send the release plan by Friday, high priority, and an action for Alex to confirm QA sign-off by Monday.”

[Wait for Claude to call create_meeting and add_action_item.]
Claude has interpreted the request and called MeetingPilot's MCP tools. Now I'll return to the dashboard and show the saved records.

[Edit Priya's due date or owner in the dashboard.]
The user can also edit the record directly in MeetingPilot. Now I'll ask Claude: “Mark Alex's QA sign-off action as Done.”

[Show update_action_item tool call and refresh dashboard.]
The status has changed in the same stored record. This is the core loop: Claude understands; MeetingPilot reliably saves and manages.

## 2:55–3:35 — Why this wins
We are not trying to build another giant project-management suite. We focus on one recurring pain: meeting follow-through. The product is simple to understand, quick to adopt and works through a tool people already use. MCP makes the workflow conversational without embedding an AI model in our product.

## 3:35–4:20 — Economics
The business model is subscription SaaS. The initial pricing hypothesis is ₹499 per month for an individual, ₹1,499 for a small team and ₹3,999 for a larger team. At 100 team customers on the ₹1,499 plan, that is ₹1,49,900 in monthly recurring revenue before hosting, support, payment fees and taxes. Cost side: there is no per-request AI cost, because each customer's own Claude does the thinking. My only costs are one small web instance with a disk, plus payment fees. [CONFIRM CURRENT HOSTING PRICE BEFORE QUOTING A MARGIN.] These are targets to validate, not current revenue or proven conversion rates. The initial customer segment is small product teams, agencies and founder-led businesses.

## 4:20–4:50 — Close
MeetingPilot turns meeting talk into owned, trackable work. It demonstrates the new division of labour: Claude provides intelligence, and focused software provides dependable execution and persistence. Thank you.

## Recording checklist
- Replace every [BRACKETED] item with true information.
- Show the real deployed app and real Claude connector/tool calls.
- Do not fake MCP calls or claim customers/revenue you do not have.
- Keep the final video under five minutes.
