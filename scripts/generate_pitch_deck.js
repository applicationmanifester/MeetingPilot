import pptxgen from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pres = new pptxgen();
pres.defineLayout({ name: 'WIDE16x9', width: 13.33, height: 7.5 });
pres.layout = 'WIDE16x9';

const S = pres.shapes;

// Brand Design Tokens
const C = {
  bg: '0B0F19',           // Ultra deep navy slate
  cardBg: '131B2E',       // Card background
  cardBorder: '24324D',   // Card border
  cardInner: '1A243B',    // Card inner section
  indigo: '6366F1',       // Primary brand indigo
  indigoLight: '818CF8',
  violet: '8B5CF6',       // Accent violet
  cyan: '38BDF8',         // Accent cyan / sky
  emerald: '34D399',      // Accent mint / green
  amber: 'FBBF24',        // Warning amber
  rose: 'F43F5E',         // Accent rose / red
  white: 'FFFFFF',        // Primary text
  slateLight: 'E2E8F0',   // Light slate
  slateMuted: '94A3B8',   // Muted description
  slateDark: '64748B',    // Dim text
};

const FONT_HEAD = 'Segoe UI';
const FONT_BODY = 'Segoe UI';

// Helper: Common Slide Setup
function addBaseSlide(category, title, slideNumber) {
  const slide = pres.addSlide();
  slide.background = { color: C.bg };

  // Subtle top accent bar
  slide.addShape(S.RECTANGLE, {
    x: 0, y: 0, w: 13.33, h: 0.08,
    fill: { color: C.indigo },
    line: { color: C.indigo, width: 0 }
  });

  // Top header bar
  // Category Pill
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: 0.8, y: 0.45, w: 2.2, h: 0.32,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
    rectRadius: 0.16
  });
  slide.addText(category.toUpperCase(), {
    x: 0.8, y: 0.45, w: 2.2, h: 0.32,
    fontSize: 9, fontFace: FONT_HEAD, bold: true, color: C.cyan,
    align: 'center', valign: 'middle'
  });

  // Top Right Brand Pill
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: 8.9, y: 0.45, w: 3.63, h: 0.32,
    fill: { color: '161E2E' },
    line: { color: '2E3B52', width: 1 },
    rectRadius: 0.16
  });
  slide.addText('⚡ ZERO AI INSIDE · CLAUDE MCP POWERED', {
    x: 8.9, y: 0.45, w: 3.63, h: 0.32,
    fontSize: 8.5, fontFace: FONT_HEAD, bold: true, color: C.emerald,
    align: 'center', valign: 'middle'
  });

  // Main Slide Title
  slide.addText(title, {
    x: 0.8, y: 0.88, w: 11.73, h: 0.65,
    fontSize: 22, fontFace: FONT_HEAD, bold: true, color: C.white,
    valign: 'middle'
  });

  // Footer separator & text
  slide.addShape(S.LINE, {
    x: 0.8, y: 6.95, w: 11.73, h: 0,
    line: { color: '1E293B', width: 1 }
  });

  slide.addText('MeetingPilot — Enterprise Meeting Action Management', {
    x: 0.8, y: 7.02, w: 7.0, h: 0.35,
    fontSize: 9, fontFace: FONT_BODY, color: C.slateDark, valign: 'middle'
  });

  slide.addText(`Slide ${slideNumber} of 10`, {
    x: 10.53, y: 7.02, w: 2.0, h: 0.35,
    fontSize: 9, fontFace: FONT_BODY, color: C.slateDark, align: 'right', valign: 'middle'
  });

  return slide;
}

// Helper: Card Container
function drawCard(slide, { x, y, w, h, bg = C.cardBg, border = C.cardBorder, accent = null }) {
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: bg },
    line: { color: border, width: 1 },
    rectRadius: 0.12
  });
  if (accent) {
    slide.addShape(S.ROUNDED_RECTANGLE, {
      x, y, w, h: 0.06,
      fill: { color: accent },
      line: { color: accent, width: 0 },
      rectRadius: 0.03
    });
  }
}

