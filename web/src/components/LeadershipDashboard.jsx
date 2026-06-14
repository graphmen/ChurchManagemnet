'use client';
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { supabase } from '../context/AuthContext';
import {
  Church, Users, MapPin, Activity, Target, AlertTriangle,
  BookOpen, Heart, TrendingUp, Award, Home, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#2E7D32','#388E3C','#43A047','#66BB6A','#A5D6A7','#1B5E20','#4CAF50'];

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
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
        <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </motion.div>
  );
}

export default function LeadershipDashboard() {
  const [stats, setStats] = useState({
    churches: 0, members: 0, pastors: 0, districts: 0,
    smallGroups: 0, campaigns: 0, candidates: 0, properties: 0,
    unassignedDistricts: 0, unreachedTerritories: 0,
    activeMembers: 0, inactiveMembers: 0,
  });
  const [campaignData, setCampaignData] = useState([]);
  const [memberStatusData, setMemberStatusData] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        { count: churches },
        { count: members },
        { count: pastors },
        { count: districts },
        { count: smallGroups },
        { count: campaigns },
        { count: candidates },
        { count: properties },
        { count: unreached },
        { data: membersByStatus },
        { data: churchesByDistrict },
        { data: recentCampaigns },
        { data: recentVisitations },
      ] = await Promise.all([
        supabase.from('ezc_churches').select('*', { count: 'exact', head: true }),
        supabase.from('ezc_members').select('*', { count: 'exact', head: true }),
        supabase.from('ezc_pastors').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ezc_pastoral_boundaries').select('*', { count: 'exact', head: true }),
        supabase.from('ezc_small_groups').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ezc_campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('ezc_baptismal_candidates').select('*', { count: 'exact', head: true }).eq('status', 'studying'),
        supabase.from('ezc_properties').select('*', { count: 'exact', head: true }),
        supabase.from('ezc_unreached_territories').select('*', { count: 'exact', head: true }),
        supabase.from('ezc_members').select('status'),
        supabase.from('ezc_churches').select('district_name'),
        supabase.from('ezc_campaigns').select('name, baptisms, attendance, start_date').order('start_date', { ascending: false }).limit(6),
        supabase.from('ezc_visitations').select('id, visit_date, visit_type').order('created_at', { ascending: false }).limit(5),
      ]);

      // Member status breakdown
      const statusCounts = {};
      (membersByStatus || []).forEach(m => {
        statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
      });
      setMemberStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      // Churches by district
      const districtCounts = {};
      (churchesByDistrict || []).forEach(c => {
        const d = c.district_name || 'Unknown';
        districtCounts[d] = (districtCounts[d] || 0) + 1;
      });
      const sortedDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name: name.length > 15 ? name.slice(0, 13) + '…' : name, count }));
      setDistrictData(sortedDistricts);

      // Campaign data
      setCampaignData((recentCampaigns || []).map(c => ({
        name: c.name?.slice(0, 12) + '…',
        baptisms: c.baptisms || 0,
        attendance: c.attendance || 0,
      })));

      setRecentActivity([
        ...(recentVisitations || []).map(v => ({
          type: 'visitation', label: `Pastoral ${v.visit_type?.replace(/_/g,' ')} visit`, time: v.visit_date
        })),
      ].slice(0, 6));

      setStats({
        churches: churches || 0, members: members || 0, pastors: pastors || 0,
        districts: districts || 0, smallGroups: smallGroups || 0,
        campaigns: campaigns || 0, candidates: candidates || 0,
        properties: properties || 0, unreachedTerritories: unreached || 0,
        activeMembers: statusCounts.active || 0,
        inactiveMembers: statusCounts.inactive || 0,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#2E7D32] font-black text-xs uppercase tracking-widest animate-pulse">Loading Dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Leadership Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Real-time ministry intelligence across the East Zimbabwe Conference</p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Church} label="Total Churches" value={stats.churches} color="bg-[#2E7D32]" sub="EZC registered" />
        <StatCard icon={Users} label="Total Members" value={stats.members} color="bg-[#1565C0]" sub={`${stats.activeMembers} active`} trend={3} />
        <StatCard icon={Award} label="Active Pastors" value={stats.pastors} color="bg-[#6A1B9A]" sub="Currently serving" />
        <StatCard icon={MapPin} label="Districts Mapped" value={stats.districts} color="bg-[#BF360C]" sub="Harare + EZC" />
      </div>

      {/* Secondary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Heart} label="Small Groups" value={stats.smallGroups} color="bg-[#00695C]" sub="Active groups" />
        <StatCard icon={Target} label="Baptismal Pipeline" value={stats.candidates} color="bg-[#F57F17]" sub="Currently studying" />
        <StatCard icon={Activity} label="Campaigns" value={stats.campaigns} color="bg-[#004D40]" sub="All time" />
        <StatCard icon={Home} label="Properties" value={stats.properties} color="bg-[#4A148C]" sub="Church assets" />
      </div>

      {/* Alert Cards */}
      {(stats.unreachedTerritories > 0 || stats.inactiveMembers > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.unreachedTerritories > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-amber-600" size={20} />
              </div>
              <div>
                <p className="font-black text-amber-800 text-sm">{stats.unreachedTerritories} Unreached Territories</p>
                <p className="text-xs text-amber-600 mt-0.5">Communities without Adventist presence identified</p>
              </div>
            </div>
          )}
          {stats.inactiveMembers > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Users className="text-red-500" size={20} />
              </div>
              <div>
                <p className="font-black text-red-700 text-sm">{stats.inactiveMembers} Inactive Members</p>
                <p className="text-xs text-red-500 mt-0.5">Require pastoral follow-up and care</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Churches by District */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Churches per District</h3>
          {districtData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={districtData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#2E7D32" radius={[4, 4, 0, 0]} name="Churches" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-gray-400 text-sm">No district data yet</p>
            </div>
          )}
        </div>

        {/* Member Status Pie */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Membership Status Breakdown</h3>
          {memberStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={memberStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  dataKey="value" nameKey="name" paddingAngle={3}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {memberStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto text-gray-300 mb-2" size={36} />
                <p className="text-gray-400 text-sm">Add members to see breakdown</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 — Campaign performance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4">Campaign Performance</h3>
        {campaignData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={campaignData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="attendance" fill="#2E7D32" radius={[4, 4, 0, 0]} name="Attendance" />
              <Bar dataKey="baptisms" fill="#FFC107" radius={[4, 4, 0, 0]} name="Baptisms" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center">
              <Target className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="text-gray-400 text-sm">No campaigns recorded yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Households', value: '—', icon: Home },
          { label: 'Prayer Bands', value: '—', icon: Heart },
          { label: 'Bible Studies', value: stats.candidates, icon: BookOpen },
          { label: 'Properties', value: stats.properties, icon: Layers },
          { label: 'Unreached', value: stats.unreachedTerritories, icon: AlertTriangle },
          { label: 'Growth %', value: '—', icon: TrendingUp },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <item.icon size={16} className="mx-auto text-[#2E7D32] mb-1" />
            <p className="text-sm font-black text-[#1A2E1A]">{item.value}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
