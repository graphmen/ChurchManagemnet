'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Users, BookOpen, Target, Heart, Award, TrendingUp,
  MapPin, CheckCircle, AlertCircle, Calendar, ShieldCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell
} from 'recharts';
import { motion } from 'framer-motion';

const COLOR_PALETTE = ['#2E7D32', '#1565C0', '#F57F17', '#6A1B9A', '#00838F', '#AD1457'];

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-[#1A2E1A] leading-tight mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      {trend && (
        <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 bg-green-50 text-green-600">
          +{trend}%
        </span>
      )}
    </motion.div>
  );
}

export default function SSPMDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeCareGroups: 0,
    totalBibleStudies: 0,
    candidatesBaptized: 0,
    surveysCompleted: 0,
    activeVolunteers: 0,
    reportingCompliance: 0
  });

  const [careGroupsByDistrict, setCareGroupsByDistrict] = useState([]);
  const [bibleStudiesByDistrict, setBibleStudiesByDistrict] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [complianceList, setComplianceList] = useState([]);

  useEffect(() => {
    loadSSPMData();
  }, []);

  const loadSSPMData = async () => {
    setLoading(true);
    try {
      // 1. Fetch general counts
      const [
        { count: careGroupsCount },
        { data: sspmReportsData },
        { data: reportsWrapperData },
        { data: churchesData }
      ] = await Promise.all([
        supabase.from('ezc_small_groups').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ezc_sspm_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_departmental_reports').select('*, ezc_churches(name, district_name)').eq('department_code', 'SSPM'),
        supabase.from('ezc_churches').select('id, name, district_name')
      ]);

      // Calculate aggregate metrics
      let aggregateStudies = 0;
      let aggregateBaptisms = 0;
      let aggregateSurveys = 0;
      let aggregateVolunteers = 0;

      sspmReportsData?.forEach(r => {
        aggregateStudies += r.bible_studies_conducted || 0;
        aggregateBaptisms += r.baptism_candidates_added || 0;
        aggregateSurveys += r.spiritual_gifts_surveys_completed || 0;
        aggregateVolunteers += r.mission_volunteers_active || 0;
      });

      // Compute Care Groups and Bible Studies by District
      const careGroupsMap = {};
      const bibleStudiesMap = {};
      
      // Get Care Groups count per district by mapping through churches
      const churchesMap = {};
      churchesData?.forEach(c => {
        churchesMap[c.id] = c.district_name || 'Unassigned';
      });

      // Fetch groups with church linkages
      const { data: groupsData } = await supabase.from('ezc_small_groups').select('church_id, member_count');
      groupsData?.forEach(g => {
        const dist = churchesMap[g.church_id] || 'Unassigned';
        careGroupsMap[dist] = (careGroupsMap[dist] || 0) + 1;
      });

      // Sum bible studies by district
      sspmReportsData?.forEach(r => {
        const churchId = r.ezc_departmental_reports?.church_id;
        const dist = churchesMap[churchId] || 'Unassigned';
        bibleStudiesMap[dist] = (bibleStudiesMap[dist] || 0) + (r.bible_studies_conducted || 0);
      });

      setCareGroupsByDistrict(
        Object.entries(careGroupsMap).map(([name, count]) => ({ name, count }))
      );

      setBibleStudiesByDistrict(
        Object.entries(bibleStudiesMap).map(([name, count]) => ({ name, count }))
      );

      // Compliance calculation
      const activeChurchesCount = churchesData?.length || 1;
      const uniqueReportingChurches = new Set(reportsWrapperData?.map(r => r.church_id));
      const compliancePercent = Math.round((uniqueReportingChurches.size / activeChurchesCount) * 100);

      setMetrics({
        activeCareGroups: careGroupsCount || 0,
        totalBibleStudies: aggregateStudies,
        candidatesBaptized: aggregateBaptisms,
        surveysCompleted: aggregateSurveys,
        activeVolunteers: aggregateVolunteers,
        reportingCompliance: compliancePercent
      });

      // Formulate recent reports list
      const formattedReports = (reportsWrapperData || []).slice(0, 5).map(r => {
        // Find matching SSPM data payload
        const subData = sspmReportsData?.find(s => s.report_id === r.id);
        return {
          id: r.id,
          churchName: r.ezc_churches?.name || 'Local Church',
          districtName: r.ezc_churches?.district_name || 'District',
          period: `${new Date(r.reporting_period_start).toLocaleDateString()} - ${new Date(r.reporting_period_end).toLocaleDateString()}`,
          status: r.status,
          careGroups: subData?.care_groups_active || 0,
          studies: subData?.bible_studies_conducted || 0,
          baptisms: subData?.baptism_candidates_added || 0
        };
      });
      setRecentReports(formattedReports);

      // Formulate compliance list by district
      const districtCompliance = {};
      churchesData?.forEach(c => {
        const d = c.district_name || 'Unassigned';
        if (!districtCompliance[d]) {
          districtCompliance[d] = { total: 0, submitted: 0 };
        }
        districtCompliance[d].total += 1;
        if (uniqueReportingChurches.has(c.id)) {
          districtCompliance[d].submitted += 1;
        }
      });
      setComplianceList(
        Object.entries(districtCompliance).map(([name, data]) => ({
          name,
          total: data.total,
          submitted: data.submitted,
          percent: Math.round((data.submitted / data.total) * 100)
        })).sort((a, b) => b.percent - a.percent)
      );

    } catch (err) {
      console.error('SSPM Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#2E7D32] font-black text-xs uppercase tracking-widest animate-pulse">Loading SSPM Modules…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logos/sspm.png" alt="SSPM Logo" className="w-12 h-12 object-contain" />
          <div>
            <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Sabbath School & Personal Ministries (SSPM)</h2>
            <p className="text-sm text-gray-500 mt-1">Care group growth, bible instruction, baptism pipeline, and volunteer impact</p>
          </div>
        </div>
        <button
          onClick={loadSSPMData}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Heart} label="Care Groups" value={metrics.activeCareGroups} color="bg-[#2E7D32]" sub="Active small groups" />
        <StatCard icon={BookOpen} label="Bible Studies" value={metrics.totalBibleStudies} color="bg-[#1565C0]" sub="Currently conducted" />
        <StatCard icon={Target} label="Baptisms Added" value={metrics.candidatesBaptized} color="bg-[#F57F17]" sub="SSPM pipeline" />
        <StatCard icon={Award} label="Spiritual Gifts" value={metrics.surveysCompleted} color="bg-[#6A1B9A]" sub="Surveys completed" />
        <StatCard icon={Users} label="Volunteers" value={metrics.activeVolunteers} color="bg-[#00838F]" sub="Active missionaries" />
        <StatCard icon={ShieldCheck} label="Reporting compliance" value={`${metrics.reportingCompliance}%`} color="bg-[#AD1457]" sub="Local churches" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Care Groups chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Care Groups by District</h3>
          {careGroupsByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={careGroupsByDistrict} margin={{ top: 0, right: 0, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#2E7D32" radius={[4, 4, 0, 0]} name="Care Groups" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No care group data available</div>
          )}
        </div>

        {/* Bible Studies chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Active Bible Studies by District</h3>
          {bibleStudiesByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={bibleStudiesByDistrict} margin={{ top: 0, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <defs>
                  <linearGradient id="colorStudies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1565C0" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1565C0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke="#1565C0" fillOpacity={1} fill="url(#colorStudies)" name="Bible Studies" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No bible study data available</div>
          )}
        </div>
      </div>

      {/* Reports & Compliance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent reports list (Col-span 2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-[#2E7D32]" />
            Recent SSPM Reports Submitted
          </h3>
          <div className="flex-1 overflow-x-auto">
            {recentReports.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Church / District</th>
                    <th className="pb-3">Reporting Period</th>
                    <th className="pb-3 text-center">Care Groups</th>
                    <th className="pb-3 text-center">Bible Studies</th>
                    <th className="pb-3 text-center">Baptisms</th>
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
                      <td className="py-3.5 pr-2 text-center font-black text-[#2E7D32]">{r.careGroups}</td>
                      <td className="py-3.5 pr-2 text-center font-black text-[#1565C0]">{r.studies}</td>
                      <td className="py-3.5 pr-2 text-center font-black text-[#F57F17]">{r.baptisms}</td>
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
                <AlertCircle size={28} className="text-gray-300 mb-2" />
                <p className="font-semibold">No SSPM reports submitted yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Compliance checklist */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-[#AD1457]" />
            District Compliance
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {complianceList.length > 0 ? (
              complianceList.map(dist => (
                <div key={dist.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700">{dist.name}</span>
                    <span className="font-black text-gray-500">{dist.submitted} / {dist.total} ({dist.percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dist.percent >= 80 ? 'bg-green-600' :
                        dist.percent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dist.percent}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs py-4 text-center">No compliance metrics available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
