'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Users, Award, Calendar, CheckCircle, ShieldCheck, MapPin,
  TrendingUp, Compass, Award as HonorIcon, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';

function StatCard({ icon: Icon, label, value, sub, color }) {
  const isLogo = typeof Icon === 'string';
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isLogo ? `${color} p-1.5` : `${color}`}`}>
        {isLogo ? (
          <img src={Icon} alt={label} className="w-full h-full object-contain" />
        ) : (
          <Icon size={22} className="text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-[#1A2E1A] leading-tight mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function YouthDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    ayMembership: 0,
    pathfinderMembership: 0,
    adventurerMembership: 0,
    totalCamporeeRegs: 0,
    totalHonors: 0,
    totalCerts: 0
  });

  const [youthByDistrict, setYouthByDistrict] = useState([]);
  const [honorsByDistrict, setHonorsByDistrict] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    loadYouthData();
  }, []);

  const loadYouthData = async () => {
    setLoading(true);
    try {
      const [
        { data: youthReportsData },
        { data: reportsWrapperData },
        { data: churchesData }
      ] = await Promise.all([
        supabase.from('ezc_youth_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_departmental_reports').select('*, ezc_churches(name, district_name)').eq('department_code', 'AY'),
        supabase.from('ezc_churches').select('id, name, district_name')
      ]);

      // Aggregate counts
      let aggAY = 0;
      let aggPath = 0;
      let aggAdv = 0;
      let aggCamp = 0;
      let aggHonors = 0;
      let aggCerts = 0;

      youthReportsData?.forEach(r => {
        aggAY += r.ay_membership || 0;
        aggPath += r.pathfinder_membership || 0;
        aggAdv += r.adventurer_membership || 0;
        aggCamp += r.camporee_registrations || 0;
        aggHonors += r.honors_completed || 0;
        aggCerts += r.leadership_certifications || 0;
      });

      setMetrics({
        ayMembership: aggAY,
        pathfinderMembership: aggPath,
        adventurerMembership: aggAdv,
        totalCamporeeRegs: aggCamp,
        totalHonors: aggHonors,
        totalCerts: aggCerts
      });

      // Mapping church -> district
      const churchesMap = {};
      churchesData?.forEach(c => {
        churchesMap[c.id] = c.district_name || 'Unassigned';
      });

      // Compute youth members & honors per district
      const districtYouth = {};
      const districtHonors = {};

      youthReportsData?.forEach(r => {
        const churchId = r.ezc_departmental_reports?.church_id;
        const dist = churchesMap[churchId] || 'Unassigned';
        
        districtYouth[dist] = (districtYouth[dist] || 0) + (r.pathfinder_membership || 0) + (r.adventurer_membership || 0) + (r.ay_membership || 0);
        districtHonors[dist] = (districtHonors[dist] || 0) + (r.honors_completed || 0);
      });

      setYouthByDistrict(
        Object.entries(districtYouth).map(([name, count]) => ({ name, count }))
      );

      setHonorsByDistrict(
        Object.entries(districtHonors).map(([name, count]) => ({ name, count }))
      );

      // Recent youth reports
      const formattedReports = (reportsWrapperData || []).slice(0, 5).map(r => {
        const subData = youthReportsData?.find(s => s.report_id === r.id);
        return {
          id: r.id,
          churchName: r.ezc_churches?.name || 'Local Church',
          districtName: r.ezc_churches?.district_name || 'District',
          period: `${new Date(r.reporting_period_start).toLocaleDateString()} - ${new Date(r.reporting_period_end).toLocaleDateString()}`,
          status: r.status,
          pathfinders: subData?.pathfinder_membership || 0,
          adventurers: subData?.adventurer_membership || 0,
          ay: subData?.ay_membership || 0,
          camporee: subData?.camporee_registrations || 0
        };
      });
      setRecentReports(formattedReports);

    } catch (err) {
      console.error('Youth Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#2E7D32] font-black text-xs uppercase tracking-widest animate-pulse">Loading Youth Portals…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Adventist Youth (AY) & Pathfinder Ministries</h2>
          <p className="text-sm text-gray-500 mt-1">Club registers, camporee enrollments, and leadership certifications across EZC</p>
        </div>
        <button
          onClick={loadYouthData}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon="/logos/pathfinder.png" label="Pathfinders" value={metrics.pathfinderMembership} color="bg-orange-50 border border-orange-100" sub="Active club members" />
        <StatCard icon="/logos/adventurer.png" label="Adventurers" value={metrics.adventurerMembership} color="bg-blue-50 border border-blue-100" sub="Active club members" />
        <StatCard icon="/logos/ay.png" label="AY Society" value={metrics.ayMembership} color="bg-green-50 border border-green-100" sub="Active youth members" />
        <StatCard icon="/logos/camporee.svg" label="Camporee Regs" value={metrics.totalCamporeeRegs} color="bg-amber-50 border border-amber-100" sub="Registered for camp" />
        <StatCard icon="/logos/honors.svg" label="Honors Earned" value={metrics.totalHonors} color="bg-purple-50 border border-purple-100" sub="Skills badges completed" />
        <StatCard icon="/logos/master_guide.png" label="Leader Certs" value={metrics.totalCerts} color="bg-cyan-50 border border-cyan-100" sub="Master Guides & PLA" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District youth members */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Total Youth Population by District</h3>
          {youthByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={youthByDistrict} margin={{ top: 0, right: 0, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#E65100" radius={[4, 4, 0, 0]} name="Youth Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No youth data reported yet</div>
          )}
        </div>

        {/* District honors */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Pathfinder Honors Completed by District</h3>
          {honorsByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={honorsByDistrict} margin={{ top: 0, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <defs>
                  <linearGradient id="colorHonors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6A1B9A" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6A1B9A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke="#6A1B9A" fillOpacity={1} fill="url(#colorHonors)" name="Honors Completed" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No honors data reported yet</div>
          )}
        </div>
      </div>

      {/* Recent submissions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-[#E65100]" />
          Recent Departmental Youth Submissions
        </h3>
        <div className="overflow-x-auto">
          {recentReports.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Church / District</th>
                  <th className="pb-3">Reporting Period</th>
                  <th className="pb-3 text-center">AY Members</th>
                  <th className="pb-3 text-center">Pathfinders</th>
                  <th className="pb-3 text-center">Adventurers</th>
                  <th className="pb-3 text-center">Camporee Regs</th>
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
                    <td className="py-3.5 pr-2 text-center font-black text-[#2E7D32]">{r.ay}</td>
                    <td className="py-3.5 pr-2 text-center font-black text-[#E65100]">{r.pathfinders}</td>
                    <td className="py-3.5 pr-2 text-center font-black text-[#0288D1]">{r.adventurers}</td>
                    <td className="py-3.5 pr-2 text-center font-black text-[#F57F17]">{r.camporee}</td>
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
              <Compass size={28} className="text-gray-300 mb-2" />
              <p className="font-semibold">No youth reports submitted yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
