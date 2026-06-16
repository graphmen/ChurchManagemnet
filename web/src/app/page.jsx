'use client';
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map as MapIcon, LayoutDashboard, Users, Church, Heart, Target,
  Home, ShieldAlert, UserCog, LogOut, Menu, X, Search, Bell,
  ChevronRight, Settings, BookOpen, Layers, ClipboardList, Compass, Landmark,
  Smartphone
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth, supabase } from '../context/AuthContext';
import LoginPage from '../components/LoginPage';
import dynamic from 'next/dynamic';
const TerritoryMap = dynamic(() => import('../components/TerritoryMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-500 font-bold">Loading Map...</div>
});
import LeadershipDashboard from '../components/LeadershipDashboard';
import MembersPage from '../components/MembersPage';
import SmallGroupsPage from '../components/SmallGroupsPage';
import EvangelismPage from '../components/EvangelismPage';
import PastoralManagement from '../components/PastoralManagement';
import ReportForm from '../components/ReportForm';
import SSPMDashboard from '../components/SSPMDashboard';
import ReportApprovals from '../components/ReportApprovals';
import YouthDashboard from '../components/YouthDashboard';
import ChildrenDashboard from '../components/ChildrenDashboard';
import StewardshipDashboard from '../components/StewardshipDashboard';
import CommunityMinistries from '../components/CommunityMinistries';
import MandEAudit from '../components/MandEAudit';
import MobileDownload from '../components/MobileDownload';
const ReportsAnalytics = dynamic(() => import('../components/ReportsAnalytics'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-500 font-bold">Loading Analytics...</div>
});


// ─── Navigation Config ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { id: 'map', label: 'Territory Map', icon: MapIcon, section: 'main' },
  
  { id: 'pastoral', label: 'Pastoral Mgmt', icon: UserCog, section: 'main', adminOnly: true },
  { id: 'sspm', label: 'SSPM Dashboard', icon: ClipboardList, section: 'ministry' },
  { id: 'youth', label: 'Youth Department', icon: Compass, section: 'ministry' },
  { id: 'children', label: 'Children Ministries', icon: Heart, section: 'ministry' },
  { id: 'stewardship', label: 'Stewardship', icon: Landmark, section: 'ministry' },
  { id: 'community', label: 'Community Portals', icon: Layers, section: 'ministry' },
  { id: 'approvals', label: 'Report Approvals', icon: BookOpen, section: 'ministry' },
  { id: 'members', label: 'Members', icon: Users, section: 'ministry' },
  { id: 'smallgroups', label: 'Small Groups & Prayer', icon: Heart, section: 'ministry' },
  { id: 'evangelism', label: 'Evangelism', icon: Target, section: 'ministry' },
  { id: 'reports', label: 'Pastoral Reports', icon: BookOpen, section: 'ministry', adminOnly: true },
  { id: 'properties', label: 'Properties', icon: Home, section: 'assets' },
  { id: 'emergency', label: 'Emergency Response', icon: ShieldAlert, section: 'tools' },
  { id: 'm_and_e', label: 'M&E & System Audit', icon: ShieldAlert, section: 'tools', adminOnly: true },
  { id: 'mobile_app', label: 'Mobile App', icon: Smartphone, section: 'tools' },
];

const SECTION_LABELS = {
  main: 'Command Centre',
  ministry: 'Ministry Modules',
  assets: 'Assets & Infrastructure',
  tools: 'Tools',
};

