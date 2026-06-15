// src/components/CouncilPicker.jsx
// Local council (LGA) picker using Vicmap Admin ArcGIS Layer 9 (LGA_POLYGON).
// Uses LeafletMap for all map rendering — no Leaflet code here.
//
// The ArcGIS LGA layer stores short names (e.g. "Melbourne" not
// "Melbourne City Council"), so we use councilData[name].shortName for queries.

import { useState, useCallback } from 'react';
import LeafletMap from './LeafletMap';

const PALETTE = [
  { fill: '#3b82f6', border: '#1d4ed8', light: '#eff6ff' },
  { fill: '#f97316', border: '#c2410c', light: '#fff7ed' },
  { fill: '#10b981', border: '#047857', light: '#ecfdf5' },
  { fill: '#8b5cf6', border: '#6d28d9', light: '#f5f3ff' },
  { fill: '#ef4444', border: '#b91c1c', light: '#fef2f2' },
  { fill: '#0ea5e9', border: '#0284c7', light: '#f0f9ff' },
];

const ARCGIS_BASE = 'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Admin/FeatureServer';
const LGA_LAYER   = 9;

async function fetchCouncilFeatures(councils, councilData) {
  // Build short names (e.g. "Melbourne") for the ArcGIS query
  const shortNames = councils.map(c => councilData[c]?.shortName || c);

  // Probe to discover field name
  const probe    = await fetch(`${ARCGIS_BASE}/${LGA_LAYER}/query?where=1%3D1&outFields=*&f=geojson&resultRecordCount=1&maxAllowableOffset=0.1`);
  if (!probe.ok) throw new Error(`ArcGIS probe ${probe.status}`);
  const probeData = await probe.json();
  const props     = probeData.features?.[0]?.properties ?? {};
  const nameField = ['lga_name','LGA_NAME','lga_official_name','name','NAME'].find(f => f in props);
  if (!nameField) throw new Error(`Cannot detect LGA name field. Got: ${Object.keys(props).join(', ')}`);

  // Fetch only needed LGAs using UPPER() for case-insensitive match
  const inClause = shortNames.map(n => `'${n.replace(/'/g,"''").toUpperCase()}'`).join(',');
  const params   = new URLSearchParams({
    where: `upper(${nameField}) IN (${inClause})`,
    outFields: nameField, f: 'geojson', outSR: '4326', maxAllowableOffset: '0.001',
  });
  const res  = await fetch(`${ARCGIS_BASE}/${LGA_LAYER}/query?${params}`);
  if (!res.ok) throw new Error(`ArcGIS query ${res.status}`);
  const data = await res.json();

  // Map features back to full council names
  const features = councils
    .map(council => {
      const shortName = (councilData[council]?.shortName || council).toUpperCase();
      const feat      = data.features?.find(
        f => (f.properties?.[nameField] ?? '').toUpperCase() === shortName
      );
      if (!feat) {
        console.warn(`CouncilPicker: no feature for "${council}" (shortName="${shortName}")`);
        return null;
      }
      return { name: council, geojson: feat };
    })
    .filter(Boolean);

  return { features };
}

