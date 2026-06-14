'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Compass, Award, Calendar, Users, Save,
  RefreshCw, ChevronLeft, Wifi, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function YouthCollector({ churches = [], onBack }) {
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localQueueCount, setLocalQueueCount] = useState(0);

  // Form states
  const [churchId, setChurchId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Youth Metrics
  const [ayMembership, setAyMembership] = useState(0);
  const [ayAttendance, setAyAttendance] = useState(0);
  const [pathfinderMembership, setPathfinderMembership] = useState(0);
  const [pathfinderAttendance, setPathfinderAttendance] = useState(0);
  const [adventurerMembership, setAdventurerMembership] = useState(0);
  const [adventurerAttendance, setAdventurerAttendance] = useState(0);
  const [camporeeRegs, setCamporeeRegs] = useState(0);
  const [honors, setHonors] = useState(0);
  const [certs, setCerts] = useState(0);

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
    const queue = JSON.parse(localStorage.getItem('ezc_youth_queue') || '[]');
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
      department_code: 'AY',
      status: 'submitted',
      metrics: {
        ay_membership: parseInt(ayMembership) || 0,
        ay_attendance: parseInt(ayAttendance) || 0,
        pathfinder_membership: parseInt(pathfinderMembership) || 0,
        pathfinder_attendance: parseInt(pathfinderAttendance) || 0,
        adventurer_membership: parseInt(adventurerMembership) || 0,
        adventurer_attendance: parseInt(adventurerAttendance) || 0,
        camporee_registrations: parseInt(camporeeRegs) || 0,
        honors_completed: parseInt(honors) || 0,
        leadership_certifications: parseInt(certs) || 0
      }
    };

    if (online) {
      const success = await uploadReport(reportPayload);
      if (success) {
        toast.success('Youth report synced successfully!');
        resetForm();
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('ezc_youth_queue') || '[]');
      queue.push(reportPayload);
      localStorage.setItem('ezc_youth_queue', JSON.stringify(queue));
      updateQueueCount();
      toast.success('Youth report saved locally (queued).');
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

      // 2. Youth metrics row
      const { error: detailErr } = await supabase
        .from('ezc_youth_reports')
        .insert({
          report_id: baseReport.id,
          ...payload.metrics
        });

      if (detailErr) throw detailErr;
      return true;
    } catch (err) {
      console.error('Youth upload failed:', err);
      toast.error('Sync failed: ' + err.message);
      return false;
    }
  };

  const triggerManualSync = async () => {
    if (!online) {
      toast.error('Connect to internet to synchronize cache');
      return;
    }

    const queue = JSON.parse(localStorage.getItem('ezc_youth_queue') || '[]');
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

    localStorage.setItem('ezc_youth_queue', JSON.stringify(remainingQueue));
    updateQueueCount();
    setLoading(false);

    if (successCount > 0) toast.success(`Synced ${successCount} youth reports!`);
    if (remainingQueue.length > 0) toast.error(`${remainingQueue.length} fails remain in cache.`);
  };

  const resetForm = () => {
    setAyMembership(0);
    setAyAttendance(0);
    setPathfinderMembership(0);
    setPathfinderAttendance(0);
    setAdventurerMembership(0);
    setAdventurerAttendance(0);
    setCamporeeRegs(0);
    setHonors(0);
    setCerts(0);
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
            className="flex items-center gap-1.5 bg-[#E65100]/10 hover:bg-[#E65100]/20 text-[#E65100] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            {localQueueCount} Sync Pending
          </button>
        )}
      </div>

      {/* Header */}
      <div className="bg-[#E65100] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logos/ay.png" alt="AY Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs font-black uppercase tracking-wider">AY & Pathfinder Report</span>
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

        {/* Club Details */}
        <div className="space-y-4">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Club Membership & Attendance</p>
          
          <div className="bg-[#FCF8F5] border border-orange-100 rounded-2xl p-4 space-y-4">
            <h4 className="text-[10px] font-black text-[#E65100] uppercase tracking-wider">Pathfinders Club</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-sm">Total Members</label>
                <input type="number" min="0" className="field text-xs bg-white" value={pathfinderMembership} onChange={e => setPathfinderMembership(e.target.value)} />
              </div>
              <div>
                <label className="label-sm">Avg Attendance</label>
                <input type="number" min="0" className="field text-xs bg-white" value={pathfinderAttendance} onChange={e => setPathfinderAttendance(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-[#F5F8FC] border border-blue-100 rounded-2xl p-4 space-y-4">
            <h4 className="text-[10px] font-black text-[#0288D1] uppercase tracking-wider">Adventurers Club</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-sm">Total Members</label>
                <input type="number" min="0" className="field text-xs bg-white" value={adventurerMembership} onChange={e => setAdventurerMembership(e.target.value)} />
              </div>
              <div>
                <label className="label-sm">Avg Attendance</label>
                <input type="number" min="0" className="field text-xs bg-white" value={adventurerAttendance} onChange={e => setAdventurerAttendance(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-[#F5FAF6] border border-green-100 rounded-2xl p-4 space-y-4">
            <h4 className="text-[10px] font-black text-[#2E7D32] uppercase tracking-wider">AY Society (Youth)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-sm">Total Members</label>
                <input type="number" min="0" className="field text-xs bg-white" value={ayMembership} onChange={e => setAyMembership(e.target.value)} />
              </div>
              <div>
                <label className="label-sm">Avg Attendance</label>
                <input type="number" min="0" className="field text-xs bg-white" value={ayAttendance} onChange={e => setAyAttendance(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Camporee & Honor logs */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Certifications & Events</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Camporee Regs</label>
              <input type="number" min="0" className="field text-xs" value={camporeeRegs} onChange={e => setCamporeeRegs(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Honors Met</label>
              <input type="number" min="0" className="field text-xs" value={honors} onChange={e => setHonors(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Leader Certs</label>
              <input type="number" min="0" className="field text-xs" value={certs} onChange={e => setCerts(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#E65100] hover:bg-[#F57C00] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? 'Processing...' : online ? 'Submit to Conference' : 'Save Report Offline'}
        </button>
      </form>
    </div>
  );
}
