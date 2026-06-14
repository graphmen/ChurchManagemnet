import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../context/AuthContext';
import { Plus, Search, UserCheck, UserX, Phone, Mail, Calendar, MapPin, X, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-600',
  interest: 'bg-blue-100 text-blue-700',
  candidate: 'bg-amber-100 text-amber-700',
  transferred: 'bg-gray-100 text-gray-600',
};

export default function MembersPage({ churches = [] }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChurch, setFilterChurch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', address: '',
    gender: '', date_of_birth: '', baptism_date: '',
    status: 'active', church_id: '', notes: '', lat: '', lng: ''
  });

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ezc_members')
      .select('*, ezc_churches(name)')
      .order('full_name');
    setMembers(data || []);
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
        church_id: form.church_id || null,
      };
      const { error } = await supabase.from('ezc_members').insert(payload);
      if (error) throw error;
      toast.success('Member added successfully!');
      setShowForm(false);
      setForm({ full_name:'', phone:'', email:'', address:'', gender:'', date_of_birth:'', baptism_date:'', status:'active', church_id:'', notes:'', lat:'', lng:'' });
      loadMembers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = members.filter(m => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      m.full_name?.toLowerCase().includes(s) ||
      m.phone?.includes(s) ||
      m.address?.toLowerCase().includes(s);
    const matchStatus = !filterStatus || m.status === filterStatus;
    const matchChurch = !filterChurch || m.church_id === filterChurch;
    return matchSearch && matchStatus && matchChurch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Members & Households</h2>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} total members registered</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#388E3C] text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-900/20"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-gray-400" />
          <input
            type="text" placeholder="Search members…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none text-[#1A2E1A] font-medium placeholder-gray-400"
          />
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-[#1A2E1A] outline-none"
        >
          <option value="">All Status</option>
          {['active','inactive','interest','candidate','transferred'].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select
          value={filterChurch} onChange={e => setFilterChurch(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-[#1A2E1A] outline-none"
        >
          <option value="">All Churches</option>
          {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="animate-spin text-[#2E7D32]" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-semibold">No members found</p>
            <p className="text-gray-400 text-sm mt-1">Add members via the mobile app or the button above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#F8FAF8]">
                  {['Name','Church','Status','Phone','Address','Last Visit',''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-[#F8FAF8] transition-colors"
                  >
                    <td className="px-5 py-3 font-bold text-[#1A2E1A]">{m.full_name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{m.ezc_churches?.name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-600'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{m.phone || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs max-w-[150px] truncate">{m.address || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{m.last_visited || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {m.phone && <a href={`tel:${m.phone}`} className="p-1.5 hover:bg-green-50 rounded-lg text-[#2E7D32] transition-colors"><Phone size={13} /></a>}
                        {m.email && <a href={`mailto:${m.email}`} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"><Mail size={13} /></a>}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1A2E1A]/70 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#2E7D32] px-8 py-5 flex items-center justify-between shrink-0">
                <h3 className="text-white font-black uppercase tracking-wider text-sm">Add New Member</h3>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 overflow-y-auto space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label-sm">Full Name *</label>
                    <input required className="field" value={form.full_name} onChange={e => setForm(p=>({...p, full_name: e.target.value}))} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="label-sm">Phone</label>
                    <input className="field" value={form.phone} onChange={e => setForm(p=>({...p, phone: e.target.value}))} placeholder="+263 77..." />
                  </div>
                  <div>
                    <label className="label-sm">Email</label>
                    <input type="email" className="field" value={form.email} onChange={e => setForm(p=>({...p, email: e.target.value}))} placeholder="john@email.com" />
                  </div>
                  <div>
                    <label className="label-sm">Gender</label>
                    <select className="field" value={form.gender} onChange={e => setForm(p=>({...p, gender: e.target.value}))}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Status</label>
                    <select className="field" value={form.status} onChange={e => setForm(p=>({...p, status: e.target.value}))}>
                      {['active','inactive','interest','candidate','transferred'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Date of Birth</label>
                    <input type="date" className="field" value={form.date_of_birth} onChange={e => setForm(p=>({...p, date_of_birth: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">Baptism Date</label>
                    <input type="date" className="field" value={form.baptism_date} onChange={e => setForm(p=>({...p, baptism_date: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-sm">Church</label>
                    <select className="field" value={form.church_id} onChange={e => setForm(p=>({...p, church_id: e.target.value}))}>
                      <option value="">Select church</option>
                      {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-sm">Home Address</label>
                    <input className="field" value={form.address} onChange={e => setForm(p=>({...p, address: e.target.value}))} placeholder="15 Main St, Harare" />
                  </div>
                  <div>
                    <label className="label-sm">Latitude (GPS)</label>
                    <input type="number" step="any" className="field" value={form.lat} onChange={e => setForm(p=>({...p, lat: e.target.value}))} placeholder="-17.8292" />
                  </div>
                  <div>
                    <label className="label-sm">Longitude (GPS)</label>
                    <input type="number" step="any" className="field" value={form.lng} onChange={e => setForm(p=>({...p, lng: e.target.value}))} placeholder="31.0522" />
                  </div>
                  <div className="col-span-2">
                    <label className="label-sm">Notes</label>
                    <textarea rows={3} className="field" value={form.notes} onChange={e => setForm(p=>({...p, notes: e.target.value}))} placeholder="Additional notes…" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="px-8 py-2.5 rounded-xl bg-[#2E7D32] text-white text-sm font-black uppercase tracking-wider hover:bg-[#388E3C] transition-all flex items-center gap-2 disabled:opacity-60">
                    {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                    Save Member
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
