// api/generate-email.js
// Vercel Serverless Function — POST /api/generate-email
//
// Set GROQ_API_KEY in Vercel dashboard:
//   Project → Settings → Environment Variables

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';  // more reliable JSON output than 8b-instant

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

function roleToSalutation(role) {
  if (!role) return 'Dear Member,';
  const r = role.toLowerCase();
  if (r.includes('senator'))    return 'Dear Senator,';
  if (r.includes('minister'))   return 'Dear Minister,';
  if (r.includes('premier'))    return 'Dear Premier,';
  if (r.includes('attorney'))   return 'Dear Attorney-General,';
  if (r.includes('treasurer'))  return 'Dear Treasurer,';
  if (r.includes('assembly'))   return 'Dear Member of the Legislative Assembly,';
  if (r.includes('council'))    return 'Dear Member of the Legislative Council,';
  if (r.includes('mayor'))      return 'Dear Mayor,';
  return 'Dear Member of Parliament,';
}

function buildPrompt({ topic, electorate, primaryRole, recipients }) {
  const topicLabel     = TOPIC_LABELS[topic] || topic;
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

You MUST respond with ONLY a raw JSON object — no markdown, no code fences, no explanation:
{"subject": "the subject line here", "body": "the full email body here with \\n for newlines"}`;
}

// ── Body parsing helper ────────────────────────────────────────────────────
// Vercel does not auto-parse JSON bodies — we must do it ourselves.
async function parseBody(req) {
  // If Vercel already parsed it (some configs do), use it directly
  if (req.body && typeof req.body === 'object') return req.body;

  // Otherwise read the raw stream
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 1. Parse body
  let body;
  try {
    body = await parseBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  // 2. Check API key
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables.',
    });
  }

  // 3. Validate fields
  const { topic, electorate, primaryRole, recipients } = body;

  if (!topic)       return res.status(400).json({ error: 'Missing required field: topic' });
  if (!electorate)  return res.status(400).json({ error: 'Missing required field: electorate' });
  if (!primaryRole) return res.status(400).json({ error: 'Missing required field: primaryRole' });
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients must be a non-empty array' });
  }

  // 4. Call Groq
  const prompt = buildPrompt({ topic, electorate, primaryRole, recipients });

  let groqRes;
  try {
    groqRes = await fetch(GROQ_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.7,
        max_tokens:  1024,
        // Note: response_format json_object is NOT used here because it can
        // cause 500s on some models. Instead we instruct the model explicitly
        // in the prompt to return raw JSON and strip any stray markdown below.
        messages: [
          {
            role:    'system',
            content: 'You are a formal letter writer. Always respond with a single raw JSON object only — no markdown fences, no preamble: {"subject":"...","body":"..."}',
          },
          {
            role:    'user',
            content: prompt,
          },
        ],
      }),
    });
  } catch (err) {
    console.error('[generate-email] Groq fetch failed:', err.message);
    return res.status(500).json({ error: `Could not reach Groq API: ${err.message}` });
  }

  // 5. Handle Groq HTTP errors
  if (!groqRes.ok) {
    let errMsg = `HTTP ${groqRes.status}`;
    try {
      const errBody = await groqRes.json();
      errMsg = errBody?.error?.message || errMsg;
    } catch {}
    console.error('[generate-email] Groq returned', groqRes.status, errMsg);
    if (groqRes.status === 401) return res.status(500).json({ error: 'Groq API key is invalid. Check GROQ_API_KEY in Vercel settings.' });
    if (groqRes.status === 429) return res.status(500).json({ error: 'Groq rate limit reached. Please try again in a moment.' });
    return res.status(500).json({ error: `Groq API error: ${errMsg}` });
  }

  // 6. Parse Groq response
  let groqData;
  try {
    groqData = await groqRes.json();
  } catch {
    return res.status(500).json({ error: 'Could not parse Groq response.' });
  }

  // 7. Extract and clean the JSON string from the response
  const raw   = groqData?.choices?.[0]?.message?.content || '';
  // Strip markdown code fences if the model added them despite being told not to
  const clean = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Find the JSON object even if there's stray text before/after
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[generate-email] No JSON object found in response. Raw:', raw);
    return res.status(500).json({ error: 'Groq did not return valid JSON. Please try again.' });
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[generate-email] JSON parse failed. Raw:', raw);
    return res.status(500).json({ error: 'Groq returned malformed JSON. Please try again.' });
  }

  if (!parsed.subject || !parsed.body) {
    return res.status(500).json({ error: 'Groq response missing subject or body fields.' });
  }

  // 8. Return — GROQ_API_KEY never reaches the browser
  return res.status(200).json({
    subject: parsed.subject,
    body:    parsed.body,
  });
}