// ==============================================================================
// SLIDE 1: Title & Hero
// ==============================================================================
{
  const slide = pres.addSlide();
  slide.background = { color: C.bg };

  // Decorative top gradient line
  slide.addShape(S.RECTANGLE, {
    x: 0, y: 0, w: 13.33, h: 0.1,
    fill: { color: C.indigo },
    line: { color: C.indigo, width: 0 }
  });

  // Logo Badge Box
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: 0.8, y: 1.1, w: 0.9, h: 0.9,
    fill: { color: C.indigo },
    line: { color: C.indigoLight, width: 1.5 },
    rectRadius: 0.2
  });
  slide.addText('✈', {
    x: 0.8, y: 1.1, w: 0.9, h: 0.9,
    fontSize: 28, fontFace: FONT_HEAD, bold: true, color: C.white,
    align: 'center', valign: 'middle'
  });

  // App Title
  slide.addText('MeetingPilot', {
    x: 1.9, y: 1.1, w: 6.0, h: 0.5,
    fontSize: 34, fontFace: FONT_HEAD, bold: true, color: C.white,
    valign: 'middle'
  });
  slide.addText('ENTERPRISE MEETING ACTION MANAGEMENT', {
    x: 1.93, y: 1.62, w: 6.5, h: 0.32,
    fontSize: 11, fontFace: FONT_HEAD, bold: true, color: C.cyan,
    valign: 'middle'
  });

  // Hero Headline
  slide.addText([
    { text: 'Turn Meetings into Momentum.\n', options: { fontSize: 32, bold: true, color: C.white } },
    { text: 'Claude is the Brain. MeetingPilot is the Backbone. Zero AI Inside.', options: { fontSize: 16, color: C.slateLight, bold: false } }
  ], {
    x: 0.8, y: 2.3, w: 11.73, h: 1.4,
    fontFace: FONT_HEAD, valign: 'top'
  });

  // 3 Feature Value Props Cards
  const cards = [
    {
      title: 'Model Context Protocol (MCP)',
      desc: 'Native Streamable HTTP & SSE connector. Connects directly to Claude Desktop, claude.ai, and Claude Code with 15 specialized tools.',
      badge: 'OPEN PROTOCOL',
      accent: C.cyan
    },
    {
      title: 'Zero AI Inside Architecture',
      desc: 'Zero OpenAI/Anthropic API keys inside the code. ₹0 inference cost per query. 100% deterministic persistence without hallucination risk.',
      badge: '97.5% GROSS MARGIN',
      accent: C.emerald
    },
    {
      title: 'Dual-Engine Persistence',
      desc: 'Supabase Cloud PostgreSQL for enterprise multi-user scale, with automated SQLite WAL fallback for resilient offline execution.',
      badge: 'SUPABASE POSTGRES',
      accent: C.violet
    }
  ];

  cards.forEach((c, i) => {
    const x = 0.8 + i * 4.0;
    const y = 3.85;
    drawCard(slide, { x, y, w: 3.73, h: 2.2, accent: c.accent });

    // Badge
    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: x + 0.25, y: y + 0.25, w: 1.8, h: 0.25,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 0.8 },
      rectRadius: 0.08
    });
    slide.addText(c.badge, {
      x: x + 0.25, y: y + 0.25, w: 1.8, h: 0.25,
      fontSize: 8, fontFace: FONT_HEAD, bold: true, color: c.accent,
      align: 'center', valign: 'middle'
    });

    // Card Title & Desc
    slide.addText(c.title, {
      x: x + 0.25, y: y + 0.58, w: 3.23, h: 0.5,
      fontSize: 14, fontFace: FONT_HEAD, bold: true, color: C.white,
      valign: 'top'
    });
    slide.addText(c.desc, {
      x: x + 0.25, y: y + 1.12, w: 3.23, h: 0.95,
      fontSize: 10.5, fontFace: FONT_BODY, color: C.slateMuted,
      valign: 'top'
    });
  });

  // Presenter Footer Info
  slide.addShape(S.LINE, {
    x: 0.8, y: 6.4, w: 11.73, h: 0,
    line: { color: '1E293B', width: 1 }
  });

  slide.addText([
    { text: 'Presented by: ', options: { bold: false, color: C.slateMuted } },
    { text: 'Bhargav G K  ', options: { bold: true, color: C.white } },
    { text: '·  QA & Customer Support Analyst @ Infor  ·  PMP® Certified  ·  Bengaluru, India', options: { bold: false, color: C.slateDark } }
  ], {
    x: 0.8, y: 6.55, w: 8.5, h: 0.4,
    fontSize: 10, fontFace: FONT_BODY, valign: 'middle'
  });

  slide.addText('Live Demo: meetingpilot-app.web.app', {
    x: 9.3, y: 6.55, w: 3.23, h: 0.4,
    fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.cyan,
    align: 'right', valign: 'middle'
  });
}

// ==============================================================================
// SLIDE 2: About the Founder
// ==============================================================================
{
  const slide = addBaseSlide('Founder Profile', 'Who I Am — Background, Credentials & Track Record', 2);

  // Left Column: Professional Credentials Card
  const leftX = 0.8;
  const colY = 1.65;
  drawCard(slide, { x: leftX, y: colY, w: 5.6, h: 5.0, accent: C.indigo });

  slide.addText('Bhargav G K', {
    x: leftX + 0.35, y: colY + 0.3, w: 4.9, h: 0.45,
    fontSize: 22, fontFace: FONT_HEAD, bold: true, color: C.white
  });
  slide.addText('QA & Support Analyst @ Infor · Certified Project Management Professional (PMP®)', {
    x: leftX + 0.35, y: colY + 0.75, w: 4.9, h: 0.35,
    fontSize: 11, fontFace: FONT_BODY, bold: true, color: C.cyan
  });

  const bioBullets = [
    { bold: 'Enterprise Experience: ', text: 'Over 3 years specializing in enterprise ERP software, order-to-cash workflows, financial billing operations, and cross-functional quality assurance.' },
    { bold: 'Delivery Governance (PMP®): ', text: 'Deep expertise in stakeholder communication, risk mitigation, schedule baselines, and team accountability frameworks.' },
    { bold: 'Operational Insight: ', text: 'Observed firsthand how vital commitments agreed upon in executive syncs evaporate between messy notes, Slack channels, and forgotten ticket queues.' },
    { bold: 'Product Philosophy: ', text: 'Software should eliminate friction, not create it. AI is ideal for unstructured conversation, but deterministic databases must handle the records.' }
  ];

  let currentY = colY + 1.25;
  bioBullets.forEach(b => {
    slide.addShape(S.OVAL, {
      x: leftX + 0.35, y: currentY + 0.08, w: 0.08, h: 0.08,
      fill: { color: C.indigoLight }, line: { color: C.indigoLight, width: 0 }
    });
    slide.addText([
      { text: b.bold, options: { bold: true, color: C.slateLight } },
      { text: b.text, options: { bold: false, color: C.slateMuted } }
    ], {
      x: leftX + 0.55, y: currentY, w: 4.7, h: 0.75,
      fontSize: 10.5, fontFace: FONT_BODY, valign: 'top'
    });
    currentY += 0.85;
  });

  // Right Column: Proven Software Track Record
  const rightX = 6.8;
  drawCard(slide, { x: rightX, y: colY, w: 5.73, h: 5.0, accent: C.violet });

  slide.addText('Proven Builder Portfolio', {
    x: rightX + 0.35, y: colY + 0.3, w: 5.0, h: 0.45,
    fontSize: 18, fontFace: FONT_HEAD, bold: true, color: C.white
  });
  slide.addText('Practical, high-reliability applications built and deployed', {
    x: rightX + 0.35, y: colY + 0.75, w: 5.0, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.slateMuted
  });

  const portfolio = [
    {
      name: 'Billit — Automated Invoicing & Billing',
      badge: 'FINTECH SAAS',
      color: C.emerald,
      desc: 'End-to-end automated invoice generation and client billing pipeline. Streamlines recurring payment lifecycles and compliance reporting.'
    },
    {
      name: 'Aurafisky — High-Performance Weather PWA',
      badge: 'PROGRESSIVE WEB APP',
      color: C.cyan,
      desc: 'Meteorological dashboard featuring sub-second geolocation weather forecasting, interactive radar imagery, and resilient offline service worker caching.'
    },
    {
      name: 'Yogatik — Browser-First AI Companion & Agent',
      badge: 'ZERO-BACKEND AI',
      color: C.amber,
      desc: 'Privacy-first, browser-native AI companion and agent featuring 65 autonomous tools, real-time voice, vision, and client-side encrypted IndexedDB persistence.'
    }
  ];

  let portY = colY + 1.2;
  portfolio.forEach(p => {
    // Nested mini card
    drawCard(slide, { x: rightX + 0.35, y: portY, w: 5.03, h: 1.05, bg: C.cardInner, border: '2E3B52' });

    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: rightX + 0.5, y: portY + 0.12, w: 1.7, h: 0.22,
      fill: { color: '0F172A' }, line: { color: p.color, width: 0.8 }, rectRadius: 0.06
    });
    slide.addText(p.badge, {
      x: rightX + 0.5, y: portY + 0.12, w: 1.7, h: 0.22,
      fontSize: 7.5, fontFace: FONT_HEAD, bold: true, color: p.color,
      align: 'center', valign: 'middle'
    });

    slide.addText(p.name, {
      x: rightX + 2.3, y: portY + 0.1, w: 2.9, h: 0.26,
      fontSize: 11, fontFace: FONT_HEAD, bold: true, color: C.white, valign: 'middle'
    });
    slide.addText(p.desc, {
      x: rightX + 0.5, y: portY + 0.38, w: 4.7, h: 0.6,
      fontSize: 9.5, fontFace: FONT_BODY, color: C.slateMuted, valign: 'top'
    });
    portY += 1.2;
  });
}

