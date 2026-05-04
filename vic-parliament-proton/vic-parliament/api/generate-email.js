// api/generate-email.js
// Vercel Serverless Function — replaces the Express POST /api/generate-email
//
// Vercel automatically serves any file in /api as a serverless function.
// The client calls POST /api/generate-email unchanged.
//
// Set GROQ_API_KEY in Vercel dashboard:
//   Project → Settings → Environment Variables

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

Respond with ONLY a JSON object in this exact format:
{"subject": "the subject line here", "body": "the full email body here with \\n for newlines"}`;
}

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 1. Check API key
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not configured. Add it in Vercel → Project Settings → Environment Variables.',
    });
  }

  // 2. Validate request body
  const { topic, electorate, primaryRole, recipients } = req.body;

  if (!topic)       return res.status(400).json({ error: 'Missing required field: topic' });
  if (!electorate)  return res.status(400).json({ error: 'Missing required field: electorate' });
  if (!primaryRole) return res.status(400).json({ error: 'Missing required field: primaryRole' });
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients must be a non-empty array' });
  }

  // 3. Call Groq
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
    return res.status(500).json({ error: 'Could not reach Groq API.' });
  }

  // 4. Handle Groq HTTP errors
  if (!groqRes.ok) {
    const errBody = await groqRes.json().catch(() => ({}));
    const errMsg  = errBody?.error?.message || `HTTP ${groqRes.status}`;
    console.error('[generate-email] Groq error:', groqRes.status, errMsg);
    if (groqRes.status === 401) return res.status(500).json({ error: 'Invalid Groq API key.' });
    if (groqRes.status === 429) return res.status(500).json({ error: 'Groq rate limit reached. Try again shortly.' });
    return res.status(500).json({ error: `Groq API error: ${errMsg}` });
  }

  // 5. Parse Groq response
  let groqData;
  try {
    groqData = await groqRes.json();
  } catch {
    return res.status(500).json({ error: 'Could not parse Groq response.' });
  }

  const raw   = groqData?.choices?.[0]?.message?.content || '';
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.error('[generate-email] JSON parse failed. Raw:', raw);
    return res.status(500).json({ error: 'Groq returned invalid JSON.' });
  }

  if (!parsed.subject || !parsed.body) {
    return res.status(500).json({ error: 'Groq response missing subject or body.' });
  }

  // 6. Return — GROQ_API_KEY never reaches the browser
  return res.status(200).json({
    subject: parsed.subject,
    body:    parsed.body,
  });
}
