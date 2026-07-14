# Analytics Output Refinement Plan

## Overview
This plan outlines improvements to make the analytics output (deal analysis, market summary, price forecast) more polished, structured, and frontend-friendly while preserving the analytical depth.

## Current State Analysis
The analytics system currently generates:
- **Deal Analysis**: Structured JSON with fields like `dealScore`, `pricingDeepDive`, `priceTrend`, etc.
- **Market Summary**: Free-form markdown/text
- **Price Forecast**: Free-form markdown/text

While the deal analysis is already structured, all outputs could benefit from:
1. More consistent JSON structure across all analytics types
2. Enhanced semantic breakdown for easier frontend consumption
3. Standardized metadata (confidence scores, data freshness, etc.)
4. Better separation of concerns (facts vs. recommendations vs. summaries)

## Proposed Improvements

### 1. Unified Analytics Response Structure
Create a common envelope for all analytics responses:

```typescript
interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  generatedAt: string; // ISO timestamp
  cacheStatus: 'fresh' | 'stale' | 'generating';
  generationDurationMs?: number;
  dataQuality: {
    completeness: number; // 0-100%
    sourcesUsed: number; // e.g., number of pricing snapshots
    dateRange: { start: string; end: string };
  };
}
```

### 2. Enhanced Deal Analysis Structure
Break down the current deal analysis into more granular, typed sections:

```typescript
interface EnhancedDealAnalysis {
  // Core scoring
  dealScore: number; // 0-100
  confidence: number; // 0-100
  
  // Pricing details
  pricing: {
    current: {
      perPerson: number;
      perPersonPerDay: number;
      total: number;
    };
    historical: {
      trend: 'improving' | 'declining' | 'stable';
      changePercent: number;
      volatility: number; // standard deviation
      percentile: number; // where current price sits historically
    };
    valueAssessment: {
      rating: 'poor' | 'fair' | 'good' | 'excellent';
      justification: string;
    };
  };
  
  // Ship & experience
  shipExperience: {
    highlights: string[]; // e.g., ["New water coaster", "Specialty dining"]
    concerns: string[]; // e.g., ["Older ship", "Limited cabins with balconies"]
    overallRating: number; // 1-5
  };
  
  // Itinerary & destination
  itineraryInsights: {
    portScore: number; // 0-100
    seaDays: number;
    portDays: number;
    uniqueExperiences: string[];
    potentialDrawbacks: string[];
  };
  
  // Recommendations
  recommendations: {
    action: 'strong_buy' | 'buy' | 'consider' | 'wait' | 'avoid';
    reasoning: string;
    idealBookingWindow: string; // e.g., "Book now" or "Wait 2-3 weeks"
    alternatives: Array<{
      sailingId: number;
      reason: string;
      potentialSavings: number;
    }>;
    insiderTips: string[];
  };
  
  // Summary
  executiveSummary: string; // 2-3 sentence overview
}
```

### 3. Improved Market Summary Structure
Structure the market-wide analysis for dashboard consumption:

```typescript
interface MarketAnalysis {
  generatedAt: string;
  overview: {
    totalSailings: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    trend: 'rising' | 'falling' | 'stable';
    momentum: number; // -100 to +100
  };
  
  destinationInsights: Array<{
    region: string;
    sailingCount: number;
    averagePrice: number;
    trend: 'improving' | 'declining' | 'stable';
    demandLevel: 'low' | 'medium' | 'high';
    bestTimeToBook: string; // e.g., "6-8 weeks out"
  }>;
  
  linePerformance: Array<{
    line: string;
    sailingCount: number;
    averagePrice: number;
    valueScore: number; // 0-100
    trend: 'improving' | 'declining' | 'stable';
  }>;
  
  opportunities: Array<{
    type: 'price_drop' | 'new_itinerary' | 'added_value';
    description: string;
    estimatedSavings: number;
    confidence: number;
  }>;
  
  risks: Array<{
    type: 'price_increase' | 'capacity_reduction' | 'itinerary_change';
    description: string;
    probability: number; // 0-100
    impact: 'low' | 'medium' | 'high';
  }>;
}
```

### 4. Enhanced Price Forecast Structure
Move beyond simple trends to actionable forecasting:

