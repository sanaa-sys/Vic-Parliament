// src/components/Step1.jsx
// Postcode entry + disambiguation stages:
//   Stage 1: Federal electorate picker  (if spans multiple federal divisions)
//   Stage 2: State Assembly district picker (if spans multiple districts)
//   Stage 3: Council / ward picker (only shown when postcode spans multiple councils)

import { useState, useEffect } from 'react';
import { isDataLoaded, lookupPostcode } from '../hooks/useMembers';
import SuburbPicker  from './SuburbPicker';
import StatePicker   from './StatePicker';
import CouncilPicker from './CouncilPicker';

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

const STAGE = { NONE: 'none', FEDERAL: 'federal', DISTRICT: 'district', COUNCIL: 'council' };

export default function Step1({ onNext }) {
  const [postcode, setPostcode] = useState('');
  const [topic,       setTopic]       = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [error,    setError]    = useState('');
  const [stage,    setStage]    = useState(STAGE.NONE);
  const [lookup,   setLookup]   = useState(null);

  // State district multi data
  const [districtData,  setDistrictData]  = useState(null);
  const [districtsList, setDistrictsList] = useState(null);

  // Council data
  const [councilData,    setCouncilData]    = useState(null); // {councilName: {mayor,...}}
  const [councilWardMap, setCouncilWardMap] = useState(null); // {councilName: [ward,...]} for current pc

  // Load state and council data on mount
  useEffect(() => {
    fetch('/postcode_district_suburbs.json').then(r => r.json()).then(setDistrictData).catch(() => {});
    fetch('/council_data.json').then(r => r.json()).then(setCouncilData).catch(() => {});
  }, []);

  function handleFind() {
    setError('');
    setStage(STAGE.NONE);
    setLookup(null);

    if (!isDataLoaded()) { setError('data.js not loaded.'); return; }
    if (postcode.length !== 4 || !/^\d+$/.test(postcode)) {
      setError('Please enter a valid 4-digit Victorian postcode.');
      return;
    }
    if (!postcode.startsWith('3')) {
      setError('Victorian postcodes start with 3.');
      return;
    }
    const result = lookupPostcode(postcode);
    if (!result) { setError(`Postcode ${postcode} not found.`); return; }

    // If user selected 'other' and typed a custom topic, use that as the topic
    // The generate-email API falls back to raw string if not a known TOPIC_LABELS key
    const effectiveTopic = (topic === 'other' && customTopic.trim())
      ? customTopic.trim()
      : topic || 'other';
    const baseLookup = { postcode, topic: effectiveTopic, ...result };
    setLookup(baseLookup);

    // Determine first stage needed
    if (result.divisions.length > 1) {
      setStage(STAGE.FEDERAL);
    } else if (districtData && Object.keys(districtData[postcode] || {}).length > 1) {
      setDistrictsList(Object.keys(districtData[postcode]));
      setStage(STAGE.DISTRICT);
    } else {
      // Go straight to council picker
      loadCouncilStage(postcode, baseLookup);
    }
  }

  function loadCouncilStage(pc, currentLookup) {
    fetch('/postcode_council_map.json')
      .then(r => r.json())
      .then(data => {
        const cwMap = data[pc] || {};
        const councilCount = Object.keys(cwMap).length;

        // Only show the council picker if there are multiple councils
        // For a single council, resolve it automatically and proceed
        if (councilCount <= 1) {
          const council = Object.keys(cwMap)[0] || null;
          const info    = council ? (councilData?.[council] ?? {}) : {};
          proceed({
            ...(currentLookup),
            council,
            ward:          null,
            councilInfo:   info,
            councilWardMap: cwMap,
          });
          return;
        }

        setCouncilWardMap(cwMap);
        setLookup(prev => ({ ...(prev || currentLookup), councilWardMap: cwMap }));
        setStage(STAGE.COUNCIL);
      })
      .catch(() => {
        // If council data unavailable, skip to next step
        proceed(currentLookup);
      });
  }

  function handleFederalSelected(chosenDivision) {
    const updated = {
      ...lookup,
      division:   chosenDivision,
      divisions:  [chosenDivision],
      federalRep: window.REPRESENTATIVES?.[chosenDivision] ?? lookup.federalRep,
    };
    setLookup(updated);

    const districtOptions = districtData
      ? Object.keys(districtData[lookup.postcode] ?? {})
      : [];
    if (districtOptions.length > 1) {
      setDistrictsList(districtOptions);
      setStage(STAGE.DISTRICT);
    } else {
      loadCouncilStage(lookup.postcode, updated);
    }
  }

  function handleDistrictSelected(chosenDistrict) {
    const asmMember = window.ASSEMBLY_MEMBERS?.[chosenDistrict] ?? lookup.assemblyMember;
    const updated   = {
      ...lookup,
      district:       chosenDistrict,
      assemblyMember: asmMember,
    };
    setLookup(updated);
    loadCouncilStage(lookup.postcode, updated);
  }

  function handleCouncilSelected({ council, ward }) {
    const info = councilData?.[council] ?? {};
    proceed({
      ...lookup,
      council,
      ward:           ward || null,
      councilInfo:    info,
      councilWardMap,
    });
  }

  function proceed(finalLookup) {
    setStage(STAGE.NONE);
    onNext(finalLookup);
  }

  const federalElectorateSuburbs = lookup?.divisions
    ? Object.fromEntries(lookup.divisions.map(d => [d, []]))
    : null;

  const totalStages = (() => {
    let n = 0;
    if (lookup?.divisions?.length > 1) n++;
    if (districtsList?.length > 1) n++;
    if (councilWardMap && Object.keys(councilWardMap).length > 1) n++;
    return n;
  })();

  const stageNumber = (() => {
    if (stage === STAGE.FEDERAL) return 1;
    if (stage === STAGE.DISTRICT) return lookup?.divisions?.length > 1 ? 2 : 1;
    if (stage === STAGE.COUNCIL) {
      let n = 1;
      if (lookup?.divisions?.length > 1) n++;
      if (districtsList?.length > 1) n++;
      return n;
    }
    return 0;
  })();

  return (
    <div>
      <div className="hero">
        <div style={{
          fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
          color: 'var(--color-text-secondary)', marginBottom: 6,
          textTransform: 'uppercase',
        }}>
          WriteEZ — an easy way to write petitions
        </div>
        <h1>Contact your representatives</h1>
        <p>
          Find your federal, state and local government representatives,
          then send a personalised email about any issue that matters to you.
        </p>
      </div>

      {!isDataLoaded() && (
        <div className="error-banner">
          ⚠️ <strong>data.js not loaded.</strong> Add it to <code>client/src/data/data.js</code>.
        </div>
      )}

      <div className="card">
        <div className="label">Your Victorian postcode</div>
        <input
          type="text" className="postcode-input"
          placeholder="e.g. 3000, 3029, 3182…"
          maxLength={4} inputMode="numeric" value={postcode}
          onChange={e => { setPostcode(e.target.value); setError(''); setStage(STAGE.NONE); }}
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
        <select value={topic} onChange={e => {
          setTopic(e.target.value);
          if (e.target.value !== 'other') setCustomTopic('');
        }}>
          <option value="">Select a topic…</option>
          {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {topic === 'other' && (
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder="Describe your topic e.g. 'road safety on Bridge Road'"
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: customTopic.trim()
                  ? '1.5px solid var(--color-accent)'
                  : '0.5px solid var(--color-border)',
                fontSize: 13,
                color: 'var(--color-text)',
                background: 'var(--color-bg)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              autoFocus
            />
            <div style={{
              fontSize: 11, marginTop: 5,
              color: customTopic.trim()
                ? 'var(--color-text-secondary)'
                : '#d97706',
            }}>
              {customTopic.trim()
                ? `Your email will be about: "${customTopic.trim()}"`
                : 'Please describe your topic so the email can be personalised'}
            </div>
          </div>
        )}
      </div>

      {stage === STAGE.NONE && (
        <div className="btns">
          <button
            className="btn btn-primary"
            onClick={handleFind}
            disabled={topic === 'other' && !customTopic.trim()}
            style={{
              opacity: (topic === 'other' && !customTopic.trim()) ? 0.45 : 1,
              cursor:  (topic === 'other' && !customTopic.trim()) ? 'default' : 'pointer',
            }}
          >
            Find my representatives →
          </button>
        </div>
      )}

      {stage === STAGE.FEDERAL && federalElectorateSuburbs && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
            Step {stageNumber} of {totalStages} — Federal electorate
          </div>
          <SuburbPicker
            postcode={postcode}
            electorateSuburbs={federalElectorateSuburbs}
            onSelect={handleFederalSelected}
          />
        </>
      )}

      {stage === STAGE.DISTRICT && districtsList && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
            Step {stageNumber} of {totalStages} — State Assembly district
          </div>
          <StatePicker
            postcode={postcode} mode="district" options={districtsList}
            onSelect={handleDistrictSelected}
          />
        </>
      )}

      {stage === STAGE.COUNCIL && councilWardMap && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
            Step {stageNumber} of {totalStages} — Local council
          </div>
          <CouncilPicker
            postcode={postcode}
            councilWardMap={councilWardMap}
            councilData={councilData || {}}
            onSelect={handleCouncilSelected}
          />
        </>
      )}
    </div>
  );
}
