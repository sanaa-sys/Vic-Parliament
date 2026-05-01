// src/components/SuburbPicker.jsx
//
// Shown when a postcode spans multiple federal electorates.
// - Loads postcode_electorate_suburbs.json (built by fetch_openaustralia.py)
//   for suburb-level detail
// - Renders a Leaflet map with coloured electorate polygons
// - User clicks their electorate (or suburb) to confirm
//
// Props:
//   postcode           string   e.g. "3029"
//   electorateSuburbs  object   {electorate: []} skeleton from POSTCODE_DIVISIONS_MAP
//   onSelect           fn(electorateName)

import { useEffect, useRef, useState } from 'react';

const PALETTE = [
  { fill: '#3b82f6', border: '#1d4ed8', text: '#1e40af' },
  { fill: '#f97316', border: '#c2410c', text: '#9a3412' },
  { fill: '#10b981', border: '#047857', text: '#065f46' },
  { fill: '#8b5cf6', border: '#6d28d9', text: '#4c1d95' },
  { fill: '#ef4444', border: '#b91c1c', text: '#991b1b' },
];

export default function SuburbPicker({ postcode, electorateSuburbs, onSelect }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const layersRef  = useRef({});

  const [richSuburbs, setRichSuburbs] = useState(electorateSuburbs); // enriched from JSON
  const [selected,    setSelected]    = useState(null);
  const [mapReady,    setMapReady]    = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [mapError,    setMapError]    = useState('');

  const electorates = Object.keys(richSuburbs);

  // Determine if any suburb appears in multiple electorates (spans boundary)
  const allSuburbsFlat = electorates.flatMap(e => richSuburbs[e]);
  const suburbCounts   = allSuburbsFlat.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1; return acc;
  }, {});
  const crossBoundarySuburbs = Object.keys(suburbCounts).filter(s => suburbCounts[s] > 1);

  // ── Load richer suburb data from postcode_electorate_suburbs.json ─────────
  useEffect(() => {
    fetch('/postcode_electorate_suburbs.json')
      .then(r => r.json())
      .then(data => {
        const entry = data[postcode];
        if (entry && Object.keys(entry).length > 0) {
          // Merge: keep all electorates from divisions map, add suburb lists from JSON
          const merged = {};
          electorates.forEach(elec => {
            // Match by exact name or case-insensitive
            const key = Object.keys(entry).find(
              k => k.toLowerCase() === elec.toLowerCase()
            );
            merged[elec] = key ? entry[key] : (electorateSuburbs[elec] || []);
          });
          setRichSuburbs(merged);
        }
      })
      .catch(() => {
        // JSON not available — use the skeleton from POSTCODE_DIVISIONS_MAP
        // SuburbPicker still works, just without suburb lists
      });
  }, [postcode]);

  // ── Load Leaflet and initialise the map ───────────────────────────────────
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link');
      link.id     = 'leaflet-css';
      link.rel    = 'stylesheet';
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) { initMap(); return; }
    const script    = document.createElement('script');
    script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload   = initMap;
    script.onerror  = () => setMapError('Could not load map library.');
    document.head.appendChild(script);
    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    };
  }, []);

  async function initMap() {
    if (!mapRef.current || leafletRef.current) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
    leafletRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    let geoData;
    try {
      const res = await fetch('/electorates.json');
      geoData   = await res.json();
    } catch {
      setMapError('Could not load electorate boundaries.');
      setLoading(false);
      return;
    }

    const bounds = L.latLngBounds();

    electorates.forEach((elecName, idx) => {
      const colour  = PALETTE[idx % PALETTE.length];
      const feature = geoData.features.find(
        f => f.properties.name.toLowerCase() === elecName.toLowerCase()
      );
      if (!feature) return;

      const layer = L.geoJSON(feature, {
        style: {
          fillColor:   colour.fill,
          fillOpacity: 0.25,
          color:       colour.border,
          weight:      2,
          opacity:     0.9,
        },
      }).addTo(map);

      // Click on map polygon selects that electorate
      layer.on('click', () => setSelected(elecName));
      layer.eachLayer(l => bounds.extend(l.getBounds()));
      layersRef.current[elecName] = { layer, colour };
    });

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    setLoading(false);
    setMapReady(true);
  }

  // Highlight selected electorate on map
  useEffect(() => {
    if (!mapReady) return;
    Object.entries(layersRef.current).forEach(([name, { layer }]) => {
      layer.setStyle({
        fillOpacity: name === selected ? 0.55 : 0.25,
        weight:      name === selected ? 4    : 2,
      });
    });
  }, [selected, mapReady]);

  return (
    <div style={{ marginBottom: 16 }}>

      {/* Warning banner */}
      <div style={{
        background: '#fefce8', border: '0.5px solid #d97706',
        borderRadius: 'var(--radius-md)', padding: '10px 14px',
        marginBottom: 12, fontSize: 13, color: '#92400e',
      }}>
        ⚠️ Postcode <strong>{postcode}</strong> spans{' '}
        <strong>{electorates.length} federal electorates</strong>.
        Select yours on the map or from the list below.
      </div>

      {/* Leaflet map */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(245,245,243,0.85)', borderRadius: 'var(--radius-md)',
            fontSize: 13, color: 'var(--color-text-secondary)',
          }}>
            Loading map…
          </div>
        )}
        {mapError && <div className="error-banner">{mapError}</div>}
        <div ref={mapRef} style={{
          height: 300,
          borderRadius: 'var(--radius-md)',
          border: '0.5px solid var(--color-border)',
          overflow: 'hidden',
        }} />
        <div style={{
          fontSize: 11, color: 'var(--color-text-secondary)',
          textAlign: 'center', marginTop: 4,
        }}>
          Click an electorate on the map, or select below
        </div>
      </div>

      {/* Electorate cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {electorates.map((elec, idx) => {
          const colour     = PALETTE[idx % PALETTE.length];
          const isSelected = selected === elec;
          const suburbs    = richSuburbs[elec] || [];

          return (
            <div
              key={elec}
              onClick={() => setSelected(elec)}
              style={{
                border:     isSelected ? `2px solid ${colour.border}` : '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding:    '10px 14px',
                cursor:     'pointer',
                background: isSelected ? `${colour.fill}18` : 'var(--color-bg)',
                transition: 'all 0.15s',
              }}
            >
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
                {/* Radio dot */}
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border:      isSelected ? `5px solid ${colour.border}` : '2px solid var(--color-border-secondary)',
                  background:  isSelected ? colour.fill : 'transparent',
                  transition: 'all 0.15s',
                }} />
              </div>

              {/* Suburb chips when selected */}
              {isSelected && suburbs.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {suburbs.map(s => (
                    <span key={s} style={{
                      fontSize: 11, padding: '2px 8px',
                      background: `${colour.fill}30`,
                      border:     `1px solid ${colour.fill}80`,
                      borderRadius: 20,
                      color:      colour.text,
                      fontWeight: 500,
                      // Highlight cross-boundary suburbs
                      opacity: crossBoundarySuburbs.includes(s) ? 0.65 : 1,
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AEC note for cross-boundary suburbs */}
      {crossBoundarySuburbs.length > 0 && (
        <div style={{
          background: '#f0f9ff', border: '0.5px solid #0ea5e9',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginBottom: 12, fontSize: 12, color: '#0369a1',
        }}>
          ℹ️ <strong>{crossBoundarySuburbs.join(', ')}</strong>{' '}
          {crossBoundarySuburbs.length === 1 ? 'spans' : 'span'} multiple electorate boundaries.
          If you live in {crossBoundarySuburbs.length === 1 ? 'this suburb' : 'one of these suburbs'},{' '}
          <a href="https://www.aec.gov.au/About_AEC/Contact_the_AEC/"
             target="_blank" rel="noreferrer"
             style={{ color: '#0369a1' }}>
            contact the AEC
          </a>{' '}
          to confirm your exact electorate.
        </div>
      )}

      {/* Confirm button */}
      <button
        className="btn btn-primary"
        style={{
          width: '100%', justifyContent: 'center',
          padding: '11px 20px', fontSize: 14,
          opacity: selected ? 1 : 0.45,
          cursor: selected ? 'pointer' : 'default',
        }}
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
      >
        {selected
          ? `Confirm — I'm in Division of ${selected} →`
          : 'Select your electorate to continue →'}
      </button>
    </div>
  );
}
