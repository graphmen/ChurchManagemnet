'use client';
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
  { id: 'churches',  label: 'Churches',          color: '#4CAF50', count: null, defaultOn: true  },
  { id: 'harare',    label: 'Harare Pastoral',   color: '#FFC107', count: null, defaultOn: true  },
  { id: 'ezc',       label: 'EZC Boundary',       color: '#10B981', count: null, defaultOn: false },
  { id: 'prov',      label: 'Provinces',           color: '#1976D2', count: 10,  defaultOn: false },
  { id: 'districts', label: 'Admin Districts',     color: '#3B82F6', count: 59,  defaultOn: false },
  { id: 'wards',     label: 'Wards',               color: '#78909C', count: null, defaultOn: false },
  { id: 'church',    label: 'Church Territories',  color: '#FF6D00', count: 555, defaultOn: false },
];

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const churchIcon   = L.icon({ iconUrl: '/sda_logo.svg', iconSize: [28,28], iconAnchor: [14,14], popupAnchor: [0,-16] });
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
const DIST_PAL = ['#1B5E20','#2E7D32','#388E3C','#43A047','#1565C0','#1976D2','#6A1B9A','#7B1FA2','#BF360C','#E64A19','#004D40','#00695C','#827717','#F57F17','#4A148C'];
const PROV_PAL = ['#1565C0','#283593','#6A1B9A','#880E4F','#BF360C','#E65100','#2E7D32','#1B5E20','#004D40','#37474F'];
const CHUR_PAL = ['#E65100','#BF360C','#4E342E','#37474F','#006064','#01579B','#1A237E','#311B92','#880E4F'];

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
        setTimeout(() => { map.flyToBounds(b, { padding:[50,50], duration:2.2, easeLinearity:0.25 }); done.current = true; }, 900);
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
// SEARCH CONTROL
// ─────────────────────────────────────────────
function SearchControl({ harareData, churches, onSelectBoundary, setSelectedChurch }) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const districts = harareData?.features || [];
  
  const filteredDistricts = query.trim() === '' ? [] : districts.filter(d => {
    const name = d.properties?.District || d.properties?.name || '';
    return name.toLowerCase().includes(query.toLowerCase());
  });

  const filteredChurches = query.trim() === '' ? [] : churches.filter(c => {
    return c.name?.toLowerCase().includes(query.toLowerCase());
  });

  const handleSelectDistrict = (d) => {
    const bounds = L.geoJSON(d).getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
      onSelectBoundary(d.properties);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleSelectChurch = (c) => {
    const geom = typeof c.geom === 'string' ? JSON.parse(c.geom) : c.geom;
    if (geom?.coordinates) {
      const latlng = [geom.coordinates[1], geom.coordinates[0]];
      map.flyTo(latlng, 15, { duration: 1.5 });
      setSelectedChurch(c);
    }
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'absolute', top: 10, left: 50, zIndex: 1001, width: 220 }}>
      <div className="glass-control" style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: 6 }}>
        <span style={{ fontSize: 14 }}>🔍</span>
        <input
          type="text"
          placeholder="Search district or church..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.trim() !== '');
          }}
          onFocus={() => setIsOpen(query.trim() !== '')}
          className="glass-input"
          style={{ width: '100%', border: 'none', background: 'transparent', padding: '4px 2px', fontSize: 11 }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false); }} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 10 }}>
            ✕
          </button>
        )}
      </div>

      {isOpen && (filteredDistricts.length > 0 || filteredChurches.length > 0) && (
        <div className="glass-dropdown" style={{ position: 'absolute', top: 38, left: 0, width: '100%', zIndex: 1002 }}>
          {filteredDistricts.length > 0 && (
            <div>
              <div style={{ padding: '6px 10px 3px', fontSize: 9, fontWeight: 800, color: '#FFC107', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Districts
              </div>
              {filteredDistricts.map((d, idx) => {
                const name = d.properties?.District || d.properties?.name || 'Unknown';
                return (
                  <div key={`d-${idx}`} onClick={() => handleSelectDistrict(d)} className="glass-dropdown-item">
                    📍 {name}
                  </div>
                );
              })}
            </div>
          )}

          {filteredChurches.length > 0 && (
            <div>
              <div style={{ padding: '6px 10px 3px', fontSize: 9, fontWeight: 800, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: 0.8, borderTop: filteredDistricts.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                Churches
              </div>
              {filteredChurches.map((c) => (
                <div key={`c-${c.id}`} onClick={() => handleSelectChurch(c)} className="glass-dropdown-item">
                  ⛪ {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// GEOLOCATION CONTROL
// ─────────────────────────────────────────────
function LocateMeControl() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [locLayer, setLocLayer] = useState(null);

  const handleLocate = () => {
    setLocating(true);
    map.locate({ setView: true, maxZoom: 16 });
  };

  useEffect(() => {
    const onLocationFound = (e) => {
      setLocating(false);
      if (locLayer) {
        locLayer.remove();
      }
      
      const accuracyCircle = L.circle(e.latlng, {
        radius: e.accuracy,
        fillColor: '#2196F3',
        fillOpacity: 0.15,
        color: '#2196F3',
        weight: 1
      });

      const pinMarker = L.circleMarker(e.latlng, {
        radius: 8,
        fillColor: '#2196F3',
        color: '#ffffff',
        weight: 2.5,
        fillOpacity: 0.95
      });

      const group = L.layerGroup([accuracyCircle, pinMarker]).addTo(map);
      setLocLayer(group);
    };

    const onLocationError = () => {
      setLocating(false);
      alert('Could not retrieve your location. Make sure GPS permissions are enabled.');
    };

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    return () => {
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [map, locLayer]);

  return (
    <div style={{ position: 'absolute', top: 90, left: 10, zIndex: 1001 }}>
      <button
        onClick={handleLocate}
        className="glass-button"
        title="Locate Me"
        style={{
          width: 32,
          height: 32,
          fontSize: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}
      >
        {locating ? '⏳' : '🎯'}
      </button>
    </div>
  );
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
          boxShadow: open
            ? '0 0 0 2px rgba(76,175,80,0.27), 0 4px 20px rgba(0,0,0,0.4)'
            : '0 2px 12px rgba(0,0,0,0.35)',
          transition:'all 0.2s', letterSpacing:0.3,
        }}
      >
        <span style={{ fontSize:16 }}>🗺</span>
        Layers
        <span style={{
          background: open ? 'rgba(255,255,255,0.2)' : 'rgba(76,175,80,0.3)',
          borderRadius:4, padding:'1px 6px', fontSize:10,
        }}>
          {open ? '✕' : '▼'}
        </span>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position:'absolute', top:44, right:0, width:232,
          background:'rgba(17,50,28,0.97)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:14,
          boxShadow:'0 12px 40px rgba(0,0,0,0.6)',
          backdropFilter:'blur(16px)',
          overflow:'hidden',
        }}>

          {/* ─ BASE MAPS ─ */}
          <div style={{ padding:'12px 12px 8px' }}>
            <p style={{
              color:'rgba(255,255,255,0.35)', fontSize:9, fontWeight:800,
              textTransform:'uppercase', letterSpacing:1.4,
              margin:'0 0 9px', display:'flex', alignItems:'center', gap:6,
            }}>
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)', display:'inline-block' }}/>
              Base Maps
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)', display:'inline-block' }}/>
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
              {BASEMAPS.map(bm => {
                const sel = basemap === bm.id;
                return (
                  <button key={bm.id} onClick={() => onBasemap(bm.id)} style={{
                    border: sel ? '2px solid #4CAF50' : '2px solid transparent',
                    borderRadius:8, padding:'6px 4px',
                    background: sel ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.04)',
                    cursor:'pointer', display:'flex', flexDirection:'column',
                    alignItems:'center', gap:3,
                    boxShadow: sel ? '0 0 0 1px rgba(76,175,80,0.27)' : 'none',
                    transition:'all 0.18s',
                  }}>
                    <div style={{
                      width:48, height:32, borderRadius:5, background:bm.grad,
                      border: sel ? '1px solid #4CAF50' : '1px solid rgba(255,255,255,0.08)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                    }}>{bm.icon}</div>
                    <span style={{
                      fontSize:9, fontWeight:700,
                      color: sel ? '#4CAF50' : 'rgba(255,255,255,0.55)',
                      textAlign:'center', lineHeight:1.2,
                    }}>{bm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'0 12px' }} />

          {/* ─ BOUNDARIES ─ */}
          <div style={{ padding:'10px 12px 14px' }}>
            <p style={{
              color:'rgba(255,255,255,0.35)', fontSize:9, fontWeight:800,
              textTransform:'uppercase', letterSpacing:1.4,
              margin:'0 0 9px', display:'flex', alignItems:'center', gap:6,
            }}>
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)', display:'inline-block' }}/>
              Boundaries
              <span style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)', display:'inline-block' }}/>
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {BOUNDARY_LAYERS.map(bl => {
                const on = layers[bl.id];
                return (
                  <div key={bl.id}
                    onClick={() => onLayer(bl.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:9,
                      padding:'6px 8px', borderRadius:8, cursor:'pointer',
                      background: on ? `${bl.color}14` : 'rgba(255,255,255,0.02)',
                      border: on ? `1px solid ${bl.color}33` : '1px solid rgba(255,255,255,0.05)',
                      transition:'all 0.18s',
                    }}
                  >
                    <div style={{
                      width:3, height:26, borderRadius:2, flexShrink:0,
                      background: on ? bl.color : 'rgba(255,255,255,0.12)',
                      transition:'background 0.2s',
                    }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{
                        margin:0, fontSize:11, fontWeight:700,
                        color: on ? '#fff' : 'rgba(255,255,255,0.42)',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                        transition:'color 0.2s',
                      }}>{bl.label}</p>
                      {bl.count && (
                        <p style={{ margin:'1px 0 0', fontSize:9, color: on ? bl.color : 'rgba(255,255,255,0.25)', fontWeight:600 }}>
                          {bl.count.toLocaleString()} features
                        </p>
                      )}
                    </div>
                    <ToggleSwitch checked={on} onChange={() => onLayer(bl.id)} color={bl.color} />
                  </div>
                );
              })}
            </div>

            {/* Ward zoom hint */}
            {layers.wards && zoom < 10 && (
              <div style={{
                marginTop:8,
                background:'rgba(120,144,156,0.18)', borderRadius:8,
                padding:'5px 9px', fontSize:10,
                color:'rgba(255,255,255,0.5)', textAlign:'center',
              }}>
                🔍 Zoom in past level 10 for wards
              </div>
            )}

            {/* Church zoom hint */}
            {layers.churches && zoom < 13 && (
              <div style={{
                marginTop:8,
                background:'rgba(76,175,80,0.18)', borderRadius:8,
                padding:'5px 9px', fontSize:10,
                color:'rgba(255,255,255,0.5)', textAlign:'center',
              }}>
                🔍 Zoom in past level 13 for Churches
              </div>
            )}

            {/* Church boundaries zoom hint */}
            {layers.church && zoom < 13 && (
              <div style={{
                marginTop:8,
                background:'rgba(255,109,0,0.18)', borderRadius:8,
                padding:'5px 9px', fontSize:10,
                color:'rgba(255,255,255,0.5)', textAlign:'center',
              }}>
                🔍 Zoom in past level 13 for Church Territories
              </div>
            )}
          </div>
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
      padding:'3px 14px', borderRadius:20, fontFamily:'monospace', fontSize:10,
      fontWeight:600, backdropFilter:'blur(8px)',
      border:'1px solid rgba(255,255,255,0.1)', pointerEvents:'none',
    }}>
      {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}° · Z{zoom}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function TerritoryMap({
  churches = [], showBoundaries, showMembers, showProperties, showGroups,
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

  // Basemap — Google Streets default
  const [basemap, setBasemap] = useState('g-roads');
  const activeBasemap = BASEMAPS.find(b => b.id === basemap) ?? BASEMAPS[0];

  // UI
  const [zoom, setZoom]     = useState(11);
  const [coords, setCoords] = useState(null);
  const [selectedChurch, setSelectedChurch] = useState(null);

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
      supabase.from('ezc_members').select('id,full_name,lat,lng,status,church_id').then(({ data }) => {
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

  // ── Styles ──
  const ezcStyle  = { fillColor:'#1B5E20', weight:4, color:'#4CAF50', opacity:1, dashArray:'12,7', fillOpacity:0.04, interactive:false };
  const wardStyle = { fillColor:'#455A64', weight:0.8, color:'#78909C', opacity:0.5, fillOpacity:0.06 };

  const provincialStyle = useCallback(f => {
    const c = pColor(f.properties?.province_n || '');
    return { fillColor:c, weight:2.5, color:c, opacity:0.85, fillOpacity:0.12 };
  }, []);

  const onEachProvince = useCallback((f, layer) => {
    const n = f.properties?.province_n || 'Province';
    const p = f.properties?.population;
    const tooltipContent = `
      <div style="font-weight:800;font-size:12px;">🗺️ ${n}</div>
      ${p ? `<div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;">👥 ${Math.round(p/1000)}K pop.</div>` : ''}
    `;
    layer.bindTooltip(tooltipContent, { sticky:true, opacity:0.98, className: 'custom-tooltip' });
    layer.on({ 
      mouseover: e => {
        e.target.setStyle({ fillOpacity:0.3, weight:3.5 });
        e.target.bringToFront();
      }, 
      mouseout: e => e.target.setStyle(provincialStyle(f)) 
    });
  }, [provincialStyle]);

  const districtStyle = useCallback(f => {
    const c = dColor(f.properties?.district_n || f.properties?.name || '');
    return { fillColor:c, weight:2, color:c, opacity:0.8, fillOpacity:0.1 };
  }, []);

  const onEachDistrict = useCallback((f, layer) => {
    const n = f.properties?.district_n || f.properties?.name || 'District';
    const p = f.properties?.province || '';
    const tooltipContent = `
      <div style="font-weight:800;font-size:11px;">🏢 ${n}</div>
      ${p ? `<div style="font-size:9px;color:rgba(255,255,255,0.7);margin-top:2px;">📍 ${p}</div>` : ''}
    `;
    layer.bindTooltip(tooltipContent, { sticky:true, opacity:0.98, className: 'custom-tooltip' });
    layer.on({ 
      mouseover: e => {
        e.target.setStyle({ fillOpacity:0.25, weight:3 });
        e.target.bringToFront();
      }, 
      mouseout: e => e.target.setStyle(districtStyle(f)) 
    });
  }, [districtStyle]);

  const harareStyle = useCallback(f => {
    const name   = f.properties?.District || f.properties?.name || '';
    const pastor = f.properties?.Pastor;
    const isSel  = selectedBoundary?.District === name;
    const isUn   = !pastor;
    const c      = dColor(name);
    return {
      fillColor:   isUn ? '#607D8B' : c,
      weight:      isSel ? 4.5 : 3, opacity: 1,
      color:       isSel ? '#FFC107' : (isUn ? '#90A4AE' : c),
      dashArray:   isUn ? '6,4' : '',
      fillOpacity: isSel ? 0.45 : (isUn ? 0.15 : 0.25),
    };
  }, [selectedBoundary]);

  const onEachHarare = useCallback((f, layer) => {
    const name   = f.properties?.District || 'Unknown';
    const pastor = f.properties?.Pastor;
    layer.on({
      mouseover: e => {
        const isSel = selectedBoundary?.District === name;
        e.target.setStyle({ fillOpacity: 0.5, weight: isSel ? 4.5 : 4, color: isSel ? '#FFC107' : dColor(name) });
        e.target.bringToFront();
      },
      mouseout:  e => e.target.setStyle(harareStyle(f)),
      click:     () => onSelectBoundary?.(f.properties),
    });
    
    const tooltipContent = `
      <div style="font-weight: 800; font-size: 12px; margin-bottom: 2px;">📍 ${name}</div>
      <div style="font-size: 10px; color: ${pastor ? '#A5D6A7' : '#FFCDD2'}; font-weight: 700;">
        ${pastor ? `🙏 Pastor ${pastor}` : '⚠ Unassigned'}
      </div>
    `;
    layer.bindTooltip(tooltipContent, { sticky: true, opacity: 0.98, className: 'custom-tooltip' });
  }, [harareStyle, onSelectBoundary, selectedBoundary]);

  const onEachWard = useCallback((f, layer) => {
    const n = f.properties?.ward_name || f.properties?.WARD_NAME || f.properties?.name || 'Ward';
    layer.bindTooltip(`<div style="font-weight:700;font-size:10px;">📋 ${n}</div>`, { sticky:true, opacity:0.98, className: 'custom-tooltip' });
  }, []);

  const churchTerStyle = useCallback(f => {
    const c = cColor(f.properties?.church_name || f.properties?.name || '');
    return { fillColor:c, weight:1.5, color:c, opacity:0.8, fillOpacity:0.22 };
  }, []);

  const onEachChurchTer = useCallback((f, layer) => {
    const ch = f.properties?.church_name || f.properties?.name || 'Church';
    const di = f.properties?.district || '';
    layer.on({
      mouseover: e => {
        e.target.setStyle({ fillOpacity:0.4, weight:2.5 });
        e.target.bringToFront();
      },
      mouseout:  e => e.target.setStyle(churchTerStyle(f)),
    });
    const tooltipContent = `
      <div style="font-weight:800;font-size:11px;">⛪ ${ch}</div>
      ${di ? `<div style="font-size:9px;color:rgba(255,255,255,0.7);margin-top:2px;">🏢 ${di} District</div>` : ''}
    `;
    layer.bindTooltip(tooltipContent, { sticky:true, opacity:0.98, className: 'custom-tooltip' });
    layer.bindPopup(`<div style="font-family:sans-serif;min-width:180px;padding:5px 3px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><img src="/sda_logo.svg" style="width:22px;height:22px"/><strong style="font-size:12px;color:#BF360C">${ch}</strong></div>${di ? `<p style="font-size:10px;color:#888;margin:0">📍 ${di} District</p>` : ''}</div>`);
  }, [churchTerStyle]);

  return (
    <div style={{ height:'100%', width:'100%', position:'relative' }}>

      <LayerControlPanel
        basemap={basemap} onBasemap={setBasemap}
        layers={layers}   onLayer={toggleLayer}
        zoom={zoom}
      />

      <CoordDisplay coords={coords} zoom={zoom} />

      <MapContainer center={HARARE_CENTER} zoom={11} style={{ height:'100%', width:'100%' }} className="z-0">

        {/* Active Basemap Tile */}
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
        <LocateMeControl />
        <SearchControl 
          harareData={harareData} 
          churches={churches} 
          onSelectBoundary={onSelectBoundary} 
          setSelectedChurch={setSelectedChurch} 
        />

        {/* Zimbabwe outline */}
        {zimBoundary && (
          <GeoJSON data={zimBoundary} style={{ fillColor:'transparent', weight:2.5, color:'#4CAF50', opacity:0.35, dashArray:'8,6', interactive:false }} />
        )}

        {/* EZC Boundary */}
        {layers.ezc && ezcData && <GeoJSON key="ezc" data={ezcData} style={ezcStyle} />}

        {/* Provinces */}
        {layers.prov && provincialData && <GeoJSON key="prov" data={provincialData} style={provincialStyle} onEachFeature={onEachProvince} />}

        {/* Admin Districts */}
        {layers.districts && districtData && <GeoJSON key="dist" data={districtData} style={districtStyle} onEachFeature={onEachDistrict} />}

        {/* Harare Pastoral */}
        {layers.harare && harareData && (
          <GeoJSON key={`harare-${selectedBoundary?.District}`} data={harareData} style={harareStyle} onEachFeature={onEachHarare} />
        )}

        {/* Wards (lazy, zoom ≥ 10) */}
        {layers.wards && wardData && zoom >= 10 && <GeoJSON key="wards" data={wardData} style={wardStyle} onEachFeature={onEachWard} />}

        {/* Church Territories (zoom ≥ 13) */}
        {layers.church && churchTerritories && zoom >= 13 && <GeoJSON key="church" data={churchTerritories} style={churchTerStyle} onEachFeature={onEachChurchTer} />}

        {/* Church markers (zoom ≥ 13) */}
        {layers.churches && zoom >= 13 && churches.map(church => {
          const geom = typeof church.geom === 'string' ? JSON.parse(church.geom) : church.geom;
          if (!geom?.coordinates) return null;
          return (
            <Marker 
              key={church.id} 
              position={[geom.coordinates[1], geom.coordinates[0]]} 
              icon={churchIcon}
              ref={ref => {
                if (ref && selectedChurch?.id === church.id) {
                  if (!ref.isPopupOpen()) {
                    setTimeout(() => ref.openPopup(), 100);
                  }
                }
              }}
            >
              <Popup>
                <div style={{ minWidth:200, padding:'4px 2px', fontFamily:'sans-serif' }}>
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

        {showMembers && zoom >= 11 && members.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={memberIcon}>
            <Popup><div style={{ fontFamily:'sans-serif', padding:'2px 4px' }}><p style={{ fontWeight:700, color:'#1565C0', margin:0 }}>{m.full_name}</p><p style={{ color:'#888', margin:'2px 0 0', fontSize:10, textTransform:'capitalize' }}>{m.status}</p></div></Popup>
          </Marker>
        ))}

        {showProperties && zoom >= 10 && properties.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={propertyIcon}>
            <Popup><div style={{ fontFamily:'sans-serif', padding:'2px 4px' }}><p style={{ fontWeight:700, color:'#E65100', margin:0 }}>{p.name}</p><p style={{ color:'#888', margin:'2px 0 0', fontSize:10, textTransform:'capitalize' }}>{p.type}</p></div></Popup>
          </Marker>
        ))}

        {showGroups && zoom >= 10 && groups.map(g => (
          <Marker key={g.id} position={[g.lat, g.lng]} icon={groupIcon}>
            <Popup><div style={{ fontFamily:'sans-serif', padding:'2px 4px' }}><p style={{ fontWeight:700, color:'#6A1B9A', margin:0 }}>{g.name}</p><p style={{ color:'#888', margin:'2px 0 0', fontSize:10, textTransform:'capitalize' }}>{g.type?.replace(/_/g, ' ')}</p><p style={{ margin:'3px 0 0', fontSize:10, fontWeight:700, color: g.is_active ? '#2E7D32' : '#f44336' }}>{g.is_active ? '● Active' : '○ Inactive'}</p></div></Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
