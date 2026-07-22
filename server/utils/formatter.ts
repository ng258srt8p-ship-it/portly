/**
 * TripTide — Content Formatter
 * 
 * Formats raw analysis text into structured, readable sections
 * for the Deal Analysis and Price Forecast displays.
 */

export interface FormattedSection {
  title: string;
  content: string;
}

/**
 * Format a long string into structured sections with headers.
 * Splits by semicolons, periods, or known section keywords.
 */
/**
 * Format a long string into structured sections with headers.
 * Splits by semicolons, periods, or known section keywords.
 * Also sanitizes content: replaces em/en dashes with commas/periods, ensures proper capitalization.
 */
export function formatJustification(text: string): FormattedSection[] {
  if (!text) return [];

  const sections: FormattedSection[] = [];

  // Split by semicolons first (most common separator in our data)
  const parts = text.split(';').map(p => sanitizeContent(p.trim())).filter(p => p.length > 0);

  if (parts.length <= 1) {
    // Single paragraph - just return as-is
    return [{ title: 'Analysis', content: sanitizeContent(text) }];
  }

  let currentSection: FormattedSection | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    
    // Determine section header based on content
    let title = '';
    if (lower.includes('score') || lower.includes('weighted factors')) {
      title = 'Deal Score & Scoring Factors';
    } else if (lower.includes('cabin') || lower.includes('per night') || lower.includes('$')) {
      title = 'Cabin Pricing';
    } else if (lower.includes('trend') || lower.includes('falling') || lower.includes('rising') || lower.includes('dropping')) {
      title = 'Price Trend';
    } else if (lower.includes('destin') || lower.includes('caribbean') || lower.includes('alaska') || lower.includes('mediterranean')) {
      title = 'Destination';
    } else if (lower.includes('cruise line') || lower.includes('premium') || lower.includes('brand')) {
      title = 'Cruise Line Strategy';
    } else if (lower.includes('port') || lower.includes('itinerary')) {
      title = 'Itinerary';
    } else if (lower.includes('gratuities') || lower.includes('wifi') || lower.includes('total cost')) {
      title = 'Hidden Costs';
    } else {
      title = currentSection?.title || 'Analysis';
    }
    
    if (!currentSection || currentSection.title !== title) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { title, content: part };
    } else {
      currentSection.content += ' ' + part;
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Format pricing deep-dive into sections.
 * Also sanitizes content (em/en dashes, capitalization).
 */
export function formatPricingDeepDive(text: string): FormattedSection[] {
  if (!text) return [];

  // Split by periods and semicolons
  const sentences = text.replace(/;\s*/g, '. ').split('. ').filter(s => s.trim().length > 5);

  const sections: FormattedSection[] = [];

  for (const sentence of sentences) {
    const trimmed = sanitizeContent(sentence.trim());
    const lower = trimmed.toLowerCase();
    
    let title = '';
    if (lower.includes('cabin') || lower.includes('suite') || lower.includes('balcony') || lower.includes('oceanview') || lower.includes('inside')) {
      title = 'Cabin Pricing';
    } else if (lower.includes('trend') || lower.includes('falling') || lower.includes('rising') || lower.includes('dropping')) {
      title = 'Price Trend';
    } else if (lower.includes('cruise line') || lower.includes('ship')) {
      title = 'Ship & Route';
    } else {
      title = 'Pricing Analysis';
    }
    
    sections.push({ title, content: trimmed });
  }

  return sections;
}

/**
 * Sanitize content: replace em/en dashes with commas, fix leading lowercase sentences.
 */
export function sanitizeContent(text: string): string {
  if (!text) return text;
  let s = text;

  // Replace em/en dashes with commas (or periods if sentence end)
  s = s.replace(/\u2014/g, ',');       // em dash
  s = s.replace(/\u2013/g, ',');       // en dash
  s = s.replace(/–/g, ',');            // alternative em/en
  s = s.replace(/\u00AD/g, '');        // soft hyphen (e.g. Wi‑Fi)
  s = s.replace(/\u2010/g, '-');      // hyphen character
  s = s.replace(/\u2012/g, '-');      // figure dash
  s = s.replace(/\u2015/g, '-');      // horizontal bar
  s = s.replace(/\u2043/g, '-');      // hyphen hyphen

  // Fix sentence starts: if a sentence begins with lowercase after '.', '!?', capitalize it
  s = s.replace(/([.!?:]\s*)([a-z])/g, (_, delim, letter) => `${delim}${letter.toUpperCase()}`);

  // Remove robotic patterns
  s = s.replace(/Score\s+of\s+\d+/i, 'Worth');
  s = s.replace(/Monitor\s+for\s+s[a]le[s]?/i, 'Check back');
  s = s.replace(/Book\s+early\s+to\s+secure/i, 'Act soon');
  s = s.replace(/Book\s+now\s+for\s+best/i, 'Act now for best');

  return s;
}

/**
 * Format insider tips with context headers.
 * Also sanitizes content: replaces em/en dashes, fixes sentence capitalization, removes robotic patterns.
 */
export function formatInsiderTips(tips: string[]): FormattedSection[] {
  return tips.map(tip => {
    let content = sanitizeContent(tip);
    const lower = content.toLowerCase();
    let title = 'Insider Tip';
    
    if (lower.includes('prices have dropped') || lower.includes('prices climbing') || lower.includes('lock in')) {
      title = 'Pricing Alert';
    } else if (lower.includes('cabin') || lower.includes('upgrade') || lower.includes('bed') || lower.includes('deck')) {
      title = 'Cabin Recommendation';
    } else if (lower.includes('gratuit') || lower.includes('wifi') || lower.includes('total cost') || lower.includes('out-the-door')) {
      title = 'Cost Breakdown';
    } else if (lower.includes('barbecue') || lower.includes('champagne') || lower.includes('special') || lower.includes('culinary')) {
      title = 'Onboard Experience';
    } else if (lower.includes('embarkation') || lower.includes('check-in') || lower.includes('port')) {
      title = 'Port Information';
    } else if (lower.includes('season') || lower.includes('month') || lower.includes('weather')) {
      title = 'Seasonal Advice';
    } else if (lower.includes('promotions') || lower.includes('sales') || lower.includes('discount')) {
      title = 'Promotion Timing';
    } else {
      title = 'Insider Insight';
    }
    
    return { title, content: tip };
  });
}
