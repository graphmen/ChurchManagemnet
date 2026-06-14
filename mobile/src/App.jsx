import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth, supabase } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MobileDataCollector from './components/MobileDataCollector';
import SSPMCollector from './components/SSPMCollector';
import YouthCollector from './components/YouthCollector';
import ChildrenCollector from './components/ChildrenCollector';
import StewardshipCollector from './components/StewardshipCollector';
import WomenCollector from './components/WomenCollector';
import MenCollector from './components/MenCollector';
import HealthAdraCollector from './components/HealthAdraCollector';
import CommParlCollector from './components/CommParlCollector';
import { ClipboardList, Heart, Compass, Landmark, Users, Activity, Radio } from 'lucide-react';

function MobileAppShell() {
  const { user, profile, loading, signOut } = useAuth();
  const [churches, setChurches] = useState([]);
  const [activeView, setActiveView] = useState('menu'); // 'menu', 'collector', 'sspm', 'youth', 'children', 'stewardship', 'women', 'men', 'health', 'comm'

  useEffect(() => {
    if (user) {
      supabase.from('ezc_churches').select('*').then(({ data }) => setChurches(data || []));
    }
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#11321c]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#4CAF50] font-black text-xs uppercase tracking-[0.4em] animate-pulse">Loading System…</p>
      </div>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-[#F0F4F0] flex flex-col">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: 12, fontWeight: 700, fontSize: 13 } }} />

      {/* Mobile Top Header */}
      <header className="h-16 bg-[#11321c] border-b border-white/10 flex items-center px-5 justify-between shrink-0 shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg p-1 border border-white/20">
            <img src="/sda_logo.svg" alt="SDA" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-black text-xs leading-none">EZC Collector</p>
            <p className="text-[#4CAF50] text-[8px] uppercase tracking-[0.2em] mt-0.5 font-bold">Field Operations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-xs font-bold truncate max-w-[120px]">
            {profile?.full_name || user?.email?.split('@')[0]}
          </span>
          <button 
            onClick={signOut}
            className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/75 rounded-lg border border-white/10 transition-colors"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto py-6">
        {activeView === 'menu' && (
          <div className="max-w-xl mx-auto px-4 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-[#1A2E1A] font-black text-base uppercase tracking-wider">Select Portal</h3>
              <p className="text-xs text-gray-500">Choose the appropriate module to log details</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Option 1: General Registers */}
              <button
                onClick={() => setActiveView('collector')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-[#2E7D32] hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-green-50 text-[#2E7D32] rounded-2xl flex items-center justify-center shrink-0 border border-green-100">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Mission Registers</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Register members, small groups, visitations, properties, etc.</p>
                </div>
              </button>

              {/* Option 2: SSPM Form */}
              <button
                onClick={() => setActiveView('sspm')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-[#2E7D32] hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/sspm.png" alt="SSPM" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">SSPM Department Form</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log weekly/monthly care groups and bible study progress.</p>
                </div>
              </button>

              {/* Option 3: Youth / AY Pathfinder Form */}
              <button
                onClick={() => setActiveView('youth')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-[#E65100] hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/ay.png" alt="Youth" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Youth & Pathfinder Form</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log club sizes, weekly attendance, and honors completed.</p>
                </div>
              </button>

              {/* Option 4: Children Ministries Form */}
              <button
                onClick={() => setActiveView('children')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-[#1565C0] hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/children.png" alt="Children" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Children Ministries Form</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log children attendance, VBS campaigns, and safeguarding check lists.</p>
                </div>
              </button>

              {/* Option 5: Stewardship Form */}
              <button
                onClick={() => setActiveView('stewardship')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-[#2E7D32] hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/stewardship.png" alt="Stewardship" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Stewardship Form</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log stewardship workshops, seminar details, and finance variance.</p>
                </div>
              </button>

              {/* Option 6: Women's Ministries Form */}
              <button
                onClick={() => setActiveView('women')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-pink-500 hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/women.png" alt="Women" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Women's Ministries Form</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log mentorship pairs, retreat attendance, and Circle of Hope outreach.</p>
                </div>
              </button>

              {/* Option 7: Men's Organization Form */}
              <button
                onClick={() => setActiveView('men')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-[#11321c] hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/men.png" alt="AMO" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Adventist Men's Org (AMO)</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log fellowship meetings, workshops, and community service hours.</p>
                </div>
              </button>

              {/* Option 8: Health & ADRA Form */}
              <button
                onClick={() => setActiveView('health')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-red-500 hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/health.png" alt="Health" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Health & ADRA Form</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log health expos, medical camp patient counts, and ADRA beneficiaries.</p>
                </div>
              </button>

              {/* Option 9: Communication & PARL Form */}
              <button
                onClick={() => setActiveView('comm')}
                className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all active:scale-[0.98] text-left"
              >
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                  <img src="/logos/communication.png" alt="Communication" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1A2E1A] uppercase tracking-wide">Communication & PARL</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Log media airtime, newsletter distribution, and religious liberty reports.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeView === 'collector' && (
          <MobileDataCollector churches={churches} onBack={() => setActiveView('menu')} />
        )}

        {activeView === 'sspm' && (
          <div className="max-w-xl mx-auto px-4">
            <SSPMCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}

        {activeView === 'youth' && (
          <div className="max-w-xl mx-auto px-4">
            <YouthCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}

        {activeView === 'children' && (
          <div className="max-w-xl mx-auto px-4">
            <ChildrenCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}

        {activeView === 'stewardship' && (
          <div className="max-w-xl mx-auto px-4">
            <StewardshipCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}

        {activeView === 'women' && (
          <div className="max-w-xl mx-auto px-4">
            <WomenCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}

        {activeView === 'men' && (
          <div className="max-w-xl mx-auto px-4">
            <MenCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}

        {activeView === 'health' && (
          <div className="max-w-xl mx-auto px-4">
            <HealthAdraCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}

        {activeView === 'comm' && (
          <div className="max-w-xl mx-auto px-4">
            <CommParlCollector churches={churches} onBack={() => setActiveView('menu')} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-gray-200/50 bg-[#F0F4F0] mt-auto">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Graphmen Geospatial</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MobileAppShell />
    </AuthProvider>
  );
}
