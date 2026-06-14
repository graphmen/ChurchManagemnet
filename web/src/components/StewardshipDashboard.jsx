'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../context/AuthContext';
import {
  TrendingUp, Award, Calendar, CheckCircle, ShieldCheck,
  DollarSign, PieChart, Landmark, Heart, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
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

export default function StewardshipDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    avgAttendance: 0,
    titheGivers: 0,
    budgetAllocated: 0,
    budgetSpent: 0,
    remainingBudget: 0
  });

  const [financialsByDistrict, setFinancialsByDistrict] = useState([]);
  const [seminarsByDistrict, setSeminarsByDistrict] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    loadStewardshipData();
  }, []);

  const loadStewardshipData = async () => {
    setLoading(true);
    try {
      const [
        { data: stewReportsData },
        { data: reportsWrapperData },
        { data: churchesData }
      ] = await Promise.all([
        supabase.from('ezc_stewardship_reports').select('*, ezc_departmental_reports(*)'),
        supabase.from('ezc_departmental_reports').select('*, ezc_churches(name, district_name)').eq('department_code', 'STEW'),
        supabase.from('ezc_churches').select('id, name, district_name')
      ]);

      let aggAttendance = 0;
      let aggTithe = 0;
      let aggAllocated = 0;
      let aggSpent = 0;

      stewReportsData?.forEach(r => {
        aggAttendance += r.stewardship_seminar_attendance || 0;
        aggTithe += r.tithe_givers_count || 0;
        aggAllocated += parseFloat(r.budget_allocated) || 0;
        aggSpent += parseFloat(r.budget_spent) || 0;
      });

      const totalReports = stewReportsData?.length || 1;

      setMetrics({
        avgAttendance: Math.round(aggAttendance / totalReports) || 0,
        titheGivers: aggTithe,
        budgetAllocated: aggAllocated,
        budgetSpent: aggSpent,
        remainingBudget: aggAllocated - aggSpent
      });

      // Mapping church -> district
      const churchesMap = {};
      churchesData?.forEach(c => {
        churchesMap[c.id] = c.district_name || 'Unassigned';
      });

      // Sum metrics by district
      const distFinancials = {};
      const distSeminars = {};

      stewReportsData?.forEach(r => {
        const churchId = r.ezc_departmental_reports?.church_id;
        const dist = churchesMap[churchId] || 'Unassigned';
        
        if (!distFinancials[dist]) {
          distFinancials[dist] = { allocated: 0, spent: 0 };
        }
        distFinancials[dist].allocated += parseFloat(r.budget_allocated) || 0;
        distFinancials[dist].spent += parseFloat(r.budget_spent) || 0;

        distSeminars[dist] = (distSeminars[dist] || 0) + (r.stewardship_seminar_attendance || 0);
      });

      setFinancialsByDistrict(
        Object.entries(distFinancials).map(([name, data]) => ({
          name,
          allocated: data.allocated,
          spent: data.spent
        }))
      );

      setSeminarsByDistrict(
        Object.entries(distSeminars).map(([name, count]) => ({ name, count }))
      );

      // Formatting recent reports
      const formattedReports = (reportsWrapperData || []).slice(0, 5).map(r => {
        const subData = stewReportsData?.find(s => s.report_id === r.id);
        return {
          id: r.id,
          churchName: r.ezc_churches?.name || 'Local Church',
          districtName: r.ezc_churches?.district_name || 'District',
          period: `${new Date(r.reporting_period_start).toLocaleDateString()} - ${new Date(r.reporting_period_end).toLocaleDateString()}`,
          status: r.status,
          attendance: subData?.stewardship_seminar_attendance || 0,
          allocated: parseFloat(subData?.budget_allocated) || 0,
          spent: parseFloat(subData?.budget_spent) || 0
        };
      });
      setRecentReports(formattedReports);

    } catch (err) {
      console.error('Stewardship Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#2E7D32] font-black text-xs uppercase tracking-widest animate-pulse">Loading Stewardship Modules…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logos/stewardship.png" alt="Stewardship Logo" className="w-12 h-12 object-contain" />
          <div>
            <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Stewardship & Finance</h2>
            <p className="text-sm text-gray-500 mt-1">Stewardship education seminars, faithful return trackers, and local budgeting stats</p>
          </div>
        </div>
        <button
          onClick={loadStewardshipData}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Landmark} label="Allocated Budget" value={`$${metrics.budgetAllocated.toLocaleString()}`} color="bg-[#1565C0]" sub="Total budget logged" />
        <StatCard icon={DollarSign} label="Actual Spent" value={`$${metrics.budgetSpent.toLocaleString()}`} color="bg-[#AD1457]" sub="Tied to local ministries" />
        <StatCard icon={PieChart} label="Remaining Budget" value={`$${metrics.remainingBudget.toLocaleString()}`} color="bg-[#00838F]" sub="Surplus reserves" />
        <StatCard icon={Heart} label="Seminar Attendees" value={metrics.avgAttendance} color="bg-[#2E7D32]" sub="Average per cycle" />
        <StatCard icon={TrendingUp} label="Tithe Givers Count" value={metrics.titheGivers} color="bg-[#F57F17]" sub="Faithful records returned" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Spent */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Departmental Budget vs. Spent by District (USD)</h3>
          {financialsByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={financialsByDistrict} margin={{ top: 0, right: 0, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="allocated" fill="#1565C0" radius={[4, 4, 0, 0]} name="Allocated Budget" />
                <Bar dataKey="spent" fill="#AD1457" radius={[4, 4, 0, 0]} name="Actual Spent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No stewardship financials reported yet</div>
          )}
        </div>

        {/* Seminar attendees */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Stewardship Seminar Attendance by District</h3>
          {seminarsByDistrict.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seminarsByDistrict} margin={{ top: 0, right: 0, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#2E7D32" radius={[4, 4, 0, 0]} name="Seminar Attendees" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No seminar attendance data yet</div>
          )}
        </div>
      </div>

      {/* Recent submissions table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
        <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={18} className="text-[#1565C0]" />
          Recent Departmental Stewardship Submissions
        </h3>
        <div className="overflow-x-auto">
          {recentReports.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Church / District</th>
                  <th className="pb-3">Reporting Period</th>
                  <th className="pb-3 text-center">Seminar Attendance</th>
                  <th className="pb-3 text-center">Allocated Budget</th>
                  <th className="pb-3 text-center">Actual Spent</th>
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
                    <td className="py-3.5 pr-2 text-center font-black text-[#2E7D32]">{r.attendance}</td>
                    <td className="py-3.5 pr-2 text-center font-black text-[#1565C0]">${r.allocated.toLocaleString()}</td>
                    <td className="py-3.5 pr-2 text-center font-black text-[#AD1457]">${r.spent.toLocaleString()}</td>
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
              <p className="font-semibold">No stewardship reports submitted yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
