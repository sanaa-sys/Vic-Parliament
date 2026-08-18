// api/health.js
// Vercel Serverless Function — GET /api/health

export default function handler(req, res) {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    model:     'qwen/qwen3.6-27b',
    groq:      !!process.env.GROQ_API_KEY,
    runtime:   'vercel-functions',
  });
}
