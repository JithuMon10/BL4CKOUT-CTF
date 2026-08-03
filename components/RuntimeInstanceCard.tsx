'use client';

import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Square, Copy, Check, Terminal, ExternalLink, Clock } from 'lucide-react';

export interface InstanceData {
  instanceId: string;
  challengeId: string;
  userId: string;
  status: 'pending' | 'running' | 'terminating' | 'terminated' | 'failed';
  host: string;
  port: number;
  protocol: 'nc' | 'http' | 'tcp';
  connectionCommand: string;
  createdAt: string;
  expiresAt: string;
  timeRemainingSeconds: number;
}

interface RuntimeInstanceCardProps {
  challengeId: string;
  initialInstance?: InstanceData | null;
}

export function RuntimeInstanceCard({ challengeId, initialInstance }: RuntimeInstanceCardProps) {
  const [instance, setInstance] = useState<InstanceData | null>(initialInstance || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    initialInstance?.timeRemainingSeconds || 0
  );

  // Auto-fetch existing active instance for this user & challenge on mount
  useEffect(() => {
    if (initialInstance || !challengeId) return;

    let isMounted = true;
    fetch('/api/runtime/status')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data.success || !Array.isArray(data.data)) return;
        const active = data.data.find((inst: InstanceData) => inst.challengeId === challengeId && inst.status === 'running');
        if (active) {
          setInstance(active);
          setRemainingSeconds(active.timeRemainingSeconds);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [challengeId, initialInstance]);

  // Sync remaining seconds countdown ticker
  useEffect(() => {
    if (!instance || instance.status !== 'running' || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setInstance(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [instance, remainingSeconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpawn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/runtime/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to spawn instance.');
      }
      setInstance(data.data);
      setRemainingSeconds(data.data.timeRemainingSeconds);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start instance.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!instance) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/runtime/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: instance.instanceId, additionalMins: 30 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to extend instance lifetime.');
      }
      setInstance(data.data);
      setRemainingSeconds(data.data.timeRemainingSeconds);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to extend instance.');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!instance) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/runtime/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: instance.instanceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to terminate instance.');
      }
      setInstance(null);
      setRemainingSeconds(0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to stop instance.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!instance) return;
    navigator.clipboard.writeText(instance.connectionCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = instance && instance.status === 'running' && remainingSeconds > 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md text-slate-100 max-w-xl w-full">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-lg text-slate-100 tracking-wide">Interactive Instance</h3>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              🟢 Running
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span className="w-2 h-2 rounded-full bg-rose-400 mr-1.5" />
              🔴 Expired / Off
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {!isRunning ? (
        <div className="text-center py-6">
          <p className="text-slate-400 text-sm mb-4">
            Launch a dedicated dynamic Docker container to solve this challenge interactively.
          </p>
          <button
            onClick={handleSpawn}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            Start Instance
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Connection Command
            </label>
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 font-mono text-sm">
              <span className="text-cyan-300 flex-1 truncate select-all">{instance.connectionCommand}</span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy Command"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              {instance.protocol === 'http' && (
                <a
                  href={instance.connectionCommand}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Open Link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Expires in:</span>
              <span className="font-semibold text-cyan-400">{formatTime(remainingSeconds)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRenew}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Renew (+30m)
              </button>
              <button
                onClick={handleTerminate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-medium border border-rose-900/80 transition-colors disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-rose-300" />
                Terminate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
