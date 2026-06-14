'use client';
import React, { useEffect, useState } from 'react';
import { supabase, useAuth } from '../context/AuthContext';
import {
  BookOpen, CheckCircle2, AlertTriangle, MessageSquare, Clipboard,
  User, Calendar, Clock, Filter, Eye, RefreshCw, X, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ReportApprovals() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Role determinations
  const isPastor = profile?.role === 'pastor';
  const isDirector = profile?.role === 'conference_director';
  const isAdmin = profile?.role === 'conference_admin';

  useEffect(() => {
    loadReports();
  }, [statusFilter, deptFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ezc_departmental_reports')
        .select('*, ezc_churches(name, district_name), profiles!ezc_departmental_reports_submitted_by_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      } else {
        // Default views depending on role
        if (isPastor) {
          query = query.in('status', ['submitted', 'reviewed_by_pastor', 'rejected']);
        } else if (isDirector) {
          query = query.in('status', ['reviewed_by_pastor', 'approved_by_director', 'rejected']);
        }
      }

      if (deptFilter) {
        query = query.eq('department_code', deptFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetailsAndAudit = async (report) => {
    setSelectedReport(null);
    setAuditTrail([]);
    setComment('');
    
    try {
      // 1. Fetch department metrics based on code
      let detailsData = null;
      if (report.department_code === 'SSPM') {
        const { data } = await supabase
          .from('ezc_sspm_reports')
          .select('*')
          .eq('report_id', report.id)
          .single();
        detailsData = data;
      }

      // 2. Fetch spatial activities for report
      const { data: geoData } = await supabase
        .from('ezc_geo_activities')
        .select('*')
        .eq('report_id', report.id);

      // 3. Fetch audit logs for this report
      const { data: auditData } = await supabase
        .from('ezc_system_audit_trail')
        .select('*, profiles(full_name, role)')
        .eq('entity_id', report.id)
        .order('timestamp', { ascending: true });

      setSelectedReport({
        ...report,
        details: detailsData,
        activities: geoData || [],
      });
      setAuditTrail(auditData || []);
    } catch (err) {
      console.error('Error fetching details:', err);
      toast.error('Could not load report details');
    }
  };

  const handleAction = async (newStatus) => {
    if (!selectedReport) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('ezc_departmental_reports')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast.success(`Report status updated to: ${newStatus.replace(/_/g, ' ')}`);
      setSelectedReport(null);
      loadReports();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styling = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-amber-100 text-amber-700 border border-amber-200',
      reviewed_by_pastor: 'bg-blue-100 text-blue-700 border border-blue-200',
      approved_by_director: 'bg-green-100 text-green-700 border border-green-200',
      rejected: 'bg-red-100 text-red-600 border border-red-200',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styling[status] || styling.draft}`}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1A2E1A] uppercase tracking-tight">Departmental Verification & Approvals</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isPastor ? 'Verify reports submitted by local church departmental leaders' : ''}
            {isDirector ? 'Review and give final approval to pastor-verified reports' : ''}
            {isAdmin ? 'System administrator command panel for report state overrides' : ''}
          </p>
        </div>
        <button
          onClick={loadReports}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
          <Filter size={16} /> Filters:
        </div>
        
        <div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="field py-2.5 text-xs font-bold border border-gray-200 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted (Pending Pastor)</option>
            <option value="reviewed_by_pastor">Verified (Pending Director)</option>
            <option value="approved_by_director">Approved (Locked)</option>
            <option value="rejected">Rejected (Needs edits)</option>
          </select>
        </div>

        <div>
          <select 
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="field py-2.5 text-xs font-bold border border-gray-200 bg-white"
          >
            <option value="">All Departments</option>
            <option value="SSPM">Sabbath School & Personal Ministries (SSPM)</option>
            <option value="AY">Adventist Youth (AY)</option>
            <option value="WM">Women's Ministries (WM)</option>
            <option value="AMO">Adventist Men (AMO)</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm min-h-[500px]">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clipboard size={18} className="text-[#2E7D32]" />
            Departmental Submission Ledger
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-24">
              <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-semibold">No reports matching selected filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div 
                  key={r.id}
                  onClick={() => loadReportDetailsAndAudit(r)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between hover:bg-gray-50/50 ${
                    selectedReport?.id === r.id ? 'border-[#2E7D32] bg-[#E8F0E8]/20' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-lg border border-green-100 uppercase">
                        {r.department_code}
                      </span>
                      <h4 className="font-black text-gray-800 text-sm">{r.ezc_churches?.name}</h4>
                    </div>
                    <p className="text-xs text-gray-400 font-semibold">{r.ezc_churches?.district_name} District</p>
                    <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold mt-1">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(r.reporting_period_start).toLocaleDateString()} - {new Date(r.reporting_period_end).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><User size={12} /> Submitter: {r.profiles?.full_name || 'Leader'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(r.status)}
                    <Eye size={16} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Report Details */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
          <h3 className="font-black text-[#1A2E1A] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText size={18} className="text-[#1565C0]" />
            Report Inspection Pane
          </h3>

          <AnimatePresence mode="wait">
            {selectedReport ? (
              <motion.div 
                key={selectedReport.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between space-y-6"
              >
                {/* Header Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-black text-gray-800 text-base leading-tight">{selectedReport.ezc_churches?.name}</h4>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">{selectedReport.ezc_churches?.district_name} District · Department: {selectedReport.department_code}</p>
                    <div className="mt-2">{getStatusBadge(selectedReport.status)}</div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Dynamic Department Details */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Metrics</p>
                    {selectedReport.department_code === 'SSPM' && selectedReport.details ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-lg font-black text-[#2E7D32]">{selectedReport.details.care_groups_active}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-black">Care Groups</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-lg font-black text-[#1565C0]">{selectedReport.details.bible_studies_conducted}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-black">Bible Studies</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-lg font-black text-[#F57F17]">{selectedReport.details.baptism_candidates_added}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-black">Baptisms Added</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-lg font-black text-[#6A1B9A]">{selectedReport.details.mission_volunteers_active}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-black">Active Missionaries</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs italic">No detailed breakdown payload associated</p>
                    )}
                  </div>

                  {/* Spatial Activities */}
                  {selectedReport.activities?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Geo-Tagged Activities</p>
                      <div className="space-y-2">
                        {selectedReport.activities.map(act => (
                          <div key={act.id} className="bg-[#E8F0E8]/40 border border-[#2E7D32]/10 rounded-xl p-3 text-xs">
                            <div className="flex justify-between items-start font-bold">
                              <span className="text-[#2E7D32] font-black">{act.activity_name}</span>
                              {act.attendance_count > 0 && <span className="text-gray-500">{act.attendance_count} attended</span>}
                            </div>
                            {act.narrative_summary && <p className="text-[11px] text-gray-500 mt-1 leading-normal">{act.narrative_summary}</p>}
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider block mt-1">📍 Pinned on Map</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audit Trail Timeline */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verification Audit Trail</p>
                    <div className="relative border-l border-gray-200 pl-3.5 ml-1 space-y-4">
                      {auditTrail.map(log => (
                        <div key={log.id} className="relative text-xs">
                          {/* Indicator Dot */}
                          <div className={`absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-white ${
                            log.action_type === 'APPROVE' ? 'border-green-600' :
                            log.action_type === 'VERIFY' ? 'border-blue-600' :
                            log.action_type === 'REJECT' ? 'border-red-500' :
                            'border-amber-500'
                          }`} />
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            <span className="uppercase text-gray-500">{log.action_type}</span>
                          </div>
                          <p className="text-gray-800 font-bold mt-0.5">{log.profiles?.full_name || 'System Actor'}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{log.profiles?.role?.replace(/_/g, ' ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  {/* Rejection comment */}
                  {selectedReport.status !== 'approved_by_director' && (
                    <div>
                      <label className="label-sm">Review Comments / Return Feedback</label>
                      <textarea 
                        className="field text-xs py-2 h-16" 
                        placeholder="Add details for approvals or reason for rejection..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    {/* Reject button */}
                    {selectedReport.status !== 'approved_by_director' && selectedReport.status !== 'rejected' && (
                      <button
                        onClick={() => handleAction('rejected')}
                        disabled={processing}
                        className="flex-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}

                    {/* Pastor validation button */}
                    {isPastor && selectedReport.status === 'submitted' && (
                      <button
                        onClick={() => handleAction('reviewed_by_pastor')}
                        disabled={processing}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
                      >
                        Verify & Forward
                      </button>
                    )}

                    {/* Director approval button */}
                    {isDirector && selectedReport.status === 'reviewed_by_pastor' && (
                      <button
                        onClick={() => handleAction('approved_by_director')}
                        disabled={processing}
                        className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#388E3C] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
                      >
                        Lock & Approve
                      </button>
                    )}

                    {/* Admin overriding statuses */}
                    {isAdmin && (
                      <div className="flex flex-col gap-2 w-full">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Admin Override Mode</p>
                        <div className="flex gap-1">
                          {['draft', 'submitted', 'reviewed_by_pastor', 'approved_by_director'].map(st => (
                            <button
                              key={st}
                              onClick={() => handleAction(st)}
                              disabled={processing}
                              className="py-1 px-2 border border-gray-300 text-[9px] font-bold rounded-lg uppercase hover:bg-gray-100"
                            >
                              Force {st.split('_')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-6">
                <Clock size={32} className="text-gray-300 mb-2" />
                <p className="font-semibold text-xs">Select a report from the ledger to inspect data values and process approvals</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