// ==============================================================================
// SLIDE 3: The Problem
// ==============================================================================
{
  const slide = addBaseSlide('The Market Pain', 'The Meeting Accountability Gap — Why Commitments Slip', 3);

  const problems = [
    {
      num: '01',
      title: 'Post-Meeting Overhead Trap',
      subtitle: '15–20 minutes lost per meeting',
      badge: 'FRICTION OVERLOAD',
      color: C.rose,
      points: [
        'Teams spend 30-40% of their work week in syncs and planning calls.',
        'Nobody wants to spend 20 minutes manually creating Jira tickets, updating complex Asana boards, or drafting Slack recaps.',
        '70% of verbal commitments slip past due dates or lack assigned ownership entirely.'
      ]
    },
    {
      num: '02',
      title: 'Flaw of AI Note-Takers',
      subtitle: 'Passive summaries, zero execution',
      badge: 'INFORMATION DUMP',
      color: C.amber,
      points: [
        'Tools like Otter, Fireflies, and Teams Copilot generate 5-page AI transcripts that executives never read.',
        'Passive summaries do NOT equal accountability or operational follow-through.',
        'Decisions remain buried inside walls of text rather than logged in a dedicated register.'
      ]
    },
    {
      num: '03',
      title: 'The AI Wrapper Dilemma',
      subtitle: 'Hallucinations & crushing token bills',
      badge: 'UNSTABLE UNIT ECONOMICS',
      color: C.cyan,
      points: [
        'Startups wrapping OpenAI/Anthropic APIs burn $0.05–$0.20 per query, crushing gross margins to 30-40%.',
        'Direct LLM writes introduce hallucination risks into enterprise databases.',
        'Enterprises reject sharing confidential transcripts with unvetted third-party AI intermediaries.'
      ]
    }
  ];

  problems.forEach((p, i) => {
    const x = 0.8 + i * 4.0;
    const y = 1.65;
    drawCard(slide, { x, y, w: 3.73, h: 5.0, accent: p.color });

    // Number & Badge
    slide.addText(p.num, {
      x: x + 0.3, y: y + 0.25, w: 0.8, h: 0.5,
      fontSize: 28, fontFace: FONT_HEAD, bold: true, color: p.color
    });

    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: x + 1.2, y: y + 0.35, w: 2.2, h: 0.28,
      fill: { color: '1E293B' }, line: { color: '334155', width: 0.8 }, rectRadius: 0.08
    });
    slide.addText(p.badge, {
      x: x + 1.2, y: y + 0.35, w: 2.2, h: 0.28,
      fontSize: 8, fontFace: FONT_HEAD, bold: true, color: p.color,
      align: 'center', valign: 'middle'
    });

    slide.addText(p.title, {
      x: x + 0.3, y: y + 0.85, w: 3.13, h: 0.45,
      fontSize: 16, fontFace: FONT_HEAD, bold: true, color: C.white
    });
    slide.addText(p.subtitle, {
      x: x + 0.3, y: y + 1.3, w: 3.13, h: 0.3,
      fontSize: 11, fontFace: FONT_BODY, bold: true, color: C.slateLight
    });

    let ptY = y + 1.8;
    p.points.forEach(pt => {
      slide.addShape(S.OVAL, {
        x: x + 0.3, y: ptY + 0.08, w: 0.07, h: 0.07,
        fill: { color: p.color }, line: { color: p.color, width: 0 }
      });
      slide.addText(pt, {
        x: x + 0.45, y: ptY, w: 2.95, h: 0.9,
        fontSize: 10, fontFace: FONT_BODY, color: C.slateMuted, valign: 'top'
      });
      ptY += 0.98;
    });
  });
}

