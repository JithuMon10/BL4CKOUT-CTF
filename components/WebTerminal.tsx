'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Terminal as TerminalIcon, Maximize2, Minimize2, X } from 'lucide-react';

interface WebTerminalProps {
  terminalUrl: string;
  instanceId: string;
  onClose?: () => void;
}

/**
 * Web-based terminal for nc/TCP challenge instances.
 * Connects via WebSocket to the Fastify proxy, which bridges to the Docker container's TCP port.
 */
export default function WebTerminal({ terminalUrl, instanceId, onClose }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || !terminalUrl) return;

    let terminal: any;
    let ws: WebSocket;
    let destroyed = false;

    const initTerminal = async () => {
      // Dynamically import xterm (client-side only)
      const { Terminal } = await import('@xterm/xterm');
      await import('@xterm/xterm/css/xterm.css');

      if (destroyed) return;

      terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        theme: {
          background: '#0a0a0f',
          foreground: '#e4e4e7',
          cursor: '#10b981',
          cursorAccent: '#0a0a0f',
          selectionBackground: 'rgba(16, 185, 129, 0.3)',
          black: '#18181b',
          red: '#ef4444',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e4e4e7',
          brightBlack: '#52525b',
          brightRed: '#f87171',
          brightGreen: '#34d399',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#fafafa',
        },
        rows: expanded ? 30 : 16,
        cols: 80,
        scrollback: 1000,
        convertEol: true,
      });

      terminalInstanceRef.current = terminal;

      if (terminalRef.current) {
        terminal.open(terminalRef.current);
      }

      terminal.writeln('\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m');
      terminal.writeln('\x1b[36m║\x1b[0m  \x1b[1;32mBL4CKOUT CTF\x1b[0m — Interactive Terminal             \x1b[36m║\x1b[0m');
      terminal.writeln('\x1b[36m║\x1b[0m  Connecting to challenge instance...             \x1b[36m║\x1b[0m');
      terminal.writeln('\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m');
      terminal.writeln('');

      // Connect WebSocket
      try {
        ws = new WebSocket(terminalUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
          if (destroyed) return;
          setConnected(true);
          setError(null);
          terminal.writeln('\x1b[32m● Connected to challenge instance\x1b[0m');
          terminal.writeln('');
          terminal.focus();
        };

        ws.onmessage = (event) => {
          if (destroyed) return;
          if (event.data instanceof ArrayBuffer) {
            terminal.write(new Uint8Array(event.data));
          } else {
            terminal.write(event.data);
          }
        };

        ws.onclose = (event) => {
          if (destroyed) return;
          setConnected(false);
          terminal.writeln('');
          terminal.writeln('\x1b[33m● Connection closed\x1b[0m');
        };

        ws.onerror = () => {
          if (destroyed) return;
          setConnected(false);
          setError('Failed to connect to challenge instance.');
          terminal.writeln('\x1b[31m● Connection error\x1b[0m');
        };

        // Terminal → WebSocket (player input)
        terminal.onData((data: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(new TextEncoder().encode(data));
          }
        });
      } catch (err: any) {
        setError(err.message || 'Failed to establish WebSocket connection');
      }
    };

    initTerminal();

    return () => {
      destroyed = true;
      if (ws!) {
        ws.close();
      }
      if (terminal) {
        terminal.dispose();
      }
    };
  }, [terminalUrl]);

  // Resize terminal when expanded state changes
  useEffect(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.resize(80, expanded ? 30 : 16);
    }
  }, [expanded]);

  return (
    <div className={`bg-[#0a0a0f] border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${expanded ? 'fixed inset-4 z-50' : 'w-full'}`}>
      {/* Terminal Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 border-b border-zinc-800/70">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="w-3 h-3 rounded-full bg-amber-500 opacity-50" />
            <span className="w-3 h-3 rounded-full bg-zinc-600" />
          </div>
          <span className="text-xs font-mono text-zinc-400 ml-2">
            {connected ? (
              <span className="text-emerald-400">● connected</span>
            ) : error ? (
              <span className="text-rose-400">● disconnected</span>
            ) : (
              <span className="text-amber-400 animate-pulse">● connecting...</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-500 mr-2">
            {instanceId.slice(0, 20)}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title={expanded ? 'Minimize' : 'Maximize'}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Close Terminal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/60 -z-10"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Terminal Container */}
      <div
        ref={terminalRef}
        className="p-2"
        style={{ minHeight: expanded ? 'calc(100% - 40px)' : '320px' }}
      />

      {error && (
        <div className="px-3 py-2 bg-rose-500/10 border-t border-rose-500/20 text-xs text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
}
