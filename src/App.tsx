import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import NetworkGraph, { type Node } from './components/NetworkGraph';
import SentinelTerminal from './components/SentinelTerminal';
import {
  ShieldCheck, Activity, Terminal, Wifi, Database, Bell,
  Cpu, Target, Layers, AlertTriangle, Globe, Crosshair,
  Server, Skull, Radio, Navigation, Share2
} from 'lucide-react';

/* --- TYPES --- */
interface Threat {
  id: string; time: string; type: string; title: string;
  color: string; sector: string; resolved: boolean;
}

/* ─── PURE COMPONENTS (defined at module level, never recreated) ─── */

const HUDMetric = memo(({ icon, label, value, color }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{ opacity: 0.2 }}>{icon}</div>
    <div>
      <div style={{ fontSize: '7px', fontWeight: 900, opacity: 0.3 }}>{label}</div>
      <div style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', color: color || 'white' }}>{value}</div>
    </div>
  </div>
));

const HUDLabel = memo(({ label, active, accent }: any) => (
  <div style={{ padding: '5px 10px', background: active ? 'rgba(0,209,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${active ? '#00d1ff40' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', fontSize: '8px', fontWeight: 900, color: active ? accent : 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
    {label}
  </div>
));

const MetricCard = memo(({ label, value, unit, color, icon, progress }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.4 }}>
      <span style={{ fontSize: '7px', fontWeight: 900 }}>{label}</span>{icon}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace', color }}>{value}</div>
      <div style={{ fontSize: '8px', opacity: 0.3 }}>{unit}</div>
    </div>
    <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: color, boxShadow: `0 0 6px ${color}`, transition: 'width 0.5s ease' }} />
    </div>
  </div>
));

