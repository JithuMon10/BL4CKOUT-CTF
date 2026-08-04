'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

interface RuntimeStatusBadgeProps {
  showLabel?: boolean;
  className?: string;
}

export default function RuntimeStatusBadge({ showLabel = true, className = '' }: RuntimeStatusBadgeProps) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch('/api/runtime/health', { cache: 'no-store' });
        if (!isMounted) return;
        if (res.status === 503 || !res.ok) {
          setOnline(false);
        } else {
          const data = await res.json().catch(() => ({}));
          setOnline(Boolean(data.online));
        }
      } catch {
        if (isMounted) setOnline(false);
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (online === null) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400 ${className}`}>
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        {showLabel && <span>Checking Runtime...</span>}
      </span>
    );
  }

  if (online) {
    return (
      <span
        title="Runtime service is online and ready to spawn containers"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-medium text-emerald-400 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        {showLabel && <span className="font-semibold">🟢 Runtime Online</span>}
      </span>
    );
  }

  return (
    <span
      title="Runtime server is currently offline. Please try again later."
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] font-medium text-rose-400 ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-rose-500" />
      {showLabel && <span className="font-semibold">🔴 Runtime Offline</span>}
    </span>
  );
}