// ─── Properties Page (simple) ─────────────────────────────────────────────────
function PropertiesPage({ churches }) {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'church', district_name: '', address: '', status: 'active', area_sqm: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { default: toast } = { default: { success: () => {}, error: () => {} } };

  useEffect(() => {
    supabase.from('ezc_properties').select('*').order('name')
      .then(({ data }) => { setProps(data || []); setLoading(false); });
  }, []);

  const TYPE_COLORS = {
    church: 'bg-green-100 text-green-700', school: 'bg-blue-100 text-blue-700',
    office: 'bg-purple-100 text-purple-700', land: 'bg-amber-100 text-amber-700',
    hospital: 'bg-red-100 text-red-600', institution: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Church Properties</h2>
          <p className="text-sm text-gray-500 mt-0.5">{props.length} registered assets</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#388E3C] text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95">
          + Add Property
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : props.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Home size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-semibold">No properties registered yet</p>
          <p className="text-gray-400 text-sm mt-1">Add churches, schools, offices and land</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {props.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${TYPE_COLORS[p.type] || 'bg-gray-100 text-gray-600'} mb-2 inline-block`}>{p.type}</span>
                  <h3 className="font-black text-[#1A2E1A] text-sm">{p.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
              </div>
              {p.district_name && <p className="text-xs text-gray-400 mb-1">📍 {p.district_name}</p>}
              {p.address && <p className="text-xs text-gray-400 truncate">{p.address}</p>}
              {p.area_sqm && <p className="text-xs text-[#2E7D32] font-bold mt-2">{p.area_sqm} m²</p>}
            </motion.div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="font-black text-[#1A2E1A] uppercase tracking-tight mb-6">Add Property</h3>
            <div className="space-y-4">
              <div><label className="label-sm">Property Name *</label><input required className="field" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-sm">Type</label>
                  <select className="field" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
                    {['church','school','office','land','hospital','clinic','institution','other'].map(t=><option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div><label className="label-sm">Status</label>
                  <select className="field" value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value}))}>
                    {['active','under_construction','planned','sold','leased'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label-sm">District</label><input className="field" value={form.district_name} onChange={e => setForm(p=>({...p,district_name:e.target.value}))} /></div>
              <div><label className="label-sm">Address</label><input className="field" value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))} /></div>
              <div><label className="label-sm">Area (m²)</label><input type="number" className="field" value={form.area_sqm} onChange={e => setForm(p=>({...p,area_sqm:e.target.value}))} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
              <button onClick={async () => {
                setSaving(true);
                const { error } = await supabase.from('ezc_properties').insert({ ...form, area_sqm: parseFloat(form.area_sqm) || null });
                setSaving(false);
                if (!error) { setShowForm(false); supabase.from('ezc_properties').select('*').order('name').then(({ data }) => setProps(data || [])); }
              }} disabled={saving}
                className="flex-1 py-3 bg-[#2E7D32] text-white rounded-xl text-sm font-black uppercase hover:bg-[#388E3C] disabled:opacity-60">
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Emergency Page ───────────────────────────────────────────────────────────
function EmergencyPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('ezc_emergency_events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setEvents(data || []); setLoading(false); });
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Emergency Response</h2>
          <p className="text-sm text-gray-500 mt-0.5">Crisis management and member welfare</p>
        </div>
        <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95">
          + Report Emergency
        </button>
      </div>
      {events.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ShieldAlert size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-semibold">No active emergencies</p>
          <p className="text-gray-400 text-sm mt-1">The system will alert you when a crisis is reported</p>
        </div>
      )}
      {events.map(e => (
        <div key={e.id} className={`rounded-2xl p-5 border ${e.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${e.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
            <span className="text-[10px] font-black uppercase text-gray-400">{e.type}</span>
          </div>
          <h3 className="font-black text-[#1A2E1A]">{e.title}</h3>
          {e.description && <p className="text-sm text-gray-500 mt-1">{e.description}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Main App Shell ───────────────────────────────────────────────────────────
function AppShell() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [churches, setChurches] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);

  // Map layer toggles
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState(null);

  useEffect(() => {
    if (user) {
      supabase.from('ezc_churches').select('*').then(({ data }) => setChurches(data || []));
    }
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#11321c]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#4CAF50] font-black text-xs uppercase tracking-[0.4em] animate-pulse">Loading System…</p>
      </div>
    </div>
  );

  if (!user) return <LoginPage />;

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if ((item.id === 'collector' || item.id === 'properties') && profile?.role === 'viewer') return false;
    return true;
  });
  const sections = [...new Set(visibleNav.map(n => n.section))];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <div className="p-6 md:p-8"><LeadershipDashboard /></div>;
      
      case 'map': return (
        <div className="h-full flex flex-col">
          {/* Map Layer Controls */}
          <div className="bg-white/95 backdrop-blur-md border-b border-gray-100/80 px-6 py-3 flex flex-wrap items-center gap-4 shrink-0 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mr-1">Layers:</span>
            {[
              { key: 'showBoundaries', label: 'Boundaries', state: showBoundaries, set: setShowBoundaries, Icon: Layers },
              { key: 'showMembers', label: 'Members', state: showMembers, set: setShowMembers, Icon: Users },
              { key: 'showProperties', label: 'Properties', state: showProperties, set: setShowProperties, Icon: Home },
              { key: 'showGroups', label: 'Small Groups', state: showGroups, set: setShowGroups, Icon: Heart },
            ].map(({ key, label, state, set, Icon }) => (
              <button key={key} onClick={() => set(!state)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                  state 
                    ? 'bg-gradient-to-r from-[#2E7D32] to-[#388E3C] text-white border-transparent shadow-[0_4px_14px_rgba(46,125,50,0.25)]' 
                    : 'bg-white text-gray-500 border-gray-200/80 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 hover:shadow-sm'
                }`}>
                <Icon size={12} className={state ? 'animate-pulse' : ''} /> {label}
              </button>
            ))}
            {selectedBoundary && (
              <div className="ml-auto flex items-center gap-2.5 bg-[#E8F0E8]/70 backdrop-blur border border-[#2E7D32]/20 px-4 py-2 rounded-xl shadow-[0_2px_8px_rgba(46,125,50,0.05)]">
                <span className="text-xs font-black text-[#2E7D32]">📍 {selectedBoundary.District}</span>
                {selectedBoundary.Pastor && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">· Pastor {selectedBoundary.Pastor}</span>}
                <button onClick={() => setSelectedBoundary(null)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all"><X size={12} /></button>
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            <TerritoryMap
              churches={churches}
              showBoundaries={showBoundaries}
              showMembers={showMembers}
              showProperties={showProperties}
              showGroups={showGroups}
              selectedBoundary={selectedBoundary}
              onSelectBoundary={setSelectedBoundary}
            />
          </div>
        </div>
      );
      case 'members': return <div className="p-6 md:p-8"><MembersPage churches={churches} /></div>;
      case 'sspm': return <div className="p-6 md:p-8"><SSPMDashboard /></div>;
      case 'youth': return <div className="p-6 md:p-8"><YouthDashboard /></div>;
      case 'children': return <div className="p-6 md:p-8"><ChildrenDashboard /></div>;
      case 'stewardship': return <div className="p-6 md:p-8"><StewardshipDashboard /></div>;
      case 'community': return <div className="p-6 md:p-8"><CommunityMinistries /></div>;
      case 'approvals': return <div className="p-6 md:p-8"><ReportApprovals /></div>;
      case 'smallgroups': return <div className="p-6 md:p-8"><SmallGroupsPage churches={churches} /></div>;
      case 'evangelism': return <div className="p-6 md:p-8"><EvangelismPage churches={churches} /></div>;
      case 'pastoral': return <div className="p-6 md:p-8"><PastoralManagement /></div>;
      case 'properties': return <div className="p-6 md:p-8"><PropertiesPage churches={churches} /></div>;
      case 'emergency': return <div className="p-6 md:p-8"><EmergencyPage /></div>;
      case 'm_and_e': return <div className="p-6 md:p-8"><MandEAudit /></div>;
      case 'mobile_app': return <div className="p-6 md:p-8"><MobileDownload /></div>;
      case 'reports': return (
        <div className="p-6 md:p-8">
          <ReportsAnalytics selectedDistrict={null} filterPastor="" churches={churches} />
        </div>
      );
      default: return null;
    }
  };

  const currentNav = visibleNav.find(n => n.id === activeTab);

  return (
    <div className="flex h-screen bg-[#F0F4F0] overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: 12, fontWeight: 700, fontSize: 13 } }} />

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#11321c] flex flex-col
        md:relative md:translate-x-0 md:z-auto
        transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl p-1.5 border border-white/20">
                <img src="/sda_logo.svg" alt="SDA" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-white font-black text-sm leading-none">EZC GeoMap</p>
                <p className="text-[#4CAF50] text-[10px] uppercase tracking-[0.2em] mt-0.5 font-bold">GIS Platform</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-white/40 hover:text-white md:hidden">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {sections.map(section => {
            const items = visibleNav.filter(n => n.section === section);
            return (
              <div key={section}>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] px-3 mb-1.5">{SECTION_LABELS[section]}</p>
                <div className="space-y-0.5">
                  {items.map(item => (
                    <button key={item.id}
                      onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        activeTab === item.id
                          ? 'bg-[#2E7D32] text-white font-black'
                          : 'text-white/60 hover:bg-white/5 hover:text-white font-semibold'
                      }`}
                    >
                      <item.icon size={17} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {activeTab === item.id && <ChevronRight size={14} className="ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#2E7D32] flex items-center justify-center text-white font-black text-xs shrink-0">
              {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-black truncate">{profile?.full_name || user?.email}</p>
              <p className="text-[#4CAF50] text-[10px] font-bold capitalize">{profile?.role?.replace(/_/g, ' ') || 'User'}</p>
            </div>
          </div>
          <button onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-wider">
            <LogOut size={14} /> Sign Out
          </button>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-6 h-6 rounded bg-white/10 p-0.5">
              <img src="/graphmen.png" alt="Graphmen" className="w-full h-full object-contain opacity-60" />
            </div>
            <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Graphmen Geospatial</p>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-4 shrink-0 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden">
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            {currentNav && <currentNav.icon size={18} className="text-[#2E7D32]" />}
            <h2 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wider">{currentNav?.label}</h2>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowReportForm(true)}
              className="hidden sm:flex items-center gap-2 bg-[#2E7D32] hover:bg-[#388E3C] text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all">
              + Log Activity
            </button>
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={18} className="text-gray-500" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={activeTab === 'map' ? 'h-full flex flex-col' : ''}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Report Form Modal */}
      <AnimatePresence>
        {showReportForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#11321c]/70 backdrop-blur-md" onClick={() => setShowReportForm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#2E7D32]/30 overflow-hidden flex flex-col max-h-[90vh] relative">
              <div className="p-8 overflow-y-auto">
                <ReportForm onClose={() => setShowReportForm(false)} pastorName={profile?.full_name || ''} churches={churches} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