const ThreatCard = memo(({ threat, onAcknowledge, onDismiss }: { threat: Threat; onAcknowledge: () => void; onDismiss: () => void }) => (
  <div style={{ padding: '10px', background: threat.resolved ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)', border: `1px solid ${threat.resolved ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)'}`, borderRadius: '10px', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '5px', animation: 'slideIn 0.3s ease-out', transition: 'all 0.3s' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '7px', fontWeight: 900, color: threat.resolved ? '#10b981' : threat.color, padding: '1px 5px', background: `${threat.resolved ? '#10b981' : threat.color}15`, borderRadius: '3px' }}>{threat.resolved ? '✓ RESOLVED' : threat.type}</span>
      <span style={{ fontSize: '8px', opacity: 0.2, fontFamily: 'monospace' }}>{threat.time}</span>
    </div>
    <div style={{ fontSize: '10px', fontWeight: 'bold', textDecoration: threat.resolved ? 'line-through' : 'none', opacity: threat.resolved ? 0.4 : 1 }}>{threat.title}</div>
    <div style={{ fontSize: '8px', opacity: 0.3 }}>LOC: {threat.sector}</div>
    {!threat.resolved && (
      <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
        <button onClick={onAcknowledge} style={{ flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '3px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>✓ ACK</button>
        <button onClick={onDismiss} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', padding: '3px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>✕ DISMISS</button>
      </div>
    )}
  </div>
));

/* ─── PERSISTENCE ─── */
const SAVE_KEY = 'sentinel_x_state';

const mkDefaultNodes = (): Node[] => {
  const n: Node[] = [
    { id: 'gw-01', type: 'firewall', label: 'GATEWAY_MASTER', status: 'online', value: 24, traffic: 88, sector: 'SEC-01' },
    { id: 'db-01', type: 'database', label: 'CORE_STORAGE', status: 'online', value: 20, traffic: 45, sector: 'SEC-04' },
    { id: 'srv-01', type: 'server', label: 'WORKER_ALPHA', status: 'warning', value: 16, traffic: 12, sector: 'SEC-02' },
    { id: 'srv-02', type: 'server', label: 'WORKER_BETA', status: 'online', value: 16, traffic: 5, sector: 'SEC-02' },
  ];
  for (let i = 0; i < 20; i++)
    n.push({ id: `ep-${i}`, type: 'endpoint', label: `NODE_${i.toString().padStart(2, '0')}`, status: 'online', value: 7, traffic: Math.floor(Math.random() * 40), sector: 'SEC-09' });
  return n;
};

const mkDefaultLinks = (): any[] => {
  const anchors = ['gw-01', 'srv-01', 'srv-02'];
  const l: any[] = [
    { source: 'gw-01', target: 'db-01' },
    { source: 'gw-01', target: 'srv-01' },
    { source: 'gw-01', target: 'srv-02' },
  ];
  for (let i = 0; i < 20; i++)
    l.push({ source: `ep-${i}`, target: anchors[i % 3] });
  return l;
};

const normalizeLinks = (links: any[]): any[] =>
  links.map(l => ({
    source: typeof l.source === 'object' && l.source ? l.source.id : l.source,
    target: typeof l.target === 'object' && l.target ? l.target.id : l.target,
  }));

const loadState = () => {
  try {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('state=')) {
      const d = JSON.parse(atob(hash.slice(6)));
      if (d?.nodes) return d;
    }
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
};

const writeState = (state: any) => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
};

/* ─── APP ─── */
const App: React.FC = () => {
  const saved = useMemo(() => loadState(), []);

  /* layout */
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1100 && window.innerWidth >= 768);
  const [activePanel, setActivePanel] = useState<'log' | 'graph' | 'terminal' | 'threats'>('graph');
  const [shareMsg, setShareMsg] = useState('');

  /* state */
  const [isLockdown, setIsLockdown] = useState<boolean>(saved?.isLockdown ?? false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [satID, setSatID] = useState<string>(saved?.satID ?? 'L_EO_6');
  const [satStatus, setSatStatus] = useState('CONNECTED');
  const [satDetails, setSatDetails] = useState({ orbit: '35,786 KM', signal: 92, drift: '0.002°' });
  const [logs, setLogs] = useState<{ msg: string; time: string; type: string }[]>(
    saved?.logs ?? [
      { msg: 'KERNEL_A9_BOOT_COMPLETE', time: new Date().toLocaleTimeString([], { hour12: false }), type: 'success' },
      { msg: saved ? 'STATE_RESTORED_FROM_CACHE' : 'NEURAL_MESH_ESTABLISHED', time: new Date().toLocaleTimeString([], { hour12: false }), type: 'info' },
    ]
  );
  const [metrics, setMetrics] = useState({ cpu: 22, ram: 4.2, ping: 12 });
  const [nodes, setNodes] = useState<Node[]>(saved?.nodes ?? mkDefaultNodes());
  const [links, setLinks] = useState<any[]>(saved?.links ? normalizeLinks(saved.links) : mkDefaultLinks());
  const [threats, setThreats] = useState<Threat[]>(saved?.threats ?? [
    { id: 'th-1', time: new Date().toLocaleTimeString([], { hour12: false }), type: 'DDOS', title: 'TCP/SYN Flood', color: '#ff2d55', sector: 'GATEWAY_MASTER', resolved: false },
    { id: 'th-2', time: new Date().toLocaleTimeString([], { hour12: false }), type: 'SQLI', title: 'Auth Bypass Attempt', color: '#ffb800', sector: 'CORE_STORAGE', resolved: false },
  ]);
  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);

  /* resize — debounced */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const h = () => { clearTimeout(t); t = setTimeout(() => { setIsMobile(window.innerWidth < 768); setIsTablet(window.innerWidth < 1100 && window.innerWidth >= 768); }, 150); };
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); clearTimeout(t); };
  }, []);

  /* single merged timer — fewer renders */
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      setMetrics({ cpu: Math.floor(18 + Math.random() * 25), ram: parseFloat((4.1 + Math.random() * 0.2).toFixed(1)), ping: Math.floor(8 + Math.random() * 14) });
      setSatDetails(p => ({ ...p, signal: Math.min(100, Math.max(80, p.signal + (Math.random() * 4 - 2))) }));
      if (++tick % 2 === 0) {
        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        setBlockedIPs(p => [ip, ...p.slice(0, 6)]);
      }
    }, 2500);
    return () => clearInterval(id);
  }, []);

  /* persist — write a ref of current full state so we can merge cheaply */
  const stateRef = useRef<any>({});
  useEffect(() => { stateRef.current = { nodes: normalizeLinks(links), links: normalizeLinks(links), logs, isLockdown, satID, threats, nodes }; });

  const persist = useCallback((patch: any) => {
    const next = { ...stateRef.current, ...patch };
    if (patch.links) next.links = normalizeLinks(patch.links);
    writeState(next);
  }, []);

  useEffect(() => { persist({ nodes }); }, [nodes, persist]);
  useEffect(() => { persist({ links }); }, [links, persist]);
  useEffect(() => { persist({ logs }); }, [logs, persist]);
  useEffect(() => { persist({ isLockdown }); }, [isLockdown, persist]);
  useEffect(() => { persist({ satID }); }, [satID, persist]);
  useEffect(() => { persist({ threats }); }, [threats, persist]);

  const handleNodeSelect = useCallback((node: Node | null) => setSelectedNode(node), []);

  /* helpers */
  const addLog = useCallback((msg: string, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(p => [{ msg, time, type }, ...p.slice(0, 15)]);
  }, []);

  const handleShare = useCallback(() => {
    const state = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    const url = `${window.location.origin}${window.location.pathname}#state=${btoa(JSON.stringify(state))}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg('✓ COPIED'); setTimeout(() => setShareMsg(''), 3000);
    }).catch(() => setShareMsg('FAILED'));
  }, []);

  const onCommand = useCallback((cmd: string) => {
    const c = cmd.toLowerCase();
    if (c === 'lockdown') { setIsLockdown(true); addLog('PROTOCOL_9_ENGAGED', 'error'); }
    else if (c === 'unlock') { setIsLockdown(false); addLog('PROTOCOL_9_STANDBY', 'success'); }
    else if (c === 'scan') { addLog('DEEP_MESH_PULSE_DETECTION_ACTIVE', 'info'); }
    else if (c === 'ping_sat') {
      const id = `L_EO_${Math.floor(Math.random() * 9 + 1)}`;
      addLog(`HANDSHAKE INIT: ${id}`, 'info'); setSatStatus('LINKING...');
      setTimeout(() => { setSatID(id); setSatStatus('CONNECTED'); setSatDetails({ orbit: `${(35000 + Math.random() * 1000).toLocaleString()} KM`, signal: 98, drift: '0.001°' }); addLog(`UPLINK SECURED: ${id}`, 'success'); }, 1500);
    }
    else if (c.startsWith('add ')) {
      const nt = (c.split(' ')[1] || 'endpoint') as any;
      const nid = `new-${Date.now()}`;
      const num = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const label = `${nt.toUpperCase()}_${num}`;
      const anchors = ['gw-01', 'srv-01', 'srv-02', 'db-01'];
      const tgt = anchors[Math.floor(Math.random() * anchors.length)];
      const vmap: Record<string, number> = { server: 16, database: 20, firewall: 22, endpoint: 8 };
      setNodes(p => [...p, { id: nid, type: nt, label, status: 'online', value: vmap[nt] ?? 8, traffic: 0, sector: `SEC-${num}` }]);
      setLinks(p => [...normalizeLinks(p), { source: nid, target: tgt }]);
      addLog(`PROVISIONED: ${label} → ${tgt.toUpperCase()}`, 'success');
    }
    else if (c.startsWith('kill ')) {
      const t = c.split(' ')[1].toUpperCase();
      setNodes(p => p.map(n => n.label === t ? { ...n, status: 'critical' } : n));
      addLog(`TERMINATE: ${t} CRITICAL`, 'error');
    }
    else if (c.startsWith('heal ')) {
      const t = c.split(' ')[1].toUpperCase();
      setNodes(p => p.map(n => n.label === t ? { ...n, status: 'online' } : n));
      addLog(`RECOVERY: ${t} STABILIZED`, 'success');
    }
    else if (c === 'inject_threat' || c.startsWith('inject ')) {
      const types = ['DDOS', 'SQLI', 'XSS', 'MITM', 'RCE', 'BRUTE'];
      const titles = ['Neural Breach', 'Packet Storm', 'Zero-Day Exploit', 'Port Scan', 'Buffer Overflow', 'Auth Hijack'];
      const colors = ['#ff2d55', '#ffb800', '#ff6b35', '#c084fc'];
      setNodes(prev => {
        const nt: Threat = { id: `th-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour12: false }), type: types[Math.floor(Math.random() * types.length)], title: titles[Math.floor(Math.random() * titles.length)], color: colors[Math.floor(Math.random() * colors.length)], sector: prev[Math.floor(Math.random() * prev.length)]?.label ?? 'UNKNOWN', resolved: false };
        setThreats(tp => [nt, ...tp.slice(0, 7)]);
        addLog(`THREAT: ${nt.type} @ ${nt.sector}`, 'error');
        return prev; // don't mutate nodes, just read them
      });
    }
    else if (c === 'shutdown') { addLog('SYSTEM_TERMINATING...', 'error'); setTimeout(() => window.location.reload(), 2000); }
    else if (c === 'reset') { localStorage.removeItem(SAVE_KEY); window.location.hash = ''; setTimeout(() => window.location.reload(), 1000); }
    else if (c === 'share') { handleShare(); addLog('SHARE_LINK_GENERATED', 'success'); }
  }, [addLog, handleShare]);

  const stability = Math.max(0, 100 - nodes.filter(n => n.status === 'critical').length * 15);
  const accent = isLockdown ? '#ff2d55' : '#00d1ff';

  /* ─── RENDER — all JSX inlined, no sub-components defined inside App ─── */
  return (
    <div style={{ backgroundColor: isLockdown ? '#0f0505' : '#050507', color: 'white', height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '14px 22px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', transition: 'background 0.8s ease', overflow: 'hidden', fontSize: '13px' }}>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', background: `${accent}10`, border: `1px solid ${accent}30`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck color={accent} size={18} />
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.3em', opacity: 0.3, color: accent }}>J-CYBERSTREAM</div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '13px' : '15px', fontWeight: 900 }}>COMMAND CENTER</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isMobile && <>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '7px', opacity: 0.3 }}>STABILITY</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold', color: stability < 50 ? '#ff2d55' : '#00ffa3' }}>{stability}%</div>
            </div>
            <HUDMetric icon={<Wifi size={12} />} label="LATENCY" value={`${metrics.ping}ms`} />
            <HUDMetric icon={<Target size={12} />} label="SWEEP" value="ACTIVE" color="#00ffa3" />
          </>}
          <button onClick={handleShare} style={{ background: `rgba(0,209,255,0.08)`, border: `1px solid rgba(0,209,255,0.2)`, color: accent, padding: '5px 10px', borderRadius: '8px', fontSize: '8px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Share2 size={10} />{shareMsg || 'SHARE'}
          </button>
          <div style={{ padding: '6px 12px', background: `${isLockdown ? '#ff2d55' : '#10b981'}10`, border: `1px solid ${isLockdown ? '#ff2d55' : '#10b981'}30`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '5px', height: '5px', background: isLockdown ? '#ff2d55' : '#10b981', borderRadius: '50%' }} />
            <span style={{ fontSize: '8px', fontWeight: 900, color: isLockdown ? '#ff2d55' : '#10b981' }}>{isLockdown ? 'LOCKDOWN' : 'SECURE'}</span>
          </div>
          {!isMobile && <Bell size={16} style={{ opacity: 0.3 }} />}
        </div>
      </header>

      {isMobile ? (
        /* ─── MOBILE ─── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          {/* satellite strip */}
          <div onClick={() => onCommand('ping_sat')} style={{ background: '#0a0a0f', border: `1px solid ${accent}20`, borderRadius: '16px', padding: '12px', display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', background: `conic-gradient(from 0deg, ${accent}20, transparent)`, borderRadius: '50%', animation: 'spin 4s linear infinite' }} />
              <Globe size={20} color={accent} style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <div>
              <div style={{ fontSize: '7px', color: accent, fontWeight: 900 }}>GEO_UPLINK</div>
              <div style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'monospace' }}>{satID}</div>
              <div style={{ fontSize: '8px', opacity: 0.4 }}>SIG: {Math.floor(satDetails.signal)}% · {satDetails.orbit}</div>
            </div>
          </div>
          {/* panel area */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activePanel === 'graph' && (
              <div style={{ height: '100%', background: '#0a0a0f', border: `1px solid ${isLockdown ? '#ff2d5530' : 'rgba(255,255,255,0.05)'}`, borderRadius: '20px', position: 'relative', overflow: 'hidden' }}>
                <NetworkGraph nodes={nodes} links={links} isLockdown={isLockdown} onNodeSelect={handleNodeSelect} />
                {selectedNode && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(5,5,7,0.95)', border: `1px solid ${accent}40`, padding: '12px', borderRadius: '12px', width: '160px', backdropFilter: 'blur(10px)', zIndex: 100 }}>
                    <div style={{ fontSize: '8px', color: accent, fontWeight: 900, marginBottom: '8px' }}>NODE_INSPECTOR</div>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedNode.label}</div>
                    <div style={{ fontSize: '9px', color: selectedNode.status === 'critical' ? '#ff2d55' : '#00ffa3' }}>{selectedNode.status.toUpperCase()}</div>
                    <button onClick={() => onCommand(`kill ${selectedNode.label}`)} style={{ marginTop: '8px', width: '100%', background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', color: '#ff2d55', padding: '4px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>TERMINATE</button>
                  </div>
                )}
              </div>
            )}
            {activePanel === 'log' && (
              <div style={{ height: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', opacity: 0.6 }}><Layers size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900 }}>NEURAL_SYS_LOG</span></div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {logs.map((l, i) => <div key={i} style={{ fontSize: '9px', fontFamily: 'monospace', display: 'flex', gap: '8px', opacity: 1 - (i * 0.06) }}><span style={{ opacity: 0.2, whiteSpace: 'nowrap' }}>[{l.time}]</span><span style={{ color: l.type === 'error' ? '#ff2d55' : l.type === 'success' ? '#10b981' : '#888', wordBreak: 'break-all' }}>{l.msg}</span></div>)}
                </div>
              </div>
            )}
            {activePanel === 'terminal' && (
              <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '12px 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Terminal size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900, opacity: 0.6 }}>COMMAND_UPLINK</span></div>
                <SentinelTerminal onCommand={onCommand} />
              </div>
            )}
            {activePanel === 'threats' && (
              <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '14px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}><AlertTriangle size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900 }}>THREAT_MANIFEST</span></div>
                  <button onClick={() => onCommand('inject_threat')} style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', color: '#ff2d55', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>+ INJECT</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {threats.map(t => <ThreatCard key={t.id} threat={t} onAcknowledge={() => { setThreats(p => p.map(x => x.id === t.id ? { ...x, resolved: true } : x)); addLog(`ACK: ${t.type}`, 'success'); }} onDismiss={() => { setThreats(p => p.filter(x => x.id !== t.id)); addLog(`DISMISSED: ${t.type}`, 'info'); }} />)}
                </div>
              </div>
            )}
          </div>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {([['graph', 'MESH', <Crosshair size={13} />], ['log', 'LOG', <Layers size={13} />], ['terminal', 'CMD', <Terminal size={13} />], ['threats', 'THREATS', <AlertTriangle size={13} />]] as any[]).map(([id, lbl, ico]) => (
              <button key={id} onClick={() => setActivePanel(id)} style={{ flex: 1, background: activePanel === id ? `${accent}15` : 'rgba(255,255,255,0.02)', border: `1px solid ${activePanel === id ? `${accent}40` : 'rgba(255,255,255,0.05)'}`, color: activePanel === id ? accent : 'rgba(255,255,255,0.3)', padding: '7px', borderRadius: '10px', fontSize: '7px', cursor: 'pointer', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>{ico}{lbl}</button>
            ))}
          </div>
        </div>
      ) : isTablet ? (
        /* ─── TABLET ─── */
        <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr auto', gap: '12px', overflow: 'hidden' }}>
          {/* satellite full-width */}
          <div style={{ gridColumn: '1/-1' }}>
            <div onClick={() => onCommand('ping_sat')} style={{ background: '#0a0a0f', border: `1px solid ${accent}20`, borderRadius: '18px', padding: '16px', display: 'flex', gap: '20px', cursor: 'pointer', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', width: '100%', height: '100%', background: `conic-gradient(from 0deg, ${accent}20, transparent)`, borderRadius: '50%', animation: 'spin 4s linear infinite' }} />
                <Globe size={26} color={accent} style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '8px', color: accent, fontWeight: 900, letterSpacing: '0.15em' }}>GEO_UPLINK · {satStatus}</div>
                <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace' }}>{satID}</div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                  {[{ l: 'ORBIT', v: satDetails.orbit }, { l: 'SIGNAL', v: `${Math.floor(satDetails.signal)}%` }, { l: 'DRIFT', v: satDetails.drift }].map(d => (
                    <div key={d.l}><div style={{ fontSize: '7px', opacity: 0.3 }}>{d.l}</div><div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{d.v}</div></div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', opacity: 0.2 }}><Navigation size={12} /><Radio size={12} /></div>
            </div>
          </div>
          {/* graph */}
          <div style={{ background: '#0a0a0f', border: `1px solid ${isLockdown ? '#ff2d5530' : 'rgba(255,255,255,0.05)'}`, borderRadius: '22px', position: 'relative', overflow: 'hidden' }}>
            <NetworkGraph nodes={nodes} links={links} isLockdown={isLockdown} onNodeSelect={handleNodeSelect} />
            {selectedNode && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(5,5,7,0.95)', border: `1px solid ${accent}40`, padding: '14px', borderRadius: '14px', width: '180px', backdropFilter: 'blur(10px)', zIndex: 100 }}>
                <div style={{ fontSize: '9px', color: accent, fontWeight: 900, marginBottom: '8px' }}>NODE_INSPECTOR</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedNode.label}</div>
                <div style={{ fontSize: '10px', color: selectedNode.status === 'critical' ? '#ff2d55' : '#00ffa3' }}>{selectedNode.status.toUpperCase()}</div>
                <button onClick={() => onCommand(`kill ${selectedNode.label}`)} style={{ marginTop: '10px', width: '100%', background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', color: '#ff2d55', padding: '5px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>TERMINATE NODE</button>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '14px', left: '14px', display: 'flex', gap: '8px' }}>
              <HUDLabel label="NEURAL_CORRIDOR_7" accent={accent} /><HUDLabel label="SDR_ACTIVE" active accent={accent} />
            </div>
          </div>
          {/* right side panels */}
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', opacity: 0.6 }}><Layers size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900 }}>NEURAL_SYS_LOG</span></div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {logs.map((l, i) => <div key={i} style={{ fontSize: '9px', fontFamily: 'monospace', display: 'flex', gap: '8px', opacity: 1 - (i * 0.06) }}><span style={{ opacity: 0.2, whiteSpace: 'nowrap' }}>[{l.time}]</span><span style={{ color: l.type === 'error' ? '#ff2d55' : l.type === 'success' ? '#10b981' : '#888' }}>{l.msg}</span></div>)}
              </div>
            </div>
            <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}><AlertTriangle size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900 }}>THREAT_MANIFEST</span></div>
                <button onClick={() => onCommand('inject_threat')} style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', color: '#ff2d55', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>+ INJECT</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {threats.map(t => <ThreatCard key={t.id} threat={t} onAcknowledge={() => { setThreats(p => p.map(x => x.id === t.id ? { ...x, resolved: true } : x)); addLog(`ACK: ${t.type}`, 'success'); }} onDismiss={() => { setThreats(p => p.filter(x => x.id !== t.id)); addLog(`DISMISSED: ${t.type}`, 'info'); }} />)}
              </div>
            </div>
          </div>
          {/* bottom metrics + terminal spanning 2 cols */}
          <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Terminal size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900, opacity: 0.6 }}>COMMAND_UPLINK</span></div>
            <SentinelTerminal onCommand={onCommand} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            <MetricCard label="CPU" value={metrics.cpu} unit="%" color={accent} icon={<Cpu size={10} />} progress={metrics.cpu * 2} />
            <MetricCard label="RAM" value={metrics.ram} unit="GB" color="#00ffa3" icon={<Database size={10} />} progress={65} />
            <MetricCard label="NODES" value={nodes.length} unit="" color={accent} icon={<Crosshair size={10} />} progress={Math.min(100, nodes.length * 4)} />
            <MetricCard label="STABILITY" value={stability} unit="%" color={stability < 50 ? '#ff2d55' : '#ffb800'} icon={<Activity size={10} />} progress={stability} />
          </div>
        </main>
      ) : (
        /* ─── DESKTOP ─── */
        <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '270px 1fr 270px', gap: '14px', overflow: 'hidden' }}>
          {/* LEFT */}
          <div style={{ display: 'grid', gridTemplateRows: '1.2fr 1fr', gap: '14px', overflow: 'hidden' }}>
            <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', opacity: 0.6 }}><Layers size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900 }}>NEURAL_SYS_LOG</span></div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {logs.map((l, i) => <div key={i} style={{ fontSize: '9px', fontFamily: 'monospace', display: 'flex', gap: '8px', opacity: 1 - (i * 0.06) }}><span style={{ opacity: 0.2, whiteSpace: 'nowrap' }}>[{l.time}]</span><span style={{ color: l.type === 'error' ? '#ff2d55' : l.type === 'success' ? '#10b981' : '#888', wordBreak: 'break-all' }}>{l.msg}</span></div>)}
              </div>
            </div>
            <div style={{ background: 'rgba(255,45,85,0.01)', border: '1px solid rgba(255,45,85,0.05)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><AlertTriangle size={12} color="#ff2d55" /><span style={{ fontSize: '9px', fontWeight: 900, color: '#ff2d55' }}>FIREWALL_INGRESS</span></div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {blockedIPs.map((ip, i) => <div key={i} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,45,85,0.1)', borderRadius: '6px', marginBottom: '5px', fontSize: '9px', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}><span style={{ opacity: 0.4 }}>BLOCKED:</span><span style={{ color: '#ff2d55' }}>{ip}</span></div>)}
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
            {/* Satellite HUD */}
            <div onClick={() => onCommand('ping_sat')} style={{ background: '#0a0a0f', border: `1px solid ${accent}20`, borderRadius: '20px', padding: '18px', display: 'flex', gap: '22px', cursor: 'pointer', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', width: '100%', height: '100%', border: `1px solid ${accent}10`, borderRadius: '50%' }} />
                <div style={{ position: 'absolute', width: '100%', height: '100%', background: `conic-gradient(from 0deg, ${accent}20, transparent)`, borderRadius: '50%', animation: satStatus === 'CONNECTED' ? 'spin 4s linear infinite' : 'spin 0.8s linear infinite' }} />
                <Globe size={28} color={accent} style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '8px', color: accent, fontWeight: 900, letterSpacing: '0.2em', marginBottom: '2px' }}>GEO_UPLINK · {satStatus}</div>
                <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace' }}>{satID}</div>
                <div style={{ display: 'flex', gap: '18px', marginTop: '8px' }}>
                  {[{ l: 'ORBITAL_ALT', v: satDetails.orbit }, { l: 'SIGNAL', v: `${Math.floor(satDetails.signal)}%` }, { l: 'DRIFT', v: satDetails.drift }].map(d => (
                    <div key={d.l}><div style={{ fontSize: '7px', opacity: 0.3 }}>{d.l}</div><div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>{d.v}</div></div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', opacity: 0.2 }}><Navigation size={12} /><Radio size={12} /></div>
            </div>

            {/* Graph */}
            <div style={{ flex: 1, background: '#0a0a0f', border: `1px solid ${isLockdown ? '#ff2d5530' : 'rgba(255,255,255,0.05)'}`, borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              <NetworkGraph nodes={nodes} links={links} isLockdown={isLockdown} onNodeSelect={handleNodeSelect} />
              {selectedNode && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(5,5,7,0.95)', border: `1px solid ${accent}40`, padding: '14px', borderRadius: '14px', width: '180px', backdropFilter: 'blur(10px)', animation: 'slideIn 0.3s', zIndex: 100 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: accent }}>NODE_INSPECTOR</div>
                    {selectedNode.status === 'critical' ? <Skull size={12} color="#ff2d55" /> : <Server size={12} color={accent} />}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div><div style={{ fontSize: '7px', opacity: 0.3 }}>UID</div><div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', wordBreak: 'break-all' }}>{selectedNode.label}</div></div>
                    <div><div style={{ fontSize: '7px', opacity: 0.3 }}>STATUS</div><div style={{ fontSize: '10px', color: selectedNode.status === 'critical' ? '#ff2d55' : '#00ffa3' }}>{selectedNode.status.toUpperCase()}</div></div>
                  </div>
                  <button onClick={() => onCommand(`kill ${selectedNode.label}`)} style={{ width: '100%', background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', color: '#ff2d55', padding: '5px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>TERMINATE NODE</button>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '8px' }}>
                <HUDLabel label="NEURAL_CORRIDOR_7" accent={accent} /><HUDLabel label="SDR_ACTIVE" active accent={accent} />
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', flexShrink: 0 }}>
              <MetricCard label="CPU_CORE" value={metrics.cpu} unit="%" color={accent} icon={<Cpu size={11} />} progress={metrics.cpu * 2} />
              <MetricCard label="MEM_ADDR" value={metrics.ram} unit="GB" color={isLockdown ? '#ff2d55' : '#00ffa3'} icon={<Database size={11} />} progress={65} />
              <MetricCard label="MESH_NODES" value={nodes.length} unit="" color={accent} icon={<Crosshair size={11} />} progress={Math.min(100, nodes.length * 4)} />
              <MetricCard label="STABILITY" value={stability} unit="%" color={stability < 50 ? '#ff2d55' : '#ffb800'} icon={<Activity size={11} />} progress={stability} />
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: 'grid', gridTemplateRows: '1.2fr 1fr', gap: '14px', overflow: 'hidden' }}>
            <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Terminal size={11} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900, opacity: 0.6 }}>COMMAND_UPLINK</span></div>
              <SentinelTerminal onCommand={onCommand} />
            </div>
            <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}><AlertTriangle size={12} color={accent} /><span style={{ fontSize: '9px', fontWeight: 900 }}>THREAT_MANIFEST</span></div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', color: '#ff2d55', opacity: 0.6 }}>{threats.filter(t => !t.resolved).length} ACTIVE</span>
                  <button onClick={() => onCommand('inject_threat')} style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', color: '#ff2d55', padding: '2px 7px', borderRadius: '4px', fontSize: '8px', cursor: 'pointer', fontWeight: 900 }}>+ INJECT</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {threats.length === 0 && <div style={{ fontSize: '10px', opacity: 0.3, textAlign: 'center', marginTop: '16px' }}>ALL CLEAR</div>}
                {threats.map(t => <ThreatCard key={t.id} threat={t} onAcknowledge={() => { setThreats(p => p.map(x => x.id === t.id ? { ...x, resolved: true } : x)); addLog(`ACK: ${t.type}`, 'success'); }} onDismiss={() => { setThreats(p => p.filter(x => x.id !== t.id)); addLog(`DISMISSED: ${t.type}`, 'info'); }} />)}
              </div>
            </div>
          </div>
        </main>
      )}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width:3px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
};

export default App;
