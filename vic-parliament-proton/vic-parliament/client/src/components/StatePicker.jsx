// src/components/StatePicker.jsx
//
// Map-based picker for Victorian state Assembly district / Council region disambiguation.
// Fetches district/region boundaries live from the Vicmap Admin ArcGIS FeatureServer
// (public API, no key required, CC BY 4.0 licensed).
//
// Layer 15 = STATE_ASSEMBLY_2022 (Victorian Lower House)
// Layer 16 = STATE_COUNCIL_2022  (Victorian Upper House)
//
// Props:
//   postcode   string            e.g. "3029"
//   mode       "district"|"region"
//   options    string[]          district/region names to show
//   onSelect   fn(name)

import { useEffect, useRef, useState } from 'react';

const PALETTE = [
  { fill: '#3b82f6', border: '#1d4ed8', text: '#1e40af' },
  { fill: '#f97316', border: '#c2410c', text: '#9a3412' },
  { fill: '#10b981', border: '#047857', text: '#065f46' },
  { fill: '#8b5cf6', border: '#6d28d9', text: '#4c1d95' },
  { fill: '#ef4444', border: '#b91c1c', text: '#991b1b' },
  { fill: '#0ea5e9', border: '#0284c7', text: '#0369a1' },
];

const ARCGIS_BASE =
  'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Admin/FeatureServer';
const LAYER_ID   = { district: 15, region: 16 };

// Vicmap field names to try for the district/region name (in order of preference)
// The actual field name is discovered from the first API response
const NAME_CANDIDATES = {
  district: ['dist_name', 'DIST_NAME', 'district_name', 'DISTRICT_NAME', 'name', 'NAME'],
  region:   ['region_name', 'REGION_NAME', 'name', 'NAME'],
};

function detectNameField(properties, mode) {
  for (const candidate of NAME_CANDIDATES[mode]) {
    if (candidate in properties) return candidate;
  }
  // Fall back to first string-valued property that isn't OBJECTID or numeric
  for (const [k, v] of Object.entries(properties)) {
    if (typeof v === 'string' && k.toLowerCase() !== 'objectid') return k;
  }
  return null;
}

async function fetchDistrictGeoJSON(names, mode) {
  const layer = LAYER_ID[mode];
  // First, probe with a single feature to discover the name field
  const probeUrl = `${ARCGIS_BASE}/${layer}/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=1&maxAllowableOffset=0.05`;
  const probe    = await fetch(probeUrl);
  if (!probe.ok) throw new Error(`ArcGIS returned ${probe.status}`);
  const probeData = await probe.json();
  if (!probeData.features?.length) throw new Error('No features in probe');

  const nameField = detectNameField(probeData.features[0].properties, mode);
  if (!nameField) throw new Error('Could not detect name field');

  // Now fetch just the districts/regions we need
  const inList = names.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
  const where  = `${nameField} IN (${inList})`;
  const params = new URLSearchParams({
    where,
    outFields: nameField,
    f: 'geojson',
    outSR: '4326',
    maxAllowableOffset: '0.0005',
  });
  const res  = await fetch(`${ARCGIS_BASE}/${layer}/query?${params}`);
  if (!res.ok) throw new Error(`ArcGIS returned ${res.status}`);
  const data = await res.json();
  return { data, nameField };
}

