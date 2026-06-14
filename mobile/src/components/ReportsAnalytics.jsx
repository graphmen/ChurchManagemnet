import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Activity,
  Target,
  Layout
} from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ReportsAnalytics = ({ selectedDistrict, filterPastor, churches }) => {
  const [activeSubTab, setActiveSubTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [territories, setTerritories] = useState(null);
  const [coverageData, setCoverageData] = useState({});
  const [stats, setStats] = useState({
    totalVisits: 0,
    activeTerritories: 0,
    coveragePercent: 0,
    saturationIndex: '0.0'
  });

  const [recentVisits, setRecentVisits] = useState([]);

  useEffect(() => {
    loadSpatialAnalytics();
  }, [selectedDistrict, filterPastor, churches]);

  const loadSpatialAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Fetch Territories
      const configRes = await fetch(`/gis_config.json?v=${Date.now()}`);
      if (!configRes.ok) return;
      const config = await configRes.json();
      
      const tRes = await fetch(`${config.latestFile}?v=${config.version}`);
      const geoData = await tRes.json();
      setTerritories(geoData);

      // 2. Fetch All Activities
      let query = supabase.from('ezc_visitations').select('*');
      if (filterPastor) query = query.eq('pastor_id', filterPastor);
      if (selectedDistrict) {
          // If we have a selected district, we need churches in that district
          const districtChurches = churches.filter(c => c.district_id === selectedDistrict).map(c => c.id);
          query = query.in('church_id', districtChurches);
      }
      
      const { data: visits } = await query.order('visit_date', { ascending: false });
      
      // 3. Aggregate by Territory
      const activityMap = {};
      visits?.forEach(v => {
          activityMap[v.church_id] = (activityMap[v.church_id] || 0) + 1;
      });

      setRecentVisits(visits?.slice(0, 5) || []);
      setCoverageData(activityMap);

      // 4. Calculate KPIs
      const activeCount = Object.keys(activityMap).length;
      const totalTerritories = geoData.features.length;
      const coverage = Math.round((activeCount / totalTerritories) * 100);
      
      setStats({
        totalVisits: visits?.length || 0,
        activeTerritories: activeCount,
        coveragePercent: coverage,
        saturationIndex: (visits?.length / totalTerritories).toFixed(1)
      });

    } catch (err) {
      console.error('Spatial analytics failure:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTerritoryStyle = (feature) => {
      const churchId = feature.properties.church_id;
      const count = coverageData[churchId] || 0;
      return {
          fillColor: count > 5 ? '#2E7D32' : count > 0 ? '#81C784' : '#EFF3EE',
          weight: 1,
          opacity: 1,
          color: '#2E7D32',
          fillOpacity: 0.8
      };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Mission Activities', value: stats.totalVisits, icon: Activity, color: 'text-sda-gold', bg: 'bg-sda-gold/10' },
          { label: 'Coverage Saturation', value: `${stats.coveragePercent}%`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Active Territories', value: stats.activeTerritories, icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Growth indexing', value: stats.saturationIndex, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((kpi, i) => (
          <div key={kpi.label} className="bg-white p-6 relative overflow-hidden group border-2 border-[#2E7D32] hover:border-[#2E7D32] transition-all shadow-md">
            <div className={`absolute top-0 right-0 w-24 h-24 ${kpi.bg} blur-[60px] translate-x-12 -translate-y-12 opacity-30`}></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className="text-4xl font-black text-[#1A2E1A] tracking-tighter">{kpi.value}</h3>
              </div>
              <div className={`p-4 rounded-none bg-[#F8FAF8] border border-[#2E7D32]/20 ${kpi.color}`}>
                <kpi.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spatial Intelligence Map */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-black uppercase tracking-widest text-[#2E7D32] flex items-center gap-2">
                <Layout size={18} />
                Spatial Activity Matrix
             </h3>
             <div className="flex gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-[#2E7D32] rounded-none"></div>
                   <span className="text-[9px] font-black uppercase text-[#1A2E1A]">High Impact</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-[#EFF3EE] border border-[#2E7D32] rounded-none"></div>
                   <span className="text-[9px] font-black uppercase text-[#1A2E1A]">Unreached</span>
                </div>
             </div>
          </div>

          <div className="h-[500px] bg-white border-2 border-[#2E7D32] relative overflow-hidden shadow-2xl">
              {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                      <div className="flex flex-col items-center gap-4">
                          <Activity className="animate-pulse text-[#2E7D32]" size={40} />
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#2E7D32]">Crunching Spatial Data...</p>
                      </div>
                  </div>
              ) : territories && (
                  <MapContainer center={[-19.0154, 29.1549]} zoom={7} className="h-full w-full outline-none">
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                      <GeoJSON 
                        data={territories} 
                        style={getTerritoryStyle}
                        onEachFeature={(feature, layer) => {
                            const count = coverageData[feature.properties.church_id] || 0;
                            layer.bindPopup(`
                                <div style="font-family: 'Inter', sans-serif; padding: 12px;">
                                    <p style="font-size: 10px; font-weight: 900; color: #2E7D32; text-transform: uppercase;">Mission Territory</p>
                                    <h4 style="font-size: 16px; font-weight: 900; color: #1A2E1A; margin: 4px 0;">${feature.properties.name}</h4>
                                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #EFF3EE;">
                                        <p style="font-size: 11px; font-weight: 700; color: #1A2E1A;">ACTIVITIES: <span style="color: #2E7D32;">${count}</span></p>
                                    </div>
                                </div>
                            `, { className: 'ivory-popup' });
                        }}
                      />
                  </MapContainer>
              )}
          </div>
        </div>

        {/* Reach Leaderboard */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#2E7D32] flex items-center gap-2">
             <Target size={18} />
             Reach Leaderboard
          </h3>
          <div className="bg-white border-2 border-[#2E7D32] divide-y-2 divide-[#EFF3EE] shadow-xl overflow-hidden">
             {territories?.features
               .map(f => ({ 
                 name: f.properties.name, 
                 count: coverageData[f.properties.church_id] || 0 
               }))
               .sort((a,b) => b.count - a.count)
               .slice(0, 10)
               .map((item, idx) => (
                 <div key={idx} className="p-4 flex items-center justify-between hover:bg-[#F8FAF8] transition-colors group">
                    <div className="flex items-center gap-4">
                       <span className="text-xs font-black text-[#2E7D32]/40 group-hover:text-[#2E7D32]">#{idx + 1}</span>
                       <p className="text-[11px] font-black uppercase text-[#1A2E1A] tracking-tight">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black px-2 py-1 ${item.count > 0 ? 'bg-emerald-100 text-[#2E7D32]' : 'bg-red-50 text-red-600'}`}>
                          {item.count} EVENTS
                       </span>
                    </div>
                 </div>
               ))
             }
          </div>

          <div className="p-6 bg-[#1A2E1A] border-2 border-[#2E7D32] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-20 h-20 bg-[#2E7D32]/20 blur-3xl"></div>
             <h4 className="text-[10px] font-black uppercase text-[#2E7D32] tracking-widest mb-2">Gap Analysis</h4>
             <p className="text-xs text-white/70 leading-relaxed font-medium">
                Identifying <span className="text-[#2E7D32] font-black">{territories?.features.filter(f => !coverageData[f.properties.church_id]).length}</span> territories with zero reported activities. Immediate field mobilization recommended for these sectors.
             </p>
          </div>
        </div>
      </div>

      {/* Feed Component */}
      <div className="space-y-6">
         <h3 className="text-sm font-black uppercase tracking-widest text-[#2E7D32]">Recent Mission Flux</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentVisits.map((visit, i) => (
               <div key={i} className="bg-white p-6 border-2 border-[#2E7D32] shadow-md hover:translate-y-[-2px] transition-transform">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-[#F8FAF8] border border-[#2E7D32]/20 text-[#2E7D32]">
                        <Activity size={20} />
                     </div>
                     <span className="text-[9px] font-black uppercase text-[#2E7D32]">{new Date(visit.visit_date).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-tight mb-1">{visit.member_name}</h4>
                  <p className="text-[10px] font-black text-[#2E7D32] uppercase mb-3">Territory Activity</p>
                  <p className="text-xs text-[#1A2E1A]/60 font-medium italic">"{visit.notes || 'Spiritual support visit completed by pastoral team.'}"</p>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
