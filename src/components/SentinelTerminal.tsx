import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
    text: string;
    type: 'cmd' | 'info' | 'error' | 'success';
    time: string;
}

interface SentinelTerminalProps {
    onCommand: (cmd: string) => void;
}

const SentinelTerminal: React.FC<SentinelTerminalProps> = ({ onCommand }) => {
    const [history, setHistory] = useState<LogEntry[]>([
        { text: 'J-CYBERSTREAM COMMAND KERNEL v4.2.0 INITIALIZED', type: 'success', time: '00:00:01' },
        { text: 'NEURAL LINK: ESTABLISHED — TYPE "HELP" FOR COMMANDS', type: 'info', time: '00:00:02' },
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const rawCmd = input.trim();
        const newEntry: LogEntry = { text: `> ${rawCmd}`, type: 'cmd', time };

        setHistory(prev => [...prev, newEntry]);

        // Process Command
        const cmd = rawCmd.toLowerCase();
        onCommand(cmd); // Send to App.tsx

        setTimeout(() => {
            processResponse(cmd, time);
        }, 100);

        setInput('');
    };

    const processResponse = (cmd: string, time: string) => {
        let responses: LogEntry[] = [];
        const r = (text: string, type: LogEntry['type'] = 'info') => responses.push({ text, type, time });

        if (cmd === 'help') {
            r('─── J-CYBERSTREAM COMMAND REFERENCE ───', 'success');
            r('LOCKDOWN       — Isolate all mesh nodes (emergency protocol)');
            r('UNLOCK         — Restore mesh after lockdown');
            r('SCAN           — Run deep mesh pulse scan for anomalies');
            r('STATUS         — Report system health and link stability');
            r('PING_SAT       — Rotate GEO uplink to a new satellite');
            r('ADD [type]     — Provision node: server | database | firewall | endpoint');
            r('KILL [label]   — Mark a node as critical (e.g. KILL WORKER_ALPHA)');
            r('HEAL [label]   — Restore a critical node (e.g. HEAL WORKER_ALPHA)');
            r('INJECT_THREAT  — Simulate a new inbound threat in the manifest');
            r('SHARE          — Copy a shareable URL with full dashboard state');
            r('RESET          — Wipe saved state and reload factory defaults');
            r('SHUTDOWN       — Terminate and reload the kernel');
            r('CLEAR          — Clear this terminal output');
        } else if (cmd === 'clear') {
            setHistory([]);
            return;
        } else if (cmd === 'lockdown') {
            r('PROTOCOL 9 ACTIVE: ALL NODES ISOLATED.', 'error');
        } else if (cmd === 'unlock') {
            r('PROTOCOL 9 DEACTIVATED: RESTORING MESH.', 'success');
        } else if (cmd === 'status') {
            r('SYSTEM: OPTIMAL | NODES: ACTIVE | LINK: STABLE', 'success');
        } else if (cmd === 'scan') {
            r('MESH SCAN INITIATED... NO ANOMALIES DETECTED.', 'success');
        } else if (cmd.startsWith('add ')) {
            r(`SYNCHRONIZING NEW ${cmd.split(' ')[1]?.toUpperCase() ?? 'NODE'}...`, 'success');
        } else if (cmd.startsWith('kill ')) {
            r(`DESTRUCT COMMAND SENT → ${cmd.split(' ')[1]?.toUpperCase()}`, 'error');
        } else if (cmd.startsWith('heal ')) {
            r(`RECOVERY PACKET SENT → ${cmd.split(' ')[1]?.toUpperCase()}`, 'success');
        } else if (cmd === 'inject_threat' || cmd.startsWith('inject ')) {
            r('THREAT VECTOR INJECTED INTO MANIFEST.', 'error');
        } else if (cmd === 'shutdown') {
            r('TERMINATING J-CYBERSTREAM KERNEL... REBOOT INITIATED.', 'error');
        } else if (cmd === 'ping_sat') {
            r('UPLINK ROTATION INITIALIZED. ESTABLISHING HANDSHAKE...', 'info');
        } else if (cmd === 'reset') {
            r('CACHE_WIPE INITIATED. FACTORY_DEFAULTS_ON_RELOAD.', 'error');
        } else if (cmd === 'share') {
            r('SHARE LINK GENERATED. COPIED TO CLIPBOARD.', 'success');
        } else {
            r(`EXECUTION ERROR: "${cmd.split(' ')[0]}" NOT RECOGNIZED. TYPE HELP.`, 'error');
        }

        setHistory(prev => [...prev, ...responses]);
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            padding: '24px',
            fontFamily: 'monospace',
            fontSize: '11px',
            overflow: 'hidden',
            border: '1px solid rgba(0,209,255,0.05)'
        }}>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', scrollBehavior: 'smooth' }}>
                {history.map((entry, i) => (
                    <div key={i} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                        <span style={{ opacity: 0.2 }}>[{entry.time}]</span>
                        <span style={{
                            color: entry.type === 'cmd' ? '#00d1ff' :
                                entry.type === 'error' ? '#ff2d55' :
                                    entry.type === 'success' ? '#10b981' : '#888'
                        }}>
                            {entry.text}
                        </span>
                    </div>
                ))}
            </div>

            <form onSubmit={handleCommand} style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <span style={{ color: '#00d1ff', fontWeight: 'bold' }}>&gt;</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                    placeholder="ENTER COMMAND..."
                    style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        flex: 1
                    }}
                />
                <div style={{ width: '8px', height: '14px', backgroundColor: '#00d1ff', animation: 'blink 1s step-end infinite' }}></div>
            </form>
        </div>
    );
};

export default SentinelTerminal;
