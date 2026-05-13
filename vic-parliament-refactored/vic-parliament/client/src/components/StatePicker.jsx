// src/components/StatePicker.jsx
// State Assembly district / Council region picker for split postcodes.
// Uses LeafletMap for all map rendering — no Leaflet code here.

import { useState, useEffect, useCallback } from 'react';
import LeafletMap from './LeafletMap';

const PALETTE = [
  { fill: '#3b82f6', border: '#1d4ed8', text: '#1e40af' },
  { fill: '#f97316', border: '#c2410c', text: '#9a3412' },
  { fill: '#10b981', border: '#047857', text: '#065f46' },
  { fill: '#8b5cf6', border: '#6d28d9', text: '#4c1d95' },
  { fill: '#ef4444', border: '#b91c1c', text: '#991b1b' },
  { fill: '#0ea5e9', border: '#0284c7', text: '#0369a1' },
];

const ARCGIS_BASE = 'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Admin/FeatureServer';
const LAYER_ID    = { district: 15, region: 16 };
async function fetchStateFeatures(names, mode) {
  const layer = LAYER_ID[mode];

  // Field names confirmed from Vicmap Admin FeatureServer:
  //   Layer 15 STATE_ASSEMBLY_2022 → 'district'
  //   Layer 16 STATE_COUNCIL_2022  → 'region'
  const NAME_MAP  = { district: 'district', region: 'region' };
  const nameField = NAME_MAP[mode];

  // Fetch only the features we need
  // Use upper() for case-insensitive match — Vicmap field values may differ
  // in capitalisation from the names stored in our XLS data
  const inList = names.map(n => `'${n.replace(/'/g,"''").toUpperCase()}'`).join(',');
  const params = new URLSearchParams({
    where: `upper(${nameField}) IN (${inList})`,
    outFields: nameField, f: 'geojson', outSR: '4326', maxAllowableOffset: '0.001',
  });
  const res  = await fetch(`${ARCGIS_BASE}/${layer}/query?${params}`);
  if (!res.ok) throw new Error(`ArcGIS query ${res.status}`);
  const data = await res.json();

  const features = names
    .map(name => {
      const feat = data.features?.find(
        f => (f.properties?.[nameField] ?? '').toLowerCase() === name.toLowerCase()
      );
      return feat ? { name, geojson: feat } : null;
    })
    .filter(Boolean);

  return { features };
}

export default function StatePicker({ postcode, mode = 'district', options, onSelect }) {
  const [suburbs,  setSuburbs]  = useState({});
  const [selected, setSelected] = useState(null);

  const singularLabel = mode === 'district' ? 'district' : 'region';
  const prefix        = mode === 'district' ? 'District of' : '';
  const suburbsUrl    = mode === 'district' ? '/postcode_district_suburbs.json' : '/postcode_region_suburbs.json';

  const allFlat    = options.flatMap(o => suburbs[o] ?? []);
  const counts     = allFlat.reduce((a, s) => { a[s] = (a[s] ?? 0) + 1; return a; }, {});
  const crossBound = Object.keys(counts).filter(s => counts[s] > 1);

  useEffect(() => {
    fetch(suburbsUrl)
      .then(r => r.json())
      .then(data => {
        const entry = data[postcode];
        if (!entry) return;
        const norm = {};
        options.forEach(opt => {
          const key = Object.keys(entry).find(k => k.toLowerCase() === opt.toLowerCase());
          norm[opt] = key ? entry[key] : [];
        });
        setSuburbs(norm);
      })
      .catch(() => {});
  }, [postcode, mode]);

  const fetchFeatures = useCallback(
    () => fetchStateFeatures(options, mode),
    [options.join(','), mode]
  );

  return (
    <div style={{ marginBottom: 16 }}>

      <div style={{
        background: '#fefce8', border: '0.5px solid #d97706',
        borderRadius: 'var(--radius-md)', padding: '10px 14px',
        marginBottom: 8, fontSize: 13, color: '#92400e',
      }}>
        ⚠️ Postcode <strong>{postcode}</strong> spans{' '}
        <strong>{options.length} state {singularLabel}s</strong>.
        Select yours on the map or from the list below.
      </div>

      <div style={{
        background: '#f0f9ff', border: '0.5px solid #0ea5e9',
        borderRadius: 'var(--radius-md)', padding: '8px 14px',
        marginBottom: 12, fontSize: 12, color: '#0369a1',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>🔍</span>
        <span>Not sure?{' '}
          <a href="https://findelectorate.parliament.vic.gov.au/" target="_blank" rel="noreferrer"
             style={{ color: '#0369a1', fontWeight: 600 }}>
            Search your address on the VEC electorate finder →
          </a>
        </span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <LeafletMap
          fetchFeatures={fetchFeatures}
          selected={selected}
          onSelect={setSelected}
          palette={PALETTE}
          height={300}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {options.map((name, idx) => {
          const colour     = PALETTE[idx % PALETTE.length];
          const isSelected = selected === name;
          const subs       = suburbs[name] ?? [];

          return (
            <div key={name} onClick={() => setSelected(name)} style={{
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
                    {prefix ? `${prefix} ${name}` : name}
                  </div>
                  {subs.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {subs.join(', ')}
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
              {isSelected && subs.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {subs.map(s => (
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

      {crossBound.length > 0 && (
        <div style={{
          background: '#f0f9ff', border: '0.5px solid #0ea5e9',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginBottom: 12, fontSize: 12, color: '#0369a1',
        }}>
          ℹ️ <strong>{crossBound.join(', ')}</strong>{' '}
          {crossBound.length === 1 ? 'spans' : 'span'} multiple {singularLabel} boundaries.{' '}
          <a href="https://findelectorate.parliament.vic.gov.au/" target="_blank" rel="noreferrer"
             style={{ color: '#0369a1', fontWeight: 600 }}>
            Find My Electoral District
          </a>{' '}
          to confirm your exact {singularLabel}.
        </div>
      )}

      <button className="btn btn-primary" style={{
        width: '100%', justifyContent: 'center', padding: '11px 20px', fontSize: 14,
        opacity: selected ? 1 : 0.45, cursor: selected ? 'pointer' : 'default',
      }}
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
      >
        {selected
          ? `Confirm — ${prefix ? prefix + ' ' : ''}${selected} →`
          : `Select your ${singularLabel} to continue →`}
      </button>
    </div>
  );
}
