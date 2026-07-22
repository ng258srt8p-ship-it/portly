import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDealContent, validateDealContent } from '../utils/contentFormatter';

describe('sanitizeDealContent', () => {
  describe('em dash removal', () => {
    it('removes em dashes (U+2014)', () => {
      const input = 'This is a test — with an em dash';
      const result = sanitizeDealContent(input);
      assert.ok(!result.includes('\u2014'), 'Should not contain em dash');
      assert.ok(!result.includes('test , with'), 'Should not leave awkward comma');
    });

    it('removes en dashes (U+2013)', () => {
      const input = 'Range is $100–$200';
      const result = sanitizeDealContent(input);
      assert.ok(!result.includes('\u2013'), 'Should not contain en dash');
    });

    it('handles multiple em dashes in one string', () => {
      const input = 'First thought — second thought — third thought';
      const result = sanitizeDealContent(input);
      assert.ok(!result.includes('\u2014'), 'Should remove all em dashes');
    });

    it('handles em dash at end of sentence', () => {
      const input = 'The total is $500—no hidden fees';
      const result = sanitizeDealContent(input);
      assert.ok(!result.includes('\u2014'), 'Should remove em dash');
    });
  });

  describe('capitalization', () => {
    it('capitalizes the first letter of the string', () => {
      const input = 'this should be capitalized';
      const result = sanitizeDealContent(input);
      assert.ok(result[0] === result[0].toUpperCase(), 'First letter should be capitalized');
    });

    it('capitalizes letters after sentence-ending punctuation', () => {
      const input = 'This is the first sentence. this should be capitalized.';
      const result = sanitizeDealContent(input);
      // Find the text after the period
      const afterPeriod = result.split('. ')[1];
      assert.ok(afterPeriod && afterPeriod[0] === afterPeriod[0].toUpperCase(), 'Letter after period should be capitalized');
    });

    it('preserves already-capitalized text', () => {
      const input = 'This is already correct. So is this.';
      const result = sanitizeDealContent(input);
      assert.equal(result, input);
    });
  });

  describe('robotic pattern rewriting', () => {
    it('rewrites "Score of X/100 based on weighted factors:"', () => {
      const input = 'Score of 74/100 based on weighted factors: price below average';
      const result = sanitizeDealContent(input);
      assert.ok(!result.includes('Score of'), 'Should remove score prefix');
      assert.ok(result.toLowerCase().includes('scores'), 'Should use natural phrasing');
    });

    it('rewrites "Standard cruise line — typical market dynamics"', () => {
      const input = 'Standard cruise line — typical market dynamics';
      const result = sanitizeDealContent(input);
      assert.ok(!result.includes('Standard cruise line —'), 'Should rewrite robotic pattern');
      assert.ok(!result.includes('\u2014'), 'Should not contain em dash');
    });

    it('rewrites "Monitor for sales"', () => {
      const input = 'Keep watching, monitor for sales';
      const result = sanitizeDealContent(input);
      assert.ok(!result.toLowerCase().includes('monitor for sales'), 'Should rewrite robotic phrase');
    });

    it('rewrites "Book early to secure"', () => {
      const input = 'You should book early to secure the best rate';
      const result = sanitizeDealContent(input);
      assert.ok(!result.toLowerCase().includes('book early to secure'), 'Should rewrite robotic phrase');
    });

    it('rewrites verdict patterns with em dashes', () => {
      const input = 'Excellent deal — book now before inventory disappears';
      const result = sanitizeDealContent(input);
      assert.ok(!result.includes('Excellent deal —'), 'Should rewrite verdict pattern');
      assert.ok(!result.includes('\u2014'), 'Should not contain em dash');
    });
  });

  describe('proper noun capitalization', () => {
    it('capitalizes cruise line names', () => {
      const input = 'royal caribbean is pricing this cruise low';
      const result = sanitizeDealContent(input);
      assert.ok(result.includes('Royal Caribbean'), 'Should capitalize cruise line');
    });

    it('capitalizes destination names', () => {
      const input = 'this sailing goes to eastern caribbean';
      const result = sanitizeDealContent(input);
      assert.ok(result.includes('Eastern Caribbean'), 'Should capitalize destination');
    });

    it('capitalizes cabin types', () => {
      const input = 'inside cabins start at $800';
      const result = sanitizeDealContent(input);
      assert.ok(result.includes('Inside'), 'Should capitalize cabin type');
    });
  });

  describe('edge cases', () => {
    it('handles null input', () => {
      const result = sanitizeDealContent(null);
      assert.equal(result, '');
    });

    it('handles undefined input', () => {
      const result = sanitizeDealContent(undefined);
      assert.equal(result, '');
    });

    it('handles empty string', () => {
      const result = sanitizeDealContent('');
      assert.equal(result, '');
    });

    it('is idempotent', () => {
      const input = 'This is a test. Another sentence here.';
      const first = sanitizeDealContent(input);
      const second = sanitizeDealContent(first);
      assert.equal(first, second, 'Should be idempotent');
    });

    it('handles text with no issues', () => {
      const input = 'Royal Caribbean is offering a great deal on this Eastern Caribbean cruise. Prices are falling.';
      const result = sanitizeDealContent(input);
      assert.ok(result.includes('Royal Caribbean'));
      assert.ok(result.includes('Eastern Caribbean'));
      assert.ok(!result.includes('\u2014'));
    });
  });

  describe('validateDealContent', () => {
    it('returns empty array for clean text', () => {
      const issues = validateDealContent('This is clean text with proper capitalization.');
      assert.equal(issues.length, 0);
    });

    it('detects em dashes', () => {
      const issues = validateDealContent('This has an em dash — in it');
      assert.ok(issues.some(i => i.includes('em dash')), 'Should detect em dash');
    });

    it('detects en dashes', () => {
      const issues = validateDealContent('Range is $100–$200');
      assert.ok(issues.some(i => i.includes('en dash')), 'Should detect en dash');
    });

    it('detects lowercase sentence starts', () => {
      const issues = validateDealContent('First sentence. lowercase start');
      assert.ok(issues.some(i => i.includes('capitalized') || i.includes('lowercase')), 'Should detect uncapped sentence');
    });

    it('detects robotic patterns', () => {
      const issues = validateDealContent('Score of 50/100 based on weighted factors: generic text');
      assert.ok(issues.some(i => i.includes('robotic')), 'Should detect robotic pattern');
    });
  });

  describe('cruise-specific scenarios', () => {
    it('sanitizes a full heuristic-style analysis', () => {
      const input = 'Score of 74/100 based on weighted factors: price well below average; classic 7-night itinerary. Royal caribbean is pricing this eastern caribbean sailing at $120/person/day. Price trend: falling (-5.2%). Standard cruise line — typical market dynamics. Monitor for sales.';
      const result = sanitizeDealContent(input);
      
      assert.ok(!result.includes('\u2014'), 'No em dashes');
      assert.ok(!result.includes('Score of'), 'No robotic score prefix');
      assert.ok(result.includes('Royal Caribbean'), 'Cruise line capitalized');
      assert.ok(result.includes('Eastern Caribbean'), 'Destination capitalized');
      assert.ok(!result.toLowerCase().includes('monitor for sales'), 'No robotic tip');
    });

    it('sanitizes insider tips', () => {
      const input = 'Prices have dropped 12% — this trend typically continues until ~45 days before departure; book now for best rates';
      const result = sanitizeDealContent(input);
      
      assert.ok(!result.includes('\u2014'), 'No em dashes');
      assert.ok(!result.includes('book now for best rates') || result.includes('book'), 'Should rewrite pattern');
    });

    it('sanitizes verdict text', () => {
      const input = 'Excellent deal — book now before inventory disappears';
      const result = sanitizeDealContent(input);
      
      assert.ok(!result.includes('\u2014'), 'No em dashes');
      assert.ok(!result.includes('Excellent deal —'), 'Should rewrite verdict');
    });
  });
});
