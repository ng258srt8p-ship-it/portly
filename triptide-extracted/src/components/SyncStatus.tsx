import { useEffect, useState } from "react";

interface SyncStatusProps {
  loading: boolean;
  lastSyncedAt: number | null;
  onRefresh: () => void;
  onSyncComplete?: () => void;
}

export default function SyncStatus({ loading, lastSyncedAt, onRefresh, onSyncComplete }: SyncStatusProps) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => forceTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsAgo = lastSyncedAt ? Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000)) : null;
  const label = loading
    ? "Syncing live fares…"
    : secondsAgo === null
      ? "Connecting…"
      : secondsAgo < 2
        ? "Synced just now"
        : `Synced ${secondsAgo}s ago`;

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!loading && lastSyncedAt) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, lastSyncedAt]);

  useEffect(() => {
    if (!loading && lastSyncedAt) {
      onSyncComplete?.();
    }
  }, [loading, lastSyncedAt]);

  return (
    <div className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 shadow-float" aria-live="polite" aria-label="Live fare sync status">
      <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${showSuccess ? "bg-success" : loading ? "animate-pulse bg-coral" : "bg-mint-ink"}`} />
      <span className="font-mono-tab text-[11px] font-medium text-ink-soft" aria-live="polite">{label}</span>
      <button
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh live fares"
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-faint hover:bg-black/[0.05] hover:text-indigo disabled:opacity-40"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={loading ? "animate-spin" : ""}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </div>
  );
}
