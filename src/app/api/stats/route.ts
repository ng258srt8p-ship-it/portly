import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public/data/deals.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const deals = JSON.parse(raw);
    const trackedSailings = deals.length;
    const pricingSnapshots = deals.reduce((sum: number, d: any) => sum + (d.nights || 7), 0);
    return NextResponse.json({ trackedSailings, pricingSnapshots });
  } catch {
    return NextResponse.json({ trackedSailings: 0, pricingSnapshots: 0 });
  }
}
