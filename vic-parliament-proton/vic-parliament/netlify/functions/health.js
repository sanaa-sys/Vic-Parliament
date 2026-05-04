// netlify/functions/health.js
//
// Netlify Function replicating GET /api/health.
// Useful for uptime checks and verifying the deployment is live.
// Accessed at: /api/health  (redirected by netlify.toml)

export const handler = async () => {
  return {
    statusCode: 200,
    headers:    { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status:    'ok',
      timestamp: new Date().toISOString(),
      model:     'llama-3.1-8b-instant',
      groq:      !!process.env.GROQ_API_KEY,
      runtime:   'netlify-functions',
    }),
  };
};
