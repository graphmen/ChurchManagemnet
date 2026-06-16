'use client';
import React, { useEffect, useState } from 'react';
import { Smartphone, Download, CheckCircle, Apple, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function MobileDownload() {
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDownloadUrl(window.location.origin + '/ezc-collector.apk');
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 px-2">
      {/* Header section */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-[#2E7D32]/10 text-[#2E7D32] rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-[#2E7D32]/20 animate-bounce">
          <Smartphone size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#1A2E1A] uppercase tracking-tight">Mobile Field App</h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto mt-1">
            Install the official EZC Collector app on your device to record church data, log ministries activities, and map geographic boundaries directly from the field.
          </p>
        </div>
      </div>

      {/* Grid of Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Android Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 text-[#2E7D32] rounded-xl flex items-center justify-center border border-green-100">
                <Smartphone size={20} />
              </div>
              <div>
                <h3 className="font-black text-[#1A2E1A] uppercase text-sm tracking-wide">Android App (APK)</h3>
                <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-md uppercase">Direct Download</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-[#2E7D32] shrink-0 mt-0.5" />
                <span>Supports offline data collection & offline map caching</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-[#2E7D32] shrink-0 mt-0.5" />
                <span>Geotagging for churches, members, and properties</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-[#2E7D32] shrink-0 mt-0.5" />
                <span>Supported on Android 8.0 (Oreo) and above</span>
              </li>
            </ul>

            {/* QR Code Section */}
            {downloadUrl && (
              <div className="bg-[#F0F4F0]/60 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Scan QR Code to Install
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-gray-250/60 shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(downloadUrl)}`}
                    alt="Scan to download APK"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <p className="text-[9px] text-[#2E7D32] font-semibold truncate max-w-full">
                  {downloadUrl}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <a 
              href="/ezc-collector.apk" 
              download 
              className="w-full flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#388E3C] text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
            >
              <Download size={14} /> Download APK (38 MB)
            </a>
          </div>
        </div>

        {/* iOS Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-[#1565C0] rounded-xl flex items-center justify-center border border-blue-100">
                <Apple size={20} />
              </div>
              <div>
                <h3 className="font-black text-[#1A2E1A] uppercase text-sm tracking-wide">iOS App (Xcode Build)</h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-md uppercase">Capacitor Native</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-[#1565C0] shrink-0 mt-0.5" />
                <span>Xcode native Swift packaging ready</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-[#1565C0] shrink-0 mt-0.5" />
                <span>Fully integrated with iOS Geolocation permissions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-[#1565C0] shrink-0 mt-0.5" />
                <span>Compatible with iOS 15.0+ and iPadOS</span>
              </li>
            </ul>

            {/* Build instructions package */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-500" /> Build Steps (Mac/Xcode)
              </p>
              <div className="text-[10px] font-mono text-gray-600 space-y-2 leading-relaxed bg-white/60 p-3 rounded-lg border border-gray-150">
                <div>
                  <span className="text-gray-400"># 1. Install workspace dependencies</span>
                  <div className="text-[#1A2E1A] font-bold mt-0.5">cd mobile & npm install</div>
                </div>
                <div>
                  <span className="text-gray-400"># 2. Compile and sync assets</span>
                  <div className="text-[#1A2E1A] font-bold mt-0.5">npm run build && npx cap sync ios</div>
                </div>
                <div>
                  <span className="text-gray-400"># 3. Open project in Xcode</span>
                  <div className="text-[#1A2E1A] font-bold mt-0.5">npx cap open ios</div>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 italic">
                * Note: Xcode build requires macOS and an Apple developer account for signing.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button 
              disabled
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-not-allowed border border-gray-200"
            >
              <Apple size={14} /> Xcode Setup Synchronized
            </button>
          </div>
        </div>

      </div>

      {/* Help section */}
      <div className="bg-[#11321c] text-white rounded-3xl p-6 flex flex-col md:flex-row items-center gap-5 justify-between shadow-lg">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="font-black uppercase text-sm tracking-wide flex items-center justify-center md:justify-start gap-2">
            <RefreshCw size={16} className="text-[#4CAF50] animate-spin" style={{ animationDuration: '6s' }} />
            Cross-Platform Synchronized
          </h4>
          <p className="text-xs text-white/75 max-w-xl">
            This repository has been configured with Capacitor. Changes to the mobile web code inside <code className="text-[#4CAF50] font-bold bg-white/10 px-1 rounded">mobile/src</code> will apply to both Android and iOS builds automatically.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 border border-white/20 px-4 py-2 rounded-xl bg-white/5">
          <Layers size={14} className="text-[#4CAF50]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[#4CAF50]">Capacitor v8.4</span>
        </div>
      </div>
    </div>
  );
}
