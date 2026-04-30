// src/components/Step1.jsx
//
// Postcode entry + 3-stage disambiguation:
//   Stage 1: Federal electorate picker  (if postcode spans multiple federal divisions)
//   Stage 2: State Assembly district picker (if postcode spans multiple districts)
//   Stage 3: Proceeds to Step 2
//
// Multi-district data comes from public JSON files built by fetch_openaustralia.py.
// Both pickers display suburb breakdowns so users know which option is theirs.

import { useState, useEffect } from 'react';
import { isDataLoaded, lookupPostcode } from '../hooks/useMembers';
import SuburbPicker from './SuburbPicker';
import StatePicker  from './StatePicker';

const TOPICS = [
  { value: 'islamophobia', label: 'Islamophobia & anti-Muslim hate' },
  { value: 'international', label: 'International affairs' },
  { value: 'climate',       label: 'Climate & environment' },
  { value: 'housing',       label: 'Housing affordability' },
  { value: 'health',        label: 'Healthcare & hospitals' },
  { value: 'transport',     label: 'Public transport' },
  { value: 'education',     label: 'Education & schools' },
  { value: 'cost',          label: 'Cost of living' },
  { value: 'other',         label: 'Other' },
];

// Picker stage:
//   'none'     → show Find button
//   'federal'  → federal electorate disambiguation
//   'district' → state Assembly district disambiguation
const STAGE = { NONE: 'none', FEDERAL: 'federal', DISTRICT: 'district' };

