# Goal Loop: Fix Deal Analysis Formatting

## Problem
The Deal Analysis section on `/sailing/:id` pages displays the `justification` field as a raw, unformatted string. The data contains structured information but it's rendered as plain text without proper formatting, headers, or sections.

**Current state:**
- `justification` = "Score of 74/100 based on weighted factors: price well below average; classic 7-night itinerary..."
- Rendered as a single `<p>` tag with no paragraph breaks
- All content (score explanation, pricing details, trends, recommendations) in one blob

**Desired state:**
- Formatted into readable sections with headers
- Structured paragraphs for different topics (score, pricing, trends, recommendations)
- Professional article-like presentation

## Acceptance Criteria

### Phase 1: Backend Formatting
1. **Format justification into structured sections**
   - Split by semicolons or sentences
   - Add headers for each topic area
   - Maintain data integrity (no loss of information)

2. **Format pricingDeepDive similarly**
   - Split into readable paragraphs
   - Add subheadings for cabin breakdown, trend analysis

3. **Format insiderTips into structured format**
   - Add context headers (e.g., "Pricing Tip", "Cabin Recommendation")
   - Maintain individual tip content

### Phase 2: Frontend Rendering
1. **Update EnhancedDealAnalysis.tsx**
   - Render justification as formatted paragraphs
   - Add section headers/labels
   - Ensure consistent styling with other sections

2. **Test across multiple sailings**
   - Validate formatting works for different destinations (Caribbean, Alaska, Europe)
   - Validate formatting works for different cruise lines
   - Validate formatting works for different durations

### Phase 3: Validation
1. **Playwright e2e tests**
   - Verify formatted text contains expected keywords
   - Verify section headers are present
   - Verify content spans multiple paragraphs/lines

2. **Manual verification**
   - Check http://localhost:3003/sailing/1049
   - Verify Deal Analysis section looks professional
   - Verify all sections are readable and well-formatted

## Implementation Steps

### Step 1: Create formatting utility
Create `server/utils/formatter.ts` with functions to:
- Split long strings into paragraphs by semicolons/periods
- Add section headers based on content keywords
- Maintain original information density

### Step 2: Update backend services
Update `server/services/enhancedAnalytics.ts`:
- `generateHeuristicEnhancedDeal()` — format justification, pricingDeepDive, insiderTips
- `parseEnhancedDealJson()` — normalize AI output with formatting

### Step 3: Update frontend
Update `src/components/sailing/EnhancedDealAnalysis.tsx`:
- Render formatted content as structured sections
- Add visual styling for different section types
- Ensure responsive layout

### Step 4: Add e2e tests
Update `e2e/enhanced-api.spec.ts`:
- Validate formatted output contains expected structure
- Verify section headers are present
- Check content density per section

### Step 5: Host and verify
- Run backend server
- Run frontend server
- Navigate to `/sailing/:id` pages
- Verify formatting looks professional and readable

## Success Metrics
- All sailings display formatted Deal Analysis
- Content is structured into 3-5 distinct sections
- Each section has a clear header/label
- Professional article-like presentation
- No information loss from original data
- e2e tests pass for multiple sailings
