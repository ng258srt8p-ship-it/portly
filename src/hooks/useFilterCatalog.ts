'use client';

import { useEffect, useState } from 'react';
import { fetchAllFilterOptions } from '@/services/cruiseApi';

export interface FilterCatalog {
  cruiseLines: string[];
  destinations: string[];
  ships: string[];
  departurePorts: string[];
  departureRegions: string[];
}

const EMPTY_CATALOG: FilterCatalog = {
  cruiseLines: [],
  destinations: [],
  ships: [],
  departurePorts: [],
  departureRegions: [],
};

/**
 * Loads the full filter catalog from /api/filters once on mount.
 * Shared by DealsGrid (for filter dropdowns + counts) and the mobile drawer.
 */
export function useFilterCatalog(): FilterCatalog {
  const [catalog, setCatalog] = useState<FilterCatalog>(EMPTY_CATALOG);

  useEffect(() => {
    let cancelled = false;
    fetchAllFilterOptions()
      .then((d: any) => {
        if (cancelled) return;
        setCatalog({
          cruiseLines: (d.cruiseLines || []).slice().sort(),
          destinations: (d.destinations || []).slice().sort(),
          ships: (d.ships || []).slice().sort(),
          departurePorts: (d.departurePorts || (d && d.ports) || []).slice().sort(),
          departureRegions: (d.departureRegions || (d && d.regions) || []).slice().sort(),
        });
      })
      .catch(() => {
        // Non-fatal: filter dropdowns will fall back to current-page data
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
