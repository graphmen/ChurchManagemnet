'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../context/AuthContext';
import {
  Heart, BookOpen, Target, Users, MapPin, Save,
  AlertTriangle, RefreshCw, CheckCircle2, ChevronLeft, Wifi, WifiOff
} from 'lucide-react';
import { getCurrentLocation } from '../utils/mobilePlugins';
import toast from 'react-hot-toast';

export default function SSPMCollector({ churches = [], onBack }) {
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [localQueueCount, setLocalQueueCount] = useState(0);

  // Form states
  const [churchId, setChurchId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  // SSPM Metrics
  const [careGroups, setCareGroups] = useState(0);
  const [bibleStudies, setBibleStudies] = useState(0);
  const [baptisms, setBaptisms] = useState(0);
  const [surveys, setSurveys] = useState(0);
  const [volunteers, setVolunteers] = useState(0);

  // Geo-Activity Sub-Form
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    attendance: 0,
    summary: '',
    lat: '',
    lng: ''
  });

  // Track online/offline status
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
    const queue = JSON.parse(localStorage.getItem('ezc_sspm_queue') || '[]');
    setLocalQueueCount(queue.length);
  };

  const handleCaptureGps = async () => {
    setGpsLoading(true);
    try {
      const pos = await getCurrentLocation();
      setNewActivity(prev => ({
        ...prev,
        lat: pos.lat.toFixed(6),
        lng: pos.lng.toFixed(6)
      }));
      toast.success('Activity coordinates captured!');
    } catch (e) {
      toast.error('Failed to get GPS. Make sure location is turned on.');
    } finally {
      setGpsLoading(false);
    }
  };

  const addActivity = () => {
    if (!newActivity.name) {
      toast.error('Activity name is required');
      return;
    }
    setActivities(prev => [...prev, { ...newActivity, id: crypto.randomUUID() }]);
    setNewActivity({ name: '', attendance: 0, summary: '', lat: '', lng: '' });
    toast.success('Activity added to report listing');
  };

  const removeActivity = (id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!churchId || !periodStart || !periodEnd) {
      toast.error('Please fill in all general report headers');
      return;
    }

    setLoading(true);

    // Build JSON data object
    const reportPayload = {
      id: crypto.randomUUID(),
      church_id: churchId,
      reporting_period_start: periodStart,
      reporting_period_end: periodEnd,
      department_code: 'SSPM',
      status: 'submitted',
      metrics: {
        care_groups_active: parseInt(careGroups) || 0,
        bible_studies_conducted: parseInt(bibleStudies) || 0,
        baptism_candidates_added: parseInt(baptisms) || 0,
        spiritual_gifts_surveys_completed: parseInt(surveys) || 0,
        mission_volunteers_active: parseInt(volunteers) || 0
      },
      activities: activities.map(act => ({
        activity_name: act.name,
        attendance_count: parseInt(act.attendance) || 0,
        narrative_summary: act.summary,
        captured_offline: !online,
        geom: act.lat && act.lng ? {
          type: 'Point',
          coordinates: [parseFloat(act.lng), parseFloat(act.lat)]
        } : null
      }))
    };

    if (online) {
      const success = await uploadReport(reportPayload);
      if (success) {
        toast.success('Report submitted and synced successfully!');
        resetForm();
      }
    } else {
      // Offline mode caching
      const queue = JSON.parse(localStorage.getItem('ezc_sspm_queue') || '[]');
      queue.push(reportPayload);
      localStorage.setItem('ezc_sspm_queue', JSON.stringify(queue));
      updateQueueCount();
      toast.success('Report saved locally! Synced queue contains ' + queue.length + ' reports.');
      resetForm();
    }
    setLoading(false);
  };

  const uploadReport = async (payload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User authentication lost');

      // 1. Insert base departmental report
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

      // 2. Insert SSPM detailed data
      const { error: detailErr } = await supabase
        .from('ezc_sspm_reports')
        .insert({
          report_id: baseReport.id,
          ...payload.metrics
        });

      if (detailErr) throw detailErr;

      // 3. Insert Geo Activities if any
      if (payload.activities?.length > 0) {
        const geoInserts = payload.activities.map(act => ({
          report_id: baseReport.id,
          activity_name: act.activity_name,
          attendance_count: act.attendance_count,
          narrative_summary: act.narrative_summary,
          captured_offline: act.captured_offline,
          geom: act.geom
        }));

        const { error: geoErr } = await supabase
          .from('ezc_geo_activities')
          .insert(geoInserts);

        if (geoErr) throw geoErr;
      }

      return true;
    } catch (e) {
      console.error('Report upload failed:', e);
      toast.error('Sync failed: ' + e.message);
      return false;
    }
  };

  const triggerManualSync = async () => {
    if (!online) {
      toast.error('Cannot sync while offline. Check internet connection.');
      return;
    }

    const queue = JSON.parse(localStorage.getItem('ezc_sspm_queue') || '[]');
    if (queue.length === 0) {
      toast.success('Local cache is already empty!');
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

    localStorage.setItem('ezc_sspm_queue', JSON.stringify(remainingQueue));
    updateQueueCount();
    setLoading(false);

    if (successCount > 0) {
      toast.success(`Successfully synchronized ${successCount} reports!`);
    }
    if (remainingQueue.length > 0) {
      toast.error(`${remainingQueue.length} reports failed to sync and remain cached.`);
    }
  };

  const resetForm = () => {
    setCareGroups(0);
    setBibleStudies(0);
    setBaptisms(0);
    setSurveys(0);
    setVolunteers(0);
    setActivities([]);
    setNewActivity({ name: '', attendance: 0, summary: '', lat: '', lng: '' });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
      {/* Network & Local Status Bar */}
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
            className="flex items-center gap-1.5 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 text-[#2E7D32] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            {localQueueCount} Sync Pending
          </button>
        )}
      </div>

      {/* Form Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logos/sspm.png" alt="SSPM Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs font-black uppercase tracking-wider">SSPM Data Log Form</span>
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
              <input
                required
                type="date"
                className="field text-xs py-2"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label-sm">Period End *</label>
              <input
                required
                type="date"
                className="field text-xs py-2"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* SSPM Numbers */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sabbath School & Discipleship Metrics</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Active Care Groups</label>
              <input
                type="number"
                min="0"
                className="field text-xs"
                value={careGroups}
                onChange={e => setCareGroups(e.target.value)}
              />
            </div>
            <div>
              <label className="label-sm">Active Bible Studies</label>
              <input
                type="number"
                min="0"
                className="field text-xs"
                value={bibleStudies}
                onChange={e => setBibleStudies(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Baptisms Pipeline</label>
              <input
                type="number"
                min="0"
                className="field text-xs"
                value={baptisms}
                onChange={e => setBaptisms(e.target.value)}
              />
            </div>
            <div>
              <label className="label-sm">Spiritual Surveys</label>
              <input
                type="number"
                min="0"
                className="field text-xs"
                value={surveys}
                onChange={e => setSurveys(e.target.value)}
              />
            </div>
            <div>
              <label className="label-sm">Active Volunteers</label>
              <input
                type="number"
                min="0"
                className="field text-xs"
                value={volunteers}
                onChange={e => setVolunteers(e.target.value)}
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Geo-Activities Sub-Form */}
        <div className="space-y-4">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Outreach & Activity Geotagging</p>
          
          {/* List of current activities */}
          {activities.length > 0 && (
            <div className="space-y-2">
              {activities.map(act => (
                <div key={act.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 truncate">{act.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                      Attendance: {act.attendance} {act.lat ? `· Coordinates: [${act.lat}, ${act.lng}]` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeActivity(act.id)}
                    className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-wider pl-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Activity Fields */}
          <div className="bg-[#F8FAF8] border border-gray-150 rounded-2xl p-4 space-y-3">
            <div>
              <label className="label-sm">Activity Name</label>
              <input
                className="field text-xs py-2 bg-white"
                placeholder="Care Group Outreach Meeting"
                value={newActivity.name}
                onChange={e => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-sm">Attendance Count</label>
                <input
                  type="number"
                  min="0"
                  className="field text-xs py-2 bg-white"
                  value={newActivity.attendance}
                  onChange={e => setNewActivity(prev => ({ ...prev, attendance: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={gpsLoading}
                  className="w-full flex items-center justify-center gap-1 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  <MapPin size={13} className="text-[#2E7D32]" />
                  {gpsLoading ? 'Locating...' : 'Get GPS Point'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-500 font-bold">
              <div>Lat: {newActivity.lat || '—'}</div>
              <div>Lng: {newActivity.lng || '—'}</div>
            </div>

            <div>
              <label className="label-sm">Brief Summary / Narrative</label>
              <input
                className="field text-xs py-2 bg-white"
                placeholder="Elder Moyo presented the gospel message..."
                value={newActivity.summary}
                onChange={e => setNewActivity(prev => ({ ...prev, summary: e.target.value }))}
              />
            </div>

            <button
              type="button"
              onClick={addActivity}
              className="w-full py-2 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/25 text-[#2E7D32] rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Add Activity to Report List
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#388E3C] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? 'Processing...' : online ? 'Submit to Conference Server' : 'Save Report Offline'}
        </button>
      </form>
    </div>
  );
}
