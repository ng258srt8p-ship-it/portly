'use client';

/**
 * TripTide — LiveRateAlert
 * 
 * Displays rate lock expiry countdown and urgency signals:
 * - Time remaining before rate lock expires
 * - Urgency level (critical/high/moderate/low)
 * - Last-available messaging for low inventory
 * - Animated countdown for critical urgency
 */

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface RateLockInfo {
  expiresAt?: string;
  minutesRemaining?: number;
  urgency: 'critical' | 'high' | 'moderate' | 'low';
}

interface LiveRateAlertProps {
  rateLock?: RateLockInfo;
  lastAvailable?: boolean;
  inventoryCount?: number;
}

export default function LiveRateAlert({
  rateLock,
  lastAvailable = false,
  inventoryCount,
}: LiveRateAlertProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!rateLock?.expiresAt) {
      if (rateLock?.minutesRemaining !== undefined) {
        setTimeLeft(rateLock.minutesRemaining * 60);
      }
      return;
    }

    const expires = new Date(rateLock.expiresAt).getTime();
    const update = () => {
      const remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [rateLock?.expiresAt, rateLock?.minutesRemaining]);

  if (!rateLock || rateLock.urgency === 'low') return null;

  const urgencyConfig = {
    critical: {
      icon: 'error_outline',
      color: 'text-rose-700',
      bg: 'bg-rose-50 border-rose-200',
      label: 'Prices Climbing Fast',
      sublabel: 'Rate lock expires soon — act now',
    },
    high: {
      icon: 'warning',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      label: 'Prices May Rise',
      sublabel: 'Limited time to lock this rate',
    },
    moderate: {
      icon: 'schedule',
      color: 'text-yellow-700',
      bg: 'bg-yellow-50 border-yellow-200',
      label: 'Good Time to Book',
      sublabel: 'Rates typically rise closer to departure',
    },
  };

  const config = urgencyConfig[rateLock.urgency];

  return (
    <div
      className={`rounded-xl border-2 p-4 ${config.bg} ${
        rateLock.urgency === 'critical' ? 'animate-pulse' : ''
      }`}
      data-testid="live-rate-alert"
    >
      <div className="flex items-start gap-3">
        <MaterialIcon name={config.icon} size="md" className={`shrink-0 ${config.color}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${config.color}`}>{config.label}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{config.sublabel}</p>

          {timeLeft !== null && timeLeft > 0 && rateLock.urgency !== 'moderate' && (
            <div className="mt-2 flex items-center gap-1.5">
              <MaterialIcon name="timer" size="xs" className="text-ink-faint" />
              <span className="text-xs font-mono font-bold text-ink">
                {Math.floor(timeLeft / 60)}m {timeLeft % 60}s remaining
              </span>
            </div>
          )}

          {lastAvailable && (
            <div className="mt-2 flex items-center gap-1.5">
              <MaterialIcon name="fingerprint" size="xs" className="text-rose-500" />
              <span className="text-xs font-medium text-rose-700">Last available at this price</span>
            </div>
          )}

          {inventoryCount !== undefined && inventoryCount <= 4 && (
            <div className="mt-2 flex items-center gap-1.5">
              <MaterialIcon name="hotel" size="xs" className="text-amber-500" />
              <span className="text-xs font-medium text-amber-700">
                Only {inventoryCount} cabin{inventoryCount > 1 ? 's' : ''} left at this price
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
