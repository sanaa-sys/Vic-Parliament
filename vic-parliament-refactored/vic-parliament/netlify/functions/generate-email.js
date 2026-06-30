// netlify/functions/generate-email.js
//
// Netlify Function that replaces the Express POST /api/generate-email endpoint.
// The client calls /api/generate-email → Netlify redirects to this function.
// CORS headers are not needed — function and client share the same origin.
//
// Environment variable required (set in Netlify UI → Site configuration → Env vars):
//   GROQ_API_KEY   your Groq API key (get one free at console.groq.com)

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

// ── Helpers ────────────────────────────────────────────────────────────────

function roleToSalutation(role) {
  if (!role) return 'Dear Member,';
  const r = role.toLowerCase();
  if (r.includes('senator'))                return 'Dear Senator,';
  if (r.includes('minister'))               return 'Dear Minister,';
  if (r.includes('premier'))                return 'Dear Premier,';
  if (r.includes('attorney'))               return 'Dear Attorney-General,';
  if (r.includes('treasurer'))              return 'Dear Treasurer,';
  if (r.includes('federal representative')
   || r.includes('house of representatives')
   || r.includes('house representative'))  return 'Dear Member of Parliament,';
  if (r.includes('assembly'))               return 'Dear Member of the Legislative Assembly,';
  if (r.includes('council'))                return 'Dear Member of the Legislative Council,';
  return 'Dear Member,';
}

function buildPrompt({ topic, customTopic, electorate, primaryRole, recipients }) {
  const topicLabel     = (topic === 'other' && customTopic)
    ? customTopic
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ── Handler ────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed. Use POST.' });
  }

  // 1. Check API key
  if (!process.env.GROQ_API_KEY) {
    return json(503, {
      error: 'GROQ_API_KEY is not configured. Add it in Netlify → Site configuration → Environment variables.',
    });
  }

  // 2. Parse + validate request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Request body must be valid JSON.' });
  }

  const { topic, customTopic, electorate, primaryRole, recipients } = body;

  if (!topic)       return json(400, { error: 'Missing required field: topic' });
  if (topic === 'other' && !customTopic?.trim()) {
    return json(400, { error: 'Missing required field: customTopic' });
  }
  if (!electorate)  return json(400, { error: 'Missing required field: electorate' });
  if (!primaryRole) return json(400, { error: 'Missing required field: primaryRole' });
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return json(400, { error: 'recipients must be a non-empty array' });
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
    console.error('[generate-email] Groq fetch error:', err.message);
    return json(500, { error: 'Could not reach Groq API. Check your internet connection.' });
  }

  // 4. Handle Groq HTTP errors
  if (!groqRes.ok) {
    const errBody = await groqRes.json().catch(() => ({}));
    const errMsg  = errBody?.error?.message || `HTTP ${groqRes.status}`;
    console.error('[generate-email] Groq error:', groqRes.status, errMsg);

    if (groqRes.status === 401) {
      return json(500, { error: 'Invalid Groq API key. Check GROQ_API_KEY in Netlify environment variables.' });
    }
    if (groqRes.status === 429) {
      return json(500, { error: 'Groq rate limit reached. Please try again in a moment.' });
    }
    return json(500, { error: `Groq API error: ${errMsg}` });
  }

  // 5. Parse Groq response
  let groqData;
  try {
    groqData = await groqRes.json();
  } catch {
    return json(500, { error: 'Could not parse Groq response.' });
  }

  const raw   = groqData?.choices?.[0]?.message?.content || '';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.error('[generate-email] JSON parse failed. Raw:', raw);
    return json(500, { error: 'Groq returned invalid JSON.' });
  }

  if (!parsed.subject || !parsed.body) {
    return json(500, { error: 'Groq response missing subject or body fields.' });
  }

  // 6. Return — GROQ_API_KEY never reaches the browser
  return json(200, {
    subject: parsed.subject,
    body:    parsed.body,
  });
};
