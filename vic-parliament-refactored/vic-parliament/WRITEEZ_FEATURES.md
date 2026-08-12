# WriteEZ — Feature Documentation

**WriteEZ** is a Victorian constituent contact platform that helps residents find their elected representatives across federal, state, and local government (and optionally university leadership), then draft and send a personalised email about an issue they care about.

**Live site:** https://writeez.vercel.app/

---

## Overview

The app guides users through a **4-step wizard**:

| Step | Name | Purpose |
|------|------|---------|
| 1 | Postcode & topic | Enter location, choose issue, resolve ambiguous electorates |
| 2 | Select recipients | Review and choose who to contact |
| 3 | Write email | AI-generated draft, fully editable |
| 4 | Send | Send anonymously, via email app, or copy manually |

A progress bar at the top shows the current step (1 of 4 through 4 of 4).

---

## Step 1 — Postcode, Topic & Location Disambiguation

### Postcode entry
- 4-digit Victorian postcode input (must start with `3`)
- Validation for format, Victorian range, and known postcodes
- Enter key submits the form

### Topic selection
Predefined topics:
- Islamophobia & anti-Muslim hate
- International affairs
- Climate & environment
- Housing affordability
- Healthcare & hospitals
- Public transport
- Education & universities
- Cost of living
- **Other** — reveals a free-text field for a custom topic

When **Other** is selected, the user must enter a topic description. This custom text is passed to the AI email generator in Step 3.

### University selection (optional)
- Dropdown of Australian universities with Vice-Chancellor contact details
- Option to skip university contact (“N/A — Do not contact university”)
- Selected university’s Vice-Chancellor can be added as a recipient in Step 2
- Data Source: https://universitiesaustralia.edu.au/our-universities/university-contacts/#type=university-vice-chancellors

### Multi-stage location disambiguation

Some Victorian postcodes span more than one electorate or council area. The app detects this automatically and walks the user through up to three sub-stages:

