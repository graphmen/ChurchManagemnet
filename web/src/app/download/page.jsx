import React from 'react';
import MobileDownload from '../../components/MobileDownload';

export const metadata = {
  title: "Download Mobile App - EZC GeoMap",
  description: "Download the official mobile collector app for the East Zimbabwe Conference GIS Platform.",
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-[#F0F4F0] flex flex-col">
      {/* Simple Header */}
      <header className="h-16 bg-[#11321c] border-b border-white/10 flex items-center px-6 justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg p-1 border border-white/20">
            <img src="/sda_logo.svg" alt="SDA" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-black text-xs leading-none">EZC GeoMap</p>
            <p className="text-[#4CAF50] text-[8px] uppercase tracking-[0.2em] mt-0.5 font-bold">Mobile Download Portal</p>
          </div>
        </div>
        <a 
          href="/" 
          className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
        >
          Portal Login
        </a>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full bg-white/50 backdrop-blur-md rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
          <MobileDownload />
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="text-center py-5 border-t border-gray-200/50 bg-[#F0F4F0] shrink-0">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Graphmen Geospatial</p>
      </footer>
    </div>
  );
}
