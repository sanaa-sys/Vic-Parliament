// server/index.js
// Node.js + Express API server for the Victorian Constituent Platform
//
// Endpoints:
//   POST /api/generate-email   — calls Groq AI (llama-3.1-8b-instant) to draft an email
//   GET  /api/health           — health check
//
// Run:
//   npm install
//   npm run dev

import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────

app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
}));

// ── Groq config ────────────────────────────────────────────────────────────

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.1-8b-instant';

const TOPIC_LABELS = {
  islamophobia:  'Islamophobia and anti-Muslim hate in Australia',
  international: 'international affairs and human rights',
  climate:       'climate change and the environment',
  housing:       'housing affordability',
  health:        'healthcare and hospitals',
  transport:     'public transport',
  education:     'education and schools',
  cost:          'cost of living',
  other:         'a matter of local concern',
};

// ── Helper: map role string to formal salutation ───────────────────────────
//
// The primary recipient is always addressed by their role, not their name.
// e.g. "Dear Minister," / "Dear Senator," / "Dear Member,"

function roleToSalutation(role) {
  if (!role) return 'Dear Member,';
  const r = role.toLowerCase();
  if (r.includes('senator'))               return 'Dear Senator,';
  if (r.includes('minister'))              return 'Dear Minister,';
  if (r.includes('premier'))               return 'Dear Premier,';
  if (r.includes('attorney'))              return 'Dear Attorney-General,';
  if (r.includes('treasurer'))             return 'Dear Treasurer,';
  if (r.includes('federal representative')
   || r.includes('house of representatives')
   || r.includes('house representative')) return 'Dear Member of Parliament,';
  if (r.includes('assembly'))              return 'Dear Member of the Legislative Assembly,';
  if (r.includes('council'))               return 'Dear Member of the Legislative Council,';
  return 'Dear Member,';
}

// ── Helper: build the AI prompt ────────────────────────────────────────────

function buildPrompt({ topic, customTopic, electorate, primaryRole, recipients }) {
  const topicLabel     = (topic === 'other' && customTopic?.trim())
    ? customTopic.trim()
    : (TOPIC_LABELS[topic] || topic);
  const salutation     = roleToSalutation(primaryRole);
  const recipientLines = (recipients || [])
    .map(r => `- ${r.name} (${r.role}, ${r.party})`)
    .join('\n') || '(none selected)';

  return `You are helping an Australian constituent write a formal email to their elected representatives about ${topicLabel}.

The primary recipient holds the role of ${primaryRole} for the electorate of ${electorate}.

All recipients:
${recipientLines}

Write a formal, respectful constituent email on the topic of ${topicLabel}. The email should:
- Open with exactly "${salutation}" on its own line — address by role, NOT by name
- Be 3-4 paragraphs, roughly 200-250 words
- Be specific to Victoria and Australia
- Include 2-3 clear, actionable requests relevant to the topic
- Be sincere and personal in tone, not preachy
- Close with "Yours sincerely,\\nA constituent in ${electorate}"

Respond with ONLY a JSON object in this exact format:
{"subject": "the subject line here", "body": "the full email body here with \\n for newlines"}`;
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    model:     GROQ_MODEL,
    groq:      !!process.env.GROQ_API_KEY,
  });
});

/**
 * POST /api/generate-email
 *
 * Request body:
 *   {
 *     topic:       string,              // e.g. "islamophobia"
 *     electorate:  string,              // e.g. "Melbourne"
 *     primaryRole: string,              // e.g. "Federal Representative"
 *     recipients:  [{ name, role, party }]
 *   }
 *
 * Response:
 *   { subject: string, body: string }
 *
 * Errors:
 *   400 — missing/invalid fields
 *   500 — Groq API failure or JSON parse error
 *   503 — GROQ_API_KEY not configured
 */
app.post('/api/generate-email', async (req, res) => {

  // 1. Check API key
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not set. Add it to server/.env',
    });
  }

  // 2. Validate request body
  const { topic, customTopic, electorate, primaryRole, recipients } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Missing required field: topic' });
  }
  if (topic === 'other' && !customTopic?.trim()) {
    return res.status(400).json({ error: 'Missing required field: customTopic' });
  }
  if (!electorate) {
    return res.status(400).json({ error: 'Missing required field: electorate' });
  }
  if (!primaryRole) {
    return res.status(400).json({ error: 'Missing required field: primaryRole' });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients must be a non-empty array' });
  }

  // 3. Call Groq
  const prompt = buildPrompt({ topic, customTopic, electorate, primaryRole, recipients });

  let groqRes;
  try {
    groqRes = await fetch(GROQ_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:           GROQ_MODEL,
        temperature:     0.7,
        max_tokens:      1024,
        response_format: { type: 'json_object' },
        messages: [
          {
            role:    'system',
            content: 'You write formal Australian constituent emails. Always address recipients by role, never by name. Return valid JSON only — no markdown: {"subject":"...","body":"..."}',
          },
          {
            role:    'user',
            content: prompt,
          },
        ],
      }),
    });
  } catch (err) {
    console.error('Groq fetch error:', err.message);
    return res.status(500).json({
      error: 'Could not reach Groq API. Check your internet connection.',
    });
  }

  // 4. Handle HTTP errors
  if (!groqRes.ok) {
    const errBody = await groqRes.json().catch(() => ({}));
    const errMsg  = errBody?.error?.message || `HTTP ${groqRes.status}`;
    console.error('Groq API error:', groqRes.status, errMsg);
    if (groqRes.status === 401) {
      return res.status(500).json({ error: 'Invalid Groq API key. Check GROQ_API_KEY in server/.env' });
    }
    if (groqRes.status === 429) {
      return res.status(500).json({ error: 'Groq rate limit reached. Please try again in a moment.' });
    }
    return res.status(500).json({ error: `Groq API error: ${errMsg}` });
  }

  // 5. Parse response
  let data;
  try {
    data = await groqRes.json();
  } catch {
    return res.status(500).json({ error: 'Could not parse Groq response' });
  }

  const raw   = data?.choices?.[0]?.message?.content || '';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.error('JSON parse failed. Raw Groq response:', raw);
    return res.status(500).json({ error: 'Groq returned invalid JSON' });
  }

  if (!parsed.subject || !parsed.body) {
    return res.status(500).json({ error: 'Groq response missing subject or body fields' });
  }

  // 6. Return email — API key never reaches the client
  return res.json({
    subject: parsed.subject,
    body:    parsed.body,
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n✓  Vic Parliament API  →  http://localhost:${PORT}`);
  console.log(`   Model:    ${GROQ_MODEL}`);
  console.log(`   Groq key: ${process.env.GROQ_API_KEY ? '✓ set' : '✗ NOT SET — add GROQ_API_KEY to server/.env'}`);
  console.log(`   Origin:   ${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}\n`);
});
