const otherData: Record<string, unknown> = {};

const cabinPrices: Record<string, unknown> = {};

for (const [cabinKey, snap] of Object.entries(cabinPrices)) {
  cabinCurrentPrices[cabinKey] = parseFloat(snap.total_out_the_door_usd);
}