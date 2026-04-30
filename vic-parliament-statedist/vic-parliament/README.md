# Victorian Constituent Contact Platform

React + Node.js rewrite of the Victorian MP constituent email platform.

## Project Structure

```
vic-parliament/
├── client/                    # React frontend (Vite)
│   ├── public/
│   │   └── data.js            # ← copy your generated data.js here
│   └── src/
│       ├── App.jsx            # Main app, step orchestration
│       ├── main.jsx           # React entry point
│       ├── index.css          # All styles
│       ├── components/
│       │   ├── ProgressBar.jsx
│       │   ├── MemberRow.jsx  # Reusable member row
│       │   ├── Step1.jsx      # Postcode + topic
│       │   ├── Step2.jsx      # Select recipients
│       │   ├── Step3.jsx      # AI email draft
│       │   └── Step4.jsx      # Send via mailto
│       ├── hooks/
│       │   └── useMembers.js  # Reads from data.js globals
│       └── data/
│           └── templates.js   # Fallback email templates
│
└── server/                    # Node.js + Express API
    ├── index.js               # API server
    ├── .env                   # API keys (never commit this)
    └── package.json
```

## API Endpoints

### `GET /api/health`
Check the server is running and the API key is configured.

```json
{ "status": "ok", "timestamp": "...", "thaura": true }
```

### `POST /api/generate-email`
Generate an AI-drafted email via Thaura. The API key lives on the
server — it is never sent to the browser.

**Request:**
```json
{
  "topic":      "islamophobia",
  "electorate": "Melbourne",
  "firstName":  "Ellen",
  "recipients": [
    { "name": "Ellen Sandell", "role": "Federal Representative", "party": "Australian Greens" }
  ]
}
```

**Response:**
```json
{
  "subject": "Addressing anti-Muslim hate in our community",
  "body":    "Dear Ellen,\n\nI am writing..."
}
```

**Error responses:**
- `400` — missing required fields
- `503` — THAURA_API_KEY not configured
- `500` — Thaura API failure

## Setup

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure the server
Edit `server/.env`:
```
THAURA_API_KEY=your_thaura_api_key_here
PORT=3001
CLIENT_ORIGIN=http://localhost:3000
```
Get a free Thaura API key at: https://thaura.ai

### 3. Add data.js to the client
Copy your generated `data.js` file into `client/public/`:
```bash
cp /path/to/data.js client/public/data.js
```
Generate `data.js` by running `fetch_openaustralia.py` first if you haven't already.

### 4. Run in development
```bash
npm run dev
```
This starts both the server (port 3001) and client (port 3000) together.

Or run them separately:
```bash
npm run dev:server   # terminal 1
npm run dev:client   # terminal 2
```

Open **http://localhost:3000** in your browser.

## How the AI email generation works

```
Browser (React)                  Node.js Server              Thaura API
     │                                │                           │
     │── POST /api/generate-email ──→ │                           │
     │   { topic, electorate,         │── POST /v1/chat/... ───→  │
     │     firstName, recipients }    │   Authorization: Bearer   │
     │                                │   [THAURA_API_KEY]        │
     │                                │ ←── { subject, body } ── │
     │ ←── { subject, body } ──────── │                           │
```

The Thaura API key **never reaches the browser**. It lives in
`server/.env` and is only used server-side.

## Deployment

### Deploy the client to GitHub Pages
```bash
npm run build
# Push client/dist/ to your gh-pages branch
```

### Deploy the server
The Node.js server needs a host that runs Node — options:
- **Railway** (free tier): connect your GitHub repo, set env vars
- **Render** (free tier): same — point to `server/` folder
- **Fly.io**: good free tier for small apps

Update `CLIENT_ORIGIN` in the server env vars to your GitHub Pages URL,
e.g. `https://sanaa-sys.github.io`.

## .gitignore
```
server/.env
node_modules/
client/dist/
client/public/data.js
```
Never commit `.env` or `data.js` (it contains scraped contact details).