#### 1. Federal electorate (if postcode spans multiple federal divisions)
- Interactive **Leaflet map** with colour-coded electorate polygons
- Clickable electorate cards with suburb lists
- Suburb tags for cross-boundary suburbs
- Link to the [AEC electorate finder](https://electorate.aec.gov.au/)
- Warning when suburbs span multiple electorate boundaries

#### 2. State Assembly district (if postcode spans multiple districts)
- Interactive **Leaflet map** with live boundaries from Vicmap Admin (ArcGIS)
- Clickable district cards with suburb lists
- Link to the [VEC electorate finder](https://findelectorate.parliament.vic.gov.au/)
- Cross-boundary suburb warnings

#### 3. Local council (always shown)
- Interactive map when postcode spans multiple council areas
- Council cards with mayor name and contact details (phone, email, website, address, CEO)
- Single-council postcodes auto-select the council
- Council boundary data fetched from Vicmap Admin with in-memory and sessionStorage caching

### Multi-step navigation
When more than one disambiguation stage is required:
- **← Back** and **Next →** buttons appear below the picker
- **Continue →** on the final sub-stage
- Back from district returns to the federal map with the previous selection preserved
- Back from the first sub-stage returns to the postcode form

When only one stage is needed (e.g. council only), the picker’s own confirm button is used instead.

---

## Step 2 — Select Recipients

Displays all representatives matched to the user’s postcode and selections. Each tier can be individually included or excluded via checkbox.

### Federal — House of Representatives
- One member for the user’s federal division
- Name, party, electorate, and email shown

### Federal — Victorian Senators (12)
- All 12 Victorian senators listed
- **Party filter** dropdown (compact, beside All/None buttons)
- **All** / **None** buttons to bulk-select visible senators (respects active party filter)

### State — Legislative Assembly
- One member for the user’s state district

### State — Legislative Council (5 members)
- Five MLCs for the user’s council region
- Party filter, All, and None controls (same pattern as senators)

### Local Council (LGA)
- Council name and ward (if applicable)
- Mayor name, phone, email, and website
- Included when council was selected in Step 1

### University Vice-Chancellor
- Shown only if a university was selected in Step 1
- University name, Vice-Chancellor name, phone, and email

### Navigation
- Summary line: postcode, federal division, state district, council region, local council, university
- **← Back** returns to Step 1
- **Next: Write email →** proceeds with selected recipients

---

## Step 3 — AI Email Draft

### Automatic generation
- Email is **auto-generated on load** using **Groq AI** (Llama 3.1)
- Prompt is personalised using:
  - Selected topic (or custom topic for “Other”)
  - User’s federal electorate
  - Primary recipient’s role
  - Full list of selected recipients (name, role, party)

### Salutations
Recipients are addressed by **role**, not by name (e.g. “Dear Senator,”, “Dear Member of the Legislative Assembly,”).

### Editing & regeneration
- **Subject line** and **message body** are fully editable
- **Regenerate ↺** button re-runs AI generation
- Loading bar with progress indicator during generation

### Fallback templates
If the AI API is unavailable, pre-written templates are used instead:
- One template per topic category
- Custom topic text is incorporated for “Other”
- User is notified that a template draft is shown

### Navigation
- **← Back** returns to Step 2
- **Next: Send options →** (disabled until subject and body are filled)

---

## Step 4 — Send Email

### Recipients summary
Lists all selected recipients with role and party before sending.

### Send options

#### Send anonymously
- Sends directly via **EmailJS** from `stophate.cip@gmail.com`
- No login or email app required
- User identity is not shared with representatives
- Success/error feedback shown after send
- Button disabled after successful send

#### Send email
- Opens the user’s **default email app** (Gmail, Outlook, Apple Mail, etc.) via `mailto:` link
- All recipients, subject, body, and CC pre-filled
- Troubleshooting note if no email app opens

#### Copy and paste manually
Individual copy buttons for:
- **To** — all recipient email addresses
- **Cc** — automatic CC addresses
- **Subject**
- **Message body**

### Automatic CC
All send methods automatically CC:
- `islamophobia@boiv.org.au` (always)

When the topic is **Islamophobia**, additional CC addresses are included:
- `support@actionagainstislamophobia.org.au`
- `contact@islamophobia.com.au`

### Navigation
- **← Back** returns to Step 3

---

## Data & Representative Coverage

### Government tiers covered
| Tier | Coverage |
|------|----------|
| Federal | House of Representatives (39 Victorian divisions) + 12 Victorian Senators |
| State | Legislative Assembly (88 districts) + Legislative Council (8 regions × 5 members) |
| Local | Victorian councils (LGAs) with mayor/CEO contact data |
| University | Optional — Australian university Vice-Chancellors |

### Data sources
- **OpenAustralia API** — federal representatives and senators
- **Parliament of Victoria PDFs** — state Assembly and Council members
- **VEC Locality Finder** — postcode → suburb → district/region mapping
- **AEC** — federal split-postcode overrides and electorate GeoJSON boundaries
- **Vicmap Admin (ArcGIS)** — live state district and council boundary polygons

### Split postcode handling
- **~34 postcodes** span multiple federal electorates
- **~239 postcodes** span multiple state Assembly districts
- Postcodes spanning multiple council areas trigger council map picker

### Performance optimisations
- Member and postcode data bundled in `data.js` (~96 KB) — no network lookup needed for members
- Federal electorate polygons bundled as `electorates.json`
- State/council boundaries fetched live per session (only relevant areas)
- Council boundary caching: in-memory Map + sessionStorage

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate-email` | POST | AI email draft via Groq (API key server-side only) |
| `/api/send-email` | POST | Server-side email send via Resend (alternative backend) |
| `/api/health` | GET | Health check and API key status |

The client also uses **EmailJS** directly in the browser for anonymous sending in Step 4.

---

## User Interface

- Dark navy theme with blue accent colours
- Card-based layout for form sections
- Colour-coded map polygons and selection cards (blue, orange, green, purple, etc.)
- Selected cards use tinted backgrounds and coloured borders (consistent across federal, district, and council pickers)
- Responsive button rows with Back / Next / Continue patterns
- Error banners for validation and API failures
- Member rows with initials avatar, role tags, party, and email

---

## Deployment & Environments

| Environment | Frontend | API |
|-------------|----------|-----|
| Local dev | Vite on port 3000 | Express on port 3001 (proxied via Vite) |
| Vercel | Static build from `client/` | `api/` serverless functions 

### Required environment variables
- `GROQ_API_KEY` — AI email generation
- EmailJS public key, service ID, and template ID — configured in client for anonymous send

---

## Summary of Key User-Facing Capabilities

1. **Find representatives** by Victorian postcode across federal, state, and local government
2. **Resolve ambiguous electorates** with interactive maps and suburb lists
3. **Choose a topic** from presets or enter a custom issue
4. **Optionally contact a university Vice-Chancellor**
5. **Select which representatives** to email with party filters and bulk controls
6. **Get an AI-drafted email** personalised to topic and recipients
7. **Edit the draft** freely before sending
8. **Send anonymously**, via your own email app, or by copying fields manually
9. **Automatic CC** to campaign monitoring addresses
10. **Navigate back and forth** between all steps without losing progress within a session

---

*Document generated from the WriteEZ codebase. Last updated: August 2026.*
