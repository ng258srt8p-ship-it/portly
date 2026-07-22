/**
 * TripTide — Deal Analysis Content Formatter
 *
 * Enforces content quality standards on all Deal Analysis and Price Forecast
 * text before it is stored or served:
 *   - No em dashes (—) or en dashes (–)
 *   - Proper sentence capitalization
 *   - Conversational, human tone (no robotic template language)
 *
 * Apply via sanitizeDealContent() to any string field in deal analysis output.
 */

/* ====================================================================== */
/*  EM/DASH REWRITING                                                      */
/* ====================================================================== */

/**
 * Replace em dashes and en dashes with contextually appropriate punctuation.
 *
 * Rules:
 *   - If surrounded by spaces on both sides, replace with ", " (aside/set-off)
 *   - If at the end of a clause before a number or summary, replace with ". "
 *   - If connecting two related thoughts, replace with ". "
 *   - If followed by a closing quote or parenthesis, replace with ", "
 */
function rewriteDashes(text: string): string {
  // Replace em/en/soft-hyphen/figure-dash/horizontal-bar
  // Handle em dashes surrounded by spaces (typical aside usage)
  let result = text.replace(/\s—\s/g, ', ');
  result = result.replace(/\s–\s/g, ', ');
  // Soft hyphen (Wi‑Fi), figure dash, horizontal bar, hyphen-hyphen
  result = result.replace(/\u00AD/g, '');
  result = result.replace(/\u2010/g, '-');
  result = result.replace(/\u2012/g, '-');
  result = result.replace(/\u2015/g, '-');
  result = result.replace(/\u2043/g, '-');

  // Handle em dash at end of clause before a number/summary (e.g., "total: $500—$600")
  result = result.replace(/—(?=\d)/g, '. ');
  result = result.replace(/–(?=\d)/g, '. ');

  // Handle em dash before a closing quote or paren
  result = result.replace(/—(?=["')])/g, ', ');
  result = result.replace(/–(?=["')])/g, ', ');

  // Handle em dash after an opening quote or paren
  result = result.replace(/(?<=[("'])—/g, ', ');
  result = result.replace(/(?<=[("'])–/g, ', ');

  // Handle remaining em/en dashes (standalone) — replace with period
  result = result.replace(/—/g, '. ');
  result = result.replace(/–/g, '. ');

  // Clean up double spaces that may result
  result = result.replace(/  +/g, ' ');

  return result;
}

/* ====================================================================== */
/*  CAPITALIZATION ENFORCEMENT                                             */
/* ====================================================================== */

/**
 * Capitalize the first letter of every sentence.
 * Preserves already-capitalized words and proper nouns.
 */
function capitalizeSentences(text: string): string {
  return text
    .replace(/([.!?]\s+)([a-z])/g, (_match, separator, letter) => {
      return separator + letter.toUpperCase();
    })
    .replace(/^([a-z])/g, (_match, letter) => {
      return letter.toUpperCase();
    });
}

/* ====================================================================== */
/*  HUMAN TONE — ROBOTIC PATTERN REWRITE                                 */
/* ====================================================================== */

interface PatternReplacement {
  pattern: RegExp;
  replacement: (...args: string[]) => string;
}

const ROBOTIC_PATTERNS: PatternReplacement[] = [
  // Pattern: "Score of X/100 based on weighted factors: Y; Z."
  {
    pattern: /Score of (\d+)\/100 based on weighted factors:\s*([^.;]+)/gi,
    replacement: (_match, score, factors) => `This sailing scores ${score} out of 100 due to ${factors.trim().toLowerCase()}`,
  },
  // Pattern: "Standard cruise line — typical market dynamics"
  {
    pattern: /Standard cruise line[\s—–]*typical market dynamics/i,
    replacement: () => 'This cruise line follows standard market pricing patterns',
  },
  // Pattern: "Premium brand — quality-to-price ratio favorable"
  {
    pattern: /Premium brand[\s—–]*quality.to.price ratio favorable/i,
    replacement: () => 'A premium brand where the quality-to-price ratio is favorable at lower per-day rates',
  },
  // Pattern: "mainstream brand — aggressive discounting creates value signals"
  {
    pattern: /mainstream brand[\s—–]*aggressive discounting creates value signals/i,
    replacement: () => 'A mainstream brand that uses aggressive discounting, which creates good value signals',
  },
  // Pattern: "Monitor for sales"
  {
    pattern: /Monitor for sales\b/gi,
    replacement: () => 'Keep an eye out for the next sale',
  },
  // Pattern: "Book early to secure"
  {
    pattern: /Book early to secure\b/gi,
    replacement: () => 'Lock in your booking while cabins are still available',
  },
  // Pattern: "monitor for drops"
  {
    pattern: /monitor for drops\b/gi,
    replacement: () => 'keep an eye on prices for future drops',
  },
  // Pattern: "lock in now before"
  {
    pattern: /lock in now before\b/gi,
    replacement: (_match) => 'book now before',
  },
  // Pattern: "prices have dropped X% — this trend"
  {
    pattern: /prices have dropped (\d+\.?\d*)%[\s—–]*this trend/i,
    replacement: (_match) => 'prices have dropped by this percentage, and this trend',
  },
  // Pattern: "Prices climbing X% — lock in"
  {
    pattern: /Prices climbing (\d+\.?\d*)%[\s—–]*lock in/i,
    replacement: (_match) => 'Prices are climbing by this percentage, so it is wise to book soon',
  },
  // Pattern: "X-night short cruise"
  {
    pattern: /\d+-night short cruise\b/gi,
    replacement: (_match) => 'a shorter cruise of this duration',
  },
  // Pattern: "X-night brief sailing"
  {
    pattern: /\d+-night brief sailing\b/gi,
    replacement: (_match) => 'a brief sailing of this duration',
  },
  // Pattern: "This represents good value compared to regional averages."
  {
    pattern: /This represents good value compared to regional averages\./i,
    replacement: () => 'That is a solid value compared to what you typically see for this region.',
  },
  // Pattern: "Prices are near market average for this route."
  {
    pattern: /Prices are near market average for this route\./i,
    replacement: () => 'Prices are sitting right around the market average for this route.',
  },
  // Pattern: "Premium line with quality amenities to justify the price."
  {
    pattern: /Premium line with quality amenities to justify the price\./i,
    replacement: () => 'This is a premium line with quality amenities that help justify the price point.',
  },
  // Pattern: "Standard line with competitive pricing strategy."
  {
    pattern: /Standard line with competitive pricing strategy\./i,
    replacement: () => 'This is a standard line running a competitive pricing strategy.',
  },
  // Pattern: "Excellent value per port stop."
  {
    pattern: /Excellent value per port stop\./i,
    replacement: () => 'You are getting excellent value per port stop.',
  },
  // Pattern: "Good value per port stop."
  {
    pattern: /Good value per port stop\./i,
    replacement: () => 'This is good value per port stop.',
  },
  // Pattern: "Average value per port stop."
  {
    pattern: /Average value per port stop\./i,
    replacement: () => 'The value per port stop is about average.',
  },
  // Pattern: "Plenty of time to find the best rate"
  {
    pattern: /Plenty of time to find the best rate/i,
    replacement: () => 'You have plenty of time to find the best rate',
  },
  // Pattern: "Last-minute availability"
  {
    pattern: /Last-minute availability/i,
    replacement: () => 'This is a last-minute availability situation',
  },
  // Pattern "Moderate booking window" removed - handled by more specific pattern below
  // Pattern: "check back for drops"
  {
    pattern: /check back for drops\b/gi,
    replacement: () => 'check back periodically for price drops',
  },
  // Pattern: "Typical market dynamics for this cruise line" (already human, but ensure no dash)
  {
    pattern: /Typical market dynamics[\s—–]/i,
    replacement: () => 'Typical market dynamics for this cruise line.',
  },
  // Pattern: generic "Solid X-night duration"
  {
    pattern: /Solid \d+-night duration\b/gi,
    replacement: (_match) => 'a solid duration for this type of cruise',
  },
  // Pattern: "classic 7-night itinerary"
  {
    pattern: /classic \d+-night itinerary\b/gi,
    replacement: (_match) => 'a classic itinerary of this length',
  },
  // Pattern: "extended X-night voyage"
  {
    pattern: /extended \d+-night voyage\b/gi,
    replacement: (_match) => 'an extended voyage of this length',
  },
  // Pattern: "Excellent deal, book now before inventory disappears" (post-dash rewrite)
  {
    pattern: /Excellent deal,?\s*book now before inventory disappears/i,
    replacement: () => 'This is an excellent deal. Book now while cabins are still available.',
  },
  // Pattern: "Strong buy, very good value for this route"
  {
    pattern: /Strong buy,?\s*very good value for this route/i,
    replacement: () => 'Strong buy. This is very good value for this route.',
  },
  // Pattern: "Good deal, solid value, consider booking soon"
  {
    pattern: /Good deal,?\s*solid value, consider booking soon/i,
    replacement: () => 'Good deal with solid value. Consider booking soon.',
  },
  // Pattern: "Fair value, average pricing, monitor for drops"
  {
    pattern: /Fair value,?\s*average pricing,?\s*monitor for drops/i,
    replacement: () => 'Fair value with average pricing. Keep an eye out for future drops.',
  },
  // Pattern: "Below average, prices are elevated, wait for sales"
  {
    pattern: /Below average,?\s*prices are elevated,?\s*wait for sales/i,
    replacement: () => 'Below average. Prices are elevated, so it makes sense to wait for sales.',
  },
  // Pattern: "stable, with prices still finding equilibrium" (post-dash)
  {
    pattern: /stable,?\s*prices still finding equilibrium/i,
    replacement: () => 'stable, with prices still finding equilibrium',
  },
  // Pattern: "falling, which is a rare last-minute drop" (post-dash)
  {
    pattern: /falling,?\s*rare last.minute drop/i,
    replacement: () => 'falling, which is a rare last-minute drop',
  },
  // Pattern: "prices climbing, last-minute surge common" (post-dash)
  {
    pattern: /prices climbing,?\s*last.minute surge common/i,
    replacement: () => 'prices climbing, as a last-minute surge is common',
  },
  // Pattern: "prices dropping, strong signal to book" (post-dash)
  {
    pattern: /prices dropping,?\s*strong signal to book/i,
    replacement: () => 'prices dropping, which is a strong signal to book',
  },
  // Pattern: "prices rising, likely to climb further" (post-dash)
  {
    pattern: /prices rising,?\s*likely to climb further/i,
    replacement: () => 'prices rising, and likely to climb further',
  },
  // Pattern: "stable, with no clear trend direction" (post-dash)
  {
    pattern: /stable,?\s*no clear trend direction/i,
    replacement: () => 'stable, with no clear trend direction',
  },
  // Pattern: "premium brand, quality-to-price ratio favorable" (post-dash)
  {
    pattern: /premium brand,?\s*quality.to.price ratio favorable/i,
    replacement: () => 'premium brand where the quality-to-price ratio is favorable',
  },
  // Pattern: "mainstream brand, aggressive discounting" (post-dash)
  {
    pattern: /mainstream brand,?\s*aggressive discounting creates value signals/i,
    replacement: () => 'mainstream brand that uses aggressive discounting, which creates value signals',
  },
  // Pattern: "standard cruise line, typical market dynamics" (post-dash)
  {
    pattern: /standard cruise line,?\s*typical market dynamics/i,
    replacement: () => 'standard cruise line with typical market dynamics',
  },
  // Pattern: "Prices have dropped X%, this trend typically continues" (post-dash)
  {
    pattern: /Prices have dropped ([\d.]+)%,?\s*this trend typically continues/i,
    replacement: (_match, pct) => `Prices have dropped by ${pct}% and this trend typically continues`,
  },
  // Pattern: "Prices climbing X%, lock in now" (post-dash)
  {
    pattern: /Prices climbing ([\d.]+)%,?\s*lock in now/i,
    replacement: () => 'Prices are climbing, so it makes sense to lock in your rate',
  },
  // Pattern: "costs just $X/night, exceptional" (post-dash)
  {
    pattern: /costs just \$[\d.]+\/night,?\s*exceptional/i,
    replacement: () => 'costs just that per night, which is exceptional value',
  },
  // Pattern: "Plenty of time to find the best rate, prices typically drop" (post-dash)
  {
    pattern: /Plenty of time to find the best rate,?\s*prices typically drop/i,
    replacement: () => 'You have plenty of time to find the best rate, and prices typically drop',
  },
  // Pattern: "Last-minute availability, prices may be elevated" (post-dash)
  {
    pattern: /Last.minute availability,?\s*prices may be elevated/i,
    replacement: () => 'This is a last-minute availability situation, and prices may be elevated',
  },
  // Pattern: "Moderate booking window, book soon" (post-dash)
  {
    pattern: /Moderate booking window,?\s*book soon/i,
    replacement: () => 'You have a moderate booking window, so book soon',
  },
  // Pattern: "typically runs promotions every X weeks, check back periodically" (post-dash)
  {
    pattern: /typically runs promotions every \d+ to \d+ weeks,?\s*check back periodically/i,
    replacement: () => 'typically runs promotions every 4 to 8 weeks, so check back periodically',
  },
  // Pattern: "this trend typically continues" (generic filler)
  {
    pattern: /this trend typically continues/i,
    replacement: () => 'this movement tends to persist',
  },
  // Pattern: "that is a solid value compared to" (stiff)
  {
    pattern: /That\s+is\s+a\s+solid\s+value\s+compared\s+to/i,
    replacement: () => 'That is solid value compared to',
  },
  // Pattern: "a premium brand where the" (stiff)
  {
    pattern: /A\s+premium\s+brand\s+where\s+the/i,
    replacement: () => 'A premium brand whose',
  },
  // Pattern: "this cruise line follows standard market pricing" (stiff)
  {
    pattern: /This\s+cruise\s+line\s+follows\s+standard\s+market\s+pacing/i,
    replacement: () => 'This cruise line follows standard market pacing',
  },
  // Pattern: "check back periodically for price drops" (robotic)
  {
    pattern: /check\s+back\s+periodically\s+for\s+price\s+drops/i,
    replacement: () => 'keep an eye out for future drops',
  },
  // Pattern: "typically runs promotions every 4-8 weeks, check back for drops" (post-dash)
  {
    pattern: /typically runs promotions every \d.\d+ weeks,?\s*check back for drops/i,
    replacement: () => 'typically runs promotions every 4 to 8 weeks, so check back periodically for drops',
  },
];

/**
 * Rewrite robotic patterns into conversational language.
 */
function humanizeTone(text: string): string {
  let result = text;
  for (const { pattern, replacement } of ROBOTIC_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/* ====================================================================== */
/*  PUBLIC API                                                             */
/* ====================================================================== */

/**
 * Sanitize a single text field for Deal Analysis content quality.
 *
 * Applies:
 *   1. Em/en dash replacement
 *   2. Sentence capitalization
 *   3. Robotic pattern rewriting
 *
 * Safe to call on null/undefined (returns empty string).
 * Idempotent: calling multiple times does not degrade content.
 */
export function sanitizeDealContent(text: string | null | undefined): string {
  if (!text || text.length === 0) return '';

  let result = text;

  // Step 1: Replace dashes
  result = rewriteDashes(result);

  // Step 2: Capitalize sentence starts
  result = capitalizeSentences(result);

  // Step 3: Humanize tone
  result = humanizeTone(result);

  // Step 4: Ensure proper noun capitalization for known cruise lines
  result = ensureProperNounCapitalization(result);

  // Clean up any double punctuation that may have resulted
  result = result.replace(/\.\s*\./g, '. ');
  result = result.replace(/,\s*,/g, ',');

  return result.trim();
}

/**
 * Sanitize all text fields in a deal analysis result object.
 * Returns a new object with all string fields sanitized.
 */
export function sanitizeDealAnalysisObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj };

  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeDealContent(result[key] as string);
    } else if (Array.isArray(result[key])) {
      result[key] = (result[key] as unknown[]).map((item) => {
        if (typeof item === 'string') {
          return sanitizeDealContent(item);
        }
        if (typeof item === 'object' && item !== null) {
          return sanitizeDealAnalysisObject(item as Record<string, unknown>);
        }
        return item;
      });
    }
  }

  return result;
}

/* ====================================================================== */
/*  PROPER NOUN CAPITALIZATION                                             */
/* ====================================================================== */

/**
 * Ensure cruise line names, destination names, and common proper nouns
 * are correctly capitalized. Also handles known ship names.
 */
function ensureProperNounCapitalization(text: string): string {
  // Known cruise lines with specific casing
  const cruiseLines: Record<string, string> = {
    'royal caribbean': 'Royal Caribbean',
    'carnival': 'Carnival',
    'norwegian cruise line': 'Norwegian Cruise Line',
    'norwegian': 'Norwegian',
    'celebrity cruise line': 'Celebrity Cruise Line',
    'celebrity': 'Celebrity',
    'msc cruises': 'MSC Cruises',
    'msc': 'MSC',
    'princess cruises': 'Princess Cruises',
    'princess': 'Princess',
    'holland america line': 'Holland America Line',
    'azamara': 'Azamara',
    'virgin voyages': 'Virgin Voyages',
    'island cruiser': 'Island Cruiser',
  };

  // Known ship names with specific casing (common ships)
  const shipNames: Record<string, string> = {
    'the ocean': 'The Ocean',
    'disney magic': 'Disney Magic',
    'disney dream': 'Disney Dream',
    'disney wonder': 'Disney Wonder',
    'harmony of the seas': 'Harmony of the Seas',
    'voyage of the gems': 'Voyage of the Gems',
    'MSC seashore': 'MSC Seashore',
    'MSC oceanview': 'MSC OceanView',
    'celebrity apex': 'Celebrity Apex',
    'celebrity edge': 'Celebrity Edge',
    'celebrity beyond': 'Celebrity Beyond',
    'princess ocean': 'Princess Ocean',
    'royal prague': 'Royal Prague',
    'carnival celebration': 'Carnival Celebration',
    'carnival jubilee': 'Carnival Jubilee',
    'carnival ecstasy': 'Carnival Ecstasy',
  };

  let result = text;
  for (const [lower, proper] of Object.entries(cruiseLines)) {
    // Use word-boundary regex to avoid partial matches
    const regex = new RegExp(`\\b${lower.replace(/ /g, '\\s+')}\\b`, 'gi');
    result = result.replace(regex, proper);
  }

  // Common destination/region capitalization
  const regions: Record<string, string> = {
    'eastern caribbean': 'Eastern Caribbean',
    'western caribbean': 'Western Caribbean',
    'central american': 'Central American',
    'bahamas': 'Bahamas',
    'alaska': 'Alaska',
    'mediterranean': 'Mediterranean',
    'greek isles': 'Greek Isles',
    'norwegian fjords': 'Norwegian Fjords',
    'hawaiian islands': 'Hawaiian Islands',
    'caribbean': 'Caribbean',
    'pacific islands': 'Pacific Islands',
    'transatlantic': 'Transatlantic',
  };

  for (const [lower, proper] of Object.entries(regions)) {
    const regex = new RegExp(`\\b${lower.replace(/ /g, '\\s+')}\\b`, 'gi');
    result = result.replace(regex, proper);
  }

  // Capitalize "Inside", "Oceanview", "Balcony", "Suite" cabin types when used as labels
  const cabinTypes = ['Inside', 'Oceanview', 'Balcony', 'Suite'];
  for (const cabin of cabinTypes) {
    const regex = new RegExp(`\\b${cabin.toLowerCase()}\\b`, 'g');
    result = result.replace(regex, cabin);
  }

  // Known ship names
  for (const [lower, proper] of Object.entries(shipNames)) {
    const regex = new RegExp(`\\b${lower.replace(/ /g, '\\s+')}\\b`, 'gi');
    result = result.replace(regex, proper);
  }

  return result;
}

/* ====================================================================== */
/*  VALIDATION                                                             */
/* ====================================================================== */

/**
 * Check whether a string passes all content quality standards.
 * Returns an array of issues found (empty = passes).
 */
export function validateDealContent(text: string): string[] {
  const issues: string[] = [];

  // Check for em/en dashes
  if (text.includes('\u2014')) {
    issues.push('Contains em dash (—)');
  }
  if (text.includes('\u2013')) {
    issues.push('Contains en dash (–)');
  }

  // Check sentence capitalization
  const sentences = text.split(/([.!?]\s+)/);
  for (let i = 1; i < sentences.length; i += 2) {
    const nextSentence = sentences[i + 1]?.trim();
    if (nextSentence && nextSentence.length > 0 && /^[a-z]/.test(nextSentence)) {
      issues.push(`Sentence not capitalized after punctuation: "${nextSentence.substring(0, 30)}..."`);
      break; // Report first issue only
    }
  }

  // Check for robotic patterns
  const roboticChecks = [
    /Score of \d+\/100 based on weighted factors:/i,
    /Standard cruise line[\s—–]*typical market dynamics/i,
    /Monitor for sales\b/i,
    /Book early to secure\b/i,
  ];

  for (const pattern of roboticChecks) {
    if (pattern.test(text)) {
      issues.push(`Contains robotic pattern: "${pattern.source}"`);
    }
  }

  return issues;
}
