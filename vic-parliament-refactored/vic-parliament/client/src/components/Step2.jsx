// src/components/Step2.jsx
import { useState } from 'react';
import MemberRow from './MemberRow';

export default function Step2({ lookup, onNext, onBack }) {
  const { postcode, division, district, region,
          federalRep, senators, assemblyMember, councilMembers,
          council, ward, councilInfo } = lookup;

  // Selection state
  const [repSel,      setRepSel]      = useState(true);
  const [senSel,      setSenSel]      = useState(
    () => Object.fromEntries(senators.map(s => [s.member_id, true]))
  );
  const [asmSel,      setAsmSel]      = useState(true);
  const [councilSel,  setCouncilSel]  = useState(
    () => Object.fromEntries(councilMembers.map(m => [m.email, true]))
  );
  const [lgaSel, setLgaSel] = useState(true);   // local council (mayor/CEO)

  function toggleSen(id) {
    setSenSel(prev => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleCouncil(email) {
    setCouncilSel(prev => ({ ...prev, [email]: !prev[email] }));
  }
  function allSenators(val) {
    setSenSel(Object.fromEntries(senators.map(s => [s.member_id, val])));
  }
  function allCouncil(val) {
    setCouncilSel(Object.fromEntries(councilMembers.map(m => [m.email, val])));
  }

  function handleNext() {
    const selected = [];
    if (repSel && federalRep)   selected.push(federalRep);
    senators.forEach(s => { if (senSel[s.member_id])  selected.push(s); });
    if (asmSel && assemblyMember) selected.push(assemblyMember);
    councilMembers.forEach(m => { if (councilSel[m.email]) selected.push(m); });
    // Local council — add as contact target if selected and has email
    if (lgaSel && councilInfo?.email) {
      selected.push({
        name:    councilInfo.mayor || councilInfo.name,
        email:   councilInfo.email,
        phone:   councilInfo.phone || '',
        party:   '',
        chamber: 'lga',
        council: council,
        ward:    ward || '',
        website: councilInfo.website || '',
      });
    }
    onNext({ selected, repSel, senSel, asmSel, councilSel, lgaSel });
  }

  const descParts = [];
  if (division) descParts.push(`Federal: ${division}`);
  if (district) descParts.push(`Assembly: ${district}`);
  if (region)   descParts.push(`Council: ${region}`);
  if (council)  descParts.push(`Local: ${council}${ward ? `, ${ward} Ward` : ''}`);

  return (
    <div>
      <div className="section-title">Your representatives</div>
      <div className="section-sub">
        Postcode {postcode} · {descParts.join(' · ')}
      </div>

      {/* Federal Rep */}
      <div className="label" style={{ marginBottom: 8 }}>
        Federal — House of Representatives
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        {federalRep ? (
          <MemberRow
            member={federalRep}
            tagLabel="Representative"
            tagClass="tag-rep"
            electorateLabel={`Division of ${federalRep.electorate}`}
            checked={repSel}
            onChange={() => setRepSel(p => !p)}
            isLast
          />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '4px 0' }}>
            No federal representative data found for postcode {postcode}.
          </div>
        )}
      </div>

      {/* Senators */}
      <div className="label" style={{ marginBottom: 8 }}>
        Federal — Victorian Senators (12){' '}
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, marginLeft: 8 }}>
          <button className="btn btn-sm" onClick={() => allSenators(true)}  style={{ padding: '2px 10px', fontSize: 11 }}>All</button>{' '}
          <button className="btn btn-sm" onClick={() => allSenators(false)} style={{ padding: '2px 10px', fontSize: 11 }}>None</button>
        </span>
      </div>
      <div className="card" style={{ padding: '8px 12px', marginBottom: 16 }}>
        {senators.map((s, i) => (
          <MemberRow
            key={s.member_id}
            member={s}
            tagLabel="Senator"
            tagClass="tag-senate"
            electorateLabel={null}
            checked={!!senSel[s.member_id]}
            onChange={() => toggleSen(s.member_id)}
            isLast={i === senators.length - 1}
          />
        ))}
      </div>

      {/* Assembly */}
      <div className="label" style={{ marginBottom: 8 }}>
        State — Legislative Assembly
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        {assemblyMember ? (
          <MemberRow
            member={assemblyMember}
            tagLabel="Assembly"
            tagClass="tag-state-asm"
            electorateLabel={`District of ${assemblyMember.electorate}`}
            checked={asmSel}
            onChange={() => setAsmSel(p => !p)}
            isLast
          />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '4px 0' }}>
            No Assembly member data found for district {district || 'unknown'}.
          </div>
        )}
      </div>

      {/* Council */}
      <div className="label" style={{ marginBottom: 8 }}>
        State — Legislative Council (5 members for your region){' '}
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, marginLeft: 8 }}>
          <button className="btn btn-sm" onClick={() => allCouncil(true)}  style={{ padding: '2px 10px', fontSize: 11 }}>All</button>{' '}
          <button className="btn btn-sm" onClick={() => allCouncil(false)} style={{ padding: '2px 10px', fontSize: 11 }}>None</button>
        </span>
      </div>
      <div className="card" style={{ padding: '8px 12px' }}>
        {councilMembers.length > 0 ? councilMembers.map((m, i) => (
          <MemberRow
            key={m.email}
            member={m}
            tagLabel="MLC"
            tagClass="tag-state-cou"
            electorateLabel={m.electorate}
            checked={!!councilSel[m.email]}
            onChange={() => toggleCouncil(m.email)}
            isLast={i === councilMembers.length - 1}
          />
        )) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '4px 0' }}>
            No Council region data found for postcode {postcode}.
          </div>
        )}
      </div>

      {/* Local Council (LGA) */}
      {council && councilInfo && (
        <>
          <div className="label" style={{ marginBottom: 8 }}>
            Local Council
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <input
                type="checkbox" checked={lgaSel}
                onChange={e => setLgaSel(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                  {council}
                  {ward && ward !== 'Unsubdivided' && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 500,
                      background: 'var(--color-bg-secondary)',
                      border: '0.5px solid var(--color-border)',
                      borderRadius: 12, padding: '2px 8px',
                      color: 'var(--color-text-secondary)',
                    }}>
                      {ward} Ward
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Mayor: {councilInfo.mayor}
                </div>
                {councilInfo.phone && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Phone: <a href={`tel:${councilInfo.phone}`} style={{ color: 'var(--color-accent)' }}>{councilInfo.phone}</a>
                  </div>
                )}
                {councilInfo.email && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Email: <a href={`mailto:${councilInfo.email}`} style={{ color: 'var(--color-accent)' }}>{councilInfo.email}</a>
                  </div>
                )}
                {councilInfo.website && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <a href={councilInfo.website} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                      {councilInfo.website.replace('https://','').replace('http://','')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="btns">
        <button className="btn" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={handleNext}>
          Next: Write email →
        </button>
      </div>
    </div>
  );
}
