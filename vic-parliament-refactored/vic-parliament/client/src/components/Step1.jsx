// src/components/Step1.jsx
// Postcode entry + disambiguation stages:
//   Stage 1: Federal electorate picker  (if spans multiple federal divisions)
//   Stage 2: State Assembly district picker (if spans multiple districts)
//   Stage 3: Legislative Council region picker (if spans multiple regions)
//   Stage 4: Council / ward picker (always shown — may span multiple councils)

import { useState, useEffect } from 'react';
import { isDataLoaded, lookupPostcode, getCouncilMembers } from '../hooks/useMembers';
import SuburbPicker  from './SuburbPicker';
import StatePicker   from './StatePicker';
import CouncilPicker from './CouncilPicker';
import { UNIVERSITIES } from '../data/universities';

const TOPICS = [
  { value: 'islamophobia', label: 'Islamophobia & anti-Muslim hate' },
  { value: 'international', label: 'International affairs' },
  { value: 'climate',       label: 'Climate & environment' },
  { value: 'housing',       label: 'Housing affordability' },
  { value: 'health',        label: 'Healthcare & hospitals' },
  { value: 'transport',     label: 'Public transport' },
  { value: 'education',     label: 'Education & universities' },
  { value: 'cost',          label: 'Cost of living' },
  { value: 'other',         label: 'Other' },
];

const STAGE = { NONE: 'none', FEDERAL: 'federal', DISTRICT: 'district', REGION: 'region', COUNCIL: 'council' };

/** Vicmap LGA layer uses short names ("Melbourne"), not "Melbourne City Council". */
function lgaShortName(name) {
  return String(name || '')
    .replace(/\s+Council$/i, '')
    .replace(/\s+(Rural City|City|Shire|Borough)$/i, '')
    .trim();
}

