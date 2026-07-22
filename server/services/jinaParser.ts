/**
 * TripTide — Jina Reader Parser
 * 
 * Dedicated parser for converting Jina AI markdown output
 * into structured cruise data with high accuracy.
 * 
 * Features:
 * - Ship name extraction (multiple cruise lines)
 * - Date normalization (various formats → ISO 8601)
 * - Itinerary port extraction
 * - Cabin pricing tier logic
 * - Data validation
 */

export interface ParsedCruise {
  cruiseLine: string;
  ship: string;
  sailDate: string; // ISO 8601: YYYY-MM-DD
  duration: number; // nights
  departurePort: string;
  destination: string;
  itinerary: string[];
  cabinPricing: {
    inside: number;
    oceanview: number;
    balcony: number;
    suite: number;
  };
  rawMarkdown: string;
  sourceUrl: string;
}

export interface ParseResult {
  success: boolean;
  cruises: ParsedCruise[];
  errors: string[];
  warnings: string[];
}

/**
 * Main parsing function.
 * Takes Jina markdown output and returns structured cruise data.
 */
export function parseJinaMarkdown(markdown: string, sourceUrl: string): ParseResult {
  const result: ParseResult = {
    success: false,
    cruises: [],
    errors: [],
    warnings: [],
  };

  if (!markdown || markdown.length < 100) {
    result.errors.push('Markdown too short or empty');
    return result;
  }

  try {
    // Detect cruise line from URL
    const cruiseLine = detectCruiseLine(sourceUrl);
    
    // Get parsing rules for this cruise line
    const rules = getParsingRules(cruiseLine);
    
    // Extract ship name
    const ship = extractShipName(markdown, rules.shipNamePattern);
    if (!ship) {
      result.warnings.push('Could not extract ship name, using fallback');
    }
    
    // Extract sail dates (may be multiple)
    const sailDates = extractSailDates(markdown, rules.datePattern);
    if (sailDates.length === 0) {
      result.warnings.push('No sail dates found');
    }
    
    // Extract itinerary
    const itinerary = extractItinerary(markdown, rules.itineraryPattern);
    
    // Extract prices
    const prices = extractAllPrices(markdown, rules.pricePattern);
    
    // Derive cabin pricing from extracted prices
    const cabinPricing = deriveCabinPricing(prices);
    
    // Generate cruise records (one per date)
    const departurePort = extractDeparturePort(markdown, itinerary);
    const destination = detectDestination(itinerary);
    
    const cruises: ParsedCruise[] = sailDates.map(date => ({
      cruiseLine,
      ship: ship || 'Unknown Ship',
      sailDate: date,
      duration: extractDuration(markdown) || 7,
      departurePort,
      destination,
      itinerary: itinerary.length > 0 ? itinerary : ['TBA'],
      cabinPricing,
      rawMarkdown: markdown.slice(0, 2000), // Store preview
      sourceUrl,
    }));
    
    // Validate each cruise
    const validCruises = cruises.filter(cruise => {
      const isValid = validateCruise(cruise);
      if (!isValid) {
        result.errors.push(`Invalid cruise data for ${cruise.ship} on ${cruise.sailDate}`);
      }
      return isValid;
    });
    
    result.cruises = validCruises;
    result.success = validCruises.length > 0;
    
    if (result.success) {
      console.log(`[Jina Parser] ✅ Parsed ${validCruises.length} cruise(s) from ${cruiseLine}`);
    }
    
    return result;
    
  } catch (err: any) {
    result.errors.push(`Parser error: ${err.message}`);
    return result;
  }
}

/**
 * Detect cruise line from URL.
 */
function detectCruiseLine(url: string): string {
  if (url.includes('royalcaribbean.com')) return 'Royal Caribbean';
  if (url.includes('carnival.com')) return 'Carnival';
  if (url.includes('ncl.com')) return 'Norwegian';
  if (url.includes('princess.com')) return 'Princess';
  if (url.includes('msc.com')) return 'MSC';
  if (url.includes('celebrity.com')) return 'Celebrity';
  if (url.includes('hollandamerica.com')) return 'Holland America';
  return 'Unknown';
}

/**
 * Get parsing rules for a specific cruise line.
 */
