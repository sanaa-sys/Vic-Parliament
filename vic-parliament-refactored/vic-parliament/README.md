# Victorian Constituent Contact Platform

A React web app that helps Victorian residents find their elected representatives
across all three levels of government and send them a personalised AI-drafted email
about any issue they care about.

**Live site:** https://sanaa-sys.github.io/Vic-Parliament/

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Architecture](#architecture)
3. [Data sources](#data-sources)
4. [Data pipeline](#data-pipeline)
5. [Project structure](#project-structure)
6. [Local development](#local-development)
7. [Deployment — Vercel](#deployment--vercel)
8. [API reference](#api-reference)
9. [Updating member data](#updating-member-data)

---

## How it works

The app walks users through four steps:

```
Step 1 → Enter postcode + topic
           ↓ (if postcode spans multiple electorates)
         Federal picker (Leaflet map, coloured polygons, suburb list)
           ↓ (if postcode spans multiple state districts)
         State Assembly picker (Leaflet map, live Vicmap boundaries)

Step 2 → Review representatives across all tiers
           • Federal House of Representatives member
           • 12 Victorian senators
           • State Legislative Assembly member
           • State Legislative Council members (5 per region)
         Select which ones to contact

Step 3 → AI-drafted email via Groq (llama-3.1-8b-instant)
         Members addressed by role ("Dear Senator,"), not by name
         User can edit before sending

Step 4 → Single mailto: link opens the user's email app
         All selected recipients pre-filled in the To: field
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React + Vite)                  │
│                                                             │
│  client/src/                                                │
│  ├── App.jsx              Step orchestration (Steps 1–4)   │
│  ├── components/                                            │
│  │   ├── Step1.jsx        Postcode entry + disambiguation   │
│  │   ├── SuburbPicker.jsx Federal map picker (Leaflet)      │
│  │   ├── StatePicker.jsx  State district map picker         │
│  │   ├── Step2.jsx        Representative selection          │
│  │   ├── Step3.jsx        AI email draft                    │
│  │   ├── Step4.jsx        Send via mailto                   │
│  │   ├── MemberRow.jsx    Reusable member card              │
│  │   └── ProgressBar.jsx  4-step progress indicator         │
│  ├── hooks/               
│  │   └── useMembers.js    Postcode lookup + data accessors  │
│  └── data/                
│      ├── data.js          Bundled member + postcode data    │
│      └── templates.js     Fallback email templates          │
│                                                             │
│  client/public/           Static JSON served at runtime     │
│  ├── electorates.json         Federal electorate polygons   │
│  ├── postcode_electorate_suburbs.json  Federal splits       │
│  ├── postcode_district_suburbs.json    State splits         │
│  ├── postcode_region_suburbs.json      Region splits        │
│  ├── postcode_districts_map.json       All districts/pc     │
│  └── postcode_regions_map.json         All regions/pc       │
└───────────────────────┬─────────────────────────────────────┘
                        │ POST /api/generate-email
                        │ GET  /api/health
                        ▼
┌───────────────────────────────────────────────────────────────┐
│              Serverless API (Vercel Functions)                │
│                                                               │
│  api/                                                         │
│  ├── generate-email.js   Calls Groq, returns {subject, body} │
│  └── health.js           Health check + key status           │
│                                                               │
│  GROQ_API_KEY lives here only — never sent to the browser    │
└───────────────────────┬───────────────────────────────────────┘
                        │ POST /v1/chat/completions
                        ▼
              ┌─────────────────────┐
              │   Groq API          │
              │   llama-3.1-8b-     │
              │   instant           │
              └─────────────────────┘

Map boundaries fetched live in the browser:
  SuburbPicker → /public/electorates.json (bundled, federal)
  StatePicker  → ArcGIS FeatureServer (live, state/council)
                 services-ap1.arcgis.com/P744lA0wf4LlBZ84
                 Layer 15 = STATE_ASSEMBLY_2022
                 Layer 16 = STATE_COUNCIL_2022
```

### Key design decisions

- **`data.js` is bundled at build time** — all postcode-to-member lookups happen
  in the browser with zero network requests. The file is ~96KB and is imported
  as an ES module by `useMembers.js`.

- **Split postcode disambiguation** — 239 Victorian postcodes span multiple state
  districts and 34 span multiple federal electorates. The app detects these using
  `POSTCODE_DIVISIONS_MAP` / `POSTCODE_DISTRICTS_MAP` and shows a map picker
  with suburb breakdowns so the user can confirm their correct electorate.

- **No server for production** — the Express `server/` is only used during local
  development. In production (Vercel), `api/generate-email.js` is a serverless
  function that handles email generation.

- **mailto: single window** — all selected recipients are placed in a single
  `mailto:` To field, opening the user's existing email app with everything
  pre-filled. No third-party email service or OAuth required.

---

## Data sources

### Federal members — OpenAustralia API

| Field | Detail |
|---|---|
| **URL** | `http://www.openaustralia.org/api/` |
| **Endpoints used** | `getRepresentatives?postcode=XXXX`, `getSenators?state=vic` |
| **Coverage** | All 39 Victorian federal electoral divisions + 12 Victorian senators |
| **Licence** | CC BY-SA 3.0 |
| **Refreshed by** | Running `fetch_openaustralia.py` |

> **Limitation:** The API returns one representative per postcode even for split
> postcodes. Split postcode detection is handled by the AEC authoritative override
> table in `fetch_openaustralia.py` (`AEC_SUBURB_ELECTORATE` dict).

### State Assembly members — Parliament of Victoria PDF

| Field | Detail |
|---|---|
| **Source** | parliament.vic.gov.au — Members list PDF |
| **File used** | `lamemlist-as-at-2026-02-13.pdf` |
| **Coverage** | All 88 Legislative Assembly districts |
| **Licence** | © Parliament of Victoria (public document) |
| **Refreshed by** | Downloading updated PDF, re-running `fetch_openaustralia.py` |

### State Council members — Parliament of Victoria PDF

| Field | Detail |
|---|---|
| **Source** | parliament.vic.gov.au — Legislative Council members PDF |
| **File used** | `lc_members.pdf` |
| **Coverage** | 8 Council regions × 5 members each = 40 members |
| **Licence** | © Parliament of Victoria (public document) |
| **Refreshed by** | Downloading updated PDF, re-running `fetch_openaustralia.py` |

### Postcode → suburb → district mapping — VEC Locality Finder

| Field | Detail |
|---|---|
| **Source** | Victorian Electoral Commission Locality Finder |
| **File used** | `LocalityFinderJun25.xls` |
| **Coverage** | 694 Victorian postcodes, 2,889 suburb+postcode combinations |
| **Fields** | Locality Name, Post Code, District Name, Region Name |
| **Licence** | © Victorian Electoral Commission (CC BY 4.0) |
| **Refreshed by** | Downloading updated XLS from vec.vic.gov.au, re-running `fetch_openaustralia.py` |

This is the authoritative source for which suburb belongs to which state Assembly
district and which Council region.

### Federal electorate boundaries — AEC authoritative data

| Field | Detail |
|---|---|
| **Source** | Australian Electoral Commission locality search |
| **URL** | `https://electorate.aec.gov.au/LocalitySearchResults.aspx?filter=XXXX&filterby=Postcode` |
| **Coverage** | 34 Victorian split postcodes (postcodes crossing federal electorate boundaries) |
| **Licence** | © Commonwealth of Australia |
| **Stored as** | `AEC_SUBURB_ELECTORATE` dict in `fetch_openaustralia.py` |

Used to override the OpenAustralia API's single-division response for postcodes
that genuinely span multiple federal electorates (e.g. 3004 spans Melbourne +
Macnamara; 3364 spans Ballarat + Bendigo + Mallee).

### Federal electorate GeoJSON — AEC via E_VIC24

| Field | Detail |
|---|---|
| **Source** | AEC 2024 Victorian federal electoral boundaries |
| **File** | `E_VIC24_region.json` (thinned to `electorates.json` at 735KB) |
| **Coverage** | 38 Victorian federal electoral divisions |
| **Format** | GeoJSON FeatureCollection, WGS84 coordinates |
| **Licence** | CC BY 4.0 |
| **Used by** | `SuburbPicker.jsx` — drawn as coloured Leaflet polygons |

The original 6.8MB file is thinned to 735KB by keeping every 8th coordinate
point using a Douglas-Peucker-style reduction in `fetch_openaustralia.py`.

### State electoral boundaries — Vicmap Admin ArcGIS

| Field | Detail |
|---|---|
| **Source** | Vicmap Admin, published by Land Use Victoria |
| **API** | `https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Admin/FeatureServer` |
| **Layer 15** | `STATE_ASSEMBLY_2022` — 88 lower house districts |
| **Layer 16** | `STATE_COUNCIL_2022` — 8 upper house regions |
| **Licence** | CC BY 4.0 |
| **Used by** | `StatePicker.jsx` — fetched live in the browser, only the relevant districts |

Unlike the federal GeoJSON (which is bundled), state boundaries are fetched live
so the bundle size stays small. Only the 2–6 districts relevant to the user's
postcode are fetched per session.

---

## Data pipeline

All member data and postcode maps are generated by a single Python script:

```
fetch_openaustralia.py
        │
        ├─ OpenAustralia API ──────────────────────→ POSTCODE_REP_MAP
        │   getRepresentatives?postcode=3000..3999      POSTCODE_DIVISIONS_MAP
        │   getSenators?state=vic                       REPRESENTATIVES
        │                                               VIC_SENATORS
        │
        ├─ AEC_SUBURB_ELECTORATE (hardcoded) ──────→ Override POSTCODE_DIVISIONS_MAP
        │   34 split postcodes, AEC-authoritative        for split postcodes
        │
        ├─ LocalityFinderJun25.xls (VEC) ──────────→ POSTCODE_DISTRICT_MAP
        │   suburb → state district → council region     POSTCODE_REGION_MAP
        │                                               POSTCODE_DISTRICTS_MAP
        │                                               POSTCODE_REGIONS_MAP
        │                                         →   postcode_district_suburbs.json
        │                                         →   postcode_region_suburbs.json
        │
        ├─ Parliament PDFs (hardcoded) ────────────→ ASSEMBLY_MEMBERS
        │   lamemlist + lc_members.pdf                   COUNCIL_MEMBERS
        │
        └─ All of the above ───────────────────────→ data.js
                                                  →   postcode_electorate_suburbs.json
```

**Run the pipeline:**
```bash
python fetch_openaustralia.py \
  --xls LocalityFinderJun25.xls \
  --output client/src/data/data.js
```

This produces:
- `client/src/data/data.js` — bundled into the React app at build time
- `postcode_electorate_suburbs.json` → copy to `client/public/`
- `postcode_district_suburbs.json` → copy to `client/public/`
- `postcode_region_suburbs.json` → copy to `client/public/`

**Set your OpenAustralia API key** (free at openaustralia.org.au/api/key):
```bash
# Option A: environment variable
export OA_API_KEY="your_key_here"

# Option B: .env file next to the script
echo "OA_API_KEY=your_key_here" > .env
```

---

## Project structure

```
vic-parliament/
│
├── fetch_openaustralia.py      Data pipeline script (run locally)
├── vercel.json                 Vercel build + routing config
├── netlify.toml                Netlify build + routing config (alternative)
├── package.json                Root scripts: install:all, build, dev
├── run-dev.mjs                 Starts client + server together for local dev
│
├── api/                        Vercel serverless functions (production)
│   ├── generate-email.js       POST /api/generate-email → Groq AI
│   └── health.js               GET  /api/health
│
├── netlify/functions/          Netlify functions (alternative to api/)
│   ├── generate-email.js       Same logic, Netlify handler signature
│   └── health.js
│
├── client/                     React + Vite frontend
│   ├── index.html
│   ├── vite.config.js          Dev proxy: /api → localhost:3001
│   ├── package.json
│   │
│   ├── public/                 Static files served at runtime (not bundled)
│   │   ├── electorates.json              735KB — federal electorate polygons
│   │   ├── postcode_electorate_suburbs.json  49KB — federal split postcode data
│   │   ├── postcode_district_suburbs.json    59KB — state split postcode data
│   │   ├── postcode_region_suburbs.json      60KB — council split postcode data
│   │   ├── postcode_districts_map.json       17KB — postcode → [districts]
│   │   └── postcode_regions_map.json         21KB — postcode → [regions]
│   │
│   └── src/
│       ├── App.jsx                  Step orchestration (Steps 1–4)
│       ├── main.jsx                 React entry point
│       ├── index.css                All styles (CSS variables, components)
│       │
│       ├── components/
│       │   ├── Step1.jsx            Postcode entry + disambiguation logic
│       │   ├── SuburbPicker.jsx     Federal map picker (Leaflet + electorates.json)
│       │   ├── StatePicker.jsx      State map picker (Leaflet + live Vicmap ArcGIS)
│       │   ├── Step2.jsx            Select representatives across all tiers
│       │   ├── Step3.jsx            AI email draft (calls /api/generate-email)
│       │   ├── Step4.jsx            Send via mailto: + copy fallback
│       │   ├── MemberRow.jsx        Reusable member card with photo + details
│       │   └── ProgressBar.jsx      4-step progress indicator
│       │
│       ├── hooks/
│       │   └── useMembers.js        Postcode lookup, exports getDivisionsForPostcode
│       │                            getDistrictsForPostcode, getRegionsForPostcode
│       │
│       └── data/
│           ├── data.js              96KB — all members + postcode maps (ES module)
│           └── templates.js         Fallback email templates (used if Groq fails)
│
└── server/                     Express server (local development only)
    ├── index.js                 Same /api/generate-email + /api/health logic
    ├── .env                     GROQ_API_KEY (never commit)
    └── package.json
```

---

## Local development

### Prerequisites
- Node.js 18+
- Python 3.10+ with `pip install pandas xlrd shapely requests`
- A free [OpenAustralia API key](https://www.openaustralia.org.au/api/key)
- A free [Groq API key](https://console.groq.com)

### Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure the local API server
cp server/.env.example server/.env
# Edit server/.env and add your GROQ_API_KEY

# 3. Generate data.js (takes ~15 min — fetches 1000 postcodes from OpenAustralia)
export OA_API_KEY="your_openaustralia_key"
python fetch_openaustralia.py --xls LocalityFinderJun25.xls

# 4. Copy the generated public files
cp postcode_electorate_suburbs.json client/public/
cp postcode_district_suburbs.json   client/public/
cp postcode_region_suburbs.json     client/public/

# 5. Start development servers
npm run dev
# → React client:  http://localhost:3000
# → Express API:   http://localhost:3001
```

### Development vs production API

| Environment | Who handles /api/* |
|---|---|
| `npm run dev` (local) | Express server on port 3001 (via Vite proxy) |
| Vercel deploy | `api/generate-email.js` serverless function |
| Netlify deploy | `netlify/functions/generate-email.js` serverless function |

The client code in `Step3.jsx` calls `fetch('/api/generate-email')` identically
in all environments — routing is handled by the Vite proxy config or the
platform's redirect rules.

---

## Deployment — Vercel

### First deploy

1. Push all files to GitHub (ensure `data.js` and the `client/public/*.json`
   files are committed — they are needed at build time)

2. Go to [vercel.com](https://vercel.com) → **Add New → Project**

3. Import `sanaa-sys/Vic-Parliament` from GitHub

4. Set **Root Directory** to `vic-parliament-netlify/vic-parliament`

5. Vercel auto-reads `vercel.json` — no other build settings needed

6. Click **Deploy**

7. After deploy: **Settings → Environment Variables** → add `GROQ_API_KEY`

8. **Deployments → Redeploy** to apply the key

### Subsequent deploys

Push to the `main` branch — Vercel auto-deploys on every push.

### Environment variables

| Variable | Where to set | Required |
|---|---|---|
| `GROQ_API_KEY` | Vercel dashboard → Environment Variables | Yes |

`CLIENT_ORIGIN` and `PORT` are not needed in production — the serverless
function and client share the same origin.

---

## API reference

### `POST /api/generate-email`

Generates an AI-drafted email using Groq. The `GROQ_API_KEY` is read
server-side and never sent to the browser.

**Request body:**
```json
{
  "topic":       "islamophobia",
  "electorate":  "Melbourne",
  "primaryRole": "Federal Representative",
  "recipients":  [
    { "name": "Kate Ashmor", "role": "Federal Representative", "party": "Liberal" }
  ]
}
```

**`topic` values:** `islamophobia` · `international` · `climate` · `housing` ·
`health` · `transport` · `education` · `cost` · `other`

**Response:**
```json
{
  "subject": "Addressing Islamophobia in our community",
  "body":    "Dear Member of Parliament,\n\nI am writing to you..."
}
```

**Error responses:**

| Status | Meaning |
|---|---|
| `400` | Missing required field (`topic`, `electorate`, `primaryRole`, or `recipients`) |
| `503` | `GROQ_API_KEY` not configured in environment |
| `500` | Groq API error, rate limit, or JSON parse failure |

### `GET /api/health`

```json
{
  "status":    "ok",
  "timestamp": "2026-04-25T09:00:00.000Z",
  "model":     "llama-3.1-8b-instant",
  "groq":      true,
  "runtime":   "vercel-functions"
}
```

---

## Updating member data

Member data needs to be refreshed when:
- A by-election changes a federal or state member
- New parliament is formed after an election
- VEC releases an updated `LocalityFinderJun25.xls`

**Steps:**
1. Download the latest `LocalityFinderJun25.xls` from [vec.vic.gov.au](https://www.vec.vic.gov.au)
2. If parliament PDFs have changed, update the hardcoded member dicts in `fetch_openaustralia.py`
3. Run the pipeline:
   ```bash
   python fetch_openaustralia.py --xls LocalityFinderJun25.xls --reset-cache
   ```
   (`--reset-cache` forces a fresh fetch from the OpenAustralia API)
4. Copy the generated JSON files to `client/public/`
5. Commit and push — Vercel will auto-deploy

> **Note:** The `AEC_SUBURB_ELECTORATE` dict in `fetch_openaustralia.py` may also
> need updating if federal electorate boundaries change after a redistribution.
> Check [electorate.aec.gov.au](https://electorate.aec.gov.au) for any changes
> to split postcodes.
