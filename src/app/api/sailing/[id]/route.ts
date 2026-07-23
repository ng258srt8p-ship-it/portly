import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

interface Deal {
  id: number | string;
  price: number;
  nights: number;
}

const TIER_MULTIPLIERS = [
  { cabinType: 'Inside',     multiplier: 1.0 },
  { cabinType: 'Oceanview',  multiplier: 1.25 },
  { cabinType: 'Balcony',    multiplier: 1.55 },
  { cabinType: 'Suite',      multiplier: 2.1 },
];

function fmt(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const filePath = path.join(process.cwd(), 'public/data/deals.json');
  let deals: Deal[];
  try {
    deals = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Data not found' }, { status: 500 });
  }

  const id = params.id;
  // Handle both numeric (1,2,3…) and string ("d1","d2"…) IDs
  const normalizedId = id.startsWith('d') ? id : `d${id}`;
  const deal = deals.find((d) => String(d.id) === normalizedId);
  if (!deal) {
    return NextResponse.json({ error: `Sailing ${id} not found` }, { status: 404 });
  }

  const basePrice = deal.price;
  const nights = deal.nights || 7;

  const cabins = TIER_MULTIPLIERS.map(({ cabinType, multiplier }) => {
    const perPersonBase = Math.round(basePrice * multiplier * 100 / 100);
    const totalFees = Math.round(perPersonBase * 0.12);
    const totalGratuities = Math.round(nights * 16 * multiplier);
    const totalOutTheDoor = perPersonBase + totalFees + totalGratuities;
    const perPersonPerDay = Math.round(totalOutTheDoor / 2 / nights);

    return {
      cabinType,
      baseFare: fmt(perPersonBase),
      portFees: fmt(totalFees),
      gratuities: fmt(totalGratuities),
      total: fmt(totalOutTheDoor),
      perPersonPerDay: fmt(perPersonPerDay),
      raw: {
        totalOutTheDoor,
        perPersonBase,
        totalFees,
        totalGratuities,
        perPersonPerDay,
      },
    };
  });

  return NextResponse.json({ cabinBreakdown: cabins });
}
