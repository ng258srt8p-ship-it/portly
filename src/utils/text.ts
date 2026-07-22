/**
 * Text normalization utilities for consistent copy across all data-rendering components.
 * 
 * Handles:
 * - Double-word stuttering ("This is a This is a ...")
 * - Duplicate articles ("a a ...")
 * - Extra whitespace
 * - Common typo corrections
 */

/**
 * Clean a text string from API-generated content by removing common copy artifacts.
 */
export function cleanText(text: string): string {
  if (!text) return '';

  let result = text;

  // Remove double-word stutter (e.g., "This is a This is a ...")
  const stutterWords = ['This', 'There', 'The', 'A', 'An', 'Is', 'Was', 'Are', 'Have', 'Has', 'Had', 'Can', 'Could', 'Will', 'Would', 'May', 'Should'];
  for (const word of stutterWords) {
    const re = new RegExp(`\\b(${word})\\s+${word}\\b`, 'gi');
    while (result.match(re)) {
      result = result.replace(re, word);
    }
  }

  // Collapse "a a" -> "a" (articles repeated)
  const articleRe = /\ba\s+a\b/gi;
  while (result.match(articleRe)) {
    result = result.replace(articleRe, 'a');
  }

  // Collapse "This is a This is a" -> "This is a"
  const thisRe = /This is a This is a/gi;
  while (result.match(thisRe)) {
    result = result.replace(thisRe, 'This is a');
  }

  // Collapse "a This" -> "This"
  const aThisRe = /\ba\s+This\b/gi;
  while (result.match(aThisRe)) {
    result = result.replace(aThisRe, 'This');
  }

  // Collapse "a there" -> "there"
  const aThereRe = /\ba\s+there\b/gi;
  while (result.match(aThereRe)) {
    result = result.replace(aThereRe, 'there');
  }

  // Collapse multiple whitespace (tabs, newlines) into single spaces
  result = result.replace(/\s+/g, ' ');

  // Trim whitespace
  result = result.trim();

  // Fix multiple consecutive dots at end
  result = result.replace(/\.{3,}/g, '...');

  return result;
}
