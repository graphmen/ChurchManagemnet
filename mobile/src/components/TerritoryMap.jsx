import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../context/AuthContext';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const HARARE_CENTER = [-17.8292, 31.0522];
const GOOGLE_SUB    = ['mt0','mt1','mt2','mt3'];

const BASEMAPS = [
  { id: 'g-roads',     label: 'Streets',   icon: '🛣️',  grad: 'linear-gradient(135deg,#f0f0f0,#d0d0d0)', url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',   sub: GOOGLE_SUB, attr: '© Google Maps' },
  { id: 'g-hybrid',    label: 'Hybrid',    icon: '🛰️',  grad: 'linear-gradient(135deg,#2d5a1b,#1a3a0a)', url: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', sub: GOOGLE_SUB, attr: '© Google Maps' },
  { id: 'g-satellite', label: 'Satellite', icon: '📡',  grad: 'linear-gradient(135deg,#1a2a1a,#0d1f0d)', url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',   sub: GOOGLE_SUB, attr: '© Google Maps' },
  { id: 'g-terrain',   label: 'Terrain',   icon: '⛰️',  grad: 'linear-gradient(135deg,#c8d5b9,#8aab8a)', url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',   sub: GOOGLE_SUB, attr: '© Google Maps' },
  { id: 'carto-light', label: 'Light',     icon: '🌤️',  grad: 'linear-gradient(135deg,#f8f9fa,#dde1e5)', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', sub: null, attr: '© CARTO' },
  { id: 'carto-dark',  label: 'Dark',      icon: '🌑',  grad: 'linear-gradient(135deg,#1a1a2e,#16213e)', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',  sub: null, attr: '© CARTO' },
];

const BOUNDARY_LAYERS = [
  { id: 'churches', label: 'Churches',          color: '#4CAF50', count: null,  defaultOn: true  },
  { id: 'harare',   label: 'Harare Pastoral',    color: '#FFC107', count: null,  defaultOn: true  },
  { id: 'ezc',      label: 'EZC Boundary',        color: '#10B981', count: null,  defaultOn: false },
  { id: 'prov',     label: 'Provinces',            color: '#1976D2', count: 10,   defaultOn: false },
  { id: 'districts',label: 'Admin Districts',      color: '#3B82F6', count: 59,   defaultOn: false },
  { id: 'wards',    label: 'Wards',                color: '#78909C', count: null,  defaultOn: false },
  { id: 'church',   label: 'Church Territories',  color: '#FF6D00', count: 555,  defaultOn: false },
];

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const churchIcon = L.icon({ iconUrl: '/sda_logo.svg', iconSize: [28,28], iconAnchor: [14,14], popupAnchor: [0,-16] });
const memberIcon   = L.divIcon({ className:'', html:`<div style="width:10px;height:10px;background:#2196F3;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`, iconSize:[10,10], iconAnchor:[5,5] });
const propertyIcon = L.divIcon({ className:'', html:`<div style="width:12px;height:12px;background:#FF9800;border:2px solid white;border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`, iconSize:[12,12], iconAnchor:[6,6] });
const groupIcon    = L.divIcon({ className:'', html:`<div style="width:12px;height:12px;background:#9C27B0;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`, iconSize:[12,12], iconAnchor:[6,6] });

// ─────────────────────────────────────────────
// COLOR HELPERS
// ─────────────────────────────────────────────
function colorHash(name, palette) {
  if (!name) return palette[0];
  const h = name.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  return palette[h % palette.length];
}
const DIST_PAL  = ['#1B5E20','#2E7D32','#388E3C','#43A047','#1565C0','#1976D2','#6A1B9A','#7B1FA2','#BF360C','#E64A19','#004D40','#00695C','#827717','#F57F17','#4A148C'];
const PROV_PAL  = ['#1565C0','#283593','#6A1B9A','#880E4F','#BF360C','#E65100','#2E7D32','#1B5E20','#004D40','#37474F'];
const CHUR_PAL  = ['#E65100','#BF360C','#4E342E','#37474F','#006064','#01579B','#1A237E','#311B92','#880E4F'];

const dColor = n => colorHash(n, DIST_PAL);
const pColor = n => colorHash(n, PROV_PAL);
const cColor = n => colorHash(n, CHUR_PAL);

// ─────────────────────────────────────────────
// MAP HOOKS
// ─────────────────────────────────────────────
function ZoomTracker({ onZoom }) {
  useMapEvents({ zoomend: e => onZoom(e.target.getZoom()) });
  return null;
}
function CoordTracker({ onMove }) {
  useMapEvents({ mousemove: e => onMove(e.latlng) });
  return null;
}
function AutoFocusHarare({ harareData }) {
  const map  = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (harareData?.features?.length > 0 && !done.current) {
      const b = L.geoJSON(harareData).getBounds();
      if (b.isValid()) {
        setTimeout(() => { map.flyToBounds(b, { padding:[40,40], duration:2, easeLinearity:0.25 }); done.current = true; }, 900);
      }
    }
  }, [harareData, map]);
  return null;
}
function ScaleBarControl() {
  const map = useMap();
  useEffect(() => {
    const s = L.control.scale({ position:'bottomright', imperial:false });
    s.addTo(map); return () => s.remove();
  }, [map]);
  return null;
}

// ─────────────────────────────────────────────
// TOGGLE SWITCH
// ─────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, color }) {
  return (
    <div onClick={onChange} style={{
      width:34, height:19, borderRadius:10, flexShrink:0,
      background: checked ? color : 'rgba(255,255,255,0.15)',
      position:'relative', cursor:'pointer',
      transition:'background 0.22s', boxShadow: checked ? `0 0 6px ${color}88` : 'none',
    }}>
      <div style={{
        width:15, height:15, borderRadius:'50%', background:'#fff',
        position:'absolute', top:2, left: checked ? 17 : 2,
        transition:'left 0.22s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// LAYER CONTROL PANEL
// ─────────────────────────────────────────────
function LayerControlPanel({ basemap, onBasemap, layers, onLayer, zoom }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position:'absolute', top:10, right:10, zIndex:1001, fontFamily:'sans-serif' }}>

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:7,
          background: open ? '#1b4d2c' : 'rgba(17,50,28,0.92)',
          color:'#fff', border:`1.5px solid ${open ? '#4CAF50' : 'rgba(255,255,255,0.15)'}`,
          borderRadius:10, padding:'7px 14px',
          fontSize:12, fontWeight:800, cursor:'pointer',
          backdropFilter:'blur(10px)',
          boxShadow: open ? '0 0 0 2px rgba(76,175,80,0.27), 0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.35)',
          transition:'all 0.2s',
          letterSpacing:0.3,
        }}
      >
        <span style={{ fontSize:16 }}>🗺</span>
        Layers
        <span style={{
          background: open ? 'rgba(255,255,255,0.2)' : 'rgba(76,175,80,0.3)',
          borderRadius:4, padding:'1px 6px', fontSize:10
        }}>
          {open ? '✕' : '▼'}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position:'absolute', top:42, right:0,
          width:230,
          background:'rgba(17,50,28,0.96)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:14,
          boxShadow:'0 12px 40px rgba(0,0,0,0.55)',
          backdropFilter:'blur(14px)',
          overflow:'hidden',
        }}>

          {/* ── BASE MAPS ── */}
          <div style={{ padding:'10px 12px 8px' }}>
            <p style={{
              color:'rgba(255,255,255,0.38)', fontSize:9, fontWeight:800,
              textTransform:'uppercase', letterSpacing:1.2,
              margin:'0 0 8px', display:'flex', alignItems:'center', gap:6
            }}>
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)', display:'inline-block' }}/>
              Base Maps
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)', display:'inline-block' }}/>
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
              {BASEMAPS.map(bm => {
                const sel = basemap === bm.id;
                return (
                  <button
                    key={bm.id}
                    onClick={() => onBasemap(bm.id)}
                    style={{
                      border: sel ? '2px solid #4CAF50' : '2px solid transparent',
                      borderRadius:8, padding:'6px 4px',
                      background: sel ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                      cursor:'pointer', display:'flex', flexDirection:'column',
                      alignItems:'center', gap:3,
                      boxShadow: sel ? '0 0 0 1px #4CAF5044' : 'none',
                      transition:'all 0.18s',
                    }}
                  >
                    {/* Thumbnail swatch */}
                    <div style={{
                      width:48, height:32, borderRadius:5,
                      background:bm.grad,
                      border: sel ? '1px solid #4CAF50' : '1px solid rgba(255,255,255,0.08)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16,
                    }}>
                      {bm.icon}
                    </div>
                    <span style={{
                      fontSize:9, fontWeight:700, color: sel ? '#4CAF50' : 'rgba(255,255,255,0.6)',
                      textAlign:'center', lineHeight:1.2,
                    }}>{bm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'0 12px' }} />

          {/* ── BOUNDARIES ── */}
          <div style={{ padding:'8px 12px 12px' }}>
            <p style={{
              color:'rgba(255,255,255,0.38)', fontSize:9, fontWeight:800,
              textTransform:'uppercase', letterSpacing:1.2,
              margin:'0 0 8px', display:'flex', alignItems:'center', gap:6
            }}>
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)', display:'inline-block' }}/>
              Boundaries
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.1)', display:'inline-block' }}/>
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {BOUNDARY_LAYERS.map(bl => {
                const on = layers[bl.id];
                return (
                  <div key={bl.id} style={{
                    display:'flex', alignItems:'center', gap:9,
                    padding:'5px 8px', borderRadius:8,
                    background: on ? `${bl.color}14` : 'transparent',
                    border: on ? `1px solid ${bl.color}33` : '1px solid transparent',
                    transition:'all 0.18s',
                    cursor:'pointer',
                  }} onClick={() => onLayer(bl.id)}>
                    {/* Color swatch line */}
                    <div style={{
                      width:3, height:24, borderRadius:2,
                      background: on ? bl.color : 'rgba(255,255,255,0.15)',
                      transition:'background 0.2s', flexShrink:0,
                    }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{
                        margin:0, fontSize:11, fontWeight:700,
                        color: on ? '#fff' : 'rgba(255,255,255,0.5)',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                        transition:'color 0.2s',
                      }}>{bl.label}</p>
                      {bl.count && (
                        <p style={{ margin:0, fontSize:9, color: on ? bl.color : 'rgba(255,255,255,0.3)' }}>
                          {bl.count} features
                        </p>
                      )}
                    </div>
                    <ToggleSwitch checked={on} onChange={() => onLayer(bl.id)} color={bl.color} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ZOOM HINT for Wards ── */}
          {layers.wards && zoom < 10 && (
            <div style={{
              margin:'0 12px 10px',
              background:'rgba(120,144,156,0.2)', borderRadius:8,
              padding:'5px 9px', fontSize:10,
              color:'rgba(255,255,255,0.6)', textAlign:'center',
            }}>
              🔍 Zoom in past level 10 for wards
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COORDINATE DISPLAY
// ─────────────────────────────────────────────
function CoordDisplay({ coords, zoom }) {
  if (!coords) return null;
  return (
    <div style={{
      position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
      zIndex:1000, background:'rgba(17,50,28,0.88)', color:'rgba(255,255,255,0.8)',
      padding:'3px 13px', borderRadius:20,
      fontFamily:'monospace', fontSize:10, fontWeight:600,
      backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.1)',
      pointerEvents:'none',
    }}>
      {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}° · Z{zoom}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function TerritoryMap({
  churches = [], showMembers, showProperties, showGroups,
  selectedBoundary, onSelectBoundary
}) {
  // GeoJSON
  const [ezcData, setEzcData]               = useState(null);
  const [provincialData, setProvincialData] = useState(null);
  const [districtData, setDistrictData]     = useState(null);
  const [harareData, setHarareData]         = useState(null);
  const [wardData, setWardData]             = useState(null);
  const [churchTerritories, setChurchTerritories] = useState(null);
  const [zimBoundary, setZimBoundary]       = useState(null);
  const wardLoaded = useRef(false);

  // Point data
  const [members, setMembers]       = useState([]);
  const [properties, setProperties] = useState([]);
  const [groups, setGroups]         = useState([]);

  // Layer state — only Harare on by default
  const [layers, setLayers] = useState(
    Object.fromEntries(BOUNDARY_LAYERS.map(l => [l.id, l.defaultOn]))
  );
  const toggleLayer = useCallback(id => setLayers(prev => ({ ...prev, [id]: !prev[id] })), []);

  // Basemap
  const [basemap, setBasemap] = useState('g-roads');
  const activeBasemap = BASEMAPS.find(b => b.id === basemap) ?? BASEMAPS[0];

  // UI
  const [zoom, setZoom]     = useState(11);
  const [coords, setCoords] = useState(null);

  // ── Data Loading ──
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/glynnbird/countriesgeojson/master/zimbabwe.geojson')
      .then(r => r.json()).then(setZimBoundary).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/ezc_boundary.geojson').then(r => r.json()).then(setEzcData).catch(() => {});
    fetch('/provincial_boundaries.geojson').then(r => r.json()).then(setProvincialData).catch(() => {});
    fetch('/district_boundaries.geojson').then(r => r.json()).then(setDistrictData).catch(() => {});
    fetch('/harare_boundaries.geojson').then(r => r.json()).then(setHarareData).catch(() => {});
    fetch('/church_territories_official.geojson').then(r => r.json()).then(setChurchTerritories).catch(() => {});
  }, []);

  useEffect(() => {
    if (layers.wards && !wardLoaded.current) {
      wardLoaded.current = true;
      fetch('/ward_boundaries.geojson').then(r => r.json()).then(setWardData).catch(() => {});
    }
  }, [layers.wards]);

  useEffect(() => {
    if (showMembers) {
      supabase.from('ezc_members').select('id,full_name,lat,lng,status').then(({ data }) => {
        if (data) setMembers(data.filter(m => m.lat && m.lng));
      });
    }
    if (showProperties) {
      supabase.from('ezc_properties').select('id,name,type,lat,lng').then(({ data }) => {
        if (data) setProperties(data.filter(p => p.lat && p.lng));
      });
    }
    if (showGroups) {
      supabase.from('ezc_small_groups').select('id,name,type,lat,lng,is_active').then(({ data }) => {
        if (data) setGroups(data.filter(g => g.lat && g.lng));
      });
    }
  }, [showMembers, showProperties, showGroups]);

  // ── Style Functions ──
  const ezcStyle    = { fillColor:'#1B5E20', weight:4, color:'#4CAF50', opacity:1, dashArray:'12,7', fillOpacity:0.04, interactive:false };
  const wardStyle   = { fillColor:'#455A64', weight:0.8, color:'#78909C', opacity:0.5, fillOpacity:0.06 };

  const provincialStyle = useCallback(f => {
    const c = pColor(f.properties?.province_n || '');
    return { fillColor:c, weight:2.5, color:c, opacity:0.85, fillOpacity:0.15 };
  }, []);

  const onEachProvince = useCallback((f, layer) => {
    const n   = f.properties?.province_n || 'Province';
    const pop = f.properties?.population;
    layer.bindTooltip(`<div style="font-family:sans-serif;font-size:12px;font-weight:800;color:#1a2e1a">${n}${pop ? `<br/><span style="font-weight:500;color:#555;font-size:10px">${Math.round(pop/1000)}K pop.</span>` : ''}</div>`, { sticky:true, opacity:0.95 });
    layer.on({ mouseover:e => e.target.setStyle({ fillOpacity:0.38, weight:3.5 }), mouseout:e => e.target.setStyle(provincialStyle(f)) });
  }, [provincialStyle]);

  const districtStyle = useCallback(f => {
    const c = dColor(f.properties?.district_n || f.properties?.name || '');
    return { fillColor:c, weight:1.5, color:c, opacity:0.7, fillOpacity:0.12 };
  }, []);

  const onEachDistrict = useCallback((f, layer) => {
    const n = f.properties?.district_n || f.properties?.name || 'District';
    const p = f.properties?.province || '';
    layer.bindTooltip(`<div style="font-family:sans-serif;font-size:11px;font-weight:800;color:#1a2e1a">${n}<br/><span style="font-weight:500;color:#666;font-size:10px">${p}</span></div>`, { sticky:true, opacity:0.95 });
    layer.on({ mouseover:e => e.target.setStyle({ fillOpacity:0.38, weight:2.5 }), mouseout:e => e.target.setStyle(districtStyle(f)) });
  }, [districtStyle]);

  const harareStyle = useCallback(f => {
    const name   = f.properties?.District || f.properties?.name || '';
    const pastor = f.properties?.Pastor;
    const isSel  = selectedBoundary?.District === name;
    const isUn   = !pastor;
    const c      = dColor(name);
    return {
      fillColor:   isUn ? '#607D8B' : c,
      weight:      isSel ? 4 : 2, opacity:1,
      color:       isSel ? '#FFC107' : (isUn ? '#90A4AE' : '#fff'),
      dashArray:   isUn ? '6,4' : '',
      fillOpacity: isSel ? 0.55 : (isUn ? 0.2 : 0.35),
    };
  }, [selectedBoundary]);

  const onEachHarare = useCallback((f, layer) => {
    const name   = f.properties?.District || 'Unknown';
    const pastor = f.properties?.Pastor;
    layer.on({
      mouseover: e => e.target.setStyle({ fillOpacity:0.6, weight:3 }),
      mouseout:  e => e.target.setStyle(harareStyle(f)),
      click:     () => onSelectBoundary?.(f.properties),
    });
    layer.bindTooltip(
      `<div style="font-family:sans-serif;font-size:11px;font-weight:800;color:#1a2e1a">${name}<br/><span style="font-weight:600;color:${pastor ? '#2E7D32' : '#f44336'}">${pastor ? `🙏 Pastor ${pastor}` : '⚠ Unassigned'}</span></div>`,
      { sticky:true, opacity:0.95 }
    );
  }, [harareStyle, onSelectBoundary]);

  const onEachWard = useCallback((f, layer) => {
    const n = f.properties?.ward_name || f.properties?.WARD_NAME || f.properties?.name || 'Ward';
    layer.bindTooltip(`<div style="font-family:sans-serif;font-size:10px;font-weight:700;color:#37474F">${n}</div>`, { sticky:true, opacity:0.9 });
  }, []);

  const churchTerStyle = useCallback(f => {
    const c = cColor(f.properties?.church_name || f.properties?.name || '');
    return { fillColor:c, weight:1.5, color:c, opacity:0.8, fillOpacity:0.22 };
  }, []);

  const onEachChurchTer = useCallback((f, layer) => {
    const ch = f.properties?.church_name || f.properties?.name || 'Church';
    const di = f.properties?.district || '';
    layer.on({
      mouseover: e => e.target.setStyle({ fillOpacity:0.48, weight:2.5 }),
      mouseout:  e => e.target.setStyle(churchTerStyle(f)),
    });
    layer.bindTooltip(`<div style="font-family:sans-serif;font-size:11px;font-weight:800;color:#BF360C">⛪ ${ch}${di ? `<br/><span style="font-weight:500;color:#666;font-size:10px">${di}</span>` : ''}</div>`, { sticky:true, opacity:0.95 });
    layer.bindPopup(`<div style="font-family:sans-serif;min-width:175px;padding:4px"><div style="display:flex;align-items:center;gap:7px;margin-bottom:5px"><img src="/sda_logo.svg" style="width:22px;height:22px"/><strong style="font-size:12px;color:#BF360C">${ch}</strong></div>${di ? `<p style="font-size:10px;color:#888;margin:0">📍 ${di} District</p>` : ''}</div>`);
  }, [churchTerStyle]);

  // ── Render ──
  return (
    <div style={{ height:'100%', width:'100%', position:'relative' }}>

      {/* Custom Layer Control */}
      <LayerControlPanel
        basemap={basemap} onBasemap={setBasemap}
        layers={layers}   onLayer={toggleLayer}
        zoom={zoom}
      />

      {/* Coordinate bar */}
      <CoordDisplay coords={coords} zoom={zoom} />

      <MapContainer center={HARARE_CENTER} zoom={11} style={{ height:'100%', width:'100%' }} className="z-0">

        {/* Active Basemap */}
        <TileLayer
          key={activeBasemap.id}
          attribution={activeBasemap.attr}
          url={activeBasemap.url}
          subdomains={activeBasemap.sub ?? ['a','b','c']}
          maxZoom={21}
        />

        <ZoomTracker onZoom={setZoom} />
        <CoordTracker onMove={setCoords} />
        <ScaleBarControl />
        <AutoFocusHarare harareData={harareData} />

        {/* Zimbabwe outline — always */}
        {zimBoundary && (
          <GeoJSON data={zimBoundary} style={{ fillColor:'transparent', weight:2.5, color:'#4CAF50', opacity:0.35, dashArray:'8,6', interactive:false }} />
        )}

        {/* EZC Boundary */}
        {layers.ezc && ezcData && <GeoJSON key="ezc" data={ezcData} style={ezcStyle} />}

        {/* Provinces */}
        {layers.prov && provincialData && <GeoJSON key="prov" data={provincialData} style={provincialStyle} onEachFeature={onEachProvince} />}

        {/* Admin Districts */}
        {layers.districts && districtData && <GeoJSON key="dist" data={districtData} style={districtStyle} onEachFeature={onEachDistrict} />}

        {/* Harare Pastoral — key includes selection to force re-style */}
        {layers.harare && harareData && (
          <GeoJSON key={`harare-${selectedBoundary?.District}`} data={harareData} style={harareStyle} onEachFeature={onEachHarare} />
        )}

        {/* Wards (lazy, zoom ≥ 10) */}
        {layers.wards && wardData && zoom >= 10 && <GeoJSON key="wards" data={wardData} style={wardStyle} onEachFeature={onEachWard} />}

        {/* Church Territories */}
        {layers.church && churchTerritories && <GeoJSON key="church" data={churchTerritories} style={churchTerStyle} onEachFeature={onEachChurchTer} />}

        {/* Church markers (zoom ≥ 9) */}
        {layers.churches && zoom >= 9 && churches.map(church => {
          const geom = typeof church.geom === 'string' ? JSON.parse(church.geom) : church.geom;
          if (!geom?.coordinates) return null;
          return (
            <Marker key={church.id} position={[geom.coordinates[1], geom.coordinates[0]]} icon={churchIcon}>
              <Popup>
                <div style={{ minWidth:195, padding:'4px 2px', fontFamily:'sans-serif' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <img src="/sda_logo.svg" alt="" style={{ width:22, height:22 }} />
                    <strong style={{ fontSize:12, color:'#1A2E1A', textTransform:'uppercase', lineHeight:1.2 }}>{church.name}</strong>
                  </div>
                  {church.category && <p style={{ fontSize:10, color:'#888', textTransform:'uppercase', fontWeight:700, margin:'2px 0' }}>{church.category}</p>}
                  {church.pastor_name && <p style={{ fontSize:11, color:'#2E7D32', fontWeight:700, margin:'4px 0 0' }}>🙏 {church.pastor_name}</p>}
                  {church.district_name && <p style={{ fontSize:10, color:'#aaa', margin:'2px 0 0' }}>{church.district_name}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Member dots (zoom ≥ 11) */}
        {showMembers && zoom >= 11 && members.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={memberIcon}>
            <Popup><div style={{ fontFamily:'sans-serif', padding:'2px 4px' }}><p style={{ fontWeight:700, color:'#1565C0', margin:0 }}>{m.full_name}</p><p style={{ color:'#888', margin:'2px 0 0', fontSize:10, textTransform:'capitalize' }}>{m.status}</p></div></Popup>
          </Marker>
        ))}

        {/* Properties (zoom ≥ 10) */}
        {showProperties && zoom >= 10 && properties.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={propertyIcon}>
            <Popup><div style={{ fontFamily:'sans-serif', padding:'2px 4px' }}><p style={{ fontWeight:700, color:'#E65100', margin:0 }}>{p.name}</p><p style={{ color:'#888', margin:'2px 0 0', fontSize:10, textTransform:'capitalize' }}>{p.type}</p></div></Popup>
          </Marker>
        ))}

        {/* Small Groups (zoom ≥ 10) */}
        {showGroups && zoom >= 10 && groups.map(g => (
          <Marker key={g.id} position={[g.lat, g.lng]} icon={groupIcon}>
            <Popup><div style={{ fontFamily:'sans-serif', padding:'2px 4px' }}><p style={{ fontWeight:700, color:'#6A1B9A', margin:0 }}>{g.name}</p><p style={{ color:'#888', margin:'2px 0 0', fontSize:10, textTransform:'capitalize' }}>{g.type?.replace(/_/g, ' ')}</p><p style={{ margin:'3px 0 0', fontSize:10, fontWeight:700, color: g.is_active ? '#2E7D32' : '#f44336' }}>{g.is_active ? '● Active' : '○ Inactive'}</p></div></Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
