# Graph Data Enhancement Plan for TripTide Deal Cards

## Problem Statement
The current price history graphs (sparklines) on the deal cards lack clarity and usefulness:
1. **Ambiguous Data Source**: Users cannot tell what price the graph represents (average? lowest? specific cabin type?)
2. **No Cabin Type Differentiation**: Critical pricing variations by cabin category (Inside, Oceanview, Balcony, Suite) are hidden
3. **Misleading Comparisons**: Different sailings may show different baseline prices without context
4. **Poor Decision Support**: Users cannot assess which cabin category offers the best value trend

## Current Implementation Analysis

### Deals Page Graph (`/src/components/DealsGrid.tsx`)
- Uses `Sparkline` component with `deal.history` array
- Data originates from `/api/deals` endpoint (`server/routes/cruises.ts`)
- Current `history` field contains: `[currentPrice]` fallback or data from `v_price_trends` view
- **Issue**: Represents a single price series without specifying what it measures

### Sailing Detail Page Graph (`/src/components/sailing/PriceHistoryPanel.tsx`)
- More detailed: shows price history table by cabin type + sparkline
- Data from `/api/sailing/:id` endpoint with explicit `priceHistory` array
- **Issue**: Still could benefit from clearer multi-series visualization

## Proposed Solution: Enhanced Deal Card Graphs

### 1. Data Model Enhancement
Extend the `Deal` type in `src/types/cruise.ts`:
```typescript
interface Deal {
  // ... existing fields
  /** Historical prices by cabin type for trend analysis */
  cabinPriceHistory?: {
    [cabinType: string]: {
      prices: number[];     // Historical prices (chronological)
      dates: string[];      // Corresponding dates (ISO strings)
      latest: number;       // Most recent price
      changePercent: number; // % change from oldest to newest
    };
  };
  /** Primary cabin type for default display (best value or most common) */
  primaryCabinType?: string;
  /** Legacy support - will be deprecated */
  history?: number[];
}
```

### 2. API Endpoint Enhancement
Modify `/api/deals` in `server/routes/cruises.ts`:
```typescript
// AFTER fetching sailings and pricing data:
// Build detailed cabin-specific history
const cabinHistoryMap: Record<number, Record<string, { prices: number[]; dates: string[] }>> = {};

const detailedHistory = await dbQuery(
  `SELECT sailing_id, cabin_type, total_usd, recorded_date
   FROM pricing_history
   WHERE sailing_id = ANY($1::int[])
   ORDER BY sailing_id, cabin_type, recorded_date ASC`,
  [sailingIds]
);

if (detailedHistory) {
  for (const row of detailedHistory) {
    const { sailing_id: sailingId, cabin_type: cabinType, total_usd: priceStr, recorded_date } = row;
    const price = parseFloat(priceStr);
    const date = recorded_date as string;
    
    if (!cabinHistoryMap[sailingId]) {
      cabinHistoryMap[sailingId] = {};
    }
    if (!cabinHistoryMap[sailingId][cabinType]) {
      cabinHistoryMap[sailingId][cabinType] = { prices: [], dates: [] };
    }
    
    cabinHistoryMap[sailingId][cabinType].prices.push(price);
    cabinHistoryMap[sailingId][cabinType].dates.push(date);
  }
}

// THEN in the deal mapping logic:
const cabinHistory = cabinHistoryMap[row.id] || {};
const primaryCabinType = Object.keys(cabinHistory).reduce((best, current) => {
  const bestData = cabinHistory[best] || { prices: [] };
  const currentData = cabinHistory[current] || { prices: [] };
  // Prefer cabin type with most data points, or fallback to first
  return bestData.pretotal >= currentData.pretotal ? best : current;
}, Object.keys(cabinHistory)[0] || 'Inside');

return {
  // ... existing fields
  cabinPriceHistory: Object.entries(cabinHistory).map(([cabinType, data]) => ({
    cabinType,
    prices: data.prices,
    dates: data.dates,
    latest: data.prices[data.prices.length - 1] || 0,
    changePercent: data.prices.length >= 2 
      ? ((data.prices[data.prices.length - 1] - data.prices[0]) / data.prices[0]) * 100
      : 0
  })),
  primaryCabinType,
  // Maintain backward compatibility:
  history: cabinHistoryMap[row.id]?.[primaryCabinType]?.prices || [currentPrice]
};
```

### 3. Sparkline Component Enhancement
Update `src/components/ui/Sparkline.tsx` to handle enriched data:
```typescript
interface EnhancedSparklineProps {
  data: number[] | Record<string, { prices: number[]; dates: string[] }>;
  cabinType?: string; // Specific cabin type to display (optional)
  showLegend?: boolean;
  width?: number;
  height?: number;
  tooltipFormatter?: (value: number, index: number, cabinType?: string) => string;
}

export default function Sparkline({
  data,
  cabinType,
  showLegend = false,
  width = 140,
  height = 44,
  tooltipFormatter
}: EnhancedSparklineProps) {
  // Handle legacy format (backward compatibility)
  const historyData = Array.isArray(data) ? { default: { prices: data, dates: [] } } : data;
  
  // Determine which series to display
  const seriesToShow = cabinType && historyData[cabinType] 
    ? { [cabinType]: historyData[cabinType] } 
    : // Auto-select: longest series or first available
    Object.entries(historyData).reduce((acc, [key, value]) => 
      !acc.selectedKey: 'default', Value: value
    , {});
  
  // Rest of rendering logic similar to before but using selected series
  // Add enhanced tooltip showing all cabin types on hover
}
```

