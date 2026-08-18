// server/index.js
// Node.js + Express API server for the Victorian Constituent Platform
//
// Endpoints:
//   POST /api/generate-email   — calls Groq AI to draft an email
//   GET  /api/health           — health check
//
// Run:
//   npm install
//   npm run dev

import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';
import { generateEmailWithGroq, GROQ_MODEL } from '../lib/groqEmail.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
}));

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
 *     topic:       string,
 *     electorate:  string,
 *     primaryRole: string,
 *     recipients:  [{ name, role, party }]
 *   }
 *
 * Response:
 *   { subject: string, body: string }
 */
app.post('/api/generate-email', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not set. Add it to server/.env',
    });
  }

  const { topic, customTopic, incidentDetails, desiredOutcome, electorate, primaryRole, recipients } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Missing required field: topic' });
  }
  if (topic === 'other' && !customTopic?.trim()) {
    return res.status(400).json({ error: 'Missing required field: customTopic' });
  }
  if (topic === 'islamophobia' && !incidentDetails?.trim()) {
    return res.status(400).json({ error: 'Missing required field: incidentDetails' });
  }
  if (topic === 'islamophobia' && !desiredOutcome?.trim()) {
    return res.status(400).json({ error: 'Missing required field: desiredOutcome' });
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

  const result = await generateEmailWithGroq(process.env.GROQ_API_KEY, {
    topic, customTopic, incidentDetails, desiredOutcome, electorate, primaryRole, recipients,
  });

  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.json({
    subject: result.subject,
    body:    result.body,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`\n✓  Vic Parliament API  →  http://localhost:${PORT}`);
  console.log(`   Model:    ${GROQ_MODEL}`);
  console.log(`   Groq key: ${process.env.GROQ_API_KEY ? '✓ set' : '✗ NOT SET — add GROQ_API_KEY to server/.env'}`);
  console.log(`   Origin:   ${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}\n`);
});