// ==============================================================================
// SLIDE 4: The Solution
// ==============================================================================
{
  const slide = addBaseSlide('The Solution', 'MeetingPilot — "AI Thinks. Software Persists. Humans Control."', 4);

  // Top Philosophy Banner
  drawCard(slide, { x: 0.8, y: 1.65, w: 11.73, h: 1.0, bg: C.cardInner, border: C.indigo, accent: C.indigo });
  slide.addText('CORE PRODUCT PHILOSOPHY', {
    x: 1.1, y: 1.75, w: 3.0, h: 0.25,
    fontSize: 9, fontFace: FONT_HEAD, bold: true, color: C.cyan
  });
  slide.addText('Separate the cognitive reasoning layer from the deterministic system of record.', {
    x: 1.1, y: 2.02, w: 11.0, h: 0.45,
    fontSize: 15, fontFace: FONT_HEAD, bold: true, color: C.white
  });

  // 3 Core Pillars
  const pillars = [
    {
      role: 'THE REASONING BRAIN',
      actor: 'Claude (External AI)',
      desc: 'Listens, analyzes unstructured conversation, disambiguates commitments, identifies owners, deadlines, and consensus decisions.',
      features: [
        'Operates via Model Context Protocol (MCP)',
        'Bridges voice/typed notes to structured schema',
        'Zero API token cost to MeetingPilot'
      ],
      color: C.violet
    },
    {
      role: 'THE PERSISTENCE BACKBONE',
      actor: 'MeetingPilot Server',
      desc: 'Deterministic system of record. Executes 15 validated MCP tools with zero hallucinations, sub-millisecond response, and an immutable audit trail.',
      features: [
        'Dual-Engine: Supabase Cloud PostgreSQL + SQLite WAL',
        'Decision Register separated from task tickets',
        'Say-Do Velocity ratio calculated automatically'
      ],
      color: C.indigoLight
    },
    {
      role: 'THE HUMAN OVERSIGHT',
      actor: 'Live Web Dashboard',
      desc: 'Humans retain complete agency. Team members review, reassign, adjust due dates, manage priorities, and mark tasks completed.',
      features: [
        'Real-time updates via Firebase Hosting',
        'Full inline editability & instant check-off',
        'Two-way sync: Claude instantly sees UI changes'
      ],
      color: C.emerald
    }
  ];

  pillars.forEach((p, i) => {
    const x = 0.8 + i * 4.0;
    const y = 2.85;
    drawCard(slide, { x, y, w: 3.73, h: 3.8, accent: p.color });

    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: x + 0.3, y: y + 0.3, w: 2.3, h: 0.26,
      fill: { color: '1E293B' }, line: { color: '334155', width: 0.8 }, rectRadius: 0.08
    });
    slide.addText(p.role, {
      x: x + 0.3, y: y + 0.3, w: 2.3, h: 0.26,
      fontSize: 8, fontFace: FONT_HEAD, bold: true, color: p.color,
      align: 'center', valign: 'middle'
    });

    slide.addText(p.actor, {
      x: x + 0.3, y: y + 0.7, w: 3.13, h: 0.4,
      fontSize: 16, fontFace: FONT_HEAD, bold: true, color: C.white
    });
    slide.addText(p.desc, {
      x: x + 0.3, y: y + 1.15, w: 3.13, h: 0.85,
      fontSize: 10, fontFace: FONT_BODY, color: C.slateMuted
    });

    slide.addShape(S.LINE, {
      x: x + 0.3, y: y + 2.1, w: 3.13, h: 0,
      line: { color: '24324D', width: 1 }
    });

    let ftY = y + 2.25;
    p.features.forEach(ft => {
      slide.addShape(S.OVAL, {
        x: x + 0.3, y: ftY + 0.06, w: 0.07, h: 0.07,
        fill: { color: p.color }, line: { color: p.color, width: 0 }
      });
      slide.addText(ft, {
        x: x + 0.45, y: ftY, w: 2.95, h: 0.45,
        fontSize: 9.5, fontFace: FONT_BODY, color: C.slateLight, valign: 'top'
      });
      ftY += 0.48;
    });
  });
}

