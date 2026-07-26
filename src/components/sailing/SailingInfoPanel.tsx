'use client';

/* ============================================================
   TRIPTIDE - SailingInfoPanel Component
   Ship metadata, cabin info, solo supplement details, and
   sync status for the sailing detail page.
   ============================================================ */

interface SailingInfoPanelProps {
  ship: string;
  line: string;
  region: string;
  port: string;
  days: number;
  totalCabins?: number;
  cabinCategories?: string[];
  isRepositioning?: boolean;
  isSoloWaived?: boolean;
  syncStatus?: string;
  lastSyncedAt?: string;
  itinerary?: string[];
}

export default function SailingInfoPanel({
  ship,
  line,
  region,
  port,
  days,
  totalCabins,
  cabinCategories,
  isRepositioning,
  isSoloWaived,
  syncStatus,
  lastSyncedAt,
  itinerary,
}: SailingInfoPanelProps) {
  const formatValue = (value: string, fallback: string): React.ReactNode =>
    value ? <>{value}</> : <span className="text-ink-faint/60">{fallback}</span>;

  const infoRows = [
    { label: 'Cruise Line', value: line },
    { label: 'Ship', value: ship },
    { label: 'Destination', value: formatValue(region || '', 'Unknown') },
    { label: 'Departure Port', value: formatValue(port || '', 'Unknown') },
    { label: 'Duration', value: `${days} Night${days > 1 ? 's' : ''}` },
    { label: 'Total Cabins', value: totalCabins ? <>{totalCabins.toLocaleString()}</> : <span className="text-ink-faint/60">N/A</span> },
    { label: 'Cabin Categories', value: cabinCategories?.join(', ') ? <>{cabinCategories!.join(', ')}</> : <span className="text-ink-faint/60">Unknown</span> },
    { label: 'Repositioning', value: isRepositioning ? 'Yes' : 'No' },
    { label: 'Solo Supplement', value: isSoloWaived ? 'Waived' : 'Standard' },
    { label: 'Ports of Call', value: itinerary ? `${itinerary.length} port${itinerary.length > 1 ? 's' : ''}` : <span className="text-ink-faint/60">0 ports</span> },
    { label: 'Sync Status', value: syncStatus ? <>{syncStatus}</> : <span className="text-ink-faint/60">Unsynched</span> },
  ];

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float">
      <h2 className="mb-6 font-display text-2xl font-bold text-ink">Sailing Details</h2>

      <div className="divide-y divide-black/[0.04]">
        {infoRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <span className="text-sm font-medium text-ink-soft">{row.label}</span>
            <span className="text-sm font-semibold text-ink">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {lastSyncedAt && (
        <p className="mt-4 text-[11px] text-ink-faint/60">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
