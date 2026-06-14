import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../context/AuthContext';
import {
  MapPin, Camera, ClipboardList, Users, Home, Heart, Target,
  Award, ShieldAlert, Sparkles, Plus, X, Save, RefreshCw, Smartphone, Loader2,
  ChevronLeft
} from 'lucide-react';
import { getCurrentLocation, takePhotoAndUpload } from '../utils/mobilePlugins';
import toast from 'react-hot-toast';

export default function MobileDataCollector({ churches = [], onBack }) {
  const [activeForm, setActiveForm] = useState(null); // null or form id
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentGps, setCurrentGps] = useState(null);

  // Load user current GPS on mount just for dashboard info
  useEffect(() => {
    fetchQuickGps();
  }, []);

  const fetchQuickGps = async () => {
    try {
      const pos = await getCurrentLocation();
      setCurrentGps(pos);
    } catch (e) {
      console.warn("Failed to get initial location", e);
    }
  };

  // Form configurations
  const FORMS = [
    { id: 'member', label: 'Register Member', icon: Users, color: 'from-green-500 to-emerald-600', description: 'Add new church member with photo & GPS location' },
    { id: 'household', label: 'Register Household', icon: Home, color: 'from-blue-500 to-indigo-600', description: 'Log household heads, family details & address coordinates' },
    { id: 'smallgroup', label: 'Add Small Group', icon: Heart, color: 'from-purple-500 to-indigo-600', description: 'Create prayer band, cell group, or bible study unit' },
    { id: 'campaign', label: 'Log Campaign', icon: Target, color: 'from-rose-500 to-red-600', description: 'Log evangelistic outreach events, attendance & decisions' },
    { id: 'candidate', label: 'Add Baptism Candidate', icon: Award, color: 'from-amber-500 to-orange-600', description: 'Add new candidate to the discipleship & study pipeline' },
    { id: 'property', label: 'Register Property', icon: Home, color: 'from-teal-500 to-cyan-600', description: 'Register church buildings, land assets, and valuations' },
    { id: 'visitation', label: 'Log Visitation', icon: ClipboardList, color: 'from-emerald-500 to-teal-600', description: 'Record pastoral/elder home visit details & follow-ups' },
    { id: 'emergency', label: 'Report Emergency', icon: ShieldAlert, color: 'from-red-500 to-rose-600', description: 'Report disasters, crisis zones, or urgent welfare issues' },
    { id: 'unreached', label: 'Mark Unreached Area', icon: Sparkles, color: 'from-amber-600 to-yellow-600', description: 'Identify unreached communities needing mission focus' }
  ];

  // Forms state management
  const [formData, setFormData] = useState({
    // General / GPS & Photo
    lat: '', lng: '', photo_url: '',
    // Member
    full_name: '', phone: '', email: '', gender: '', status: 'active', date_of_birth: '', baptism_date: '', church_id: '', notes: '', address: '',
    // Household
    family_name: '', head_of_household: '', member_count: '',
    // Small Group
    type: 'small_group', leader_name: '', leader_phone: '', meeting_day: '', meeting_time: '',
    // Campaign
    campaign_type: 'campaign', start_date: '', end_date: '', attendance: '', baptisms: '', bible_studies: '', decisions: '', campaign_status: 'planned',
    // Baptismal Candidate
    referrer_name: '', bible_studies_completed: 0, expected_baptism_date: '', candidate_status: 'studying',
    // Property
    property_type: 'church', property_status: 'active', area_sqm: '', valuation: '',
    // Visitation
    visit_date: new Date().toISOString().split('T')[0], visit_type: 'Spiritual Encouragement', member_name: '', follow_up: false,
    // Emergency
    title: '', emergency_type: 'crisis', description: '', affected_count: '', emergency_status: 'active',
    // Unreached
    unreached_name: '', priority: 'medium', unreached_status: 'identified', population_est: ''
  });

  const resetForm = () => {
    setFormData({
      lat: '', lng: '', photo_url: '',
      full_name: '', phone: '', email: '', gender: '', status: 'active', date_of_birth: '', baptism_date: '', church_id: '', notes: '', address: '',
      family_name: '', head_of_household: '', member_count: '',
      type: 'small_group', leader_name: '', leader_phone: '', meeting_day: '', meeting_time: '',
      campaign_type: 'campaign', start_date: '', end_date: '', attendance: '', baptisms: '', bible_studies: '', decisions: '', campaign_status: 'planned',
      referrer_name: '', bible_studies_completed: 0, expected_baptism_date: '', candidate_status: 'studying',
      property_type: 'church', property_status: 'active', area_sqm: '', valuation: '',
      visit_date: new Date().toISOString().split('T')[0], visit_type: 'Spiritual Encouragement', member_name: '', follow_up: false,
      title: '', emergency_type: 'crisis', description: '', affected_count: '', emergency_status: 'active',
      unreached_name: '', priority: 'medium', unreached_status: 'identified', population_est: ''
    });
  };

  const handleCaptureGps = async () => {
    setGpsLoading(true);
    try {
      const pos = await getCurrentLocation();
      setFormData(prev => ({ ...prev, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }));
      setCurrentGps(pos);
      toast.success(`Location captured! Accuracy: ${pos.accuracy ? pos.accuracy.toFixed(1) + 'm' : 'Standard'}`);
    } catch (e) {
      toast.error('Could not retrieve location. Please check GPS permissions.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleCapturePhoto = async () => {
    try {
      const url = await takePhotoAndUpload(setPhotoLoading);
      if (url) {
        setFormData(prev => ({ ...prev, photo_url: url }));
        toast.success('Photo uploaded and linked!');
      }
    } catch (e) {
      toast.error('Photo upload failed. Please try again.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const basePayload = {
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        notes: formData.notes
      };

      let table = '';
      let insertData = {};

      switch (activeForm) {
        case 'member':
          table = 'ezc_members';
          insertData = {
            ...basePayload,
            full_name: formData.full_name,
            phone: formData.phone,
            email: formData.email,
            gender: formData.gender || null,
            status: formData.status,
            date_of_birth: formData.date_of_birth || null,
            baptism_date: formData.baptism_date || null,
            church_id: formData.church_id || null,
            address: formData.address,
            photo_url: formData.photo_url || null
          };
          break;

        case 'household':
          table = 'ezc_households';
          insertData = {
            ...basePayload,
            family_name: formData.family_name,
            head_of_household: formData.head_of_household,
            phone: formData.phone,
            address: formData.address,
            church_id: formData.church_id || null,
            member_count: parseInt(formData.member_count) || 0
          };
          break;

        case 'smallgroup':
          table = 'ezc_small_groups';
          insertData = {
            ...basePayload,
            name: formData.full_name, // Map input as group name
            type: formData.type,
            leader_name: formData.leader_name,
            leader_phone: formData.leader_phone,
            church_id: formData.church_id || null,
            meeting_day: formData.meeting_day,
            meeting_time: formData.meeting_time,
            address: formData.address,
            member_count: parseInt(formData.member_count) || 0,
            is_active: true
          };
          break;

        case 'campaign':
          table = 'ezc_campaigns';
          insertData = {
            ...basePayload,
            name: formData.full_name, // Map input as campaign name
            type: formData.campaign_type,
            church_id: formData.church_id || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            address: formData.address,
            attendance: parseInt(formData.attendance) || 0,
            baptisms: parseInt(formData.baptisms) || 0,
            bible_studies: parseInt(formData.bible_studies) || 0,
            decisions: parseInt(formData.decisions) || 0,
            status: formData.campaign_status
          };
          break;

        case 'candidate':
          table = 'ezc_baptismal_candidates';
          insertData = {
            ...basePayload,
            full_name: formData.full_name,
            phone: formData.phone,
            address: formData.address,
            church_id: formData.church_id || null,
            referrer_name: formData.referrer_name,
            bible_studies_completed: parseInt(formData.bible_studies_completed) || 0,
            expected_baptism_date: formData.expected_baptism_date || null,
            status: formData.candidate_status
          };
          break;

        case 'property':
          table = 'ezc_properties';
          insertData = {
            ...basePayload,
            name: formData.full_name, // Map input as property name
            type: formData.property_type,
            status: formData.property_status,
            address: formData.address,
            area_sqm: formData.area_sqm ? parseFloat(formData.area_sqm) : null,
            valuation: formData.valuation ? parseFloat(formData.valuation) : null,
            photo_url: formData.photo_url || null
          };
          break;

        case 'visitation':
          table = 'ezc_visitations';
          insertData = {
            ...basePayload,
            church_id: formData.church_id || null,
            visit_date: formData.visit_date,
            visit_type: formData.visit_type,
            member_name: formData.member_name,
            follow_up_needed: formData.follow_up
          };
          break;

        case 'emergency':
          table = 'ezc_emergency_events';
          insertData = {
            ...basePayload,
            title: formData.title,
            type: formData.emergency_type,
            description: formData.description,
            affected_area: formData.address,
            affected_count: parseInt(formData.affected_count) || 0,
            status: formData.emergency_status
          };
          break;

        case 'unreached':
          table = 'ezc_unreached_territories';
          insertData = {
            ...basePayload,
            name: formData.unreached_name,
            description: formData.description,
            population_est: parseInt(formData.population_est) || null,
            priority: formData.priority,
            status: formData.unreached_status
          };
          break;

        default:
          throw new Error('Invalid form type');
      }

      const { error } = await supabase.from(table).insert(insertData);
      if (error) throw error;

      toast.success('Data synchronized successfully!');
      setActiveForm(null);
      resetForm();
    } catch (err) {
      toast.error(`Sync error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#11321c] rounded-3xl p-6 text-white relative overflow-hidden border border-white/10 shadow-xl">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button 
                type="button"
                onClick={onBack} 
                className="text-white/60 hover:text-white mr-1 transition-colors p-1"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">Mission Data Collector</h2>
              <p className="text-xs text-white/60 mt-1">EZC Field Operations System</p>
            </div>
          </div>
          <Smartphone className="text-[#4CAF50] opacity-40 shrink-0" size={36} />
        </div>
        {/* GPS accuracy pill */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-white/55">
            <MapPin size={13} className="text-[#4CAF50]" />
            Location Engine:
          </span>
          <span className="font-bold text-[#81C784]">
            {currentGps ? (
              <span className="flex items-center gap-1">
                Connected ({currentGps.source === 'gps' ? 'Device GPS' : 'Web Fallback'})
                <button onClick={fetchQuickGps} className="hover:text-white transition-colors p-0.5"><RefreshCw size={10} /></button>
              </span>
            ) : (
              'Retrieving coordinates...'
            )}
          </span>
        </div>
      </div>

      {/* Grid of Forms */}
      <AnimatePresence mode="wait">
        {!activeForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-3"
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Data Module</p>
            {FORMS.map(form => (
              <button
                key={form.id}
                onClick={() => { resetForm(); setActiveForm(form.id); }}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:border-green-300 hover:shadow-md transition-all active:scale-[0.98] text-left group"
              >
                <div className={`p-3 bg-gradient-to-br ${form.color} text-white rounded-xl shadow-sm shrink-0`}>
                  <form.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wider group-hover:text-[#2E7D32] transition-colors">{form.label}</h4>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{form.description}</p>
                </div>
                <Plus size={16} className="text-gray-300 group-hover:text-[#2E7D32] transition-colors shrink-0" />
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-none"
          >
            {/* Header */}
            <div className="bg-[#2E7D32] text-white px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">
                {FORMS.find(f => f.id === activeForm)?.label}
              </span>
              <button
                type="button"
                onClick={() => { setActiveForm(null); resetForm(); }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* GPS coordinates fetch row */}
              <div className="bg-[#F8FAF8] border-2 border-dashed border-[#2E7D32]/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#2E7D32] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={12} /> Geographic Coordinates *
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={gpsLoading}
                    className="flex items-center gap-1 bg-[#2E7D32] hover:bg-[#388E3C] disabled:bg-gray-200 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    {gpsLoading ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      'Capture GPS'
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase">Latitude</label>
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="e.g. -17.8292"
                      value={formData.lat}
                      onChange={e => setFormData(p => ({ ...p, lat: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#2E7D32]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase">Longitude</label>
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="e.g. 31.0522"
                      value={formData.lng}
                      onChange={e => setFormData(p => ({ ...p, lng: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#2E7D32]"
                    />
                  </div>
                </div>
              </div>

              {/* Photo capture (Conditional) */}
              {(activeForm === 'member' || activeForm === 'property') && (
                <div className="bg-[#F8FAF8] border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center relative shrink-0">
                    {formData.photo_url ? (
                      <img src={formData.photo_url} alt="Upload" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={20} className="text-gray-300" />
                    )}
                    {photoLoading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase">Capture Image</label>
                    <p className="text-[10px] text-gray-400 mb-1.5">Attach photo for identification</p>
                    <button
                      type="button"
                      disabled={photoLoading}
                      onClick={handleCapturePhoto}
                      className="bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 text-[#2E7D32] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      {formData.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic form inputs */}
              <div className="space-y-3">
                {/* 1. MEMBER FORM */}
                {activeForm === 'member' && (
                  <>
                    <div>
                      <label className="label-sm">Full Name *</label>
                      <input required className="field" value={formData.full_name} onChange={e => setFormData(p=>({...p, full_name: e.target.value}))} placeholder="John Doe" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Phone</label>
                        <input className="field" value={formData.phone} onChange={e => setFormData(p=>({...p, phone: e.target.value}))} placeholder="+263 77..." />
                      </div>
                      <div>
                        <label className="label-sm">Email</label>
                        <input type="email" className="field" value={formData.email} onChange={e => setFormData(p=>({...p, email: e.target.value}))} placeholder="john@doe.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Gender</label>
                        <select className="field" value={formData.gender} onChange={e => setFormData(p=>({...p, gender: e.target.value}))}>
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Status</label>
                        <select className="field" value={formData.status} onChange={e => setFormData(p=>({...p, status: e.target.value}))}>
                          {['active','inactive','interest','candidate','transferred'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Date of Birth</label>
                        <input type="date" className="field" value={formData.date_of_birth} onChange={e => setFormData(p=>({...p, date_of_birth: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">Baptism Date</label>
                        <input type="date" className="field" value={formData.baptism_date} onChange={e => setFormData(p=>({...p, baptism_date: e.target.value}))} />
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Church *</label>
                      <select required className="field" value={formData.church_id} onChange={e => setFormData(p=>({...p, church_id: e.target.value}))}>
                        <option value="">Select Church...</option>
                        {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-sm">Home Address</label>
                      <input className="field" value={formData.address} onChange={e => setFormData(p=>({...p, address: e.target.value}))} placeholder="Greendale, Harare" />
                    </div>
                  </>
                )}

                {/* 2. HOUSEHOLD FORM */}
                {activeForm === 'household' && (
                  <>
                    <div>
                      <label className="label-sm">Family Name *</label>
                      <input required className="field" value={formData.family_name} onChange={e => setFormData(p=>({...p, family_name: e.target.value}))} placeholder="Chiri Family" />
                    </div>
                    <div>
                      <label className="label-sm">Head of Household</label>
                      <input className="field" value={formData.head_of_household} onChange={e => setFormData(p=>({...p, head_of_household: e.target.value}))} placeholder="Mr. Chiriga" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Phone</label>
                        <input className="field" value={formData.phone} onChange={e => setFormData(p=>({...p, phone: e.target.value}))} placeholder="+263..." />
                      </div>
                      <div>
                        <label className="label-sm">Family Count</label>
                        <input type="number" min="1" className="field" value={formData.member_count} onChange={e => setFormData(p=>({...p, member_count: e.target.value}))} placeholder="4" />
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Church *</label>
                      <select required className="field" value={formData.church_id} onChange={e => setFormData(p=>({...p, church_id: e.target.value}))}>
                        <option value="">Select Church...</option>
                        {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-sm">Address</label>
                      <input className="field" value={formData.address} onChange={e => setFormData(p=>({...p, address: e.target.value}))} placeholder="Highlands, Harare" />
                    </div>
                  </>
                )}

                {/* 3. SMALL GROUP FORM */}
                {activeForm === 'smallgroup' && (
                  <>
                    <div>
                      <label className="label-sm">Group / Band Name *</label>
                      <input required className="field" value={formData.full_name} onChange={e => setFormData(p=>({...p, full_name: e.target.value}))} placeholder="Ruwa Cell Group A" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Type</label>
                        <select className="field" value={formData.type} onChange={e => setFormData(p=>({...p, type: e.target.value}))}>
                          <option value="small_group">Small Group</option>
                          <option value="prayer_band">Prayer Band</option>
                          <option value="bible_study">Bible Study</option>
                          <option value="branch_sabbath">Branch Sabbath</option>
                          <option value="ministry_center">Ministry Center</option>
                          <option value="prayer_cell">Prayer Cell</option>
                          <option value="intercessory">Intercessory Group</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Church *</label>
                        <select required className="field" value={formData.church_id} onChange={e => setFormData(p=>({...p, church_id: e.target.value}))}>
                          <option value="">Select Church...</option>
                          {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Leader Name</label>
                        <input className="field" value={formData.leader_name} onChange={e => setFormData(p=>({...p, leader_name: e.target.value}))} placeholder="E.g. Elder Moyo" />
                      </div>
                      <div>
                        <label className="label-sm">Leader Phone</label>
                        <input className="field" value={formData.leader_phone} onChange={e => setFormData(p=>({...p, leader_phone: e.target.value}))} placeholder="+263..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Meeting Day</label>
                        <select className="field" value={formData.meeting_day} onChange={e => setFormData(p=>({...p, meeting_day: e.target.value}))}>
                          <option value="">Select day</option>
                          {['Monday','Tuesday','Wednesday','Thursday','Friday','Sabbath','Sunday'].map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Meeting Time</label>
                        <input type="time" className="field" value={formData.meeting_time} onChange={e => setFormData(p=>({...p, meeting_time: e.target.value}))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Member Count</label>
                        <input type="number" min="0" className="field" value={formData.member_count} onChange={e => setFormData(p=>({...p, member_count: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">Meeting Address</label>
                        <input className="field" value={formData.address} onChange={e => setFormData(p=>({...p, address: e.target.value}))} placeholder="House 123, Ruwa" />
                      </div>
                    </div>
                  </>
                )}

                {/* 4. CAMPAIGN FORM */}
                {activeForm === 'campaign' && (
                  <>
                    <div>
                      <label className="label-sm">Campaign Name *</label>
                      <input required className="field" value={formData.full_name} onChange={e => setFormData(p=>({...p, full_name: e.target.value}))} placeholder="Harare Youth Outreach Campaign" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Type</label>
                        <select className="field" value={formData.campaign_type} onChange={e => setFormData(p=>({...p, campaign_type: e.target.value}))}>
                          {['campaign','seminar','revival','outreach','community','vbs','health'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Status</label>
                        <select className="field" value={formData.campaign_status} onChange={e => setFormData(p=>({...p, campaign_status: e.target.value}))}>
                          {['planned','active','completed','cancelled'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Start Date</label>
                        <input type="date" className="field" value={formData.start_date} onChange={e => setFormData(p=>({...p, start_date: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">End Date</label>
                        <input type="date" className="field" value={formData.end_date} onChange={e => setFormData(p=>({...p, end_date: e.target.value}))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Attendance</label>
                        <input type="number" min="0" className="field" value={formData.attendance} onChange={e => setFormData(p=>({...p, attendance: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">Decisions</label>
                        <input type="number" min="0" className="field" value={formData.decisions} onChange={e => setFormData(p=>({...p, decisions: e.target.value}))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Bible Studies</label>
                        <input type="number" min="0" className="field" value={formData.bible_studies} onChange={e => setFormData(p=>({...p, bible_studies: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">Baptisms</label>
                        <input type="number" min="0" className="field" value={formData.baptisms} onChange={e => setFormData(p=>({...p, baptisms: e.target.value}))} />
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Hosting Church *</label>
                      <select required className="field" value={formData.church_id} onChange={e => setFormData(p=>({...p, church_id: e.target.value}))}>
                        <option value="">Select Church...</option>
                        {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-sm">Location Address</label>
                      <input className="field" value={formData.address} onChange={e => setFormData(p=>({...p, address: e.target.value}))} placeholder="Greendale Open Grounds" />
                    </div>
                  </>
                )}

                {/* 5. BAPTISMAL CANDIDATE FORM */}
                {activeForm === 'candidate' && (
                  <>
                    <div>
                      <label className="label-sm">Candidate Full Name *</label>
                      <input required className="field" value={formData.full_name} onChange={e => setFormData(p=>({...p, full_name: e.target.value}))} placeholder="Gift Phiri" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Phone</label>
                        <input className="field" value={formData.phone} onChange={e => setFormData(p=>({...p, phone: e.target.value}))} placeholder="+263..." />
                      </div>
                      <div>
                        <label className="label-sm">Referrer / Elder</label>
                        <input className="field" value={formData.referrer_name} onChange={e => setFormData(p=>({...p, referrer_name: e.target.value}))} placeholder="E.g. Elder Nyoni" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Studies Completed</label>
                        <input type="number" min="0" className="field" value={formData.bible_studies_completed} onChange={e => setFormData(p=>({...p, bible_studies_completed: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">Status</label>
                        <select className="field" value={formData.candidate_status} onChange={e => setFormData(p=>({...p, candidate_status: e.target.value}))}>
                          <option value="studying">Studying</option>
                          <option value="ready">Ready for Baptism</option>
                          <option value="baptized">Baptized</option>
                          <option value="withdrawn">Withdrawn</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Expected Baptism Date</label>
                        <input type="date" className="field" value={formData.expected_baptism_date} onChange={e => setFormData(p=>({...p, expected_baptism_date: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">Home Church *</label>
                        <select required className="field" value={formData.church_id} onChange={e => setFormData(p=>({...p, church_id: e.target.value}))}>
                          <option value="">Select Church...</option>
                          {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Home Address</label>
                      <input className="field" value={formData.address} onChange={e => setFormData(p=>({...p, address: e.target.value}))} placeholder="Greendale, Harare" />
                    </div>
                  </>
                )}

                {/* 6. PROPERTY FORM */}
                {activeForm === 'property' && (
                  <>
                    <div>
                      <label className="label-sm">Property Name *</label>
                      <input required className="field" value={formData.full_name} onChange={e => setFormData(p=>({...p, full_name: e.target.value}))} placeholder="Waterfalls SDA Church Plot" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Type</label>
                        <select className="field" value={formData.property_type} onChange={e => setFormData(p=>({...p, property_type: e.target.value}))}>
                          {['church','school','office','land','hospital','clinic','institution','other'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Status</label>
                        <select className="field" value={formData.property_status} onChange={e => setFormData(p=>({...p, property_status: e.target.value}))}>
                          {['active','under_construction','planned','sold','leased'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Area (m²)</label>
                        <input type="number" className="field" value={formData.area_sqm} onChange={e => setFormData(p=>({...p, area_sqm: e.target.value}))} placeholder="2000" />
                      </div>
                      <div>
                        <label className="label-sm">Valuation (USD)</label>
                        <input type="number" className="field" value={formData.valuation} onChange={e => setFormData(p=>({...p, valuation: e.target.value}))} placeholder="50000" />
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Address / Location Description</label>
                      <input className="field" value={formData.address} onChange={e => setFormData(p=>({...p, address: e.target.value}))} placeholder="Plot 45, Waterfalls" />
                    </div>
                  </>
                )}

                {/* 7. VISITATION FORM */}
                {activeForm === 'visitation' && (
                  <>
                    <div>
                      <label className="label-sm">Territory / Church *</label>
                      <select required className="field" value={formData.church_id} onChange={e => setFormData(p=>({...p, church_id: e.target.value}))}>
                        <option value="">Select Church...</option>
                        {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Visit Date</label>
                        <input type="date" className="field" value={formData.visit_date} onChange={e => setFormData(p=>({...p, visit_date: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label-sm">Category</label>
                        <select className="field" value={formData.visit_type} onChange={e => setFormData(p=>({...p, visit_type: e.target.value}))}>
                          <option value="home">Home Visit</option>
                          <option value="hospital">Hospital / Sick</option>
                          <option value="follow_up">Follow Up</option>
                          <option value="crisis">Crisis / Welfare</option>
                          <option value="discipleship">Discipleship</option>
                          <option value="evangelism">Outreach</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Member Identity / Name *</label>
                      <input required className="field" value={formData.member_name} onChange={e => setFormData(p=>({...p, member_name: e.target.value}))} placeholder="E.g. Sister Sibanda" />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer w-full">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-200 text-[#2E7D32] focus:ring-[#2E7D32]" checked={formData.follow_up} onChange={e => setFormData(p=>({...p, follow_up: e.target.checked}))} />
                        <span className="text-xs font-bold text-gray-600">Follow-up Required by District/Pastor</span>
                      </label>
                    </div>
                  </>
                )}

                {/* 8. EMERGENCY FORM */}
                {activeForm === 'emergency' && (
                  <>
                    <div>
                      <label className="label-sm">Emergency Title *</label>
                      <input required className="field" value={formData.title} onChange={e => setFormData(p=>({...p, title: e.target.value}))} placeholder="Severe Flooding in Retreat Area" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Category</label>
                        <select className="field" value={formData.emergency_type} onChange={e => setFormData(p=>({...p, emergency_type: e.target.value}))}>
                          <option value="disaster">Natural Disaster</option>
                          <option value="health">Health Crisis</option>
                          <option value="crisis">Personal Crisis</option>
                          <option value="welfare">Welfare Request</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Status</label>
                        <select className="field" value={formData.emergency_status} onChange={e => setFormData(p=>({...p, emergency_status: e.target.value}))}>
                          <option value="active">Active / Urgent</option>
                          <option value="monitoring">Monitoring</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">People Affected</label>
                        <input type="number" min="0" className="field" value={formData.affected_count} onChange={e => setFormData(p=>({...p, affected_count: e.target.value}))} placeholder="E.g. 15" />
                      </div>
                      <div>
                        <label className="label-sm">Affected Area Name</label>
                        <input className="field" value={formData.address} onChange={e => setFormData(p=>({...p, address: e.target.value}))} placeholder="Retreat Phase 2" />
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Description of Crisis</label>
                      <textarea rows={2} className="field" value={formData.description} onChange={e => setFormData(p=>({...p, description: e.target.value}))} placeholder="Detail the situation..." />
                    </div>
                  </>
                )}

                {/* 9. UNREACHED TERRITORY FORM */}
                {activeForm === 'unreached' && (
                  <>
                    <div>
                      <label className="label-sm">Territory Designation Name *</label>
                      <input required className="field" value={formData.unreached_name} onChange={e => setFormData(p=>({...p, unreached_name: e.target.value}))} placeholder="Chiremba North Extension" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Priority</label>
                        <select className="field" value={formData.priority} onChange={e => setFormData(p=>({...p, priority: e.target.value}))}>
                          <option value="high">High priority</option>
                          <option value="medium">Medium priority</option>
                          <option value="low">Low priority</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-sm">Status</label>
                        <select className="field" value={formData.unreached_status} onChange={e => setFormData(p=>({...p, unreached_status: e.target.value}))}>
                          <option value="identified">Identified</option>
                          <option value="planning">Planning Work</option>
                          <option value="reached">Reached / Planted</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-sm">Est. Population</label>
                        <input type="number" min="0" className="field" value={formData.population_est} onChange={e => setFormData(p=>({...p, population_est: e.target.value}))} placeholder="E.g. 500" />
                      </div>
                      <div>
                        <label className="label-sm">Description / Obstacles</label>
                        <input className="field" value={formData.description} onChange={e => setFormData(p=>({...p, description: e.target.value}))} placeholder="No active church presence..." />
                      </div>
                    </div>
                  </>
                )}

                {/* Notes (Standard for all) */}
                <div>
                  <label className="label-sm">Additional observations & comments</label>
                  <textarea rows={2} className="field" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any other context..." />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setActiveForm(null); resetForm(); }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.lat || !formData.lng}
                  className="flex-1 py-3 bg-[#2E7D32] hover:bg-[#388E3C] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={13} />
                      Sync Record
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
