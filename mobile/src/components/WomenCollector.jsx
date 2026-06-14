'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Heart, Save, RefreshCw, ChevronLeft, Wifi, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WomenCollector({ churches = [], onBack }) {
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localQueueCount, setLocalQueueCount] = useState(0);

  // Form states
  const [churchId, setChurchId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // WM Metrics
  const [mentorship, setMentorship] = useState(0);
  const [retreat, setRetreat] = useState(0);
  const [projects, setProjects] = useState(0);
  const [circle, setCircle] = useState(0);

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
    const queue = JSON.parse(localStorage.getItem('ezc_wm_queue') || '[]');
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
      department_code: 'WM',
      status: 'submitted',
      metrics: {
        mentorship_pairs_active: parseInt(mentorship) || 0,
        retreat_attendance: parseInt(retreat) || 0,
        outreach_projects_count: parseInt(projects) || 0,
        circle_of_hope_attendees: parseInt(circle) || 0
      }
    };

    if (online) {
      const success = await uploadReport(reportPayload);
      if (success) {
        toast.success('WM report synced successfully!');
        resetForm();
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('ezc_wm_queue') || '[]');
      queue.push(reportPayload);
      localStorage.setItem('ezc_wm_queue', JSON.stringify(queue));
      updateQueueCount();
      toast.success('Women\'s Ministries report saved offline.');
      resetForm();
    }
    setLoading(false);
  };

  const uploadReport = async (payload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth session invalid');

      // 1. Core report
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

      // 2. WM metrics
      const { error: detailErr } = await supabase
        .from('ezc_womens_ministry_reports')
        .insert({
          report_id: baseReport.id,
          ...payload.metrics
        });

      if (detailErr) throw detailErr;
      return true;
    } catch (err) {
      console.error('WM report upload failed:', err);
      toast.error('Sync failed: ' + err.message);
      return false;
    }
  };

  const triggerManualSync = async () => {
    if (!online) {
      toast.error('Connect to internet to synchronize cache');
      return;
    }

    const queue = JSON.parse(localStorage.getItem('ezc_wm_queue') || '[]');
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

    localStorage.setItem('ezc_wm_queue', JSON.stringify(remainingQueue));
    updateQueueCount();
    setLoading(false);

    if (successCount > 0) toast.success(`Synced ${successCount} WM reports!`);
    if (remainingQueue.length > 0) toast.error(`${remainingQueue.length} fails remain in cache.`);
  };

  const resetForm = () => {
    setMentorship(0);
    setRetreat(0);
    setProjects(0);
    setCircle(0);
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
            className="flex items-center gap-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            {localQueueCount} Sync Pending
          </button>
        )}
      </div>

      {/* Header */}
      <div className="bg-pink-600 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logos/women.png" alt="Women's Ministries Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs font-black uppercase tracking-wider">Women's Ministries Report</span>
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

        {/* WM Numbers */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Departmental Indicators</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Circle of Hope Attendees</label>
              <input type="number" min="0" className="field text-xs" value={circle} onChange={e => setCircle(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Mentorship Pairs</label>
              <input type="number" min="0" className="field text-xs" value={mentorship} onChange={e => setMentorship(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Retreat Attendance</label>
              <input type="number" min="0" className="field text-xs" value={retreat} onChange={e => setRetreat(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Outreach Projects</label>
              <input type="number" min="0" className="field text-xs" value={projects} onChange={e => setProjects(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? 'Processing...' : online ? 'Submit to Conference' : 'Save Report Offline'}
        </button>
      </form>
    </div>
  );
}
