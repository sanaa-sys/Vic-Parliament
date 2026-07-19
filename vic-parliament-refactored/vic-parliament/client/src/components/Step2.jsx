// src/components/Step2.jsx
import { useState, useMemo } from 'react';
import MemberRow from './MemberRow';
import { UNIVERSITIES } from '../data/universities';

export default function Step2({ lookup, onNext, onBack }) {
    const { postcode, division, district, region,
        federalRep, senators, assemblyMember, councilMembers,
        council, ward, councilInfo, university } = lookup;

    const vcData = university
        ? UNIVERSITIES.find(u => u.university === university)
        : null;

    const [repSel, setRepSel] = useState(true);
    const [senSel, setSenSel] = useState(
        () => Object.fromEntries(senators.map(s => [s.member_id, true]))
    );
    const [asmSel, setAsmSel] = useState(true);
    const [councilSel, setCouncilSel] = useState(
        () => Object.fromEntries(councilMembers.map(m => [m.email, true]))
    );
    const [lgaSel, setLgaSel] = useState(true);
    const [vcSel, setVcSel] = useState(true);

    const [senPartyFilter, setSenPartyFilter] = useState('');
    const [councilPartyFilter, setCouncilPartyFilter] = useState('');

    const senatorParties = useMemo(
        () => [...new Set(senators.map(s => s.party).filter(Boolean))].sort(),
        [senators]
    );
    const councilParties = useMemo(
        () => [...new Set(councilMembers.map(m => m.party).filter(Boolean))].sort(),
        [councilMembers]
    );

    const filteredSenators = useMemo(
        () => senPartyFilter ? senators.filter(s => s.party === senPartyFilter) : senators,
        [senators, senPartyFilter]
    );
    const filteredCouncilMembers = useMemo(
        () => councilPartyFilter ? councilMembers.filter(m => m.party === councilPartyFilter) : councilMembers,
        [councilMembers, councilPartyFilter]
    );

    function toggleSen(id) {
        setSenSel(prev => ({ ...prev, [id]: !prev[id] }));
    }
    function toggleCouncil(email) {
        setCouncilSel(prev => ({ ...prev, [email]: !prev[email] }));
    }
    function allSenators(val) {
        setSenSel(prev => ({
            ...prev,
            ...Object.fromEntries(filteredSenators.map(s => [s.member_id, val])),
        }));
    }
    function allCouncil(val) {
        setCouncilSel(prev => ({
            ...prev,
            ...Object.fromEntries(filteredCouncilMembers.map(m => [m.email, val])),
        }));
    }

    function handleNext() {
        const selected = [];
        if (repSel && federalRep) selected.push(federalRep);
        senators.forEach(s => { if (senSel[s.member_id]) selected.push(s); });
        if (asmSel && assemblyMember) selected.push(assemblyMember);
        councilMembers.forEach(m => { if (councilSel[m.email]) selected.push(m); });
        if (lgaSel && councilInfo?.email) {
            selected.push({
                name: councilInfo.mayor || councilInfo.name,
                email: councilInfo.email,
                phone: councilInfo.phone || '',
                party: '',
                chamber: 'lga',
                council: council,
                ward: ward || '',
                website: councilInfo.website || '',
            });
        }
        if (vcSel && vcData) {
            selected.push({
                name: vcData.name,
                email: vcData.email,
                phone: vcData.phone,
                party: '',
                chamber: 'university',
                university: vcData.university,
                position: vcData.position,
            });
        }
        onNext({ selected, repSel, senSel, asmSel, councilSel, lgaSel, vcSel });
    }

    const descParts = [];
    if (division) descParts.push(`Federal: ${division}`);
    if (district) descParts.push(`Assembly: ${district}`);
    if (region) descParts.push(`Council: ${region}`);
    if (council) descParts.push(`Local: ${council}${ward ? `, ${ward} Ward` : ''}`);
    if (university) descParts.push(`University: ${university}`);

    const filterSelectStyle = {
        fontSize: 11,
        padding: '2px 24px 2px 6px',
        borderRadius: 6,
        border: '0.5px solid var(--color-border-secondary)',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        width: 'auto',
        maxWidth: 140,
    };

    const filterControlsStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
        flexWrap: 'wrap',
    };

    const filterBtnStyle = { padding: '2px 10px', fontSize: 11 };

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
            <div style={{ marginBottom: 8 }}>
                <div className="label" style={{ marginBottom: 0 }}>
                    Federal — Victorian Senators (12)
                </div>
                <div style={filterControlsStyle}>
                    {senatorParties.length > 1 && (
                        <select
                            value={senPartyFilter}
                            onChange={e => setSenPartyFilter(e.target.value)}
                            style={filterSelectStyle}
                        >
                            <option value="">All parties</option>
                            {senatorParties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    )}
                    <button className="btn btn-sm" onClick={() => allSenators(true)} style={filterBtnStyle}>All</button>
                    <button className="btn btn-sm" onClick={() => allSenators(false)} style={filterBtnStyle}>None</button>
                </div>
            </div>
            <div className="card" style={{ padding: '8px 12px', marginBottom: 16 }}>
                {filteredSenators.length > 0 ? filteredSenators.map((s, i) => (
                    <MemberRow
                        key={s.member_id}
                        member={s}
                        tagLabel="Senator"
                        tagClass="tag-senate"
                        electorateLabel={null}
                        checked={!!senSel[s.member_id]}
                        onChange={() => toggleSen(s.member_id)}
                        isLast={i === filteredSenators.length - 1}
                    />
                )) : (
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '4px 0' }}>
                        No senators match "{senPartyFilter}".
                    </div>
                )}
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
            <div style={{ marginBottom: 8 }}>
                <div className="label" style={{ marginBottom: 0 }}>
                    State — Legislative Council (5 members for your region)
                </div>
                <div style={filterControlsStyle}>
                    {councilParties.length > 1 && (
                        <select
                            value={councilPartyFilter}
                            onChange={e => setCouncilPartyFilter(e.target.value)}
                            style={filterSelectStyle}
                        >
                            <option value="">All parties</option>
                            {councilParties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    )}
                    <button className="btn btn-sm" onClick={() => allCouncil(true)} style={filterBtnStyle}>All</button>
                    <button className="btn btn-sm" onClick={() => allCouncil(false)} style={filterBtnStyle}>None</button>
                </div>
            </div>
            <div className="card" style={{ padding: '8px 12px', marginBottom: 16 }}>
                {filteredCouncilMembers.length > 0 ? filteredCouncilMembers.map((m, i) => (
                    <MemberRow
                        key={m.email}
                        member={m}
                        tagLabel="MLC"
                        tagClass="tag-state-cou"
                        electorateLabel={m.electorate}
                        checked={!!councilSel[m.email]}
                        onChange={() => toggleCouncil(m.email)}
                        isLast={i === filteredCouncilMembers.length - 1}
                    />
                )) : (
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '4px 0' }}>
                        {councilMembers.length === 0
                            ? `No Council region data found for postcode ${postcode}.`
                            : `No council members match "${councilPartyFilter}".`}
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
                                            {councilInfo.website.replace('https://', '').replace('http://', '')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* University Vice-Chancellor - NEW */}
            {university && vcData && (
                <>
                    <div className="label" style={{ marginBottom: 8 }}>
                        University Vice-Chancellor
                    </div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                            <input
                                type="checkbox" checked={vcSel}
                                onChange={e => setVcSel(e.target.checked)}
                                style={{ marginTop: 2 }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                                    {vcData.university}
                                    <span style={{
                                        marginLeft: 8, fontSize: 11, fontWeight: 500,
                                        background: 'var(--color-bg-secondary)',
                                        border: '0.5px solid var(--color-border)',
                                        borderRadius: 12, padding: '2px 8px',
                                        color: 'var(--color-text-secondary)',
                                    }}>
                                        {vcData.position}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                                    Name: {vcData.name}
                                </div>
                                {vcData.phone && (
                                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                        Phone: <a href={`tel:${vcData.phone}`} style={{ color: 'var(--color-accent)' }}>{vcData.phone}</a>
                                    </div>
                                )}
                                {vcData.email && (
                                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                        Email: <a href={`mailto:${vcData.email}`} style={{ color: 'var(--color-accent)' }}>{vcData.email}</a>
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