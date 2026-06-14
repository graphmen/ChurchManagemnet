'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../context/AuthContext';
import { Plus, Search, Target, Calendar, MapPin, Users, X, Save, Loader, Award, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  planned: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-500',
};

const CAMPAIGN_TYPES = ['campaign','seminar','revival','outreach','community','vbs','health'];

export default function EvangelismPage({ churches = [] }) {
  const [campaigns, setCampaigns] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'campaign', church_id: '', start_date: '', end_date: '',
    address: '', lat: '', lng: '', attendance: '', baptisms: '', bible_studies: '',
    decisions: '', status: 'planned', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: camps }, { data: cands }] = await Promise.all([
      supabase.from('ezc_campaigns').select('*, ezc_churches(name)').order('start_date', { ascending: false }),
      supabase.from('ezc_baptismal_candidates').select('*, ezc_churches(name)').order('created_at', { ascending: false }),
    ]);
    setCampaigns(camps || []);
    setCandidates(cands || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        attendance: parseInt(form.attendance) || 0,
        baptisms: parseInt(form.baptisms) || 0,
        bible_studies: parseInt(form.bible_studies) || 0,
        decisions: parseInt(form.decisions) || 0,
        church_id: form.church_id || null,
      };
      const { error } = await supabase.from('ezc_campaigns').insert(payload);
      if (error) throw error;
      toast.success('Campaign logged!');
      setShowForm(false);
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const totalBaptisms = campaigns.reduce((s, c) => s + (c.baptisms || 0), 0);
  const totalAttendance = campaigns.reduce((s, c) => s + (c.attendance || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Evangelism & Campaigns</h2>
          <p className="text-sm text-gray-500 mt-0.5">{campaigns.length} campaigns · {candidates.length} baptismal candidates</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#388E3C] text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-900/20">
          <Plus size={16} /> Log Campaign
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Baptisms', value: totalBaptisms, icon: Award, color: 'text-[#2E7D32]' },
          { label: 'Total Attendance', value: totalAttendance.toLocaleString(), icon: Users, color: 'text-blue-600' },
          { label: 'Active Campaigns', value: activeCampaigns, icon: Target, color: 'text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
            <s.icon size={24} className={`mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-black text-[#1A2E1A]">{s.value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
          { id: 'candidates', label: 'Baptismal Candidates', count: candidates.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${
              activeTab === tab.id ? 'bg-white text-[#2E7D32] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
        <Search size={15} className="text-gray-400" />
        <input type="text" placeholder={activeTab === 'campaigns' ? 'Search campaigns…' : 'Search candidates…'}
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-[#1A2E1A] font-medium placeholder-gray-400" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader className="animate-spin text-[#2E7D32]" size={28} /></div>
      ) : activeTab === 'campaigns' ? (
        <div className="space-y-3">
          {campaigns.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase">{c.type}</span>
                  </div>
                  <h3 className="font-black text-[#1A2E1A] text-sm">{c.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{c.ezc_churches?.name}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-black">
                  <div className="text-center">
                    <p className="text-[#2E7D32] text-lg leading-none">{c.baptisms || 0}</p>
                    <p className="text-gray-400 uppercase text-[9px] tracking-wider">Baptisms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-blue-600 text-lg leading-none">{c.attendance || 0}</p>
                    <p className="text-gray-400 uppercase text-[9px] tracking-wider">Attended</p>
                  </div>
                  <div className="text-center">
                    <p className="text-amber-600 text-lg leading-none">{c.bible_studies || 0}</p>
                    <p className="text-gray-400 uppercase text-[9px] tracking-wider">Studies</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {c.start_date && <span className="flex items-center gap-1"><Calendar size={11} /> {c.start_date} → {c.end_date || 'ongoing'}</span>}
                {c.address && <span className="flex items-center gap-1 truncate"><MapPin size={11} /> {c.address}</span>}
              </div>
            </motion.div>
          ))}
          {campaigns.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Target size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-semibold">No campaigns yet</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {candidates.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-semibold">No candidates in pipeline</p>
              <p className="text-gray-400 text-sm mt-1">Add via mobile app during evangelism</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#F8FAF8]">
                  {['Name','Church','Studies','Progress','Status','Expected Baptism'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.filter(c => !search || c.full_name?.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-[#F8FAF8] transition-colors">
                    <td className="px-5 py-3 font-bold text-[#1A2E1A]">{c.full_name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{c.ezc_churches?.name || '—'}</td>
                    <td className="px-5 py-3 text-xs font-bold text-[#2E7D32]">{c.bible_studies_completed}/{c.bible_studies_total}</td>
                    <td className="px-5 py-3">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-[#2E7D32] rounded-full h-2" style={{ width: `${Math.min(100, Math.round((c.bible_studies_completed/c.bible_studies_total)*100))}%` }} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${c.status === 'ready' ? 'bg-green-100 text-green-700' : c.status === 'baptized' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{c.expected_baptism_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Campaign Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1A2E1A]/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
              <div className="bg-[#2E7D32] px-8 py-5 flex items-center justify-between shrink-0 rounded-t-3xl">
                <h3 className="text-white font-black uppercase tracking-wider text-sm">Log Campaign / Event</h3>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="p-8 overflow-y-auto space-y-4">
                <div>
                  <label className="label-sm">Campaign Name *</label>
                  <input required className="field" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} placeholder="Harare Central Evangelistic Campaign" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-sm">Type</label>
                    <select className="field" value={form.type} onChange={e => setForm(p=>({...p, type: e.target.value}))}>
                      {CAMPAIGN_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Status</label>
                    <select className="field" value={form.status} onChange={e => setForm(p=>({...p, status: e.target.value}))}>
                      {['planned','active','completed','cancelled'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Start Date</label>
                    <input type="date" className="field" value={form.start_date} onChange={e => setForm(p=>({...p, start_date: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">End Date</label>
                    <input type="date" className="field" value={form.end_date} onChange={e => setForm(p=>({...p, end_date: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">Attendance</label>
                    <input type="number" className="field" value={form.attendance} onChange={e => setForm(p=>({...p, attendance: e.target.value}))} min="0" />
                  </div>
                  <div>
                    <label className="label-sm">Baptisms</label>
                    <input type="number" className="field" value={form.baptisms} onChange={e => setForm(p=>({...p, baptisms: e.target.value}))} min="0" />
                  </div>
                  <div>
                    <label className="label-sm">Bible Studies</label>
                    <input type="number" className="field" value={form.bible_studies} onChange={e => setForm(p=>({...p, bible_studies: e.target.value}))} min="0" />
                  </div>
                  <div>
                    <label className="label-sm">Decisions</label>
                    <input type="number" className="field" value={form.decisions} onChange={e => setForm(p=>({...p, decisions: e.target.value}))} min="0" />
                  </div>
                  <div className="col-span-2">
                    <label className="label-sm">Church</label>
                    <select className="field" value={form.church_id} onChange={e => setForm(p=>({...p, church_id: e.target.value}))}>
                      <option value="">Select church</option>
                      {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-sm">Location / Address</label>
                    <input className="field" value={form.address} onChange={e => setForm(p=>({...p, address: e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="label-sm">Notes</label>
                    <textarea rows={2} className="field" value={form.notes} onChange={e => setForm(p=>({...p, notes: e.target.value}))} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="px-8 py-2.5 rounded-xl bg-[#2E7D32] text-white text-sm font-black uppercase tracking-wider hover:bg-[#388E3C] flex items-center gap-2 disabled:opacity-60">
                    {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />} Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
