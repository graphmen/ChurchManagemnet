import React, { useState } from 'react';
import { X, Send, ClipboardList, TrendingUp, Users, Heart, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hupqhiyxlghccdabqlrs.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Zx71cr2QdmE0Il7AAFCX4w_L3XalRVp';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ReportForm = ({ onClose, pastorName, churches = [] }) => {
  const [reportType, setReportType] = useState('visitation'); // 'visitation' or 'smallgroup'
  const [formData, setFormData] = useState({
    church_id: '',
    report_date: new Date().toISOString().split('T')[0],
    // Visitation Fields
    member_name: '',
    visit_type: 'Spiritual Encouragement',
    follow_up: false,
    // Small Group Fields
    group_name: '',
    attendance_members: 0,
    attendance_visitors: 0,
    bible_studies: 0,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        if (reportType === 'visitation') {
            const { error } = await supabase.from('ezc_visitations').insert({
                church_id: formData.church_id || null,
                visit_date: formData.report_date,
                member_name: formData.member_name,
                visit_type: formData.visit_type,
                notes: formData.notes,
                follow_up_needed: formData.follow_up,
                pastor_name: pastorName
            });
            if (error) throw error;
        } else {
            // For now, since small groups might not be in the DB yet, 
            // we'll log to ezc_reports as a catch-all or create a placeholder group
            const { error } = await supabase.from('ezc_reports').insert({
                church_id: formData.church_id,
                report_date: formData.report_date,
                pastor_name: pastorName,
                payload: {
                    type: 'small_group',
                    group_name: formData.group_name,
                    attendance_members: formData.attendance_members,
                    attendance_visitors: formData.attendance_visitors,
                    bible_studies: formData.bible_studies,
                    notes: formData.notes
                }
            });
            if (error) throw error;
        }
        
        setSuccess(true);
        setTimeout(() => { onClose(); }, 2000);
    } catch (err) {
        console.error('Error submitting report:', err);
        alert('Failed to submit report. Please check database connectivity.');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (success) {
      return (
          <div className="text-center py-12">
              <div className="w-20 h-20 bg-sda-gold/20 text-sda-gold rounded-full flex items-center justify-center mx-auto mb-6 border border-sda-gold/30 ring-8 ring-sda-gold/5">
                  <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Mission Data Logged</h2>
              <p className="text-slate-400">The report has been synchronized with the GIS engine.</p>
          </div>
      );
  }

  return (
    <div className="relative">
      <button onClick={onClose} className="absolute -top-12 -right-12 p-3 bg-white border-2 border-[#2E7D32] rounded-xl text-[#1A2E1A] hover:bg-[#F8FAF8] transition-all shadow-xl hover:scale-110 active:scale-95">
        <X size={24} />
      </button>

      <div className="flex items-center gap-5 mb-10">
        <div className="p-5 bg-white text-[#2E7D32] rounded-2xl border-2 border-[#2E7D32] shadow-sm">
          <ClipboardList size={40} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-[#1A2E1A] tracking-tight uppercase leading-none">Mission Report</h2>
          <p className="text-[11px] text-[#2E7D32] uppercase tracking-[0.2em] font-black mt-2">OFFICIAL LOG | SHEPHERD {pastorName.toUpperCase()}</p>
        </div>
      </div>

      {/* Type Toggle */}
      <div className="flex p-1.5 bg-[#F8FAF8] rounded-2xl mb-10 border-2 border-[#2E7D32]">
        <button 
          onClick={() => setReportType('visitation')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${reportType === 'visitation' ? 'bg-[#2E7D32] text-white shadow-xl' : 'text-[#1A2E1A] hover:bg-white'}`}
        >
          <Heart size={16} /> Visitation
        </button>
        <button 
          onClick={() => setReportType('smallgroup')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${reportType === 'smallgroup' ? 'bg-[#2E7D32] text-white shadow-xl' : 'text-[#1A2E1A] hover:bg-white'}`}
        >
          <Users size={16} /> Small Group
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest mb-3 block">Mission Territory / Church</label>
            <select 
              required 
              className="w-full bg-white border-2 border-[#2E7D32] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#2E7D32] transition-all text-[#1A2E1A] text-xs font-black uppercase" 
              value={formData.church_id} 
              onChange={(e) => setFormData({...formData, church_id: e.target.value})}
            >
              <option value="">Select Territory...</option>
              {churches.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest mb-3 block">Event Date</label>
            <input type="date" required className="w-full bg-white border-2 border-[#2E7D32] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#2E7D32] transition-all text-[#1A2E1A] text-xs font-black" value={formData.report_date} onChange={(e) => setFormData({...formData, report_date: e.target.value})} />
          </div>

          {reportType === 'visitation' ? (
            <>
              <div className="col-span-2">
                <label className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest mb-3 block">Member Identity</label>
                <input type="text" required placeholder="Enter full name..." className="w-full bg-white border-2 border-[#2E7D32] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#2E7D32] transition-all text-[#1A2E1A] text-xs font-black uppercase placeholder:text-[#1A2E1A]/40" value={formData.member_name} onChange={(e) => setFormData({...formData, member_name: e.target.value})} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest mb-3 block">Visit Category</label>
                <select className="w-full bg-white border-2 border-[#2E7D32] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#2E7D32] transition-all text-[#1A2E1A] text-xs font-black uppercase" value={formData.visit_type} onChange={(e) => setFormData({...formData, visit_type: e.target.value})}>
                  <option>Spiritual Encouragement</option>
                  <option>Sick / Bereavement</option>
                  <option>Social / Fellowship</option>
                  <option>Stewardship / Counseling</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-1 flex items-end">
                <label className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-[#2E7D32] cursor-pointer hover:bg-[#F8FAF8] transition-all w-full group">
                  <input type="checkbox" className="w-6 h-6 rounded-md border-2 border-[#2E7D32] text-[#2E7D32] focus:ring-[#2E7D32]" checked={formData.follow_up} onChange={(e) => setFormData({...formData, follow_up: e.target.checked})} />
                  <span className="text-[11px] font-black text-[#1A2E1A] uppercase tracking-widest group-hover:text-[#2E7D32]">Follow-up Required</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2">
                <label className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest mb-3 block">Unit Designation</label>
                <input type="text" required placeholder="e.g. Greendale Cell Group A..." className="w-full bg-white border-2 border-[#2E7D32] rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#2E7D32] transition-all text-[#1A2E1A] text-xs font-black uppercase placeholder:text-[#1A2E1A]/40" value={formData.group_name} onChange={(e) => setFormData({...formData, group_name: e.target.value})} />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-6">
                 {[
                   { id: 'attendance_members', label: 'Members' },
                   { id: 'attendance_visitors', label: 'Visitors' },
                   { id: 'bible_studies', label: 'Studies' },
                 ].map(field => (
                   <div key={field.id} className="bg-white p-5 rounded-2xl border-2 border-[#2E7D32] shadow-sm">
                     <p className="text-[10px] font-black text-[#2E7D32] uppercase mb-2 tracking-tighter">{field.label}</p>
                     <input type="number" min="0" className="w-full bg-transparent border-none text-2xl font-black text-[#1A2E1A] p-0 focus:ring-0 outline-none" value={formData[field.id]} onChange={(e) => setFormData({...formData, [field.id]: parseInt(e.target.value) || 0})} />
                   </div>
                 ))}
              </div>
            </>
          )}
        </div>

        <div>
          <label className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest mb-3 block">Mission Observations</label>
          <textarea rows="4" placeholder="Summary of interaction..." className="w-full bg-white border-2 border-[#2E7D32] rounded-2xl p-5 outline-none focus:ring-2 focus:ring-[#2E7D32] transition-all text-[#1A2E1A] text-sm resize-none font-bold" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
        </div>

        <button type="submit" disabled={isSubmitting || !formData.church_id} className="w-full py-6 bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-[#F8FAF8] disabled:text-[#1A2E1A]/20 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.5em] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4">
          {isSubmitting ? 'Syncing...' : 'Secure Mission Log'}
        </button>
      </form>
    </div>
  );
};

export default ReportForm;