// ==============================================================================
// SLIDE 5: Architecture
// ==============================================================================
{
  const slide = addBaseSlide('System Architecture', 'Zero AI Inside Architecture — Clean Separation of Concerns', 5);

  // Left Column: The 4-Tier Flow
  const tiers = [
    {
      level: 'TIER 1 · CLIENT LAYER',
      title: 'Claude Desktop / claude.ai / Claude Code',
      tech: 'Remote Custom MCP Connector · User Subscription Model',
      color: C.cyan
    },
    {
      level: 'TIER 2 · PROTOCOL TRANSPORT',
      title: 'Model Context Protocol (JSON-RPC 2.0)',
      tech: 'Streamable HTTP (POST /mcp) & Legacy SSE (GET /sse) · Bearer Auth',
      color: C.indigoLight
    },
    {
      level: 'TIER 3 · EXECUTION ENGINE',
      title: 'MeetingPilot Node.js Express Core',
      tech: '15 MCP Tools · Rate Limiting (120 req/min) · Security Headers · Audit Log',
      color: C.violet
    },
    {
      level: 'TIER 4 · DETERMINISTIC STORAGE',
      title: 'Dual-Engine: Supabase PostgreSQL + SQLite WAL',
      tech: 'Cloud Multi-User PostgreSQL + Automated Local SQLite Failover',
      color: C.emerald
    }
  ];

  let tierY = 1.65;
  tiers.forEach(t => {
    drawCard(slide, { x: 0.8, y: tierY, w: 7.2, h: 1.1, bg: C.cardInner, border: '24324D', accent: t.color });

    slide.addText(t.level, {
      x: 1.05, y: tierY + 0.15, w: 3.5, h: 0.22,
      fontSize: 8, fontFace: FONT_HEAD, bold: true, color: t.color
    });
    slide.addText(t.title, {
      x: 1.05, y: tierY + 0.38, w: 6.7, h: 0.32,
      fontSize: 13, fontFace: FONT_HEAD, bold: true, color: C.white
    });
    slide.addText(t.tech, {
      x: 1.05, y: tierY + 0.72, w: 6.7, h: 0.26,
      fontSize: 9.5, fontFace: FONT_BODY, color: C.slateMuted
    });

    tierY += 1.25;
  });

  // Right Column: Architectural Advantages
  const rightX = 8.3;
  drawCard(slide, { x: rightX, y: 1.65, w: 4.23, h: 4.85, accent: C.emerald });

  slide.addText('Why "Zero AI Inside" Wins', {
    x: rightX + 0.35, y: 1.95, w: 3.5, h: 0.4,
    fontSize: 18, fontFace: FONT_HEAD, bold: true, color: C.white
  });
  slide.addText('Architectural and economic defensibility', {
    x: rightX + 0.35, y: 2.35, w: 3.5, h: 0.25,
    fontSize: 10, fontFace: FONT_BODY, color: C.slateMuted
  });

  const advs = [
    { title: '₹0 Inference Cost', desc: 'No OpenAI or Anthropic API bills. Customers bring their own Claude subscriptions, resulting in 97.5%+ gross margins.' },
    { title: 'Zero Hallucination Risk', desc: 'The database is 100% deterministic SQL. What is stored is exactly what was agreed upon, verified by strict schemas.' },
    { title: 'Enterprise Privacy Compliance', desc: 'Customer meeting transcripts never touch third-party middleman servers. Only authorized MCP tool payloads are exchanged.' },
    { title: 'Sub-Millisecond Query Speed', desc: 'Direct SQL indexing enables instant dashboard rendering and Say-Do ratio calculations without LLM latency.' }
  ];

  let advY = 2.75;
  advs.forEach(a => {
    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: rightX + 0.35, y: advY, w: 3.53, h: 0.9,
      fill: { color: '0F172A' }, line: { color: '24324D', width: 0.8 }, rectRadius: 0.08
    });
    slide.addText(a.title, {
      x: rightX + 0.5, y: advY + 0.08, w: 3.2, h: 0.28,
      fontSize: 11, fontFace: FONT_HEAD, bold: true, color: C.emerald
    });
    slide.addText(a.desc, {
      x: rightX + 0.5, y: advY + 0.36, w: 3.23, h: 0.5,
      fontSize: 9, fontFace: FONT_BODY, color: C.slateMuted, valign: 'top'
    });
    advY += 1.0;
  });
}

// ==============================================================================
// SLIDE 6: Enterprise Capabilities & MCP Tools
// ==============================================================================
{
  const slide = addBaseSlide('Product Capabilities', '15 Standardized MCP Tools & Enterprise Features', 6);

  const toolCategories = [
    {
      title: 'Meeting Lifecycle',
      badge: '5 TOOLS',
      color: C.cyan,
      tools: [
        'create_meeting: Initialize sync with attendees & tags',
        'list_meetings: Query past syncs & search by keyword',
        'get_meeting: Full agenda, decisions & linked tasks',
        'update_meeting: Modify title, date, or participants',
        'delete_meeting: Safe deletion with audit log'
      ]
    },
    {
      title: 'Commitment Management',
      badge: '4 TOOLS',
      color: C.indigoLight,
      tools: [
        'add_action_item: Assign owner, due date, priority',
        'list_action_items: Filter by status, owner, overdue',
        'update_action_item: Change deadline, progress, status',
        'delete_action_item: Remove cancelled commitments'
      ]
    },
    {
      title: 'Executive Decision Register',
      badge: '2 TOOLS',
      color: C.violet,
      tools: [
        'record_meeting_decision: Log strategic consensus',
        'list_meeting_decisions: Search organizational rationale',
        'Decisions preserved independently of task tickets',
        'Prevents relitigating resolved architecture debates'
      ]
    },
    {
      title: 'Velocity & Governance',
      badge: '4 TOOLS',
      color: C.emerald,
      tools: [
        'get_dashboard_summary: Realtime team velocity',
        'get_team_analytics: Owner-by-owner Say-Do ratio',
        'create_spend_approval: Track meeting financial impact',
        'approve_action: Governance sign-off workflows'
      ]
    }
  ];

  toolCategories.forEach((tc, i) => {
    const x = 0.8 + (i % 2) * 6.0;
    const y = 1.65 + Math.floor(i / 2) * 2.5;
    drawCard(slide, { x, y, w: 5.73, h: 2.3, accent: tc.color });

    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: x + 0.3, y: y + 0.25, w: 1.4, h: 0.25,
      fill: { color: '1E293B' }, line: { color: '334155', width: 0.8 }, rectRadius: 0.08
    });
    slide.addText(tc.badge, {
      x: x + 0.3, y: y + 0.25, w: 1.4, h: 0.25,
      fontSize: 8, fontFace: FONT_HEAD, bold: true, color: tc.color,
      align: 'center', valign: 'middle'
    });

    slide.addText(tc.title, {
      x: x + 1.85, y: y + 0.22, w: 3.5, h: 0.32,
      fontSize: 14, fontFace: FONT_HEAD, bold: true, color: C.white
    });

    let tY = y + 0.65;
    tc.tools.forEach(t => {
      slide.addShape(S.OVAL, {
        x: x + 0.3, y: tY + 0.06, w: 0.06, h: 0.06,
        fill: { color: tc.color }, line: { color: tc.color, width: 0 }
      });
      slide.addText(t, {
        x: x + 0.45, y: tY, w: 5.0, h: 0.34,
        fontSize: 9.5, fontFace: FONT_BODY, color: C.slateLight, valign: 'top'
      });
      tY += 0.38;
    });
  });
}