export default function Step1({ onNext }) {
  const [postcode, setPostcode] = useState('');
  const [topic,    setTopic]    = useState('');
  const [error,    setError]    = useState('');
  const [stage,    setStage]    = useState(STAGE.NONE);

  // Accumulated lookup result — built up as user resolves each ambiguity
  const [lookup,   setLookup]   = useState(null);

  // District-level multi data loaded from JSON
  const [districtData,  setDistrictData]  = useState(null); // {postcode: {district: [suburbs]}}
  const [regionData,    setRegionData]    = useState(null); // {postcode: {region: [suburbs]}}
  const [districtsList, setDistrictsList] = useState(null); // [district, ...] for current pc
  const [regionsList,   setRegionsList]   = useState(null); // [region, ...] for current pc

  // ── Load state boundary data on mount ─────────────────────────────────────
  useEffect(() => {
    fetch('/postcode_district_suburbs.json')
      .then(r => r.json()).then(d => setDistrictData(d)).catch(() => {});
    fetch('/postcode_region_suburbs.json')
      .then(r => r.json()).then(d => setRegionData(d)).catch(() => {});
  }, []);

  // ── Step 1: user clicks Find ───────────────────────────────────────────────
  function handleFind() {
    setError('');
    setStage(STAGE.NONE);
    setLookup(null);

    if (!isDataLoaded()) {
      setError('data.js not loaded. Add it to client/src/data/');
      return;
    }
    if (postcode.length !== 4 || !/^\d+$/.test(postcode)) {
      setError('Please enter a valid 4-digit Victorian postcode.');
      return;
    }
    if (!postcode.startsWith('3')) {
      setError('Victorian postcodes start with 3.');
      return;
    }

    const result = lookupPostcode(postcode);
    if (!result) {
      setError(`Postcode ${postcode} not found.`);
      return;
    }

    const baseLookup = { postcode, topic: topic || 'other', ...result };

    // Does this postcode span multiple federal divisions?
    if (result.divisions.length > 1) {
      setLookup(baseLookup);
      setStage(STAGE.FEDERAL);
      return;
    }

    // Does this postcode span multiple state districts?
    const districtOptions = districtData
      ? Object.keys(districtData[postcode] ?? {})
      : [];
    if (districtOptions.length > 1) {
      setLookup(baseLookup);
      setDistrictsList(districtOptions);
      setStage(STAGE.DISTRICT);
      return;
    }

    proceed(baseLookup);
  }

  // ── Stage 2: federal division confirmed ───────────────────────────────────
  function handleFederalSelected(chosenDivision) {
    const updated = {
      ...lookup,
      division:   chosenDivision,
      divisions:  [chosenDivision],
      federalRep: window.REPRESENTATIVES?.[chosenDivision] ?? lookup.federalRep,
    };

    // Now check if state district is also ambiguous
    const districtOptions = districtData
      ? Object.keys(districtData[postcode] ?? {})
      : [];
    if (districtOptions.length > 1) {
      setLookup(updated);
      setDistrictsList(districtOptions);
      setStage(STAGE.DISTRICT);
      return;
    }

    proceed(updated);
  }

  // ── Stage 3: state district confirmed ────────────────────────────────────
  function handleDistrictSelected(chosenDistrict) {
    const asmMember = window.ASSEMBLY_MEMBERS?.[chosenDistrict] ?? lookup.assemblyMember;

    // Resolve council region — if ambiguous, show the first matching region
    const regionOptions = regionData
      ? Object.keys(regionData[postcode] ?? {})
      : [];
    const region = regionOptions.length === 1
      ? regionOptions[0]
      : (lookup.region ?? regionOptions[0] ?? null);

    const councilMembers = region
      ? (window.COUNCIL_MEMBERS?.[region] ?? lookup.councilMembers)
      : [];

    proceed({
      ...lookup,
      district:       chosenDistrict,
      assemblyMember: asmMember,
      assemblyMembers: asmMember ? [asmMember] : [],
      region,
      councilMembers,
    });
  }

  function proceed(finalLookup) {
    setStage(STAGE.NONE);
    onNext(finalLookup);
  }

  // ── Federal electorate suburbs for SuburbPicker ───────────────────────────
  const federalElectorateSuburbs = lookup?.divisions
    ? Object.fromEntries(lookup.divisions.map(d => [d, []]))
    : null;

  return (
    <div>
      <div className="hero">
        <h1>Contact your representatives</h1>
        <p>
          Find your federal and Victorian state representatives, then send a
          personalised email about any issue that matters to you.
        </p>
      </div>

      {!isDataLoaded() && (
        <div className="error-banner">
          ⚠️ <strong>data.js not loaded.</strong> Add it to <code>client/src/data/data.js</code>.
        </div>
      )}

      {/* Input fields — always visible */}
      <div className="card">
        <div className="label">Your Victorian postcode</div>
        <input
          type="text"
          className="postcode-input"
          placeholder="e.g. 3000, 3029, 3182…"
          maxLength={4}
          inputMode="numeric"
          value={postcode}
          onChange={e => {
            setPostcode(e.target.value);
            setError('');
            setStage(STAGE.NONE);
          }}
          onKeyDown={e => e.key === 'Enter' && handleFind()}
        />
        {error
          ? <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-danger)' }}>{error}</div>
          : <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Enter your 4-digit Victorian postcode
            </div>
        }
      </div>

      <div className="card">
        <div className="label">What's this about?</div>
        <select value={topic} onChange={e => setTopic(e.target.value)}>
          <option value="">Select a topic…</option>
          {TOPICS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Find button — only when no picker is active */}
      {stage === STAGE.NONE && (
        <div className="btns">
          <button className="btn btn-primary" onClick={handleFind}>
            Find my MPs →
          </button>
        </div>
      )}

      {/* Federal division picker */}
      {stage === STAGE.FEDERAL && federalElectorateSuburbs && (
        <>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
            marginBottom: 8, marginTop: 4,
          }}>
            Step 1 of 2 — Federal electorate
          </div>
          <SuburbPicker
            postcode={postcode}
            electorateSuburbs={federalElectorateSuburbs}
            onSelect={handleFederalSelected}
          />
        </>
      )}

      {/* State district picker */}
      {stage === STAGE.DISTRICT && districtsList && (
        <>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
            marginBottom: 8, marginTop: 4,
          }}>
            {lookup?.divisions?.length > 1
              ? 'Step 2 of 2 — State Assembly district'
              : 'Step 1 of 1 — State Assembly district'
            }
          </div>
          <StatePicker
            postcode={postcode}
            mode="district"
            options={districtsList}
            onSelect={handleDistrictSelected}
          />
        </>
      )}
    </div>
  );
}