export default function StatePicker({ postcode, mode = 'district', options, onSelect }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const layersRef  = useRef({});

  const [suburbs,  setSuburbs]  = useState({});
  const [selected, setSelected] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [mapError, setMapError] = useState('');

  const suburbsUrl    = mode === 'district'
    ? '/postcode_district_suburbs.json'
    : '/postcode_region_suburbs.json';
  const singularLabel = mode === 'district' ? 'district' : 'region';
  const prefix        = mode === 'district' ? 'District of' : '';

  const allFlat       = options.flatMap(o => suburbs[o] ?? []);
  const counts        = allFlat.reduce((a, s) => { a[s] = (a[s] ?? 0) + 1; return a; }, {});
  const crossBoundary = Object.keys(counts).filter(s => counts[s] > 1);

  // Load suburb breakdown from JSON
  useEffect(() => {
    fetch(suburbsUrl)
      .then(r => r.json())
      .then(data => {
        const entry = data[postcode];
        if (!entry) return;
        const norm = {};
        options.forEach(opt => {
          const key = Object.keys(entry)
            .find(k => k.toLowerCase() === opt.toLowerCase());
          norm[opt] = key ? entry[key] : [];
        });
        setSuburbs(norm);
      })
      .catch(() => {});
  }, [postcode, mode]);

  // Load Leaflet then fetch + draw ArcGIS GeoJSON
  useEffect(() => {
    loadLeaflet();
    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  function loadLeaflet() {
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
    script.onerror  = () => { setMapError('Could not load map library.'); setLoading(false); };
    document.head.appendChild(script);
  }

  async function initMap() {
    if (!mapRef.current || leafletRef.current) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
    leafletRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://openstreetmap.org">OpenStreetMap</a> | ' +
        'Boundaries: <a href="https://www.vic.gov.au/maps-and-spatial-data">Vicmap</a> CC BY 4.0',
      maxZoom: 18,
    }).addTo(map);

    let geoData, nameField;
    try {
      ({ data: geoData, nameField } = await fetchDistrictGeoJSON(options, mode));
    } catch (err) {
      setMapError(`Could not load ${singularLabel} boundaries: ${err.message}`);
      setLoading(false);
      return;
    }

    if (!geoData?.features?.length) {
      setMapError(`No boundaries found — the ${singularLabel} names may not match the API.`);
      setLoading(false);
      return;
    }

    const bounds = L.latLngBounds();

    options.forEach((name, idx) => {
      const colour  = PALETTE[idx % PALETTE.length];
      const feature = geoData.features.find(f => {
        const val = f.properties?.[nameField] ?? '';
        return val.toLowerCase() === name.toLowerCase();
      });
      if (!feature) return;

      const layer = L.geoJSON(feature, {
        style: {
          fillColor: colour.fill, fillOpacity: 0.55,
          color: colour.border,   weight: 3, opacity: 0.9,
        },
      }).addTo(map);

      layer.on('click', () => setSelected(name));
      layer.eachLayer(l => bounds.extend(l.getBounds()));
      layersRef.current[name] = { layer, colour };
    });

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    setLoading(false);
    setMapReady(true);
  }

  useEffect(() => {
    if (!mapReady) return;
    Object.entries(layersRef.current).forEach(([name, { layer }]) => {
      layer.setStyle({
        fillOpacity: name === selected ? 0.80 : 0.55,
        weight:      name === selected ? 4    : 2,
      });
    });
  }, [selected, mapReady]);

  return (
    <div style={{ marginBottom: 16 }}>

      <div style={{
        background: '#fefce8', border: '0.5px solid #d97706',
        borderRadius: 'var(--radius-md)', padding: '10px 14px',
        marginBottom: 12, fontSize: 13, color: '#92400e',
      }}>
        ⚠️ Postcode <strong>{postcode}</strong> spans{' '}
        <strong>{options.length} state {singularLabel}s</strong>.
        Select yours on the map or from the list below.
      </div>

      {/* Map */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(245,245,243,0.85)', borderRadius: 'var(--radius-md)',
            fontSize: 13, color: 'var(--color-text-secondary)',
            flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>🗺️</span>
            Loading {singularLabel} boundaries…
          </div>
        )}
        {mapError && <div className="error-banner" style={{ marginBottom: 8 }}>{mapError}</div>}
        <div ref={mapRef} style={{
          height: 300, borderRadius: 'var(--radius-md)',
          border: '0.5px solid var(--color-border)', overflow: 'hidden',
          display: mapError ? 'none' : 'block',
        }} />
        {!mapError && (
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 4 }}>
            Click a {singularLabel} on the map, or select below
          </div>
        )}
      </div>

      {/* Option cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {options.map((name, idx) => {
          const colour     = PALETTE[idx % PALETTE.length];
          const isSelected = selected === name;
          const subs       = suburbs[name] ?? [];

          return (
            <div key={name} onClick={() => setSelected(name)}
              style={{
                border:       isSelected ? `2px solid ${colour.border}` : '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding:      '10px 14px',
                cursor:       'pointer',
                background:   isSelected ? `${colour.fill}18` : 'var(--color-bg)',
                transition:   'all 0.15s',
              }}
            >
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
                      opacity: crossBoundary.includes(s) ? 0.65 : 1,
                    }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {crossBoundary.length > 0 && (
        <div style={{
          background: '#f0f9ff', border: '0.5px solid #0ea5e9',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginBottom: 12, fontSize: 12, color: '#0369a1',
        }}>
          ℹ️ <strong>{crossBoundary.join(', ')}</strong>{' '}
          {crossBoundary.length === 1 ? 'spans' : 'span'} multiple {singularLabel} boundaries.
          Use the{' '}
          <a href="https://www.vec.vic.gov.au/electoral-boundaries/find-my-electoral-district"
             target="_blank" rel="noreferrer" style={{ color: '#0369a1' }}>
            VEC Find My District
          </a>{' '}
          tool to confirm your exact {singularLabel}.
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{
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
