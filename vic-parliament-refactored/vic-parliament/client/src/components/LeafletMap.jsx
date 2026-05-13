// src/components/LeafletMap.jsx
//
// Single reusable Leaflet map component used by SuburbPicker, StatePicker
// and CouncilPicker. Owns the entire Leaflet lifecycle — loading the script,
// creating the map, drawing features, highlighting selection, and cleanup.
//
// All three pickers pass a `fetchFeatures` async function that returns
// { features: [{ id, name, geojson }] }. LeafletMap handles the rest.
//
// Props:
//   fetchFeatures  async fn → { features: [{id, name, geojson}] }
//   selected       string | null   currently selected feature id/name
//   onSelect       fn(name)        called when user clicks a polygon
//   palette        array           colour palette entries {fill, border}
//   height         number          map height in px (default 300)

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Shared Leaflet loader ─────────────────────────────────────────────────
// Module-level promise — created once, shared across every LeafletMap
// instance regardless of how many are mounted at the same time.

let _leafletPromise = null;

function loadLeaflet() {
  if (_leafletPromise) return _leafletPromise;

  _leafletPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link');
      link.id     = 'leaflet-css';
      link.rel    = 'stylesheet';
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // JS — already in window
    if (window.L) { resolve(window.L); return; }

    // JS — script tag already injected (another instance started first)
    const existing = document.getElementById('leaflet-js');
    if (existing) {
      existing.addEventListener('load',  () => resolve(window.L), { once: true });
      existing.addEventListener('error', () => { _leafletPromise = null; reject(new Error('Leaflet CDN failed')); }, { once: true });
      return;
    }

    // JS — inject fresh
    const script  = document.createElement('script');
    script.id     = 'leaflet-js';
    script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.addEventListener('load',  () => resolve(window.L), { once: true });
    script.addEventListener('error', () => { _leafletPromise = null; reject(new Error('Leaflet CDN failed')); }, { once: true });
    document.head.appendChild(script);
  });

  return _leafletPromise;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function LeafletMap({
  fetchFeatures,
  selected,
  onSelect,
  palette,
  height = 300,
}) {
  const mapRef      = useRef(null);   // L.Map instance
  const layersRef   = useRef({});     // name → L.GeoJSON layer
  const mountedRef  = useRef(false);
  const initDoneRef = useRef(false);  // guard against StrictMode double-invoke

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ── Callback ref ──────────────────────────────────────────────────────
  // React calls this the instant the <div> is inserted into the DOM.
  // At this point the element has real pixel dimensions, so L.map() is safe.
  const containerRef = useCallback((node) => {
    if (!node || initDoneRef.current) return;
    initDoneRef.current = true;

    loadLeaflet()
      .then(L => initMap(L, node))
      .catch(err => {
        if (mountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      });
  }, []); // stable — no deps, never recreated

  async function initMap(L, node) {
    if (!mountedRef.current) return;

    // Create the map
    const map = L.map(node, { zoomControl: true, scrollWheelZoom: true });
    mapRef.current = map;

    // Tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors' +
        ' | Boundaries CC BY 4.0',
      maxZoom: 18,
    }).addTo(map);

    // Fetch feature data from the caller
    let features;
    try {
      ({ features } = await fetchFeatures());
    } catch (err) {
      if (mountedRef.current) {
        setError(`Could not load boundaries: ${err.message}`);
        setLoading(false);
      }
      return;
    }

    // Unmounted while fetching
    if (!mountedRef.current || !mapRef.current) return;

    if (!features?.length) {
      setError('No boundary data returned.');
      setLoading(false);
      return;
    }

    const bounds = L.latLngBounds();

    features.forEach(({ name, geojson }, idx) => {
      if (!mountedRef.current || !mapRef.current) return;

      const colour = palette[idx % palette.length];

      // Create GeoJSON layer
      const layer = L.geoJSON(geojson, {
        style: {
          fillColor:   colour.fill,
          fillOpacity: 0.55,
          color:       colour.border,
          weight:      3,
          opacity:     0.9,
        },
      });

      // Extend bounds safely — empty features have no bounds
      layer.eachLayer(l => {
        try {
          const b = l.getBounds();
          if (b?.isValid()) bounds.extend(b);
        } catch (_) {}
      });

      // Only add to map if we have a valid map reference
      if (mapRef.current) {
        layer.addTo(mapRef.current);
        layer.on('click', () => onSelect(name));
        layersRef.current[name] = { layer, colour };
      }
    });

    if (mountedRef.current && mapRef.current && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    }

    if (mountedRef.current) {
      setLoading(false);
    }
  }

  // Track mount / unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clean up all layers then destroy the map
      Object.values(layersRef.current).forEach(({ layer }) => {
        try { layer.remove(); } catch (_) {}
      });
      layersRef.current = {};
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
      }
    };
  }, []);

  // Highlight selected polygon
  useEffect(() => {
    Object.entries(layersRef.current).forEach(([name, { layer, colour }]) => {
      try {
        layer.setStyle({
          fillOpacity: name === selected ? 0.80 : 0.55,
          weight:      name === selected ? 4    : 3,
        });
      } catch (_) {}
    });
  }, [selected]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Loading overlay */}
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(245,245,243,0.85)',
          borderRadius: 'var(--radius-md)',
          flexDirection: 'column', gap: 8,
          fontSize: 13, color: 'var(--color-text-secondary)',
        }}>
          <span style={{ fontSize: 22 }}>🗺️</span>
          Loading boundaries…
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-banner" style={{ marginBottom: 8 }}>{error}</div>
      )}

      {/*
        IMPORTANT: never set display:none on this div while Leaflet initialises.
        Leaflet reads pixel dimensions during L.map(node) — a hidden element
        has 0×0 dimensions which causes _leaflet_pos TypeErrors.
        Use height:0 + visibility:hidden instead when showing the error state.
      */}
      <div
        ref={containerRef}
        style={{
          height:     error ? 0 : height,
          visibility: error ? 'hidden' : 'visible',
          overflow:   'hidden',
          borderRadius: 'var(--radius-md)',
          border:     error ? 'none' : '0.5px solid var(--color-border)',
        }}
      />

      {!loading && !error && (
        <div style={{
          fontSize: 11, textAlign: 'center', marginTop: 4,
          color: 'var(--color-text-secondary)',
        }}>
          Click an area on the map, or select below
        </div>
      )}
    </div>
  );
}