function getParsingRules(cruiseLine: string) {
  const rules: Record<string, any> = {
    'Royal Caribbean': {
      shipNamePattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+of\s+the\s+Seas)/gi,
      datePattern: /(\w+\s+\d{1,2},\s+\d{4})/g,
      itineraryPattern: /(?:ports?|itinerary|visiting)[:\s]+([^\n]+)/i,
      pricePattern: /\$([\d,]+(?:\.\d{2})?)/g,
      departurePortPattern: /from\s+([A-Z][a-zA-Z\s,]+?)(?:\s+(?:to|for)|$)/i,
    },
    'Carnival': {
      shipNamePattern: /Carnival\s+([A-Z][a-zA-Z]+)/gi,
      datePattern: /(\w+\s+\d{1,2},\s+\d{4})/g,
      itineraryPattern: /(?:ports?|itinerary)[:\s]+([^\n]+)/i,
      pricePattern: /(?:from|starting at)\s+\$([\d,]+)/gi,
      departurePortPattern: /from\s+([A-Z][a-zA-Z\s,]+?)(?:\s+to|$)/i,
    },
    'Norwegian': {
      shipNamePattern: /Norwegian\s+([A-Z][a-zA-Z]+)/gi,
      datePattern: /(\w+\s+\d{1,2},\s+\d{4})/g,
      itineraryPattern: /(?:ports?|itinerary)[:\s]+([^\n]+)/i,
      pricePattern: /\$([\d,]+(?:\.\d{2})?)/g,
      departurePortPattern: /from\s+([A-Z][a-zA-Z\s,]+?)(?:\s+to|$)/i,
    },
    'Default': {
      shipNamePattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:of\s+the\s+\w+|Carnival|Norwegian|Princess))/gi,
      datePattern: /(\w+\s+\d{1,2},\s+\d{4})/g,
      itineraryPattern: /(?:ports?|itinerary|visiting)[:\s]+([^\n]+)/i,
      pricePattern: /\$([\d,]+(?:\.\d{2})?)/g,
      departurePortPattern: /from\s+([A-Z][a-zA-Z\s,]+?)(?:\s+to|$)/i,
    },
  };
  
  return rules[cruiseLine] || rules['Default'];
}

/**
 * Extract ship name from markdown.
 */
function extractShipName(markdown: string, pattern: RegExp): string | null {
  const match = pattern.exec(markdown);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback: look for common ship name patterns
  const fallbackPatterns = [
    /([A-Z][a-z]+\s+of\s+the\s+Seas)/i,
    /Carnival\s+([A-Z][a-zA-Z]+)/i,
    /Norwegian\s+([A-Z][a-zA-Z]+)/i,
  ];
  
  for (const p of fallbackPatterns) {
    const m = p.exec(markdown);
    if (m) return m[0].trim();
  }
  
  return null;
}

/**
 * Extract sail dates from markdown.
 * Returns array of ISO 8601 dates (YYYY-MM-DD).
 */
function extractSailDates(markdown: string, pattern: RegExp): string[] {
  const dates: string[] = [];
  let match;
  
  while ((match = pattern.exec(markdown)) !== null) {
    const dateStr = match[1];
    const normalized = normalizeDate(dateStr);
    if (normalized) {
      dates.push(normalized);
    }
  }
  
  // Remove duplicates
  return [...new Set(dates)];
}

/**
 * Normalize various date formats to ISO 8601 (YYYY-MM-DD).
 */
export function normalizeDate(dateStr: string): string | null {
  // Format: "Sep 7, 2026" or "September 7, 2026"
  const monthNames: Record<string, number> = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12,
  };
  
  const match = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    const month = monthNames[match[1].toLowerCase().slice(0, 3)];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month && day && year) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  // Format: "2026-08-07" (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  return null;
}

/**
 * Extract itinerary ports from markdown.
 */
function extractItinerary(markdown: string, pattern: RegExp): string[] {
  const match = pattern.exec(markdown);
  if (!match || !match[1]) return [];
  
  const portsStr = match[1];
  
  // Split by common delimiters
  const ports = portsStr
    .split(/[,;•\-–—]/)
    .map(p => p.trim())
    .filter(p => p.length > 2 && p.length < 50)
    .map(p => {
      // Capitalize properly
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    });
  
  return ports.slice(0, 10); // Max 10 ports
}

/**
 * Extract all prices from markdown.
 * Returns array of numeric values (USD).
 */
