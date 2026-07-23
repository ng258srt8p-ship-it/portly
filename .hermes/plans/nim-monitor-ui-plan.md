# Plan: NVIDIA NIM LLM Usage Monitoring UI

## Goal
Create a single HTML file that provides a real-time dashboard to monitor usage of all Nvidia NIM LLMs, showing metrics like request rates, token usage, error rates, and active connections.

## Problem Statement
Users need visibility into their NVIDIA NIM API usage to monitor costs, detect issues, and optimize their AI applications. Currently, there's no easy way to see real-time or historical usage statistics.

## Solution Overview
Create a self-contained HTML file that:
1. Reads data from Hermes Agent's NIM rate limiter and credential pool
2. Displays real-time metrics in a dashboard format
3. Updates periodically to show current status
4. Works offline or with minimal dependencies

## Implementation Approach

### Data Sources
1. **Rate Limiter State**: `~/.hermes/nim_rate_state.json` - contains token bucket states
2. **Credential Pool**: `~/.hermes/auth.json` - contains API key status and usage
3. **Configuration**: `~/.hermes/nim_rate_limits.json` - contains rate limits per model
4. **Logs**: Optional - if Hermes exposes metrics via HTTP or files

### Technical Implementation
Since we need a single HTML file, we'll use:
- HTML5 for structure
- CSS3 for styling (modern, clean design)
- JavaScript for logic and DOM manipulation
- Chart.js (via CDN) for graphs
- LocalStorage for caching recent data
- SetInterval for periodic updates

### Features to Include
1. **Overview Panel**: Total requests, errors, active keys
2. **Per-Model Metrics**: Request rate, token usage, error rate
3. **Key Status**: Which API keys are active/exhausted/cooling down
4. **Rate Limit Status**: Current token bucket levels
5. **Historical Trends**: Simple sparkline charts for last hour
6. **Alerts**: Visual indicators when limits are approached

## Implementation Steps

### Phase 1: Basic Structure
1. Create HTML skeleton with semantic elements
2. Add basic CSS for layout and styling
3. Create placeholder divs for each metric section
4. Add Chart.js CDN link for graphs

### Phase 2: Data Integration
1. Implement JavaScript to read local files (if possible via file://)
2. If file access is blocked, create a fallback mechanism:
   - Option A: Expose a simple HTTP endpoint from Hermes
   - Option B: Use localStorage as a bridge (updated by a separate process)
   - Option C: Use a WebSocket connection to Hermes
3. Parse the JSON data from the rate limiter and credential pool

### Phase 3: Visualization
1. Create cards/widgets for each metric type
2. Implement real-time updating charts
3. Add color-coding for status (good/warning/critical)
4. Make the interface responsive

### Phase 4: Enhancement
1. Add tooltip explanations for each metric
2. Implement dark/light mode toggle
3. Add export functionality (CSV/JSON)
4. Include help/documentation section

## Files to Create
- `nim-monitor.html` - Single file containing HTML, CSS, and JS

## Dependencies
- Chart.js (via CDN: https://cdn.jsdelivr.net/npm/chart.js)
- Optionally: date-fns for date formatting (via CDN)

## Success Criteria
- Single HTML file that opens in any modern browser
- Displays real-time NIM LLM usage metrics
- Updates automatically without manual refresh
- Works when opened directly from file system (if possible)
- Shows data for all configured NIM models
- Responsive design works on desktop and mobile

## Testing Plan
1. Verify file opens correctly in Chrome/Firefox/Safari
2. Check that data displays correctly when Hermes is running
3. Simulate various states (normal, rate limited, keys exhausted)
4. Test refresh intervals and performance
5. Validate responsive design at different screen sizes