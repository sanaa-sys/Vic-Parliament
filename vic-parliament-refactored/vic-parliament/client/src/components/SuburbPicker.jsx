// src/components/SuburbPicker.jsx
// Federal electorate picker for split postcodes.
// Uses LeafletMap for all map rendering — no Leaflet code here.

import { useState, useEffect, useCallback } from 'react';
import LeafletMap from './LeafletMap';

const PALETTE = [
  { fill: '#3b82f6', border: '#1d4ed8', text: '#1e40af' },
  { fill: '#f97316', border: '#c2410c', text: '#9a3412' },
  { fill: '#10b981', border: '#047857', text: '#065f46' },
  { fill: '#8b5cf6', border: '#6d28d9', text: '#4c1d95' },
  { fill: '#ef4444', border: '#b91c1c', text: '#991b1b' },
];

// Fetches /electorates.json (bundled) and returns only the features needed
async function fetchElectorateFeatures(electorateNames) {
  const res  = await fetch('/electorates.json');
  if (!res.ok) throw new Error(`Could not load electorates.json (${res.status})`);
  const data = await res.json();

  const features = electorateNames
    .map(name => {
      const feat = data.features.find(
        f => f.properties.name.toLowerCase() === name.toLowerCase()
      );
      return feat ? { name, geojson: feat } : null;
    })
    .filter(Boolean);

  return { features };
}

export default function SuburbPicker({ postcode, electorateSuburbs, onSelect }) {
  const [richSuburbs, setRichSuburbs] = useState(electorateSuburbs);
  const [selected,    setSelected]    = useState(null);

  const electorates = Object.keys(richSuburbs);

  // Cross-boundary suburbs (appear under >1 electorate)
  const allFlat    = electorates.flatMap(e => richSuburbs[e] ?? []);
  const counts     = allFlat.reduce((a, s) => { a[s] = (a[s] ?? 0) + 1; return a; }, {});
  const crossBound = Object.keys(counts).filter(s => counts[s] > 1);

  // Enrich suburb lists from JSON
  useEffect(() => {
    fetch('/postcode_electorate_suburbs.json')
      .then(r => r.json())
      .then(data => {
        const entry = data[postcode];
        if (!entry) return;
        const merged = {};
        electorates.forEach(elec => {
          const key = Object.keys(entry).find(k => k.toLowerCase() === elec.toLowerCase());
          merged[elec] = key ? entry[key] : (electorateSuburbs[elec] ?? []);
        });
        setRichSuburbs(merged);
      })
      .catch(() => {});
  }, [postcode]);

  // Stable fetchFeatures passed to LeafletMap
  const fetchFeatures = useCallback(
    () => fetchElectorateFeatures(electorates),
    [electorates.join(',')]
  );

  return (
    <div style={{ marginBottom: 16 }}>

      {/* Warning */}
      <div style={{
        background: '#fefce8', border: '0.5px solid #d97706',
        borderRadius: 'var(--radius-md)', padding: '10px 14px',
        marginBottom: 8, fontSize: 13, color: '#92400e',
      }}>
        ⚠️ Postcode <strong>{postcode}</strong> spans{' '}
        <strong>{electorates.length} federal electorates</strong>.
        Select yours on the map or from the list below.
      </div>

      {/* AEC link */}
      <div style={{
        background: '#f0f9ff', border: '0.5px solid #0ea5e9',
        borderRadius: 'var(--radius-md)', padding: '8px 14px',
        marginBottom: 12, fontSize: 12, color: '#0369a1',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>🔍</span>
        <span>Not sure?{' '}
          <a href="https://electorate.aec.gov.au/" target="_blank" rel="noreferrer"
             style={{ color: '#0369a1', fontWeight: 600 }}>
            Search your address on the AEC electorate finder →
          </a>
        </span>
      </div>

      {/* Map */}
      <div style={{ marginBottom: 12 }}>
        <LeafletMap
          fetchFeatures={fetchFeatures}
          selected={selected}
          onSelect={setSelected}
          palette={PALETTE}
          height={300}
        />
      </div>

      {/* Electorate cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {electorates.map((elec, idx) => {
          const colour     = PALETTE[idx % PALETTE.length];
          const isSelected = selected === elec;
          const suburbs    = richSuburbs[elec] ?? [];

          return (
            <div key={elec} onClick={() => setSelected(elec)} style={{
              border:       isSelected ? `2px solid ${colour.border}` : '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              cursor: 'pointer',
              background:   isSelected ? `${colour.fill}18` : 'var(--color-bg)',
              transition:   'all 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  background: colour.fill, border: `2px solid ${colour.border}`,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                    Division of {elec}
                  </div>
                  {suburbs.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {suburbs.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border:     isSelected ? `5px solid ${colour.border}` : '2px solid var(--color-border-secondary)',
                  background: isSelected ? colour.fill : 'transparent',
                  transition: 'all 0.15s',
                }} />
              </div>
              {isSelected && suburbs.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {suburbs.map(s => (
                    <span key={s} style={{
                      fontSize: 11, padding: '2px 8px',
                      background: `${colour.fill}30`, border: `1px solid ${colour.fill}80`,
                      borderRadius: 20, color: colour.text, fontWeight: 500,
                      opacity: crossBound.includes(s) ? 0.65 : 1,
                    }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cross-boundary note */}
      {crossBound.length > 0 && (
        <div style={{
          background: '#f0f9ff', border: '0.5px solid #0ea5e9',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginBottom: 12, fontSize: 12, color: '#0369a1',
        }}>
          ℹ️ <strong>{crossBound.join(', ')}</strong>{' '}
          {crossBound.length === 1 ? 'spans' : 'span'} multiple electorate boundaries.{' '}
          <a href="https://electorate.aec.gov.au/" target="_blank" rel="noreferrer"
             style={{ color: '#0369a1', fontWeight: 600 }}>
            Contact the AEC
          </a>{' '}
          to confirm your exact electorate.
        </div>
      )}

      {/* Confirm */}
      <button className="btn btn-primary" style={{
        width: '100%', justifyContent: 'center', padding: '11px 20px', fontSize: 14,
        opacity: selected ? 1 : 0.45, cursor: selected ? 'pointer' : 'default',
      }}
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
      >
        {selected ? `Confirm — I'm in Division of ${selected} →` : 'Select your electorate to continue →'}
      </button>
    </div>
  );
}
