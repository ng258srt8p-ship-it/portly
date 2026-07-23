import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface Deal {
  id: string;
  cruiseLine: string;
  ship: string;
  destination: string;
  departurePort: string;
  duration: string;
  nights: number;
  sailDate: string;
  price: number;
  originalPrice: number;
  dropPercent: number;
  badgeType: string;
  badgeText: string;
  history: number[];
}

interface HistoryEntry {
  price: number;
  date: string;
}

interface HistorySailing {
  sailingId: number;
  ship: string;
  cabinType: string;
  durationDays: number;
  currentPrice: number;
  lowestPrice: number;
  history: HistoryEntry[];
}

interface HistoryLine {
  line: string;
  sailings: HistorySailing[];
  totalSailings: number;
}

interface HistoryData {
  lines: HistoryLine[];
  totalPricesTracked: number;
  totalSailings: number;
}

const CABIN_TYPES = ['Inside', 'Oceanview', 'Balcony', 'Suite', 'Penthouse'] as const;
const CABIN_MULTIPLIERS: Record<string, number> = {
  Inside: 0.7,
  Oceanview: 0.85,
  Balcony: 1.0,
  Suite: 1.5,
  Penthouse: 2.5,
};

function generateSyntheticHistory(basePrice: number): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  const now = new Date();
  const price = basePrice;
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7);
    // Random walk around base price (±15%)
    const variation = price * (0.85 + Math.random() * 0.3);
    entries.push({
      price: Math.round(variation),
      date: date.toISOString().split('T')[0],
    });
  }
  return entries;
}

export async function GET(_request: NextRequest) {
  try {
    const dealsPath = path.join(process.cwd(), 'public', 'data', 'deals.json');
    const raw = fs.readFileSync(dealsPath, 'utf-8');
    const deals: Deal[] = JSON.parse(raw);

    const linesMap = new Map<string, Deal[]>();
    for (const deal of deals) {
      const existing = linesMap.get(deal.cruiseLine) || [];
      existing.push(deal);
      linesMap.set(deal.cruiseLine, existing);
    }

    let totalPricesTracked = 0;
    const lines: HistoryLine[] = [];

    for (const [lineName, lineDeals] of linesMap.entries()) {
      const sailings: HistorySailing[] = [];
      for (const deal of lineDeals) {
        const cabinType = CABIN_TYPES[Math.floor(Math.random() * CABIN_TYPES.length)];
        const multiplier = CABIN_MULTIPLIERS[cabinType] || 1.0;
        const cabinPrice = Math.round(deal.price * multiplier);
        const history = generateSyntheticHistory(cabinPrice);
        const lowestPrice = Math.min(...history.map((h) => h.price));

        sailings.push({
          sailingId: parseInt(deal.id.replace('d', ''), 10),
          ship: deal.ship,
          cabinType,
          durationDays: deal.nights,
          currentPrice: cabinPrice,
          lowestPrice,
          history,
        });
        totalPricesTracked += history.length;
      }

      lines.push({
        line: lineName,
        sailings,
        totalSailings: lineDeals.length,
      });
    }

    const data: HistoryData = {
      lines,
      totalPricesTracked,
      totalSailings: deals.length,
    };

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Failed to load history:', error);
    return NextResponse.json(
      { error: 'Failed to load price history' },
      { status: 500 }
    );
  }
}
