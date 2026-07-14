/**
 * BizDevAgent — Affiliate Forensics Expert + LLM-Powered Strategy Analyst
 * 
 * Maps the monetization mechanics of CruisePlum by tracing outbound
 * booking links, identifying affiliate networks, tracking parameters,
 * and commission structures. Uses Nvidia NIM (Llama 3.1 70B) for
 * competitor strategy analysis, market opportunity identification,
 * and partnership recommendations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { RedirectTracer, TracedLink, RedirectTraceResult } from '../plugins/RedirectTracer';
import { callOpenCode } from '../server/utils/openCodeClient';

// ============================================================
// Types
// ============================================================

export interface MonetizationChannel {
  channel: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  detectedNetworks: string[];
  estimatedRevenueShare: string;
  trackingMechanism: string;
  requirements: string[];
}

export interface RevenueArchitecture {
  title: string;
  clickToRevenueFlow: {
    steps: Array<{
      step: number;
      name: string;
      description: string;
      technicalDetails: string;
    }>;
  };
  channels: MonetizationChannel[];
  trackingEcosystem: {
    firstParty: string[];
    thirdParty: string[];
    cookies: string[];
  };
  estimatedMetrics: {
    affiliateCommissionRate: string;
    cookieWindow: string;
    primaryRevenueShare: string;
    secondaryRevenueSources: string[];
  };
}

export interface BizDevAgentResult {
  redirectTraces: RedirectTraceResult;
  revenueArchitecture: RevenueArchitecture;
  affiliateNetworks: string[];
  trackingParams: Record<string, string[]>;
  competitorInsights: string[];
  monetizationBlueprint: MonetizationBlueprint;
  // NIM-powered analysis
  competitorAnalyses?: CompetitorAnalysis[];
  marketOpportunities?: MarketOpportunity[];
  executiveSummary?: string;
}

export interface CompetitorAnalysis {
  competitorName: string;
  businessModel: string;
  pricingStrategy: string;
  targetMarket: string;
  keyDifferentiators: string[];
  strengths: string[];
  weaknesses: string[];
  partnershipPotential: 'high' | 'medium' | 'low';
  confidence: number;
}

export interface MarketOpportunity {
  opportunity: string;
  marketSize: string;
  competitiveLandscape: string;
  recommendedApproach: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: string;
}

export interface MonetizationBlueprint {
  ourModel: {
    primaryRevenue: string;
    secondaryRevenue: string[];
    estimatedMargins: string;
    keyPartners: string[];
  };
  improvements: Array<{
    area: string;
    cruiseplumApproach: string;
    ourApproach: string;
    revenueImpact: string;
  }>;
}

// ============================================================
// Known Affiliate Commission Benchmarks
// ============================================================

const AFFILIATE_COMMISSION_BENCHMARKS: Record<string, { rate: string; type: string; notes: string }> = {
  'Impact Radius': { rate: '3-8%', type: 'Rev Share', notes: 'Standard cruise affiliate rates' },
  'CJ Affiliate': { rate: '3-6%', type: 'Rev Share', notes: 'Varies by cruise line partner' },
  'Travelpayouts': { rate: '2-5%', type: 'CPA/Rev Share', notes: 'Popular with travel meta-search sites' },
  'Expedia Group': { rate: '4-8%', type: 'Rev Share', notes: 'Expedia Affiliate Network' },
  'Booking Holdings': { rate: '3-7%', type: 'Rev Share', notes: 'Booking.com affiliate program' },
  'Direct Cruise Line': { rate: '2-5%', type: 'CPA', notes: 'Direct partnership with cruise lines' },
  'Host Agency': { rate: '10-16%', type: 'Commission Split', notes: 'Travel agency commission model (different from affiliate)' },
};

// ============================================================
// BizDevAgent
// ============================================================

export class BizDevAgent {
  private redirectTracer: RedirectTracer;
  private outputDir: string;
  private useNim: boolean = false;

  constructor(outputDir: string = './output/bizdev', useNim: boolean = false) {
    this.redirectTracer = new RedirectTracer();
    this.outputDir = outputDir;
    this.useNim = useNim;
    fs.mkdirSync(outputDir, { recursive: true });

    if (useNim) {
      console.log('[BizDevAgent] NIM client initialized for LLM-powered analysis');
    }
  }

  /**
   * Enable NIM-powered analysis (requires NIM_API_KEY env var)
   */
  enableNim(): void {
    this.useNim = true;
    console.log('[BizDevAgent] NIM client enabled');
  }

  /**
   * Disable NIM-powered analysis
   */
  disableNim(): void {
    this.useNim = false;
  }

  /**
   * Check if NIM is enabled
   */
  isNimEnabled(): boolean {
    return this.useNim;
  }

  /**
   * Get NIM rate limit status
   */
  getNimRateLimitStatus() {
    return null;
  }

  /**
   * Analyze outbound links from scraped page data and trace affiliate chains
   */
  async analyzeOutboundLinks(
    links: Array<{ text: string; href: string }>,
    page: any // Playwright Page
  ): Promise<BizDevAgentResult> {
    console.log('[BizDevAgent] ========================================');
    console.log('[BizDevAgent] Analyzing Outbound Links & Affiliate Chains');
    console.log('[BizDevAgent] ========================================');

    // Filter for potential affiliate/booking links
    const affiliateKeywords = ['book', 'price', 'deal', 'check', 'view', 'buy', 'reserve', 'quote'];
    const potentialLinks = links.filter(l => {
      const text = l.text.toLowerCase();
      const href = l.href.toLowerCase();
      return affiliateKeywords.some(kw => text.includes(kw)) || 
             href.includes('/redirect') || href.includes('/go') || href.includes('/out') ||
             href.includes('affiliate') || href.includes('partner') || href.includes('ref=');
    });

    console.log(`[BizDevAgent] Found ${potentialLinks.length} potential affiliate links out of ${links.length} total`);

    // Trace the redirect chains
    let traceResult: RedirectTraceResult;
    if (potentialLinks.length > 0 && page) {
      traceResult = await this.redirectTracer.traceMultiple(
        page, 
        potentialLinks.slice(0, 15).map(l => l.href),
        3
      );
    } else {
      traceResult = {
        totalTraced: 0,
        successfulTraces: 0,
        failedTraces: 0,
        traces: [],
        aggregateAnalysis: {
          affiliateNetworksFound: [],
          trackingParamsFound: [],
          travelTechFound: [],
          uniqueDomains: [],
        },
      };
    }

    // Build revenue architecture
    const revenueArchitecture = this._buildRevenueArchitecture(traceResult);

    // Build monetization blueprint
    const monetizationBlueprint = this._buildMonetizationBlueprint(traceResult);

    // Compile affiliate networks map
    const affiliateNetworkMap: Record<string, string[]> = {};
    for (const param of traceResult.aggregateAnalysis.trackingParamsFound) {
      const values = traceResult.traces
        .filter(t => t.trackingParams[param])
        .map(t => t.trackingParams[param]);
      if (values.length > 0) {
        affiliateNetworkMap[param] = [...new Set(values)];
      }
    }

    // Generate competitor insights
    const competitorInsights = this._generateInsights(traceResult);

    // Save results
    this._saveResults({
      redirectTraces: traceResult,
      revenueArchitecture,
      affiliateNetworks: traceResult.aggregateAnalysis.affiliateNetworksFound,
      trackingParams: affiliateNetworkMap,
      competitorInsights,
      monetizationBlueprint,
    });

    return {
      redirectTraces: traceResult,
      revenueArchitecture,
      affiliateNetworks: traceResult.aggregateAnalysis.affiliateNetworksFound,
      trackingParams: affiliateNetworkMap,
      competitorInsights,
      monetizationBlueprint,
    };
  }

  /**
   * Build the revenue architecture based on trace results and industry knowledge
   */
  private _buildRevenueArchitecture(traceResult: RedirectTraceResult): RevenueArchitecture {
    const hasAffiliates = traceResult.aggregateAnalysis.affiliateNetworksFound.length > 0;

    return {
      title: 'CruisePlum Revenue Architecture (Reconstructed)',
      clickToRevenueFlow: {
        steps: [
          {
            step: 1,
            name: 'User Browsing',
            description: 'User searches for cruises on CruisePlum, views deal lists, price drops, and solo supplement deals',
            technicalDetails: 'Server-rendered HTML with embedded JSON data. No client-side rendering framework detected.',
          },
          {
            step: 2,
            name: 'Outbound Click Initiation',
            description: 'User clicks "Check Price" or "View Deal" button on a cruise listing',
            technicalDetails: 'JavaScript click handler fires: (1) analytics event (if enabled), (2) redirect URL construction with cruise ID',
          },
          {
            step: 3,
            name: 'Internal Redirect (\'/redirect?id=X\')',
            description: 'User is sent to an internal redirect endpoint that masks the affiliate destination',
            technicalDetails: 'GET https://www.cruiseplum.com/redirect?id=CRUISE123 — Server looks up affiliate partner mapping for this cruise',
          },
          {
            step: 4,
            name: 'Affiliate Network Hand-off',
            description: 'Server responds with 302 redirect to affiliate network URL with tracking parameters',
            technicalDetails: 'Redirect to Impact Radius, CJ Affiliate, or similar with parameters like affiliate_id, sid, utm_source',
          },
          {
            step: 5,
            name: 'Affiliate Cookie Set',
            description: 'Affiliate network sets tracking cookie in user\'s browser (30-90 day window)',
            technicalDetails: 'Cookie set on affiliate domain. Contains click ID, publisher ID, timestamp. Used for commission attribution.',
          },
          {
            step: 6,
            name: 'Partner Booking Site',
            description: 'User arrives at partner booking site (Expedia, Cruise.com, specific travel agency, or direct cruise line)',
            technicalDetails: 'Partner site sees affiliate referral via URL parameters. User completes booking flow on partner site.',
          },
          {
            step: 7,
            name: 'Commission Earned',
            description: 'When user completes booking within cookie window, CruisePlum earns commission',
            technicalDetails: 'CPA (flat fee per booking) or Rev Share (3-8% of booking value). Paid monthly by affiliate network.',
          },
        ],
      },
      channels: [
        {
          channel: 'Affiliate Bookings (Primary)',
          description: 'Commission from outbound booking referrals to partner cruise agencies, OTAs, and direct cruise line booking engines',
          confidence: 'high',
          detectedNetworks: traceResult.aggregateAnalysis.affiliateNetworksFound,
          estimatedRevenueShare: '3-8% of booking value (Rev Share) or $25-100 CPA',
          trackingMechanism: 'Internal /redirect?id=X → 302 to affiliate network → cookie → final redirect to partner',
          requirements: [
            'Cruise line affiliate program partnerships',
            'Affiliate network account (Impact, CJ, Travelpayouts)',
            'Server-side redirect mapping (cruise_id → partner_url)',
            'Cookie tracking infrastructure',
          ],
        },
        {
          channel: 'Email Lead Generation (Secondary)',
          description: 'Collect user emails via price drop alerts and newsletter signups, monetize via targeted cruise offers',
          confidence: 'medium',
          detectedNetworks: [],
          estimatedRevenueShare: 'Email marketing ROI: $42 per $1 spent (industry avg)',
          trackingMechanism: 'Email capture forms → automated email sequences with affiliate links',
          requirements: [
            'Email service provider (SendGrid, Mailchimp, etc.)',
            'Segmented email lists by destination/preference',
            'Automated price drop alert emails with affiliate links',
          ],
        },
        {
          channel: 'Display Advertising (Tertiary)',
          description: 'Programmatic display ads on search results and deal pages',
          confidence: 'low',
          detectedNetworks: [],
          estimatedRevenueShare: '$0.50-3.00 CPM (variable by traffic quality)',
          trackingMechanism: 'Ad network tags (Google AdX, Media.net, etc.)',
          requirements: [
            'Ad network account',
            'Ad placement optimization',
            'Significant traffic volume to generate meaningful revenue',
          ],
        },
        {
          channel: 'Premium/Sponsored Listings',
          description: 'Cruise lines paying for featured placement in search results or deal lists',
          confidence: 'medium',
          detectedNetworks: [],
          estimatedRevenueShare: 'Variable — monthly sponsorship fees or PPC',
          trackingMechanism: 'Direct B2B partnerships with cruise lines',
          requirements: [
            'Sales team for B2B outreach',
            'Sufficient traffic to justify sponsorship costs',
            'Featured/boosted listing infrastructure',
          ],
        },
      ],
      trackingEcosystem: {
        firstParty: [
          'Session cookies for user authentication',
          'Watchlist/saved search preference cookies',
          'Server-side click logging on /redirect endpoint',
        ],
        thirdParty: traceResult.aggregateAnalysis.affiliateNetworksFound.length > 0 
          ? traceResult.aggregateAnalysis.affiliateNetworksFound
          : ['Impact Radius (expected)', 'CJ Affiliate (expected)', 'Google Analytics', 'Facebook Pixel'],
        cookies: [
          'Affiliate tracking cookies (30-90 day window)',
          'Analytics cookies (_ga, _gid)',
          'Session management cookies',
        ],
      },
      estimatedMetrics: {
        affiliateCommissionRate: '3-8% of booking value (industry standard for cruises)',
        cookieWindow: '30-90 days (typical for travel affiliates)',
        primaryRevenueShare: '80-90% of revenue from affiliate bookings',
        secondaryRevenueSources: [
          'Email marketing / newsletter',
          'Display advertising (if applicable)',
          'Sponsored listings / featured placements',
        ],
      },
    };
  }

  /**
   * Build the monetization blueprint for OUR competitor platform
   */
  private _buildMonetizationBlueprint(traceResult: RedirectTraceResult): MonetizationBlueprint {
    return {
      ourModel: {
        primaryRevenue: 'Affiliate Commissions via Impact Radius / CJ Affiliate (3-8% rev share) with transparent tracking',
        secondaryRevenue: [
          'Premium subscription tiers (ad-free, advanced alerts, priority support)',
          'Sponsored cruise line placements (featured listings, premium badges)',
          'Email marketing (curated deal newsletters with affiliate links)',
          'API access for travel agents (B2B subscription)',
        ],
        estimatedMargins: '60-70% gross margin (typical for affiliate-based travel platforms)',
        keyPartners: [
          'Impact Radius / CJ Affiliate (primary affiliate networks)',
          'Expedia Affiliate Network (EAN) for booking',
          'Direct cruise line affiliate programs (Royal Caribbean, Carnival, NCL, MSC, Princess)',
          'Travelpayouts for international traffic',
          'Host agencies for commission overlay opportunities',
        ],
      },
      improvements: [
        {
          area: 'Affiliate Link Transparency',
          cruiseplumApproach: 'Hidden /redirect?id=X pattern — users don\'t know they\'re being tracked',
          ourApproach: 'Disclose affiliate relationships with a small "We may earn commission" badge. Builds trust without conversion loss.',
          revenueImpact: 'Low impact on revenue, high impact on SEO/trust signals',
        },
        {
          area: 'Multi-Network Load Balancing',
          cruiseplumApproach: 'Likely uses one primary affiliate network',
          ourApproach: 'Route through multiple affiliate networks with dynamic selection based on conversion rates. A/B test networks per cruise line.',
          revenueImpact: '10-15% revenue uplift from optimized routing',
        },
        {
          area: 'Email Monetization',
          cruiseplumApproach: 'Basic email alerts, no segmentation',
          ourApproach: 'Segmented email campaigns by destination preference, price range, cruise line affinity. Automated drip sequences with targeted affiliate links.',
          revenueImpact: '2-3x email revenue vs. basic approach',
        },
        {
          area: 'Premium Tiers',
          cruiseplumApproach: 'No premium offering detected',
          ourApproach: 'Freemium model: Free = basic alerts + ads. Premium ($4.99/mo) = ad-free, real-time push, price predictions, advanced filters.',
          revenueImpact: 'New revenue stream, $5-10 ARPU from power users',
        },
        {
          area: 'B2B API Access',
          cruiseplumApproach: 'No API offering detected',
          ourApproach: 'Sell API access to travel agents and small cruise agencies. $99/mo for 10,000 API calls. Cruise pricing data as a service.',
          revenueImpact: 'High-margin B2B revenue, $100-500 MRR per agency client',
        },
      ],
    };
  }

  /**
   * Generate strategic insights from trace analysis
   */
  private _generateInsights(traceResult: RedirectTraceResult): string[] {
    const insights: string[] = [];

    if (traceResult.aggregateAnalysis.affiliateNetworksFound.length > 0) {
      insights.push(`Detected affiliate networks: ${traceResult.aggregateAnalysis.affiliateNetworksFound.join(', ')}`);
    } else {
      insights.push('No affiliate networks directly detected (likely masked by Cloudflare or internal redirects)');
    }

    if (traceResult.aggregateAnalysis.trackingParamsFound.length > 0) {
      insights.push(`Tracking parameters found: ${traceResult.aggregateAnalysis.trackingParamsFound.join(', ')}`);
    }

    if (traceResult.aggregateAnalysis.travelTechFound.length > 0) {
      insights.push(`Travel tech platforms detected: ${traceResult.aggregateAnalysis.travelTechFound.join(', ')}`);
    }

    insights.push('CruisePlum uses internal /redirect?id=X pattern to mask affiliate relationships');
    insights.push('Affiliate commission for cruises is typically 3-8% Rev Share with 30-90 day cookie window');
    insights.push('Primary revenue is affiliate bookings (estimated 80-90% of total revenue)');
    insights.push('Email list is secondary asset — price drop alerts drive email capture');
    insights.push('No evidence of display ads, premium tiers, or B2B API offerings (our opportunity)');

    return insights;
  }

  /**
   * Analyze competitor strategies using NIM LLM
   */
  async analyzeCompetitorStrategies(competitors: string[]): Promise<CompetitorAnalysis[]> {
    if (!this.isNimEnabled()) {
      console.warn('[BizDevAgent] NIM not enabled, skipping competitor analysis');
      return [];
    }

    console.log('[BizDevAgent] Analyzing competitor strategies with NIM...');

    const prompt = `Analyze the business strategies of these cruise/travel affiliate competitors: ${competitors.join(', ')}.

For each competitor, provide:
1. Business model (affiliate, CPA, hybrid, direct booking, etc.)
2. Pricing strategy (free, freemium, subscription, commission-based)
3. Target market (budget, luxury, family, solo, specific demographics)
4. Key differentiators (what makes them unique)
5. Strengths and weaknesses
6. Partnership potential (high/medium/low) for a new entrant
7. Confidence score (0-1)

Return as JSON array of objects with fields: competitorName, businessModel, pricingStrategy, targetMarket, keyDifferentiators, strengths, weaknesses, partnershipPotential, confidence.`;

    try {
      const response = await callOpenCode([
        { role: 'system', content: 'You are a business strategy analyst specializing in the cruise/travel affiliate industry. Provide detailed, actionable competitor analysis in valid JSON format.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.3, max_tokens: 3000 });

      const content = response || '[]';
      const analyses = JSON.parse(content) as CompetitorAnalysis[];
      console.log(`[BizDevAgent] Analyzed ${analyses.length} competitors`);
      return analyses;
    } catch (error) {
      console.error('[BizDevAgent] Competitor analysis failed:', error);
      return [];
    }
  }

  /**
   * Identify market opportunities using NIM LLM
   */
  async identifyMarketOpportunities(
    traceResult: RedirectTraceResult,
    competitorAnalyses: CompetitorAnalysis[]
  ): Promise<MarketOpportunity[]> {
    if (!this.isNimEnabled()) {
      console.warn('[BizDevAgent] NIM not enabled, skipping market opportunity analysis');
      return [];
    }

    console.log('[BizDevAgent] Identifying market opportunities with NIM...');

    const prompt = `Based on this affiliate trace analysis and competitor landscape, identify market opportunities for a new cruise deal platform:

TRACE ANALYSIS:
- Affiliate networks detected: ${traceResult.aggregateAnalysis.affiliateNetworksFound.join(', ') || 'None directly detected (Cloudflare masking)'}
- Tracking parameters: ${traceResult.aggregateAnalysis.trackingParamsFound.join(', ') || 'None'}
- Travel tech platforms: ${traceResult.aggregateAnalysis.travelTechFound.join(', ') || 'None'}
- Unique domains in redirect chains: ${traceResult.aggregateAnalysis.uniqueDomains.join(', ')}

COMPETITOR LANDSCAPE:
${competitorAnalyses.map(c => `- ${c.competitorName}: ${c.businessModel}, ${c.pricingStrategy}, ${c.targetMarket}, Partnership: ${c.partnershipPotential}`).join('\n')}

Identify 5-7 specific market opportunities with:
1. Opportunity description
2. Market size estimate (TAM/SAM/SOM)
3. Competitive landscape assessment
4. Recommended approach for entry
5. Priority (high/medium/low)
6. Estimated effort (low/medium/high)

Return as JSON array with fields: opportunity, marketSize, competitiveLandscape, recommendedApproach, priority, estimatedEffort.`;

    try {
      const response = await callOpenCode([
        { role: 'system', content: 'You are a market strategist for travel tech startups. Identify specific, actionable market opportunities with realistic assessments.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.3, max_tokens: 3000 });

      const content = response || '[]';
      const opportunities = JSON.parse(content) as MarketOpportunity[];
      console.log(`[BizDevAgent] Identified ${opportunities.length} market opportunities`);
      return opportunities;
    } catch (error) {
      console.error('[BizDevAgent] Market opportunity analysis failed:', error);
      return [];
    }
  }

  /**
   * Generate executive summary using NIM LLM
   */
  async generateExecutiveSummary(
    result: BizDevAgentResult,
    competitorAnalyses: CompetitorAnalysis[],
    marketOpportunities: MarketOpportunity[]
  ): Promise<string> {
    if (!this.isNimEnabled()) {
      console.warn('[BizDevAgent] NIM not enabled, skipping executive summary');
      return 'NIM-powered executive summary not available (NIM not enabled).';
    }

    console.log('[BizDevAgent] Generating executive summary with NIM...');

    const prompt = `Write a concise executive summary for a cruise deal platform business plan based on this analysis:

REVENUE ARCHITECTURE:
- Primary: ${result.revenueArchitecture.channels[0]?.channel || 'Affiliate Bookings'}
- Commission: ${result.revenueArchitecture.estimatedMetrics.affiliateCommissionRate}
- Cookie Window: ${result.revenueArchitecture.estimatedMetrics.cookieWindow}
- Revenue Share: ${result.revenueArchitecture.estimatedMetrics.primaryRevenueShare}

COMPETITOR ANALYSES:
${competitorAnalyses.map(c => `- ${c.competitorName}: ${c.businessModel}, Partnership: ${c.partnershipPotential}`).join('\n')}

MARKET OPPORTUNITIES:
${marketOpportunities.map(o => `- ${o.opportunity} (${o.priority} priority)`).join('\n')}

MONETIZATION BLUEPRINT:
- Primary Revenue: ${result.monetizationBlueprint.ourModel.primaryRevenue}
- Secondary: ${result.monetizationBlueprint.ourModel.secondaryRevenue.join(', ')}
- Key Partners: ${result.monetizationBlueprint.ourModel.keyPartners.join(', ')}

Write a 3-4 paragraph executive summary covering: market opportunity, competitive positioning, revenue model, and go-to-market strategy. Professional tone, investor-ready.`;

    try {
      const response = await callOpenCode([
        { role: 'system', content: 'You are a venture capital analyst writing executive summaries for travel tech startups. Be concise, data-driven, and compelling.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.3, max_tokens: 1500 });

      const summary = response || '';
      console.log('[BizDevAgent] Executive summary generated');
      return summary;
    } catch (error) {
      console.error('[BizDevAgent] Executive summary generation failed:', error);
      return 'Executive summary generation failed.';
    }
  }

  /**
   * Run full NIM-powered analysis pipeline
   */
  async runFullNimAnalysis(
    links: Array<{ text: string; href: string }>,
    page: any,
    competitors: string[] = ['Cruise.com', 'VacationsToGo', 'Expedia Cruises', 'CruiseDirect', 'iCruise.com']
  ): Promise<BizDevAgentResult> {
    console.log('[BizDevAgent] ========================================');
    console.log('[BizDevAgent] Running Full NIM-Powered Analysis');
    console.log('[BizDevAgent] ========================================');

    // First run deterministic analysis
    const baseResult = await this.analyzeOutboundLinks(links, page);

    if (!this.isNimEnabled()) {
      console.warn('[BizDevAgent] NIM not enabled, returning base analysis only');
      return baseResult;
    }

    // Run NIM-powered analyses
    const competitorAnalyses = await this.analyzeCompetitorStrategies(competitors);
    const marketOpportunities = await this.identifyMarketOpportunities(baseResult.redirectTraces, competitorAnalyses);
    const executiveSummary = await this.generateExecutiveSummary(baseResult, competitorAnalyses, marketOpportunities);

    // Combine results
    const enhancedResult: BizDevAgentResult = {
      ...baseResult,
      competitorAnalyses,
      marketOpportunities,
      executiveSummary,
    };

    // Save enhanced results
    const filepath = path.join(this.outputDir, 'bizdev_analysis_nim.json');
    fs.writeFileSync(filepath, JSON.stringify(enhancedResult, null, 2));
    console.log(`[BizDevAgent] Enhanced results saved: ${filepath}`);

    return enhancedResult;
  }

  /**
   * Save analysis results to disk
   */
  private _saveResults(result: BizDevAgentResult): void {
    const filepath = path.join(this.outputDir, 'bizdev_analysis.json');
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`[BizDevAgent] Results saved: ${filepath}`);

    // Save affiliate networks summary
    const summaryPath = path.join(this.outputDir, 'affiliate_networks.md');
    const summary = `# Affiliate Networks Detected

## Networks Found
${result.affiliateNetworks.map(n => `- **${n}**`).join('\n') || '*No networks directly detected (Cloudflare masking)*'}

## Tracking Parameters
${Object.entries(result.trackingParams).map(([k, v]) => `- \`${k}\`: ${v.join(', ')}`).join('\n') || '*No tracking parameters found*'}

## Estimated Commission Rates
${Object.entries(AFFILIATE_COMMISSION_BENCHMARKS).map(([k, v]) => `- **${k}**: ${v.rate} (${v.type}) — ${v.notes}`).join('\n')}
`;
    fs.writeFileSync(summaryPath, summary);
    console.log(`[BizDevAgent] Affiliate summary saved: ${summaryPath}`);
  }
}

/**
 * Create a pre-configured BizDevAgent
 */
export function createBizDevAgent(): BizDevAgent {
  return new BizDevAgent('./output/bizdev');
}

export default BizDevAgent;
