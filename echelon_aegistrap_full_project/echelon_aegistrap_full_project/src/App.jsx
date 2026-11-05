import React, { useState } from 'react';
import EchelonDarknetSuite from './components/EchelonDarknetSuite.jsx';
import AegisTrapSuite from './components/AegisTrapSuite.jsx';
import { Radar, Shield } from 'lucide-react';

export default function App() {
  const [activeSuite, setActiveSuite] = useState('echelon');

  return (
    <div className="min-h-screen bg-[#030508] text-slate-100">
      {/* Global Top Suite Switcher Bar */}
      <div className="bg-[#020407] border-b border-slate-800/90 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>UNIFIED CYBER INTELLIGENCE WORKSPACE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSuite('echelon')}
            className={`px-3 py-1 rounded font-mono text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeSuite === 'echelon'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            ECHELON // DARKNET (TOR / I2P / ZERONET)
          </button>
          <button
            onClick={() => setActiveSuite('aegistrap')}
            className={`px-3 py-1 rounded font-mono text-xs flex items-center gap-1.5 cursor-pointer transition ${
              activeSuite === 'aegistrap'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            AEGISTRAP // HONEYPOT & CTI FLEET
          </button>
        </div>
      </div>

      {activeSuite === 'echelon' ? <EchelonDarknetSuite /> : <AegisTrapSuite />}
    </div>
  );
}
