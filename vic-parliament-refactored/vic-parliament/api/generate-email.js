// api/generate-email.js
// Vercel Serverless Function — replaces the Express POST /api/generate-email
//
// Set GROQ_API_KEY in Vercel dashboard:
//   Project → Settings → Environment Variables

import { generateEmailWithGroq } from '../lib/groqEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not configured. Add it in Vercel → Project Settings → Environment Variables.',
    });
  }

  const { topic, customTopic, incidentDetails, desiredOutcome, electorate, primaryRole, recipients } = req.body;

  if (!topic)       return res.status(400).json({ error: 'Missing required field: topic' });
  if (topic === 'other' && !customTopic?.trim()) {
    return res.status(400).json({ error: 'Missing required field: customTopic' });
  }
  if (topic === 'islamophobia' && !incidentDetails?.trim()) {
    return res.status(400).json({ error: 'Missing required field: incidentDetails' });
  }
  if (topic === 'islamophobia' && !desiredOutcome?.trim()) {
    return res.status(400).json({ error: 'Missing required field: desiredOutcome' });
  }
  if (!electorate)  return res.status(400).json({ error: 'Missing required field: electorate' });
  if (!primaryRole) return res.status(400).json({ error: 'Missing required field: primaryRole' });
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'recipients must be a non-empty array' });
  }

  const result = await generateEmailWithGroq(process.env.GROQ_API_KEY, {
    topic, customTopic, incidentDetails, desiredOutcome, electorate, primaryRole, recipients,
  });

  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(200).json({
    subject: result.subject,
    body:    result.body,
  });
}