export default function CouncilPicker({ postcode, councilWardMap, councilData, onSelect }) {
  const councils    = Object.keys(councilWardMap);
  const isAmbiguous = councils.length > 1;

  const [selectedCouncil, setSelectedCouncil] = useState(isAmbiguous ? null : councils[0]);

  // Stable fetchFeatures — only recreated if the council list changes
  const fetchFeatures = useCallback(
    () => fetchCouncilFeatures(councils, councilData),
    [councils.join(',')]
  );

  return (
    <div style={{ marginBottom: 16 }}>

      {/* Ambiguity warning — only when multiple councils */}
      {isAmbiguous && (
        <div style={{
          background: '#fefce8', border: '0.5px solid #d97706',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginBottom: 12, fontSize: 13, color: '#92400e',
        }}>
          ⚠️ Postcode <strong>{postcode}</strong> spans{' '}
          <strong>{councils.length} council areas</strong>.
          Select yours on the map or from the list below.
        </div>
      )}

      {/* Map — only for ambiguous postcodes */}
      {isAmbiguous && (
        <div style={{ marginBottom: 12 }}>
          <LeafletMap
            fetchFeatures={fetchFeatures}
            selected={selectedCouncil}
            onSelect={setSelectedCouncil}
            palette={PALETTE}
            height={280}
          />
        </div>
      )}

      {/* Council cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {councils.map((council, idx) => {
          const colour     = PALETTE[idx % PALETTE.length];
          const isSelected = selectedCouncil === council;
          const info       = councilData[council];

          // Single council — show info directly, no card interaction chrome
          if (!isAmbiguous) {
            return (
              <div key={council} style={{
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                background: 'var(--color-bg)',
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 10 }}>
                  {council}
                </div>
                {info && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr',
                    gap: '5px 14px', alignItems: 'start', fontSize: 12,
                  }}>
                    {info.phone && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Phone</span>
                      <a href={`tel:${info.phone.replace(/\s/g,'')}`} style={{ color: 'var(--color-accent)' }}>{info.phone}</a>
                    </>)}
                    {info.email && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Email</span>
                      <a href={`mailto:${info.email}`} style={{ color: 'var(--color-accent)', wordBreak: 'break-all' }}>{info.email}</a>
                    </>)}
                    {info.website && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Website</span>
                      <a href={info.website} target="_blank" rel="noreferrer"
                         style={{ color: 'var(--color-accent)', wordBreak: 'break-all' }}>
                        {info.website.replace(/^https?:\/\//, '')}
                      </a>
                    </>)}
                    {info.address && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Address</span>
                      <span>{info.address}</span>
                    </>)}
                  </div>
                )}
              </div>
            );
          }

          // Multiple councils — show selectable card
          return (
            <div key={council} onClick={() => setSelectedCouncil(council)} style={{
              border:       isSelected ? `2px solid ${colour.border}` : '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              cursor:       'pointer',
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
                    {council}
                  </div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border:     isSelected ? `5px solid ${colour.border}` : '2px solid var(--color-border-secondary)',
                  background: isSelected ? colour.fill : 'transparent',
                  transition: 'all 0.15s',
                }} />
              </div>

              {/* Contact details — shown when selected */}
              {isSelected && info && (
                <div style={{
                  marginTop: 12, padding: '10px 12px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-sm)', fontSize: 12,
                }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr',
                    gap: '5px 14px', alignItems: 'start',
                  }}>
                    {info.phone && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Phone</span>
                      <a href={`tel:${info.phone.replace(/\s/g,'')}`} style={{ color: 'var(--color-accent)' }}>{info.phone}</a>
                    </>)}
                    {info.email && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Email</span>
                      <a href={`mailto:${info.email}`} style={{ color: 'var(--color-accent)', wordBreak: 'break-all' }}>{info.email}</a>
                    </>)}
                    {info.website && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Website</span>
                      <a href={info.website} target="_blank" rel="noreferrer"
                         style={{ color: 'var(--color-accent)', wordBreak: 'break-all' }}>
                        {info.website.replace(/^https?:\/\//, '')}
                      </a>
                    </>)}
                    {info.address && (<>
                      <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Address</span>
                      <span>{info.address}</span>
                    </>)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm — for single council show a simple Next button,
           for multiple councils show the confirm with the chosen name */}
      {isAmbiguous ? (
        <button className="btn btn-primary" style={{
          width: '100%', justifyContent: 'center', padding: '11px 20px', fontSize: 14,
          opacity: selectedCouncil ? 1 : 0.45, cursor: selectedCouncil ? 'pointer' : 'default',
        }}
          disabled={!selectedCouncil}
          onClick={() => selectedCouncil && onSelect({ council: selectedCouncil })}
        >
          {selectedCouncil ? `Confirm — ${selectedCouncil} →` : 'Select your council to continue →'}
        </button>
      ) : (
        <button className="btn btn-primary" style={{
          width: '100%', justifyContent: 'center', padding: '11px 20px', fontSize: 14,
        }}
          onClick={() => onSelect({ council: councils[0] })}
        >
          Continue →
        </button>
      )}
    </div>
  );
}