// ==============================================================================
// SLIDE 7: Live Demo Walkthrough
// ==============================================================================
{
  const slide = addBaseSlide('Live Demo', 'Interactive Demo Flow — Tested and Verified with Claude', 7);

  const demoSteps = [
    {
      step: 'STEP 1',
      action: 'Live Handshake',
      actor: 'MeetingPilot UI',
      desc: 'Dashboard connects to live MCP endpoint. Verifies round-trip latency, Supabase PostgreSQL connection, and 15 tools.',
      color: C.cyan
    },
    {
      step: 'STEP 2',
      action: 'Conversational Input',
      actor: 'Claude Prompt',
      desc: 'User gives Claude raw notes: "Create Architecture Sync with Bhargav, Priya, Alex. Record approved SQLite+Supabase decision. Add urgent QA task for Priya."',
      color: C.indigoLight
    },
    {
      step: 'STEP 3',
      action: 'Autonomous MCP Calls',
      actor: 'Claude Reasoning',
      desc: 'Claude selects create_meeting, record_meeting_decision, and add_action_item. Validates arguments and executes sequentially.',
      color: C.violet
    },
    {
      step: 'STEP 4',
      action: 'Instant UI Reflection',
      actor: 'Human Control',
      desc: 'Meeting and tasks appear immediately on web dashboard. Human marks Alex’s task as Completed and edits Priya’s deadline.',
      color: C.emerald
    },
    {
      step: 'STEP 5',
      action: 'Closed-Loop Intelligence',
      actor: 'Claude Analytics',
      desc: 'User asks Claude: "What is our updated status?" Claude calls get_dashboard_summary and reports real-time 50% completion rate.',
      color: C.amber
    }
  ];

  demoSteps.forEach((s, i) => {
    const x = 0.8 + i * 2.4;
    const y = 1.65;
    drawCard(slide, { x, y, w: 2.2, h: 5.0, accent: s.color });

    slide.addText(s.step, {
      x: x + 0.2, y: y + 0.25, w: 1.8, h: 0.3,
      fontSize: 12, fontFace: FONT_HEAD, bold: true, color: s.color
    });
    slide.addText(s.action, {
      x: x + 0.2, y: y + 0.6, w: 1.8, h: 0.65,
      fontSize: 14, fontFace: FONT_HEAD, bold: true, color: C.white
    });

    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: x + 0.2, y: y + 1.35, w: 1.8, h: 0.24,
      fill: { color: '1E293B' }, line: { color: '334155', width: 0.8 }, rectRadius: 0.06
    });
    slide.addText(s.actor.toUpperCase(), {
      x: x + 0.2, y: y + 1.35, w: 1.8, h: 0.24,
      fontSize: 7.5, fontFace: FONT_HEAD, bold: true, color: s.color,
      align: 'center', valign: 'middle'
    });

    slide.addText(s.desc, {
      x: x + 0.2, y: y + 1.75, w: 1.8, h: 3.0,
      fontSize: 9.5, fontFace: FONT_BODY, color: C.slateMuted, valign: 'top'
    });
  });
}

