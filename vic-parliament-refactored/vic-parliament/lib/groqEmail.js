// Shared Groq email-draft helper used by Vercel, Netlify, and the local Express server.
//
// qwen/qwen3.6-27b is a reasoning model. Groq JSON mode rejects thinking tokens
// ("Failed to validate JSON" / failed_generation). Disable thinking for this call.

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'qwen/qwen3.6-27b';

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

export function buildPrompt({ topic, customTopic, incidentDetails, desiredOutcome, electorate, primaryRole, recipients }) {
  const topicLabel     = (topic === 'other' && customTopic?.trim())
    ? customTopic.trim()
    : (TOPIC_LABELS[topic] || topic);
  const salutation     = roleToSalutation(primaryRole);
  const recipientLines = (recipients || [])
    .map(r => `- ${r.name} (${r.role}, ${r.party})`)
    .join('\n') || '(none selected)';

  const islamophobiaContext = (topic === 'islamophobia' && (incidentDetails?.trim() || desiredOutcome?.trim()))
    ? `

The constituent has provided the following details. Base the email on these — do not invent extra facts:
${incidentDetails?.trim() ? `- Incident details: ${incidentDetails.trim()}` : ''}
${desiredOutcome?.trim() ? `- Desired outcome: ${desiredOutcome.trim()}` : ''}
Incorporate the incident details into the body and turn the desired outcome into clear, actionable requests.`
    : '';

  return `You are helping an Australian constituent write a formal email to their elected representatives about ${topicLabel}.

The primary recipient holds the role of ${primaryRole} for the electorate of ${electorate}.

All recipients:
${recipientLines}${islamophobiaContext}

Write a formal, respectful constituent email on the topic of ${topicLabel}. The email should:
- Open with exactly "${salutation}" on its own line — address by role, NOT by name
- Be 3-4 paragraphs, each separated by a blank line (\\n\\n between paragraphs)
- Be specific to Victoria and Australia
- Include 2-3 clear, actionable requests relevant to the topic
- Be sincere and personal in tone, not preachy
- Close with exactly "Yours sincerely,\\n\\nA constituent"

Return a JSON object with exactly two string keys: subject and body.
Example: {"subject":"Concern about ${topicLabel}","body":"${salutation}\\n\\n..."}`;
}

export function parseEmailJson(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let clean = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];

  try {
    const parsed = JSON.parse(clean);
    if (parsed?.subject && parsed?.body) {
      return { subject: String(parsed.subject), body: String(parsed.body) };
    }
  } catch {
    return null;
  }
  return null;
}

export async function generateEmailWithGroq(apiKey, fields) {
  const prompt = buildPrompt(fields);

  let groqRes;
  try {
    groqRes = await fetch(GROQ_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:             GROQ_MODEL,
        temperature:       0.7,
        max_tokens:        2048,
        reasoning_effort:  'none',
        reasoning_format:  'hidden',
        response_format:   { type: 'json_object' },
        messages: [
          {
            role:    'system',
            content: 'You write formal Australian constituent emails. Always address recipients by role, never by name. Reply with a valid JSON object only, no markdown and no thinking: {"subject":"...","body":"..."}',
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
    return { ok: false, status: 500, error: 'Could not reach Groq API.' };
  }

  const groqData = await groqRes.json().catch(() => ({}));

  if (!groqRes.ok) {
    const errMsg = groqData?.error?.message || `HTTP ${groqRes.status}`;
    console.error('[generate-email] Groq error:', groqRes.status, errMsg);

    const recovered = parseEmailJson(groqData?.error?.failed_generation);
    if (recovered) return { ok: true, ...recovered };

    if (groqRes.status === 401) return { ok: false, status: 500, error: 'Invalid Groq API key.' };
    if (groqRes.status === 429) return { ok: false, status: 500, error: 'Groq rate limit reached. Try again shortly.' };
    return { ok: false, status: 500, error: `Groq API error: ${errMsg}` };
  }

  const raw = groqData?.choices?.[0]?.message?.content || '';
  const parsed = parseEmailJson(raw);
  if (!parsed) {
    console.error('[generate-email] JSON parse failed. Raw:', raw);
    return { ok: false, status: 500, error: 'Groq returned invalid JSON.' };
  }

  return { ok: true, ...parsed };
}
