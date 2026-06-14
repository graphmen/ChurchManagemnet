'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Heart, ShieldAlert, Save, RefreshCw, ChevronLeft, Wifi, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChildrenCollector({ churches = [], onBack }) {
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localQueueCount, setLocalQueueCount] = useState(0);

  // Form states
  const [churchId, setChurchId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // CM Metrics
  const [attendance, setAttendance] = useState(0);
  const [vbs, setVbs] = useState(0);
  const [vbsLeaders, setVbsLeaders] = useState(0);
  const [safeguarding, setSafeguarding] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    updateQueueCount();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const updateQueueCount = () => {
    const queue = JSON.parse(localStorage.getItem('ezc_children_queue') || '[]');
    setLocalQueueCount(queue.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!churchId || !periodStart || !periodEnd) {
      toast.error('Please select church and reporting dates');
      return;
    }

    setLoading(true);

    const reportPayload = {
      id: crypto.randomUUID(),
      church_id: churchId,
      reporting_period_start: periodStart,
      reporting_period_end: periodEnd,
      department_code: 'CM',
      status: 'submitted',
      metrics: {
        children_attendance: parseInt(attendance) || 0,
        vbs_attendance: parseInt(vbs) || 0,
        vbs_leaders_count: parseInt(vbsLeaders) || 0,
        safeguarding_compliant: safeguarding
      }
    };

    if (online) {
      const success = await uploadReport(reportPayload);
      if (success) {
        toast.success('Children Ministries report synced successfully!');
        resetForm();
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('ezc_children_queue') || '[]');
      queue.push(reportPayload);
      localStorage.setItem('ezc_children_queue', JSON.stringify(queue));
      updateQueueCount();
      toast.success('Children report saved locally (queued).');
      resetForm();
    }
    setLoading(false);
  };

  const uploadReport = async (payload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth session invalid');

      // 1. Core report row
      const { data: baseReport, error: baseErr } = await supabase
        .from('ezc_departmental_reports')
        .insert({
          id: payload.id,
          church_id: payload.church_id,
          submitted_by: user.id,
          department_code: payload.department_code,
          reporting_period_start: payload.reporting_period_start,
          reporting_period_end: payload.reporting_period_end,
          status: 'submitted'
        })
        .select()
        .single();

      if (baseErr) throw baseErr;

      // 2. Children metrics row
      const { error: detailErr } = await supabase
        .from('ezc_children_reports')
        .insert({
          report_id: baseReport.id,
          ...payload.metrics
        });

      if (detailErr) throw detailErr;
      return true;
    } catch (err) {
      console.error('Children report upload failed:', err);
      toast.error('Sync failed: ' + err.message);
      return false;
    }
  };

  const triggerManualSync = async () => {
    if (!online) {
      toast.error('Connect to internet to synchronize cache');
      return;
    }

    const queue = JSON.parse(localStorage.getItem('ezc_children_queue') || '[]');
    if (queue.length === 0) {
      toast.success('Local cache empty');
      return;
    }

    setLoading(true);
    let successCount = 0;
    const remainingQueue = [];

    for (const report of queue) {
      const success = await uploadReport(report);
      if (success) {
        successCount++;
      } else {
        remainingQueue.push(report);
      }
    }

    localStorage.setItem('ezc_children_queue', JSON.stringify(remainingQueue));
    updateQueueCount();
    setLoading(false);

    if (successCount > 0) toast.success(`Synced ${successCount} children reports!`);
    if (remainingQueue.length > 0) toast.error(`${remainingQueue.length} fails remain in cache.`);
  };

  const resetForm = () => {
    setAttendance(0);
    setVbs(0);
    setVbsLeaders(0);
    setSafeguarding(true);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
      {/* Network Status */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold">
          {online ? (
            <span className="flex items-center gap-1 text-green-600">
              <Wifi size={14} /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500 animate-pulse">
              <WifiOff size={14} /> Offline Mode
            </span>
          )}
        </div>
        {localQueueCount > 0 && (
          <button
            onClick={triggerManualSync}
            disabled={loading}
            className="flex items-center gap-1.5 bg-[#1565C0]/10 hover:bg-[#1565C0]/20 text-[#1565C0] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            {localQueueCount} Sync Pending
          </button>
        )}
      </div>

      {/* Header */}
      <div className="bg-[#1565C0] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logos/children.png" alt="Children Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs font-black uppercase tracking-wider">Children Ministries Report</span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-white/80 hover:text-white font-bold"
        >
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Core Headers */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">General Metadata</p>
          <div>
            <label className="label-sm">Local Church *</label>
            <select
              required
              value={churchId}
              onChange={e => setChurchId(e.target.value)}
              className="field text-xs py-2 bg-white"
            >
              <option value="">Select Local Church...</option>
              {churches.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.district_name})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Period Start *</label>
              <input required type="date" className="field text-xs py-2" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Period End *</label>
              <input required type="date" className="field text-xs py-2" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Sabbath School Attendance */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sabbath School & VBS Statistics</p>
          <div>
            <label className="label-sm">Sabbath School Average Attendance</label>
            <input type="number" min="0" className="field text-xs" value={attendance} onChange={e => setAttendance(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">VBS Attendees</label>
              <input type="number" min="0" className="field text-xs" value={vbs} onChange={e => setVbs(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">VBS Teachers Trained</label>
              <input type="number" min="0" className="field text-xs" value={vbsLeaders} onChange={e => setVbsLeaders(e.target.value)} />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Safeguarding checkbox */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Safeguarding & Protection</p>
          <div className="flex items-center">
            <label className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer w-full">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-200 text-[#1565C0] focus:ring-[#1565C0]"
                checked={safeguarding}
                onChange={e => setSafeguarding(e.target.checked)}
              />
              <div className="text-left">
                <span className="text-xs font-black text-gray-700 block">Child Protection Compliance Checklist</span>
                <span className="text-[10px] text-gray-400 mt-0.5 block">All sabbath school teachers are background checked and verified.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#1565C0] hover:bg-[#1E88E5] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? 'Processing...' : online ? 'Submit to Conference' : 'Save Report Offline'}
        </button>
      </form>
    </div>
  );
}
