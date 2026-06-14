'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../context/AuthContext';
import { Plus, Search, Users, MapPin, Calendar, Phone, X, Save, Loader, BookOpen, Heart, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_STYLES = {
  small_group: { label: 'Small Group', color: 'bg-purple-100 text-purple-700', icon: Users },
  prayer_band: { label: 'Prayer Band', color: 'bg-pink-100 text-pink-700', icon: Heart },
  bible_study: { label: 'Bible Study', color: 'bg-blue-100 text-blue-700', icon: BookOpen },
  branch_sabbath: { label: 'Branch Sabbath', color: 'bg-amber-100 text-amber-700', icon: Zap },
  ministry_center: { label: 'Ministry Center', color: 'bg-green-100 text-green-700', icon: MapPin },
  prayer_cell: { label: 'Prayer Cell', color: 'bg-rose-100 text-rose-700', icon: Heart },
  intercessory: { label: 'Intercessory', color: 'bg-indigo-100 text-indigo-700', icon: Heart },
};

export default function SmallGroupsPage({ churches = [] }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'small_group', leader_name: '', leader_phone: '',
    church_id: '', meeting_day: '', meeting_time: '', address: '',
    lat: '', lng: '', member_count: 0, is_active: true, notes: ''
  });

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ezc_small_groups')
      .select('*, ezc_churches(name)')
      .order('name');
    setGroups(data || []);
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
        member_count: parseInt(form.member_count) || 0,
        church_id: form.church_id || null,
      };
      const { error } = await supabase.from('ezc_small_groups').insert(payload);
      if (error) throw error;
      toast.success('Small group added!');
      setShowForm(false);
      loadGroups();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const filtered = groups.filter(g => {
    const s = search.toLowerCase();
    return (!search || g.name?.toLowerCase().includes(s) || g.leader_name?.toLowerCase().includes(s))
      && (!filterType || g.type === filterType);
  });

  const groupsByType = {};
  filtered.forEach(g => { groupsByType[g.type] = (groupsByType[g.type] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Small Groups & Prayer Ministries</h2>
          <p className="text-sm text-gray-500 mt-0.5">{groups.length} groups · {groups.filter(g => g.is_active).length} active</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#388E3C] text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-900/20">
          <Plus size={16} /> Add Group
        </button>
      </div>

      {/* Type summary pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_STYLES).map(([type, style]) => {
          const count = groupsByType[type] || 0;
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? '' : type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                filterType === type ? style.color + ' border-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              <style.icon size={12} />
              {style.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
        <Search size={15} className="text-gray-400" />
        <input type="text" placeholder="Search groups…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-[#1A2E1A] font-medium placeholder-gray-400" />
      </div>

      {/* Group Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader className="animate-spin text-[#2E7D32]" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-semibold">No groups found</p>
          <p className="text-gray-400 text-sm mt-1">Add small groups, prayer bands, and bible study groups</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g, i) => {
            const typeStyle = TYPE_STYLES[g.type] || { label: g.type, color: 'bg-gray-100 text-gray-600', icon: Users };
            return (
              <motion.div key={g.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${typeStyle.color} mb-2`}>
                      <typeStyle.icon size={10} /> {typeStyle.label}
                    </span>
                    <h3 className="font-black text-[#1A2E1A] text-sm leading-tight">{g.name}</h3>
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${g.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="space-y-1.5 text-xs text-gray-500">
                  {g.leader_name && <p className="flex items-center gap-2"><Users size={12} className="text-gray-400" /> {g.leader_name}</p>}
                  {g.church_id && <p className="flex items-center gap-2"><MapPin size={12} className="text-gray-400" /> {g.ezc_churches?.name || '—'}</p>}
                  {g.meeting_day && <p className="flex items-center gap-2"><Calendar size={12} className="text-gray-400" /> {g.meeting_day} {g.meeting_time}</p>}
                  {g.address && <p className="flex items-center gap-2 truncate"><MapPin size={12} className="text-gray-400" /> {g.address}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#2E7D32]">{g.member_count || 0} members</span>
                  {g.leader_phone && (
                    <a href={`tel:${g.leader_phone}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#2E7D32] transition-colors">
                      <Phone size={12} /> Call Leader
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Group Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1A2E1A]/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
              <div className="bg-[#2E7D32] px-8 py-5 flex items-center justify-between shrink-0 rounded-t-3xl">
                <h3 className="text-white font-black uppercase tracking-wider text-sm">Add Small Group / Ministry</h3>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="p-8 overflow-y-auto space-y-4">
                <div>
                  <label className="label-sm">Group Name *</label>
                  <input required className="field" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} placeholder="Waterfalls Prayer Band" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-sm">Type</label>
                    <select className="field" value={form.type} onChange={e => setForm(p=>({...p, type: e.target.value}))}>
                      {Object.entries(TYPE_STYLES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Church</label>
                    <select className="field" value={form.church_id} onChange={e => setForm(p=>({...p, church_id: e.target.value}))}>
                      <option value="">Select church</option>
                      {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Leader Name</label>
                    <input className="field" value={form.leader_name} onChange={e => setForm(p=>({...p, leader_name: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">Leader Phone</label>
                    <input className="field" value={form.leader_phone} onChange={e => setForm(p=>({...p, leader_phone: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">Meeting Day</label>
                    <select className="field" value={form.meeting_day} onChange={e => setForm(p=>({...p, meeting_day: e.target.value}))}>
                      <option value="">Select day</option>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Sabbath','Sunday'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Meeting Time</label>
                    <input type="time" className="field" value={form.meeting_time} onChange={e => setForm(p=>({...p, meeting_time: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">Member Count</label>
                    <input type="number" className="field" value={form.member_count} onChange={e => setForm(p=>({...p, member_count: e.target.value}))} min="0" />
                  </div>
                  <div>
                    <label className="label-sm">Status</label>
                    <select className="field" value={form.is_active} onChange={e => setForm(p=>({...p, is_active: e.target.value === 'true'}))}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-sm">Address / Location</label>
                    <input className="field" value={form.address} onChange={e => setForm(p=>({...p, address: e.target.value}))} placeholder="Meeting location address" />
                  </div>
                  <div>
                    <label className="label-sm">Latitude</label>
                    <input type="number" step="any" className="field" value={form.lat} onChange={e => setForm(p=>({...p, lat: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">Longitude</label>
                    <input type="number" step="any" className="field" value={form.lng} onChange={e => setForm(p=>({...p, lng: e.target.value}))} />
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
