'use client';

import RuntimeStatusBadge from '@/components/RuntimeStatusBadge';
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Play, RefreshCw, Square, Copy, Check, Terminal, ExternalLink, Clock, AlertTriangle, Monitor } from 'lucide-react';

const WebTerminal = lazy(() => import('@/components/WebTerminal'));

export interface InstanceData {
  instanceId: string;
  challengeId: string;
  userId: string;
  status: 'pending' | 'running' | 'terminating' | 'terminated' | 'failed';
  host: string;
  port: number;
  protocol: 'nc' | 'http' | 'tcp';
  connectionCommand: string;
  webUrl?: string;
  terminalUrl?: string;
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
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    initialInstance?.timeRemainingSeconds || 0
  );

  const fetchInstanceStatus = useCallback(() => {
    if (!challengeId) return;

    fetch('/api/runtime/status')
      .then((res) => {
        if (res.status === 503) {
          setIsOffline(true);
          setErrorMsg('Runtime server is currently offline. Please try again later.');
          return null;
        }
        setIsOffline(false);
        return res.json();
      })
      .then((data) => {
        if (!data || !data.success || !Array.isArray(data.data)) return;
        const active = data.data.find(
          (inst: InstanceData) => inst.challengeId === challengeId && inst.status === 'running'
        );
        if (active) {
          setInstance(active);
          setRemainingSeconds(active.timeRemainingSeconds);
          setErrorMsg(null);
        } else {
          setInstance(null);
          setRemainingSeconds(0);
        }
      })
      .catch(() => {
        setIsOffline(true);
        setErrorMsg('Runtime server is currently offline. Please try again later.');
      });
  }, [challengeId]);

  // Initial fetch on mount & subscribe to global status updates
  useEffect(() => {
    fetchInstanceStatus();

    const handleGlobalUpdate = () => {
      fetchInstanceStatus();
    };

    window.addEventListener('runtime-instance-updated', handleGlobalUpdate);
    return () => window.removeEventListener('runtime-instance-updated', handleGlobalUpdate);
  }, [challengeId, fetchInstanceStatus]);

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
      window.dispatchEvent(new CustomEvent('runtime-instance-updated'));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start instance. Check Docker runtime microservice.');
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
      window.dispatchEvent(new CustomEvent('runtime-instance-updated'));
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
      window.dispatchEvent(new CustomEvent('runtime-instance-updated'));
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
    <div className="bg-[#0b0c10]/80 border border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur-md text-zinc-100 w-full transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-zinc-100 tracking-tight">Interactive Instance</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RuntimeStatusBadge showLabel={false} />
          {loading ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin mr-1.5" />
              Starting...
            </span>
          ) : isRunning ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              Running ({instance.port})
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mr-1.5" />
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Error / Offline Alert */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Runtime Status</span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Main Body */}
      {!isRunning ? (
        <div className="text-center py-4 px-2">
          <p className="text-zinc-400 text-xs sm:text-sm mb-4 font-normal">
            Start a live instance to interact with this challenge.
          </p>
          <button
            onClick={handleSpawn}
            disabled={loading || isOffline}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md shadow-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-zinc-950" />}
            {loading ? 'Starting Instance...' : 'Start Instance'}
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block font-mono">
                Connection Endpoint
              </label>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">Port {instance.port}</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800/90 rounded-lg p-2.5 font-mono text-xs sm:text-sm shadow-inner">
              <span className="text-emerald-400 font-mono flex-1 truncate select-all">{instance.connectionCommand}</span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Connection Command"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {instance.webUrl && (
                <a
                  href={instance.webUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-colors"
                  title="Open Web Target"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/70">
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Expires:</span>
              <span className="font-semibold text-emerald-400">{formatTime(remainingSeconds)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRenew}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Extend (+30m)
              </button>
              <button
                onClick={handleTerminate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-rose-400" />
                Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