### 4. Visual Implementation Options

#### Option A: Enhanced Tooltip (Recommended - Minimal UI Change)
- Keep existing sparkline appearance
- On hover/show tooltip with:
  - Current prices for all cabin types
  - Mini trend indicators (▲/▼ % change)
  - "View Details" link to sailing page
- Example tooltip content:
  ```
  Inside: $1,050 ▼5.2%
  Oceanview: $1,320 ▼3.1% 
  Balcony: $1,890 ▼8.7% ← Best Value
  Suite: $2,450 ▼2.3%
  ```

#### Option B: Multi-Line Micro Chart
- Replace single sparkline with 2-3 line mini-chart
- Use subtle, distinguishable colors
- Add tiny legend on hover
- Best for wider card layouts

#### Option C: Badge + Trend Indicator
- Keep simple sparkline for trend direction
- Add overlay badges showing:
  - 📉 8.7% (Best declining cabin)
  - 💰 $1,890 (Current best price)
  - ⭐ 3/5 cabins trending down

### 5. Sailing Detail Page Enhancements
While already better, improve `PriceHistoryPanel`:
- **Default View**: Show all cabin types as semi-transparent lines with one highlighted
- **Interactive Legend**: Click cabin type to highlight/hide that series
- **Statistics Bar**: Show min/max/avg/current for each cabin type
- **Volatility Indicator**: Display price stability score per cabin type

### 6. Implementation Roadmap

#### Phase 1: Backward Compatible Enhancement (Week 1)
1. Modify `/api/deals` endpoint to include `cabinPriceHistory`
2. Update `Deal` TypeScript interface
3. Enhance `Sparkline` component to handle new data format
4. Update `DealsGrid` to utilize cabin-type data for tooltips
5. Maintain `history` field for backward compatibility
6. Verify all existing functionality still works

#### Phase 2: Visual Enhancement (Week 2)
1. Implement enriched tooltip with multi-cabin data
2. Add subtle visual indicators (e.g., dot color based on trend)
3. Update documentation and TypeScript definitions
4. Add unit tests for new data structures
5. Performance optimization (indexes, query limits)

#### Phase 3: Advanced Features (Optional - Post-Launch)
1. User preference for default cabin type display
2. Comparative analysis ("Show me how this sailing compares to similar routes")
3. Export functionality for power users
4. Animated transitions when data updates

### 7. Technical Considerations

#### Performance
- **Database**: Ensure indexes on `pricing_history(sailing_id, cabin_type, recorded_date)`
- **Payload Size**: Limit to most recent 30-60 days (15-30 data points per cabin)
- **Compression**: Consider delta encoding for price sequences
- **Caching**: Cache processed history data for 15-30 minutes

#### Backward Compatibility
- Keep `history:number[]` field as primary cabin's data
- Version API if breaking changes become necessary
- Graceful degradation if cabin history unavailable

#### User Experience
- Default to most relevant cabin type (often best value or most abundant)
- Clear visual distinction between hover states and normal state
- Accessible ARIA labels for screen readers
- Mobile-friendly touch targets for interactive elements

### 8. Success Metrics
- ✅ Users can identify which cabin type has best price trend at glance
- ❓ Reduction in support questions about "what does this graph show?"
- ⬆️ Increased engagement with sailing detail pages
- 💬 Positive user feedback on pricing transparency
- ⚡ Maintained or improved API response times (<200ms)

### 9. Immediate Next Steps
1. **Verify Current Data**: Check what `v_price_trends` actually contains
   ```sql
   SELECT DISTINCT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'v_price_trends';
   ```
2. **Test Enhanced Query**: Run sample query to confirm cabin-type history availability
3. **Implement Endpoint Changes**: Start with `/api/deals` modification
4. **Create Feature Branch**: `feature/enhanced-deal-graphs`
5. **Deploy to Staging**: Validate with real data before production

### 10. Alignment with Current UI/UX
This plan maintains:
- **Visual Consistency**: Same card layout, spacing, and styling
- **Interaction Patterns**: Preserves click-to-detail behavior
- **Performance Priorities**: Adds value without sacrificing speed
- **Accessibility Standards**: Enhances rather than complicates screen reader experience
- **Progressive Disclosure**: Complex data available on demand, not forced

The enhancement transforms meaningless sparklines into actionable pricing intelligence while preserving the clean, fast-and-look aesthetic users expect from TripTide.