function extractAllPrices(markdown: string, pattern: RegExp): number[] {
  const prices: number[] = [];
  let match;
  
  while ((match = pattern.exec(markdown)) !== null) {
    const priceStr = match[1].replace(/,/g, '');
    const price = parseFloat(priceStr);
    if (price > 0 && price < 100000) { // Sanity check
      prices.push(price);
    }
  }
  
  return prices;
}

/**
 * Derive cabin pricing tiers from extracted prices.
 * Uses heuristic: lowest = inside, then tiered multipliers.
 */
function deriveCabinPricing(prices: number[]): ParsedCruise['cabinPricing'] {
  if (prices.length === 0) {
    // Fallback: realistic default prices
    return {
      inside: 800,
      oceanview: 1000,
      balcony: 1500,
      suite: 2500,
    };
  }
  
  const sorted = [...prices].sort((a, b) => a - b);
  const minPrice = sorted[0];
  const maxPrice = sorted[sorted.length - 1];
  
  // Heuristic: assign prices to cabin tiers
  // Inside: lowest found
  // Oceanview: +20-25% from inside
  // Balcony: +50-70% from inside
  // Suite: highest found or +150% from inside
  
  const inside = minPrice;
  const oceanview = Math.round(minPrice * 1.22);
  const balcony = Math.round(minPrice * 1.55);
  const suite = Math.max(Math.round(minPrice * 2.2), maxPrice);
  
  return { inside, oceanview, balcony, suite };
}

/**
 * Extract departure port from markdown or itinerary.
 */
function extractDeparturePort(markdown: string, itinerary: string[]): string {
  // If itinerary exists, first port is usually departure
  if (itinerary.length > 0) {
    return itinerary[0];
  }
  
  // Try to extract from markdown
  const patterns = [
    /from\s+([A-Z][a-zA-Z\s,]+?)(?:\s+(?:to|for|on)|$)/i,
    /departs?\s+from\s+([A-Z][a-zA-Z\s,]+)/i,
    /embarks?\s+from\s+([A-Z][a-zA-Z\s,]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(markdown);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Miami, FL'; // Default fallback
}

/**
 * Detect destination region from itinerary.
 */
function detectDestination(itinerary: string[]): string {
  if (itinerary.length === 0) return 'Caribbean';
  
  const itineraryStr = itinerary.join(' ').toLowerCase();
  
  if (itineraryStr.includes('alaska')) return 'Alaska';
  if (itineraryStr.includes('mediterranean')) return 'Mediterranean';
  if (itineraryStr.includes('caribbean')) return 'Caribbean';
  if (itineraryStr.includes('bahamas')) return 'Bahamas';
  if (itineraryStr.includes('mexico')) return 'Mexican Riviera';
  if (itineraryStr.includes('hawaii')) return 'Hawaii';
  if (itineraryStr.includes('europe')) return 'Europe';
  if (itineraryStr.includes('asia')) return 'Asia';
  
  return 'Caribbean'; // Default
}

/**
 * Extract cruise duration from markdown.
 */
function extractDuration(markdown: string): number | null {
  const patterns = [
    /(\d+)\s*(?:night|nights?|day|days?)/i,
    /(\d+)-?(?:night|day)/i,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(markdown);
    if (match && match[1]) {
      const duration = parseInt(match[1], 10);
      if (duration >= 2 && duration <= 30) {
        return duration;
      }
    }
  }
  
  return null;
}

/**
 * Validate parsed cruise data.
 */
export function validateCruise(cruise: ParsedCruise): boolean {
  // Required fields
  if (!cruise.ship || cruise.ship === 'Unknown Ship') return false;
  if (!cruise.sailDate || !/^\d{4}-\d{2}-\d{2}$/.test(cruise.sailDate)) return false;
  if (cruise.duration < 2 || cruise.duration > 30) return false;
  
  // Price validation
  const { inside, oceanview, balcony, suite } = cruise.cabinPricing;
  if (inside <= 0) return false;
  if (oceanview < inside) return false;
  if (balcony < oceanview) return false;
  if (suite < balcony) return false;
  
  // Date must be in the future (or at least not ancient)
  const sailDate = new Date(cruise.sailDate);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (sailDate < oneYearAgo) return false;
  
  return true;
}

export default parseJinaMarkdown;