// ==============================================================================
// SLIDE 8: Business Model & Economics
// ==============================================================================
{
  const slide = addBaseSlide('Business & Economics', 'SaaS Pricing & The 97.5% Gross Margin Advantage', 8);

  // Left Column: Pricing Tiers
  const tiers = [
    { name: 'Free', price: '₹0', seats: '1 workspace', limit: '3 meetings/mo', color: C.slateLight },
    { name: 'Solo', price: '₹499/mo ($6)', seats: '1 seat', limit: 'Unlimited syncs', color: C.cyan },
    { name: 'Team', price: '₹1,499/mo ($18)', seats: 'Up to 5 seats', limit: 'Full MCP connectors', color: C.indigoLight },
    { name: 'Business', price: '₹3,999/mo ($48)', seats: 'Up to 20 seats', limit: 'Audit log & approvals', color: C.emerald }
  ];

  tiers.forEach((t, i) => {
    const x = 0.8 + i * 1.7;
    const y = 1.65;
    drawCard(slide, { x, y, w: 1.55, h: 2.3, bg: C.cardInner, accent: t.color });

    slide.addText(t.name, {
      x: x + 0.15, y: y + 0.2, w: 1.25, h: 0.3,
      fontSize: 12, fontFace: FONT_HEAD, bold: true, color: t.color, align: 'center'
    });
    slide.addText(t.price, {
      x: x + 0.1, y: y + 0.55, w: 1.35, h: 0.45,
      fontSize: 12, fontFace: FONT_HEAD, bold: true, color: C.white, align: 'center'
    });
    slide.addText(t.seats, {
      x: x + 0.1, y: y + 1.15, w: 1.35, h: 0.3,
      fontSize: 9.5, fontFace: FONT_BODY, color: C.slateLight, align: 'center'
    });
    slide.addText(t.limit, {
      x: x + 0.1, y: y + 1.45, w: 1.35, h: 0.6,
      fontSize: 9, fontFace: FONT_BODY, color: C.slateMuted, align: 'center'
    });
  });

  // Right Column: Economics Comparison Card
  const rightX = 7.8;
  drawCard(slide, { x: rightX, y: 1.65, w: 4.73, h: 5.0, accent: C.emerald });

  slide.addText('Unit Economics (100 Team Customers)', {
    x: rightX + 0.35, y: 1.95, w: 4.0, h: 0.35,
    fontSize: 16, fontFace: FONT_HEAD, bold: true, color: C.white
  });
  slide.addText('Monthly projection for ₹1,499/mo Team tier cohort', {
    x: rightX + 0.35, y: 2.3, w: 4.0, h: 0.25,
    fontSize: 10, fontFace: FONT_BODY, color: C.slateMuted
  });

  // Financial Table
  const financials = [
    { item: 'Gross Monthly Revenue (100 × ₹1,499)', val: '₹1,49,900', color: C.white },
    { item: 'AI Inference Costs (Customer BYO-AI)', val: '₹0', color: C.emerald },
    { item: 'Hosting & Supabase Cloud DB', val: '– ₹600', color: C.slateLight },
    { item: 'Payment Gateway Fees (2%)', val: '– ₹3,000', color: C.slateLight },
    { item: 'Net Operating Margin', val: '₹1,46,300', color: C.cyan }
  ];

  let finY = 2.75;
  financials.forEach((f, idx) => {
    const isTotal = idx === financials.length - 1;
    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: rightX + 0.35, y: finY, w: 4.03, h: 0.48,
      fill: { color: isTotal ? '1E293B' : '0F172A' },
      line: { color: isTotal ? C.cyan : '24324D', width: isTotal ? 1.2 : 0.8 },
      rectRadius: 0.06
    });
    slide.addText(f.item, {
      x: rightX + 0.5, y: finY + 0.08, w: 2.6, h: 0.32,
      fontSize: 9.5, fontFace: FONT_BODY, bold: isTotal, color: isTotal ? C.white : C.slateLight
    });
    slide.addText(f.val, {
      x: rightX + 3.1, y: finY + 0.08, w: 1.15, h: 0.32,
      fontSize: 10.5, fontFace: FONT_HEAD, bold: true, color: f.color, align: 'right'
    });
    finY += 0.55;
  });

  // Big Margin Callout Card
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x: rightX + 0.35, y: 5.6, w: 4.03, h: 0.8,
    fill: { color: '064E3B' }, line: { color: C.emerald, width: 1 }, rectRadius: 0.08
  });
  slide.addText('97.5%+ GROSS MARGIN', {
    x: rightX + 0.5, y: 5.7, w: 3.73, h: 0.35,
    fontSize: 16, fontFace: FONT_HEAD, bold: true, color: C.emerald, align: 'center'
  });
  slide.addText('Profitable from customer #10 · Zero API model bills', {
    x: rightX + 0.5, y: 6.05, w: 3.73, h: 0.25,
    fontSize: 9, fontFace: FONT_BODY, color: C.white, align: 'center'
  });

  // Bottom Comparison Note (Traditional vs MeetingPilot)
  drawCard(slide, { x: 0.8, y: 4.15, w: 6.7, h: 2.5, bg: C.cardInner, accent: C.rose });
  slide.addText('Traditional AI Wrappers vs MeetingPilot', {
    x: 1.05, y: 4.35, w: 6.2, h: 0.32,
    fontSize: 13, fontFace: FONT_HEAD, bold: true, color: C.white
  });

  const compBullets = [
    { label: 'Traditional AI Wrapper: ', text: 'Pays $0.05–$0.20 per query in server LLM tokens. Gross margins get crushed to 35-50% as usage grows.' },
    { label: 'MeetingPilot Advantage: ', text: 'Customers connect their existing Claude plan via standard MCP. Our marginal cost per meeting is near zero.' },
    { label: 'Pricing Power: ', text: 'We offer unbeatable pricing to small agencies and fast teams while retaining software-grade SaaS cash flow.' }
  ];

  let cY = 4.8;
  compBullets.forEach(b => {
    slide.addShape(S.OVAL, {
      x: 1.05, y: cY + 0.06, w: 0.07, h: 0.07,
      fill: { color: C.cyan }, line: { color: C.cyan, width: 0 }
    });
    slide.addText([
      { text: b.label, options: { bold: true, color: C.slateLight } },
      { text: b.text, options: { bold: false, color: C.slateMuted } }
    ], {
      x: 1.25, y: cY, w: 5.9, h: 0.45,
      fontSize: 9.5, fontFace: FONT_BODY, valign: 'top'
    });
    cY += 0.52;
  });
}

// ==============================================================================
// SLIDE 9: Why We Win
// ==============================================================================
{
  const slide = addBaseSlide('Competitive Moat', 'Why MeetingPilot Will Win — 4 Unfair Advantages', 9);

  const moats = [
    {
      num: '01',
      title: 'Zero Behavioral Friction',
      subtitle: 'Native to user workflow',
      badge: 'CONVERSATIONAL UX',
      color: C.cyan,
      desc: 'Users don’t need to open Jira, fill out 10 fields, or learn a complex new UI. They speak or type naturally to Claude where they already do their thinking.'
    },
    {
      num: '02',
      title: 'First-Class Decision Register',
      subtitle: 'Preserving rationale',
      badge: 'ORGANIZATIONAL MEMORY',
      color: C.indigoLight,
      desc: 'Most tools conflate action items with agreed decisions. MeetingPilot separates the Decision Register so strategic agreements are never re-litigated.'
    },
    {
      num: '03',
      title: 'BYO-AI Data Privacy',
      subtitle: 'Enterprise-grade trust',
      badge: 'GDPR / SOC2 READY',
      color: C.emerald,
      desc: 'Enterprises retain full ownership of their prompt context and Claude security boundaries. No company secrets transit middleman AI wrappers.'
    },
    {
      num: '04',
      title: 'Dual-Engine Determinism',
      subtitle: 'PostgreSQL + SQLite WAL',
      badge: 'ZERO HALLUCINATION',
      color: C.amber,
      desc: 'Database is 100% deterministic. Sub-millisecond queries, automated offline SQLite resilience, and transparent audit logging for every single change.'
    }
  ];

  moats.forEach((m, i) => {
    const x = 0.8 + i * 2.95;
    const y = 1.65;
    drawCard(slide, { x, y, w: 2.8, h: 5.0, accent: m.color });

    slide.addText(m.num, {
      x: x + 0.25, y: y + 0.25, w: 0.8, h: 0.4,
      fontSize: 26, fontFace: FONT_HEAD, bold: true, color: m.color
    });

    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: x + 0.25, y: y + 0.75, w: 2.3, h: 0.25,
      fill: { color: '1E293B' }, line: { color: '334155', width: 0.8 }, rectRadius: 0.06
    });
    slide.addText(m.badge, {
      x: x + 0.25, y: y + 0.75, w: 2.3, h: 0.25,
      fontSize: 7.5, fontFace: FONT_HEAD, bold: true, color: m.color,
      align: 'center', valign: 'middle'
    });

    slide.addText(m.title, {
      x: x + 0.25, y: y + 1.15, w: 2.3, h: 0.65,
      fontSize: 15, fontFace: FONT_HEAD, bold: true, color: C.white
    });
    slide.addText(m.subtitle, {
      x: x + 0.25, y: y + 1.8, w: 2.3, h: 0.3,
      fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.slateLight
    });

    slide.addShape(S.LINE, {
      x: x + 0.25, y: y + 2.25, w: 2.3, h: 0,
      line: { color: '24324D', width: 1 }
    });

    slide.addText(m.desc, {
      x: x + 0.25, y: y + 2.45, w: 2.3, h: 2.3,
      fontSize: 10, fontFace: FONT_BODY, color: C.slateMuted, valign: 'top'
    });
  });
}

