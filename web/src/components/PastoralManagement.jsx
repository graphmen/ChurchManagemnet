'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../context/AuthContext';
import { Plus, Users, MapPin, ArrowRight, UserCheck, AlertTriangle, X, Save, Loader, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PastoralManagement() {
  const [boundaries, setBoundaries] = useState([]);
  const [pastors, setPastors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showPastorForm, setShowPastorForm] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assignPastorId, setAssignPastorId] = useState('');
  const [pastorForm, setPastorForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: bounds }, { data: pasts }, { data: assigns }] = await Promise.all([
      supabase.from('ezc_pastoral_boundaries').select('*').order('district_name'),
      supabase.from('ezc_pastors').select('*').eq('is_active', true).order('name'),
      supabase.from('ezc_pastor_assignments').select('*, ezc_pastors(name), ezc_pastoral_boundaries(district_name)').eq('is_current', true),
    ]);
    setBoundaries(bounds || []);
    setPastors(pasts || []);
    setAssignments(assigns || []);
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedBoundary || !assignPastorId) return;
    setSaving(true);
    try {
      const pastor = pastors.find(p => p.id === assignPastorId);
      // Mark old assignments as not current
      await supabase.from('ezc_pastor_assignments')
        .update({ is_current: false, relieved_date: new Date().toISOString().split('T')[0] })
        .eq('boundary_id', selectedBoundary.id)
        .eq('is_current', true);

      // Update boundary
      await supabase.from('ezc_pastoral_boundaries')
        .update({ pastor_id: assignPastorId, pastor_name: pastor?.name, is_unassigned: false })
        .eq('id', selectedBoundary.id);

      // Create new assignment record
      await supabase.from('ezc_pastor_assignments').insert({
        pastor_id: assignPastorId,
        boundary_id: selectedBoundary.id,
        district_name: selectedBoundary.district_name,
        assigned_date: new Date().toISOString().split('T')[0],
        is_current: true,
      });

      toast.success(`${pastor?.name} assigned to ${selectedBoundary.district_name}!`);
      setShowAssignForm(false);
      setAssignPastorId('');
      loadAll();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleAddPastor = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('ezc_pastors').insert(pastorForm);
      if (error) throw error;
      toast.success('Pastor profile created!');
      setShowPastorForm(false);
      setPastorForm({ name: '', phone: '', email: '' });
      loadAll();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const unassigned = boundaries.filter(b => b.is_unassigned || !b.pastor_name);
  const assigned = boundaries.filter(b => !b.is_unassigned && b.pastor_name);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Pastoral Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{pastors.length} active pastors · {boundaries.length} districts · {unassigned.length} unassigned</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPastorForm(true)}
            className="flex items-center gap-2 bg-white border-2 border-[#2E7D32] text-[#2E7D32] px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all hover:bg-[#F0F8F0] active:scale-95">
            <Plus size={16} /> Add Pastor
          </button>
          <button onClick={loadAll}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2.5 rounded-xl transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Alert: Unassigned Districts */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-amber-600" size={20} />
            <h3 className="font-black text-amber-800 text-sm uppercase tracking-wide">{unassigned.length} Districts Without a Pastor</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(b => (
              <button key={b.id}
                onClick={() => { setSelectedBoundary(b); setShowAssignForm(true); }}
                className="flex items-center gap-1.5 bg-white border border-amber-300 hover:border-amber-500 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-amber-50">
                <MapPin size={11} /> {b.district_name || 'Unknown'} <ArrowRight size={11} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pastors List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#F8FAF8]">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider">Active Pastors</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader className="animate-spin text-[#2E7D32]" size={24} /></div>
        ) : pastors.length === 0 ? (
          <div className="text-center py-12">
            <Users size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No pastors added yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pastors.map((p, i) => {
              const theirDistricts = boundaries.filter(b => b.pastor_id === p.id);
              return (
                <motion.div key={p.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="px-6 py-4 flex items-center justify-between hover:bg-[#F8FAF8] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F0E8] flex items-center justify-center">
                      <UserCheck size={18} className="text-[#2E7D32]" />
                    </div>
                    <div>
                      <p className="font-black text-[#1A2E1A] text-sm">Pastor {p.name}</p>
                      {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {theirDistricts.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-end max-w-[300px]">
                        {theirDistricts.map(b => (
                          <span key={b.id} className="px-2 py-0.5 bg-[#E8F0E8] text-[#2E7D32] rounded-lg text-[10px] font-black">
                            {b.district_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No district assigned</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Districts table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#F8FAF8]">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider">All Pastoral Districts ({boundaries.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['District','Region','Assigned Pastor','Status','Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boundaries.map(b => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-[#F8FAF8] transition-colors">
                  <td className="px-5 py-3 font-bold text-[#1A2E1A]">{b.district_name || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{b.region || 'Harare'}</td>
                  <td className="px-5 py-3">
                    {b.pastor_name ? (
                      <span className="text-[#2E7D32] font-bold text-xs">Pastor {b.pastor_name}</span>
                    ) : (
                      <span className="text-amber-500 font-bold text-xs flex items-center gap-1"><AlertTriangle size={11} /> Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${b.is_unassigned || !b.pastor_name ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {b.is_unassigned || !b.pastor_name ? 'Unassigned' : 'Assigned'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => { setSelectedBoundary(b); setShowAssignForm(true); }}
                      className="text-xs font-bold text-[#2E7D32] hover:underline flex items-center gap-1">
                      Reassign <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Pastor Modal */}
      <AnimatePresence>
        {showAssignForm && selectedBoundary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1A2E1A]/70 backdrop-blur-sm" onClick={() => setShowAssignForm(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative p-8">
              <button onClick={() => setShowAssignForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
              <h3 className="font-black text-[#1A2E1A] uppercase tracking-tight mb-1">Assign Pastor</h3>
              <p className="text-xs text-gray-400 mb-6">District: <span className="font-bold text-[#2E7D32]">{selectedBoundary.district_name}</span></p>
              {selectedBoundary.pastor_name && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 font-medium">
                  Currently: Pastor {selectedBoundary.pastor_name} · This will create a transfer record.
                </div>
              )}
              <label className="label-sm">Select Pastor</label>
              <select className="field mb-6" value={assignPastorId} onChange={e => setAssignPastorId(e.target.value)}>
                <option value="">Choose a pastor…</option>
                {pastors.map(p => <option key={p.id} value={p.id}>Pastor {p.name}</option>)}
              </select>
              <div className="flex gap-3">
                <button onClick={() => setShowAssignForm(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAssign} disabled={!assignPastorId || saving}
                  className="flex-1 py-3 bg-[#2E7D32] text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-[#388E3C] flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader size={15} className="animate-spin" /> : <UserCheck size={15} />} Assign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Pastor Modal */}
      <AnimatePresence>
        {showPastorForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1A2E1A]/70 backdrop-blur-sm" onClick={() => setShowPastorForm(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative">
              <div className="bg-[#2E7D32] px-8 py-5 rounded-t-3xl flex items-center justify-between">
                <h3 className="text-white font-black uppercase tracking-wider text-sm">Add Pastor Profile</h3>
                <button onClick={() => setShowPastorForm(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddPastor} className="p-8 space-y-4">
                <div><label className="label-sm">Full Name *</label>
                  <input required className="field" value={pastorForm.name} onChange={e => setPastorForm(p=>({...p,name:e.target.value}))} placeholder="John Doe" /></div>
                <div><label className="label-sm">Phone</label>
                  <input className="field" value={pastorForm.phone} onChange={e => setPastorForm(p=>({...p,phone:e.target.value}))} placeholder="+263 77..." /></div>
                <div><label className="label-sm">Email</label>
                  <input type="email" className="field" value={pastorForm.email} onChange={e => setPastorForm(p=>({...p,email:e.target.value}))} placeholder="pastor@ezc.org" /></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPastorForm(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-[#2E7D32] text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-[#388E3C] flex items-center justify-center gap-2 disabled:opacity-60">
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
