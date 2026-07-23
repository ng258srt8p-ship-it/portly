import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import type { DealFilters } from '@/types/cruise';

interface Deal {
  id: number;
  cruiseLine: string;
  ship: string;
  destination: string;
  departurePort: string;
  departureRegion?: string;
  duration: string;
  nights: number;
  sailDate: string;
  price: number;
  originalPrice: number;
  dropPercent: number;
  badgeType: 'drop' | 'solo' | 'gold';
  badgeText: string;
  history: number[];
  bookingUrl?: string;
  bookingLabel?: string;
}

const SORT_FNS: Record<string, (a: Deal, b: Deal) => number> = {
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  'nights-asc': (a, b) => a.nights - b.nights,
  'nights-desc': (a, b) => b.nights - a.nights,
  'date-asc': (a, b) => new Date(a.sailDate).getTime() - new Date(b.sailDate).getTime(),
  'date-desc': (a, b) => new Date(b.sailDate).getTime() - new Date(a.sailDate).getTime(),
  'drop-desc': (a, b) => b.dropPercent - a.dropPercent,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // Read deals from static JSON
  const filePath = path.join(process.cwd(), 'public/data/deals.json');
  let deals: Deal[];
  try {
    deals = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Deals data not found' }, { status: 500 });
  }

  // Apply filters
  const cruiseLine = searchParams.get('cruiseLine');
  if (cruiseLine) {
    const lines = cruiseLine.split(',');
    deals = deals.filter((d) => lines.includes(d.cruiseLine));
  }

  const destination = searchParams.get('destination');
  if (destination) {
    const dests = destination.split(',');
    deals = deals.filter((d) => dests.includes(d.destination));
  }

  const departurePort = searchParams.get('departurePort');
  if (departurePort) {
    const ports = departurePort.split(',');
    deals = deals.filter((d) => ports.includes(d.departurePort));
  }

  const departureRegion = searchParams.get('departureRegion');
  if (departureRegion) {
    const regions = departureRegion.split(',');
    deals = deals.filter((d) => d.departureRegion && regions.includes(d.departureRegion));
  }

  const minNights = searchParams.get('minNights');
  if (minNights) deals = deals.filter((d) => d.nights >= parseInt(minNights, 10));

  const maxNights = searchParams.get('maxNights');
  if (maxNights) deals = deals.filter((d) => d.nights <= parseInt(maxNights, 10));

  const minPrice = searchParams.get('minPrice');
  if (minPrice) deals = deals.filter((d) => d.price >= parseInt(minPrice, 10));

  const maxPrice = searchParams.get('maxPrice');
  if (maxPrice) deals = deals.filter((d) => d.price <= parseInt(maxPrice, 10));

  const badgeType = searchParams.get('badgeType');
  if (badgeType) {
    const badges = badgeType.split(',') as Deal['badgeType'][];
    deals = deals.filter((d) => badges.includes(d.badgeType));
  }

  // Apply sort
  const sort = searchParams.get('sort');
  if (sort && SORT_FNS[sort]) {
    deals.sort(SORT_FNS[sort]);
  }

  // Apply limit (0 = all)
  const results = limit > 0 ? deals.slice(0, limit) : deals;

  return NextResponse.json(results);
}