function withHttp(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function formatCouncilAddress(contact) {
  if (!contact) return '';
  return [contact.street_address, contact.suburb, contact.postcode]
    .filter(Boolean)
    .join(', ');
}

/** Flatten local_council_list.json ({ lgas: [...] }) into { [councilName]: { mayor, email, shortName, ... } }. */
function indexLocalCouncilList(raw) {
  const lgas = Array.isArray(raw?.lgas) ? raw.lgas : (Array.isArray(raw) ? raw : []);
  const map = {};
  for (const lga of lgas) {
    const name = lga?.name;
    if (!name) continue;
    const cd = lga.contact_data || {};
    const contact = cd.contact || {};
    const mayor = cd.mayor || {};
    const ceo = cd.ceo || {};
    const deputyMayor = typeof cd.deputy_mayor === 'string'
      ? cd.deputy_mayor
      : (cd.deputy_mayor?.name || '');
    map[name] = {
      shortName: lgaShortName(name),
      mayor: mayor.name || '',
      mayorTitle: mayor.title || (mayor.is_administrator ? 'Administrator' : 'Mayor'),
      ceo: ceo.name || '',
      deputyMayor: deputyMayor.trim(),
      phone: contact.phone || '',
      email: contact.email || '',
      website: withHttp(contact.website),
      address: formatCouncilAddress(contact),
    };
  }
  return map;
}

export default function Step1({ onNext }) {
  const [postcode,        setPostcode]        = useState('');
  const [topic,           setTopic]           = useState('');
  const [customTopic,     setCustomTopic]     = useState('');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [desiredOutcome,  setDesiredOutcome]  = useState('');
  const [error,           setError]           = useState('');
  const [stage,    setStage]    = useState(STAGE.NONE);
  const [lookup,   setLookup]   = useState(null);
    const [university, setUniversity] = useState(''); 

  const [districtsList, setDistrictsList] = useState(null);
  const [regionsList,   setRegionsList]   = useState(null);

  // Council data
  const [councilData,    setCouncilData]    = useState(null); // {councilName: {mayor,...}}
  const [councilWardMap, setCouncilWardMap] = useState(null); // {councilName: [ward,...]} for current pc

  // Pending selections for multi-step navigation
  const [pendingFederal,  setPendingFederal]  = useState(null);
  const [pendingDistrict, setPendingDistrict] = useState(null);
  const [pendingRegion,   setPendingRegion]   = useState(null);
  const [pendingCouncil,  setPendingCouncil]  = useState(null);

  function countDistricts() {
    return lookup?.districts?.length || districtsList?.length || 0;
  }

  function countRegions() {
    return lookup?.regions?.length || regionsList?.length || 0;
  }

  // Load local council contact data on mount
  useEffect(() => {
    fetch('/local_council_list.json')
      .then(r => r.json())
      .then(raw => setCouncilData(indexLocalCouncilList(raw)))
      .catch(() => {});
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
    if (topic === 'other' && !customTopic.trim()) {
      setError('Please describe your topic.');
      return;
    }
    if (topic === 'islamophobia' && !incidentDetails.trim()) {
      setError('Please describe the incident details.');
      return;
    }
    if (topic === 'islamophobia' && !desiredOutcome.trim()) {
      setError('Please describe the desired outcome.');
      return;
    }

    const baseLookup = {
      postcode,
      topic: topic || 'other',
      ...(topic === 'other' && { customTopic: customTopic.trim() }),
      ...(topic === 'islamophobia' && {
        incidentDetails: incidentDetails.trim(),
        desiredOutcome:  desiredOutcome.trim(),
      }),
      ...(topic === 'education' && university && { university }),
      ...result,
    };
    setLookup(baseLookup);
    setDistrictsList(null);
    setRegionsList(null);
    setPendingFederal(null);
    setPendingDistrict(null);
    setPendingRegion(null);
    setPendingCouncil(null);

    goToStage(firstAmbiguousStage(baseLookup), baseLookup, postcode);
  }

  function firstAmbiguousStage(result) {
    if (result.divisions.length > 1) return STAGE.FEDERAL;
    if (result.districts.length > 1) return STAGE.DISTRICT;
    if (result.regions.length > 1)   return STAGE.REGION;
    return STAGE.COUNCIL;
  }

  function stageAfter(current, currentLookup) {
    if (current === STAGE.FEDERAL) {
      if ((currentLookup.districts ?? []).length > 1) return STAGE.DISTRICT;
      if ((currentLookup.regions ?? []).length > 1)   return STAGE.REGION;
      return STAGE.COUNCIL;
    }
    if (current === STAGE.DISTRICT) {
      if ((currentLookup.regions ?? []).length > 1) return STAGE.REGION;
      return STAGE.COUNCIL;
    }
    return STAGE.COUNCIL;
  }

  function goToStage(next, currentLookup, pc) {
    const postcodeToUse = pc || currentLookup.postcode;
    if (next === STAGE.FEDERAL) {
      setStage(STAGE.FEDERAL);
      return;
    }
    if (next === STAGE.DISTRICT) {
      setDistrictsList(currentLookup.districts);
      setStage(STAGE.DISTRICT);
      return;
    }
    if (next === STAGE.REGION) {
      setRegionsList(currentLookup.regions);
      setStage(STAGE.REGION);
      return;
    }
    loadCouncilStage(postcodeToUse, currentLookup);
  }

  function loadCouncilStage(pc, currentLookup) {
    fetch('/postcode_council_map.json')
      .then(r => r.json())
      .then(data => {
        const cwMap = data[pc] || {};
        const councils = Object.keys(cwMap);
        setCouncilWardMap(cwMap);
        if (councils.length === 1) setPendingCouncil(councils[0]);
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
      federalRep: window.REPRESENTATIVES?.[chosenDivision] ?? lookup.federalRep,
    };
    setLookup(updated);
    goToStage(stageAfter(STAGE.FEDERAL, updated), updated);
  }

  function handleDistrictSelected(chosenDistrict) {
    const asmMember = window.ASSEMBLY_MEMBERS?.[chosenDistrict] ?? lookup.assemblyMember;
    const updated   = {
      ...lookup,
      district:       chosenDistrict,
      assemblyMember: asmMember,
    };
    setLookup(updated);
    goToStage(stageAfter(STAGE.DISTRICT, updated), updated);
  }

  function handleRegionSelected(chosenRegion) {
    const updated = {
      ...lookup,
      region:         chosenRegion,
      councilMembers: getCouncilMembers(chosenRegion),
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

  function handleStageBack() {
    if (stage === STAGE.FEDERAL) {
      setStage(STAGE.NONE);
      setLookup(null);
      setDistrictsList(null);
      setRegionsList(null);
      setCouncilWardMap(null);
      setPendingFederal(null);
      setPendingDistrict(null);
      setPendingRegion(null);
      setPendingCouncil(null);
      return;
    }

    if (stage === STAGE.DISTRICT) {
      setPendingDistrict(null);
      setRegionsList(null);
      setCouncilWardMap(null);
      setPendingRegion(null);
      setPendingCouncil(null);
      if (lookup?.divisions?.length > 1) {
        setStage(STAGE.FEDERAL);
        setPendingFederal(lookup.division || null);
      } else {
        setStage(STAGE.NONE);
        setLookup(null);
        setDistrictsList(null);
      }
      return;
    }

    if (stage === STAGE.REGION) {
      setPendingRegion(null);
      setCouncilWardMap(null);
      setPendingCouncil(null);
      if (countDistricts() > 1) {
        setDistrictsList(lookup.districts);
        setStage(STAGE.DISTRICT);
        setPendingDistrict(lookup.district || null);
      } else if (lookup?.divisions?.length > 1) {
        setStage(STAGE.FEDERAL);
        setPendingFederal(lookup.division || null);
      } else {
        setStage(STAGE.NONE);
        setLookup(null);
        setDistrictsList(null);
        setRegionsList(null);
      }
      return;
    }

    if (stage === STAGE.COUNCIL) {
      setPendingCouncil(null);
      setCouncilWardMap(null);
      if (countRegions() > 1) {
        setRegionsList(lookup.regions);
        setStage(STAGE.REGION);
        setPendingRegion(lookup.region || null);
      } else if (countDistricts() > 1) {
        setDistrictsList(lookup.districts);
        setStage(STAGE.DISTRICT);
        setPendingDistrict(lookup.district || null);
      } else if (lookup?.divisions?.length > 1) {
        setStage(STAGE.FEDERAL);
        setPendingFederal(lookup.division || null);
      } else {
        setStage(STAGE.NONE);
        setLookup(null);
        setDistrictsList(null);
        setRegionsList(null);
      }
    }
  }

  function handleStageNext() {
    if (stage === STAGE.FEDERAL && pendingFederal) {
      handleFederalSelected(pendingFederal);
    } else if (stage === STAGE.DISTRICT && pendingDistrict) {
      handleDistrictSelected(pendingDistrict);
    } else if (stage === STAGE.REGION && pendingRegion) {
      handleRegionSelected(pendingRegion);
    } else if (stage === STAGE.COUNCIL && pendingCouncil) {
      handleCouncilSelected({ council: pendingCouncil });
    }
  }

  function canProceed() {
    if (stage === STAGE.FEDERAL)  return !!pendingFederal;
    if (stage === STAGE.DISTRICT) return !!pendingDistrict;
    if (stage === STAGE.REGION)   return !!pendingRegion;
    if (stage === STAGE.COUNCIL)  return !!pendingCouncil;
    return false;
  }

  const federalElectorateSuburbs = lookup?.divisions
    ? Object.fromEntries(lookup.divisions.map(d => [d, []]))
    : null;

  const totalStages = (() => {
    if (!lookup) return 0;
    let n = 0;
    if (lookup.divisions?.length > 1) n++;
    if (countDistricts() > 1) n++;
    if (countRegions() > 1) n++;
    n++; // council always shown
    return n;
  })();

  const multiStep = totalStages > 1;

  const stageNumber = (() => {
    if (stage === STAGE.FEDERAL) return 1;
    if (stage === STAGE.DISTRICT) return lookup?.divisions?.length > 1 ? 2 : 1;
    if (stage === STAGE.REGION) {
      let n = 1;
      if (lookup?.divisions?.length > 1) n++;
      if (countDistricts() > 1) n++;
      return n;
    }
    if (stage === STAGE.COUNCIL) {
      let n = 1;
      if (lookup?.divisions?.length > 1) n++;
      if (countDistricts() > 1) n++;
      if (countRegions() > 1) n++;
      return n;
    }
    return 0;
  })();

  return (
    <div>
      <div className="hero">
        <h1 style={{ color: 'var(--blue)' }}>WriteEZ</h1>
        <p style={{ color: 'var(--ice)', marginTop: 8 }}>
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
              <div className="label">Select a university (optional)</div>
              <select
                  value={university}
                  onChange={e => { setUniversity(e.target.value); setError(''); }}
              >
                  <option value="">Select a university…</option>
                  {UNIVERSITIES.map(u => (
                      <option key={u.university} value={u.university}>
                          {u.university}
                      </option>
                  ))}
                  <option value="">N/A — Do not contact university</option>

              </select>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Select a university to also include its Vice-Chancellor as a recipient
              </div>
          </div>
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
        <select
          value={topic}
          onChange={e => {
            setTopic(e.target.value);
            if (e.target.value !== 'other') setCustomTopic('');
            if (e.target.value !== 'islamophobia') {
              setIncidentDetails('');
              setDesiredOutcome('');
            }
          }}
        >
          <option value="">Select a topic…</option>
          {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {topic === 'other' && (
          <>
            <input
              type="text"
              value={customTopic}
              onChange={e => { setCustomTopic(e.target.value); setError(''); }}
              placeholder="Describe your topic…"
              style={{ marginTop: 10 }}
              onKeyDown={e => e.key === 'Enter' && stage === STAGE.NONE && handleFind()}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Your topic will be used to generate a personalised email draft
            </div>
          </>
        )}
        {topic === 'islamophobia' && (
          <>
            <div className="label" style={{ marginTop: 14 }}>Incident details</div>
            <textarea
              value={incidentDetails}
              onChange={e => { setIncidentDetails(e.target.value); setError(''); }}
              placeholder="What happened? Include when, where, and any relevant context…"
              style={{ marginTop: 6, minHeight: 88 }}
            />
            <div className="label" style={{ marginTop: 14 }}>Desired outcome</div>
            <textarea
              value={desiredOutcome}
              onChange={e => { setDesiredOutcome(e.target.value); setError(''); }}
              placeholder="What would you like representatives to do?"
              style={{ marginTop: 6, minHeight: 88 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              These details will be used to generate a personalised email draft
            </div>
          </>
        )}
      </div>

      {stage === STAGE.NONE && (
        <div className="btns">
          <button className="btn btn-primary" onClick={handleFind}>Find my representatives →</button>
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
            multiStep={multiStep}
            selected={pendingFederal}
            onSelectedChange={setPendingFederal}
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
            multiStep={multiStep}
            selected={pendingDistrict}
            onSelectedChange={setPendingDistrict}
          />
        </>
      )}

      {stage === STAGE.REGION && regionsList && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
            Step {stageNumber} of {totalStages} — Legislative Council region
          </div>
          <StatePicker
            postcode={postcode} mode="region" options={regionsList}
            onSelect={handleRegionSelected}
            multiStep={multiStep}
            selected={pendingRegion}
            onSelectedChange={setPendingRegion}
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
            multiStep={multiStep}
            selected={pendingCouncil}
            onSelectedChange={setPendingCouncil}
          />
        </>
      )}

      {stage !== STAGE.NONE && multiStep && (
        <div className="btns">
          <button className="btn" onClick={handleStageBack}>← Back</button>
          <button
            className="btn btn-primary"
            onClick={handleStageNext}
            disabled={!canProceed()}
          >
            {stageNumber === totalStages ? 'Continue →' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
}
