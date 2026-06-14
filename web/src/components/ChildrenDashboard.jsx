'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Users, Award, Calendar, CheckCircle, ShieldCheck,
  AlertTriangle, Flame, ShieldAlert, CheckSquare, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { motion } from 'framer-motion';

function StatCard({ icon: Icon, label, value, sub, color }) {
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
    </motion.div>
  );
}

export default function ChildrenDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    avgAttendance: 0,
    totalVbsAttendance: 0,
    totalVbsLeaders: 0,
    safeguardingCompliance: 0
  });

  const [attendanceByDistrict, setAttendanceByDistrict] = useState([]);
  const [vbsByDistrict, setVbsByDistrict] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [nonCompliantChurches, setNonCompliantChurches] = useState([]);

  useEffect(() => {
    loadChildrenData();
  }, []);

  const loadChildrenData = async () => {
    setLoading(true);
    try {
      const [
        { data: childReportsData },
        { data: reportsWrapperData },
        { data: churchesData }
      ] = await Promise.all([
        supabase.from('ezc_children_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_departmental_reports').select('*, ezc_churches(name, district_name)').eq('department_code', 'CM'),
        supabase.from('ezc_churches').select('id, name, district_name')
      ]);

      let aggAttendance = 0;
      let aggVbs = 0;
      let aggVbsLeaders = 0;
      let compliantReports = 0;
      const nonCompliantList = [];

      childReportsData?.forEach(r => {
        aggAttendance += r.children_attendance || 0;
        aggVbs += r.vbs_attendance || 0;
        aggVbs_leaders_count += r.vbs_leaders_count || 0;
        if (r.safeguarding_compliant) {
          compliantReports++;
        } else {
          // Find church info
          const churchInfo = reportsWrapperData?.find(w => w.id === r.report_id);
          if (churchInfo) {
            nonCompliantList.push({
              id: r.id,
              churchName: churchInfo.ezc_churches?.name || 'Local Church',
              districtName: churchInfo.ezc_churches?.district_name || 'District',
              period: `${new Date(churchInfo.reporting_period_start).toLocaleDateString()} - ${new Date(churchInfo.reporting_period_end).toLocaleDateString()}`
            });
          }
        }
      });

      const totalReports = childReportsData?.length || 1;
      const compliancePercent = Math.round((compliantReports / totalReports) * 100);

      setMetrics({
        avgAttendance: Math.round(aggAttendance / totalReports) || 0,
        totalVbsAttendance: aggVbs,
        totalVbsLeaders: aggVbsLeaders,
        safeguardingCompliance: compliancePercent
      });
      setNonCompliantChurches(nonCompliantList.slice(0, 5));

      // Mapping church -> district
      const churchesMap = {};
      churchesData?.forEach(c => {
        churchesMap[c.id] = c.district_name || 'Unassigned';
      });

      // Sum metrics by district
      const distAttendance = {};
      const distVbs = {};

      childReportsData?.forEach(r => {
        const churchId = r.ezc_departmental_reports?.church_id;
        const dist = churchesMap[churchId] || 'Unassigned';
        
        distAttendance[dist] = (distAttendance[dist] || 0) + (r.children_attendance || 0);
        distVbs[dist] = (distVbs[dist] || 0) + (r.vbs_attendance || 0);
      });

      setAttendanceByDistrict(
        Object.entries(distAttendance).map(([name, count]) => ({ name, count }))
      );

      setVbsByDistrict(
        Object.entries(distVbs).map(([name, count]) => ({ name, count }))
      );

      // Formatting recent reports
      const formattedReports = (reportsWrapperData || []).slice(0, 5).map(r => {
        const subData = childReportsData?.find(s => s.report_id === r.id);
        return {
          id: r.id,
          churchName: r.ezc_churches?.name || 'Local Church',
          districtName: r.ezc_churches?.district_name || 'District',
          period: `${new Date(r.reporting_period_start).toLocaleDateString()} - ${new Date(r.reporting_period_end).toLocaleDateString()}`,
          status: r.status,
          attendance: subData?.children_attendance || 0,
          vbs: subData?.vbs_attendance || 0,
          compliant: subData?.safeguarding_compliant
        };
      });
      setRecentReports(formattedReports);

    } catch (err) {
      console.error('Children Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#2E7D32] font-black text-xs uppercase tracking-widest animate-pulse">Loading Children Modules…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logos/children.png" alt="Children's Ministries Logo" className="w-12 h-12 object-contain" />
          <div>
            <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Children's Ministries</h2>
            <p className="text-sm text-gray-500 mt-1">Sabbath School class counts, Vacation Bible School campaign results, and child protection status</p>
          </div>
        </div>
        <button
          onClick={loadChildrenData}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Sabbath School Attendance" value={metrics.avgAttendance} color="bg-[#1565C0]" sub="Average per reporting church" />
        <StatCard icon={Flame} label="VBS Attendees" value={metrics.totalVbsAttendance} color="bg-[#F57F17]" sub="Vacation Bible School campaigns" />
        <StatCard icon={Award} label="VBS Leaders Trained" value={metrics.totalVbsLeaders} color="bg-[#2E7D32]" sub="Active child educators" />
        <StatCard icon={ShieldCheck} label="Safeguarding compliance" value={`${metrics.safeguardingCompliance}%`} color="bg-[#AD1457]" sub="Of child workers verified" />
      </div>

      {/* Child safety alerts */}
      {nonCompliantChurches.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <ShieldAlert className="text-red-600" size={20} />
          </div>
          <div>
            <p className="font-black text-red-800 text-sm">Child Safety Compliance Alerts</p>
            <p className="text-xs text-red-600 mt-0.5 mb-3">The following local churches reported non-compliance with the Conference Child Protection Policy in their latest reporting cycle:</p>
            <div className="flex flex-wrap gap-3">
              {nonCompliantChurches.map(nc => (
                <div key={nc.id} className="bg-white px-3 py-1.5 rounded-lg border border-red-100 text-[10px] font-bold text-gray-600">
                  ⚠️ <span className="font-black text-red-700">{nc.churchName}</span> ({nc.districtName} District)
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Children's Church Attendance by District</h3>
          {attendanceByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceByDistrict} margin={{ top: 0, right: 0, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#1565C0" radius={[4, 4, 0, 0]} name="Attendance" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No children attendance data yet</div>
          )}
        </div>

        {/* VBS chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">VBS Attendance by District</h3>
          {vbsByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vbsByDistrict} margin={{ top: 0, right: 0, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#F57F17" radius={[4, 4, 0, 0]} name="VBS Attendance" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No VBS campaign data yet</div>
          )}
        </div>
      </div>

      {/* Recent submissions table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <CheckSquare size={18} className="text-[#1565C0]" />
          Recent Departmental Children Reports
        </h3>
        <div className="overflow-x-auto">
          {recentReports.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Church / District</th>
                  <th className="pb-3">Reporting Period</th>
                  <th className="pb-3 text-center">Avg Attendance</th>
                  <th className="pb-3 text-center">VBS Attendance</th>
                  <th className="pb-3 text-center">Child Protection Status</th>
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
                    <td className="py-3.5 pr-2 text-center font-black text-[#1565C0]">{r.attendance}</td>
                    <td className="py-3.5 pr-2 text-center font-black text-[#F57F17]">{r.vbs}</td>
                    <td className="py-3.5 pr-2 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase inline-block ${
                        r.compliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {r.compliant ? 'Compliant' : 'Non-compliant'}
                      </span>
                    </td>
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
              <ShieldCheck size={28} className="text-gray-300 mb-2" />
              <p className="font-semibold">No children reports submitted yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