```typescript
interface EnhancedPriceForecast {
  generatedAt: string;
  sailingId: number;
  
  currentState: {
    price: number;
    percentile: number; // where it sits historically
    trend: 'increasing' | 'decreasing' | 'stable';
    velocity: number; // rate of change per day
  };
  
  forecast: {
    // Short term (next 7 days)
    shortTerm: {
      direction: 'up' | 'down' | 'flat';
      changePercent: number;
      confidence: number; // 0-100
      range: { min: number; max: number }; // prediction interval
    };
    
    // Medium term (next 30 days)
    mediumTerm: {
      direction: 'up' | 'down' | 'flat';
      changePercent: number;
      confidence: number;
      range: { min: number; max: number };
    };
    
    // Key inflection points
    inflectionPoints: Array<{
      date: string;
      expectedChange: number; // % from current
      reason: string; // e.g., "Typical price increase 21 days out"
    }>;
  };
  
  recommendation: {
    action: 'buy_now' | 'watch' | 'wait_for_drop' | 'last_minute_deal';
    confidence: number;
    targetPrice: number; // suggested price to wait for
    deadline: string; // date by which to decide
    reasoning: string;
  };
  
  modelInfo: {
    samplesUsed: number;
    dateRange: { start: string; end: string };
    accuracy: number; // historical backtest accuracy if available
  };
}
```

### 5. Implementation Approach

#### Phase 1: Define Types & Validation
- Create `/src/shared/analyticsTypes.ts` with all interfaces
- Implement validation utilities (using Zod or custom validators)
- Add default value generators for missing fields

#### Phase 2: Update Prompt Engineering
Refine prompts in `analyticsOptimized.ts` to:
- Explicitly request JSON matching new schemas
- Provide clear field definitions and examples
- Use few-shot prompting where beneficial
- Include instructions to avoid markdown/extraneous text

#### Phase 3: Add Response Processing
- Implement JSON parsing with fallback strategies
- Add schema validation and normalization
- Implement confidence scoring based on data quality
- Add processing time metrics

#### Phase 4: Update Storage & API
- Confirm current TEXT columns can store JSON strings
- Ensure API endpoints properly parse and serve JSON
- Add caching headers where appropriate
- Implement graceful degradation for legacy data

#### Phase 5: Testing & Validation
- Create unit tests for validation functions
- Test with sample sailing data
- Verify frontend can consume new formats
- Ensure backward compatibility for display

### 6. Benefits of This Approach

#### For Frontend Developers
- Predictable data structure reduces parsing complexity
- Type-safe consumption in TypeScript applications
- Direct mapping to UI components (cards, charts, badges)
- Consistent loading/error states across all analytics types

#### For End Users
- More scannable, actionable information
- Consistent presentation across different analytics types
- Clear indicators of confidence and data quality
- Easier comparison between different sailings or time periods

#### For System Maintainers
- Easier to update individual sections without breaking changes
- Better observability through structured logging
- Simpler A/B testing of different analytical approaches
- Clearer migration path for future enhancements

### 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Increased token usage | Optimize prompts, use concise language, implement response truncation |
| JSON parsing failures | Multiple parsing attempts, regex extraction, fallback to legacy processing |
| Field omission in AI response | Default values, graceful degradation, validation warnings |
| Performance impact | Asynchronous validation, incremental rollout, performance monitoring |
| Backward compatibility | Version detection, dual-format support during transition |

### 8. Success Metrics
- Reduction in frontend parsing code complexity
- Increased consistency in UI presentation of analytics
- Improved user engagement with analytics components
- Successful validation of >95% of AI-generated outputs
- Maintained or improved analytical accuracy (via human review)

### 9. Implementation Timeline
- **Week 1**: Define types, update prompts, implement validation
- **Week 2**: Integrate with analytics functions, add processing pipeline
- **Week 3**: Testing, feedback iteration, documentation
- **Week 4**: Deployment preparation, monitoring setup

### 10. Immediate Next Steps
1. Create the types file: `src/shared/analyticsTypes.ts`
2. Update one function (e.g., `analyzeSailingDealOptimized`) as a proof of concept
3. Test with a single sailing ID
4. Gather feedback on the new structure
5. Iterate and expand to other analytics types

## Conclusion
Structuring the analytics output will transform how users interact with cruise insights, making them more accessible, actionable, and consistent. This investment pays dividends in both developer experience (reduced parsing complexity) and end-user experience (clearer, more usable information).

The plan maintains the core value of AI-powered analytics while enhancing usability through better organization and presentation.