// ==============================================================================
// SLIDE 10: Conclusion & Live Verification
// ==============================================================================
{
  const slide = addBaseSlide('Summary & Live Links', 'MeetingPilot — Verification Checklist & Live Artifacts', 10);

  // Left Column: Live Verification Artifacts
  const leftX = 0.8;
  drawCard(slide, { x: leftX, y: 1.65, w: 6.6, h: 5.0, accent: C.emerald });

  slide.addText('Live Production Artifacts', {
    x: leftX + 0.35, y: 1.95, w: 5.9, h: 0.35,
    fontSize: 18, fontFace: FONT_HEAD, bold: true, color: C.white
  });
  slide.addText('All components live, verified, and operating over public internet', {
    x: leftX + 0.35, y: 2.3, w: 5.9, h: 0.25,
    fontSize: 10, fontFace: FONT_BODY, color: C.slateMuted
  });

  const links = [
    {
      title: 'Live Web Dashboard',
      url: 'https://meetingpilot-app.web.app',
      note: 'Deployed on Firebase Hosting with real-time status & Say-Do tracking.',
      color: C.cyan
    },
    {
      title: 'Live Remote MCP Endpoint',
      url: 'https://yourself-fascinating-detection-began.trycloudflare.com/mcp',
      note: 'Streamable HTTP / SSE connector verified with Claude Desktop & claude.ai.',
      color: C.emerald
    },
    {
      title: 'Open Source GitHub Repository',
      url: 'https://github.com/applicationmanifester/MeetingPilot',
      note: 'Branch main up to date with full Express server, schema, and MCP handlers.',
      color: C.violet
    },
    {
      title: 'Cloud Database',
      url: 'Supabase PostgreSQL (magysstkgdiyqvmfbjjc)',
      note: 'Dual-engine persistence with automated SQLite fallback.',
      color: C.amber
    }
  ];

  let lY = 2.75;
  links.forEach(l => {
    slide.addShape(S.ROUNDED_RECTANGLE, {
      x: leftX + 0.35, y: lY, w: 5.9, h: 0.88,
      fill: { color: '0F172A' }, line: { color: '24324D', width: 0.8 }, rectRadius: 0.08
    });
    slide.addText(l.title, {
      x: leftX + 0.5, y: lY + 0.08, w: 2.5, h: 0.25,
      fontSize: 10.5, fontFace: FONT_HEAD, bold: true, color: l.color
    });
    slide.addText(l.url, {
      x: leftX + 0.5, y: lY + 0.34, w: 5.6, h: 0.24,
      fontSize: 9, fontFace: FONT_BODY, bold: true, color: C.white
    });
    slide.addText(l.note, {
      x: leftX + 0.5, y: lY + 0.58, w: 5.6, h: 0.22,
      fontSize: 8.5, fontFace: FONT_BODY, color: C.slateMuted
    });
    lY += 0.98;
  });

  // Right Column: Conclusion & Contact
  const rightX = 7.8;
  drawCard(slide, { x: rightX, y: 1.65, w: 4.73, h: 5.0, accent: C.indigo });

  slide.addText('The MCP Vision Realized', {
    x: rightX + 0.35, y: 1.95, w: 4.0, h: 0.35,
    fontSize: 18, fontFace: FONT_HEAD, bold: true, color: C.white
  });

  slide.addText([
    { text: '"The Model Context Protocol allows AI to do what it does best—think, converse, and reason—while dedicated software handles what it does best: fast, dependable, deterministic execution."\n\n', options: { italic: true, color: C.slateLight, fontSize: 11 } },
    { text: 'MeetingPilot proves this paradigm: zero AI code inside, yet 100% conversational intelligence for enterprise meeting follow-through.', options: { color: C.slateMuted, fontSize: 10.5 } }
  ], {
    x: rightX + 0.35, y: 2.45, w: 4.03, h: 1.8,
    fontFace: FONT_BODY, valign: 'top'
  });

  slide.addShape(S.LINE, {
    x: rightX + 0.35, y: 4.5, w: 4.03, h: 0,
    line: { color: '24324D', width: 1 }
  });

  slide.addText('Founder Contact', {
    x: rightX + 0.35, y: 4.7, w: 4.0, h: 0.3,
    fontSize: 13, fontFace: FONT_HEAD, bold: true, color: C.white
  });
  slide.addText([
    { text: 'Bhargav G K  ', options: { bold: true, color: C.cyan } },
    { text: '(PMP®)\n', options: { bold: false, color: C.slateLight } },
    { text: 'QA & Customer Support Analyst @ Infor\n', options: { color: C.slateMuted } },
    { text: 'Bengaluru, Karnataka, India\n', options: { color: C.slateDark } },
    { text: 'GitHub: applicationmanifester', options: { color: C.indigoLight, bold: true } }
  ], {
    x: rightX + 0.35, y: 5.05, w: 4.03, h: 1.4,
    fontSize: 10, fontFace: FONT_BODY, valign: 'top'
  });
}

// Write the PowerPoint file
const outputPath = path.join(__dirname, '..', 'MeetingPilot_Pitch_Deck.pptx');
await pres.writeFile({ fileName: outputPath });
console.log('Successfully generated pitch deck at:', outputPath);
