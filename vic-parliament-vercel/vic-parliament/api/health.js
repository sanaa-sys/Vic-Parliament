// api/health.js
// Vercel Serverless Function — GET /api/health

export default function handler(req, res) {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    model:     'llama-3.1-8b-instant',
    groq:      !!process.env.GROQ_API_KEY,
    runtime:   'vercel-functions',
  });
}
