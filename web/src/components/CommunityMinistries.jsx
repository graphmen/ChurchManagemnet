'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Heart, Users, Calendar, CheckCircle, Landmark, ShieldAlert,
  Flame, Award, BookOpen, Target, Radio, HelpCircle, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black text-[#1A2E1A] leading-tight mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function CommunityMinistries() {
  const [activeTab, setActiveTab] = useState('wm'); // 'wm', 'amo', 'health', 'comm'
  const [loading, setLoading] = useState(true);

  // States for departments
  const [wmMetrics, setWmMetrics] = useState({ mentorship: 0, retreat: 0, projects: 0, circle: 0 });
  const [amoMetrics, setAmoMetrics] = useState({ fellowship: 0, workshops: 0, hours: 0 });
  const [healthMetrics, setHealthMetrics] = useState({ expos: 0, consultations: 0, patients: 0, newstart: 0, adra: 0 });
  const [commMetrics, setCommMetrics] = useState({ media: 0, newsletters: 0, liberty: 0, gov: 0 });

  const [wmChart, setWmChart] = useState([]);
  const [amoChart, setAmoChart] = useState([]);
  const [healthChart, setHealthChart] = useState([]);
  const [commChart, setCommChart] = useState([]);

  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    loadCommunityData();
  }, [activeTab]);

  const loadCommunityData = async () => {
    setLoading(true);
    try {
      const [
        { data: wmReports },
        { data: amoReports },
        { data: healthReports },
        { data: commReports },
        { data: reportsWrapper },
        { data: churchesData }
      ] = await Promise.all([
        supabase.from('ezc_womens_ministry_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_mens_organization_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_health_adra_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_communication_parl_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_departmental_reports').select('*, ezc_churches(name, district_name)'),
        supabase.from('ezc_churches').select('id, district_name')
      ]);

      // Map churches
      const churchesMap = {};
      churchesData?.forEach(c => { churchesMap[c.id] = c.district_name || 'Unassigned'; });

      // Aggregate Women's Ministries (WM)
      let wm_mentorship = 0, wm_retreat = 0, wm_projects = 0, wm_circle = 0;
      const wmDistMap = {};
      wmReports?.forEach(r => {
        wm_mentorship += r.mentorship_pairs_active || 0;
        wm_retreat += r.retreat_attendance || 0;
        wm_projects += r.outreach_projects_count || 0;
        wm_circle += r.circle_of_hope_attendees || 0;

        const dist = churchesMap[r.ezc_departmental_reports?.church_id] || 'Unassigned';
        wmDistMap[dist] = (wmDistMap[dist] || 0) + (r.circle_of_hope_attendees || 0);
      });
      setWmMetrics({ mentorship: wm_mentorship, retreat: wm_retreat, projects: wm_projects, circle: wm_circle });
      setWmChart(Object.entries(wmDistMap).map(([name, count]) => ({ name, count })));

      // Aggregate Men's Organization (AMO)
      let amo_fellowship = 0, amo_workshops = 0, amo_hours = 0;
      const amoDistMap = {};
      amoReports?.forEach(r => {
        amo_fellowship += r.fellowship_attendance || 0;
        amo_workshops += r.workshops_conducted || 0;
        amo_hours += r.community_service_hours || 0;

        const dist = churchesMap[r.ezc_departmental_reports?.church_id] || 'Unassigned';
        amoDistMap[dist] = (amoDistMap[dist] || 0) + (r.community_service_hours || 0);
      });
      setAmoMetrics({ fellowship: amo_fellowship, workshops: amo_workshops, hours: amo_hours });
      setAmoChart(Object.entries(amoDistMap).map(([name, count]) => ({ name, count })));

      // Aggregate Health & ADRA
      let hl_expos = 0, hl_consult = 0, hl_pat = 0, hl_new = 0, hl_adra = 0;
      const hlDistMap = {};
      healthReports?.forEach(r => {
        hl_expos += r.health_expos_count || 0;
        hl_consult += r.expo_consultations || 0;
        hl_pat += r.medical_camp_patients || 0;
        hl_new += r.newstart_graduates || 0;
        hl_adra += r.adra_beneficiaries_count || 0;

        const dist = churchesMap[r.ezc_departmental_reports?.church_id] || 'Unassigned';
        hlDistMap[dist] = (hlDistMap[dist] || 0) + (r.expo_consultations || 0);
      });
      setHealthMetrics({ expos: hl_expos, consultations: hl_consult, patients: hl_pat, newstart: hl_new, adra: hl_adra });
      setHealthChart(Object.entries(hlDistMap).map(([name, count]) => ({ name, count })));

      // Aggregate Comm & PARL
      let co_media = 0, co_news = 0, co_lib = 0, co_gov = 0;
      const coDistMap = {};
      commReports?.forEach(r => {
        co_media += r.media_broadcast_minutes || 0;
        co_news += r.newsletters_distributed || 0;
        co_lib += r.religious_liberty_incidents || 0;
        co_gov += r.government_relations_meetings || 0;

        const dist = churchesMap[r.ezc_departmental_reports?.church_id] || 'Unassigned';
        coDistMap[dist] = (coDistMap[dist] || 0) + (r.media_broadcast_minutes || 0);
      });
      setCommMetrics({ media: co_media, newsletters: co_news, liberty: co_lib, gov: co_gov });
      setCommChart(Object.entries(coDistMap).map(([name, count]) => ({ name, count })));

      // Formulate recent reports lists depending on activeTab
      const activeCode = activeTab === 'wm' ? 'WM' : activeTab === 'amo' ? 'AMO' : activeTab === 'health' ? 'HEALTH' : 'COMM';
      const filteredReports = (reportsWrapper || []).filter(w => w.department_code === activeCode).slice(0, 5).map(r => {
        let metricsDesc = '';
        if (activeCode === 'WM') {
          const det = wmReports?.find(s => s.report_id === r.id);
          metricsDesc = `Circle of Hope: ${det?.circle_of_hope_attendees || 0} · Retreat: ${det?.retreat_attendance || 0}`;
        } else if (activeCode === 'AMO') {
          const det = amoReports?.find(s => s.report_id === r.id);
          metricsDesc = `Hours Logged: ${det?.community_service_hours || 0} · Workshops: ${det?.workshops_conducted || 0}`;
        } else if (activeCode === 'HEALTH') {
          const det = healthReports?.find(s => s.report_id === r.id);
          metricsDesc = `Expo Patients: ${det?.expo_consultations || 0} · ADRA Benefic: ${det?.adra_beneficiaries_count || 0}`;
        } else {
          const det = commReports?.find(s => s.report_id === r.id);
          metricsDesc = `Media Broadcast: ${det?.media_broadcast_minutes || 0}m · PARL Cases: ${det?.religious_liberty_incidents || 0}`;
        }

        return {
          id: r.id,
          churchName: r.ezc_churches?.name || 'Local Church',
          districtName: r.ezc_churches?.district_name || 'District',
          period: `${new Date(r.reporting_period_start).toLocaleDateString()} - ${new Date(r.reporting_period_end).toLocaleDateString()}`,
          status: r.status,
          metricsDesc
        };
      });
      setRecentReports(filteredReports);

    } catch (err) {
      console.error('Community Ministries Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSubTabs = () => {
    return [
      { id: 'wm', label: "Women's Ministries", logo: '/logos/women.png', icon: Heart, color: 'text-pink-600' },
      { id: 'amo', label: "Adventist Men (AMO)", logo: '/logos/men.png', icon: Users, color: 'text-[#2E7D32]' },
      { id: 'health', label: "Health & ADRA", logo: '/logos/health.png', icon: Activity, color: 'text-red-500' },
      { id: 'comm', label: "Communication & PARL", logo: '/logos/communication.png', icon: Radio, color: 'text-blue-600' }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <img src="/logos/family.png" alt="Family Ministries Logo" className="w-12 h-12 object-contain" />
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Family & Community Portals</h2>
          <p className="text-sm text-gray-500 mt-1">Adventist Community Services, Women's & Men's Ministries, Health, and Public Affairs</p>
        </div>
      </div>

      {/* Tab Switcher Headers */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm shrink-0">
          {getSubTabs().map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-[#2E7D32] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.logo ? (
                <img src={tab.logo} alt={tab.label} className="w-4 h-4 object-contain" />
              ) : (
                <tab.icon size={14} className={activeTab === tab.id ? 'text-white' : tab.color} />
              )}
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={loadCommunityData}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-black uppercase shadow-sm transition-all"
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Sub-tab: Women's Ministries */}
          {activeTab === 'wm' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <img src="/logos/women.png" alt="Women's Ministries Logo" className="w-10 h-10 object-contain" />
                <div>
                  <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider">Women's Ministries</h3>
                  <p className="text-xs text-gray-500">Mentorship pairings, spiritual retreats, and community outreach circles</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Heart} label="Circle of Hope" value={wmMetrics.circle} color="bg-pink-500" sub="Attendees registered" />
                <StatCard icon={Users} label="Mentorship Pairs" value={wmMetrics.mentorship} color="bg-blue-500" sub="Active pairings" />
                <StatCard icon={Calendar} label="Retreat Attendances" value={wmMetrics.retreat} color="bg-purple-500" sub="Total women logged" />
                <StatCard icon={Target} label="Outreach Projects" value={wmMetrics.projects} color="bg-[#2E7D32]" sub="Completed outreach projects" />
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Circle of Hope Attendees by District</h3>
                {wmChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={wmChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#EC4899" radius={[4, 4, 0, 0]} name="Circle of Hope" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-xs">No Circle of Hope meetings reported yet</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Sub-tab: Men's Org */}
          {activeTab === 'amo' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <img src="/logos/men.png" alt="Men's Ministries Logo" className="w-10 h-10 object-contain" />
                <div>
                  <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider">Adventist Men's Organization (AMO)</h3>
                  <p className="text-xs text-gray-500">Men's fellowship meetings, leadership seminars, and community service projects</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={Users} label="Fellowship Attendees" value={amoMetrics.fellowship} color="bg-[#2E7D32]" sub="AMO attendance logs" />
                <StatCard icon={Award} label="Seminars Conducted" value={amoMetrics.workshops} color="bg-amber-500" sub="Fatherhood & parenting" />
                <StatCard icon={Activity} label="Community Service" value={`${amoMetrics.hours} hrs`} color="bg-indigo-500" sub="Welfare hours logged" />
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Community Service Hours Logged by District</h3>
                {amoChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={amoChart} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <defs>
                        <linearGradient id="colorAmo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="count" stroke="#2E7D32" fillOpacity={1} fill="url(#colorAmo)" name="Service Hours" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-xs">No service projects reported yet</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Sub-tab: Health & ADRA */}
          {activeTab === 'health' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <img src="/logos/health.png" alt="Health Ministries Logo" className="w-10 h-10 object-contain" />
                  <div>
                    <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider">Health & ADRA Ministries</h3>
                    <p className="text-xs text-gray-500">Medical expos, health seminars (NEWSTART), and humanitarian aid distribution</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <img src="/logos/health.png" alt="Health logo" className="h-8 object-contain opacity-85" />
                  <img src="/logos/adra.svg" alt="ADRA logo" className="h-8 object-contain opacity-85" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard icon={Target} label="Health Expos" value={healthMetrics.expos} color="bg-red-500" sub="Expos completed" />
                <StatCard icon={Users} label="Expo Consults" value={healthMetrics.consultations} color="bg-orange-500" sub="Consultations logged" />
                <StatCard icon={Activity} label="Medical Patients" value={healthMetrics.patients} color="bg-blue-500" sub="Camp patients verified" />
                <StatCard icon={Award} label="NEWSTART Grads" value={healthMetrics.newstart} color="bg-[#2E7D32]" sub="Living programs" />
                <StatCard icon={Landmark} label="ADRA Benefic" value={healthMetrics.adra} color="bg-[#6A1B9A]" sub="Aid distributions" />
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Expo Patient Consultations by District</h3>
                {healthChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={healthChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expo Consultations" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-xs">No health expos logged yet</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Sub-tab: Comm & PARL */}
          {activeTab === 'comm' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <img src="/logos/communication.png" alt="Communication Ministries Logo" className="w-10 h-10 object-contain" />
                  <div>
                    <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider">Communication & Public Affairs (PARL)</h3>
                    <p className="text-xs text-gray-500">Media broadcasting, conference news distribution, and religious liberty advocacy</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <img src="/logos/communication.png" alt="Communication logo" className="h-8 object-contain opacity-85" />
                  <img src="/logos/parl.svg" alt="PARL logo" className="h-8 object-contain opacity-85" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Radio} label="Media Broadcast" value={`${commMetrics.media}m`} color="bg-blue-600" sub="Sermons & news minutes" />
                <StatCard icon={BookOpen} label="Newsletters Distributed" value={commMetrics.newsletters} color="bg-emerald-500" sub="Flyers & papers" />
                <StatCard icon={ShieldAlert} label="Religious Liberty Incid" value={commMetrics.liberty} color="bg-red-500" sub="Advocacy reports" />
                <StatCard icon={Landmark} label="Gov Relations Meetings" value={commMetrics.gov} color="bg-amber-500" sub="Leaders met" />
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Broadcast Airtime (Minutes) by District</h3>
                {commChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={commChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} name="Media Minutes" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-xs">No media broadcast metrics logged yet</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Recent Reports Listing */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-[#2E7D32]" />
              Recent Departmental Submissions: {activeTab.toUpperCase()}
            </h3>
            <div className="overflow-x-auto">
              {recentReports.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Church / District</th>
                      <th className="pb-3">Reporting Period</th>
                      <th className="pb-3">Logged Indicators</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentReports.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 pr-2">
                          <p className="font-black text-gray-800">{r.churchName}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{r.districtName} District</p>
                        </td>
                        <td className="py-3.5 pr-2 text-gray-500 font-medium">{r.period}</td>
                        <td className="py-3.5 pr-2 text-gray-600 font-bold">{r.metricsDesc}</td>
                        <td className="py-3.5 text-right">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase inline-block ${
                            r.status === 'approved_by_director' ? 'bg-green-100 text-green-700' :
                            r.status === 'reviewed_by_pastor' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'rejected' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <HelpCircle size={28} className="text-gray-300 mb-2" />
                  <p className="font-semibold">No reports found for this department</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
