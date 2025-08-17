/**
 * Text normalization utilities for name processing and diacritics handling
 */

/**
 * Normalizes German diacritics and special characters
 * ä->ae, ö->oe, ü->ue, ß->ss (and uppercase variants)
 */
export function normalizeDiacritics(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/ä/g, 'ae')
    .replace(/Ä/g, 'Ae')
    .replace(/ö/g, 'oe')
    .replace(/Ö/g, 'Oe')
    .replace(/ü/g, 'ue')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

/**
 * Trims and collapses internal whitespace to single spaces
 */
export function collapseSpaces(text: string): string {
  if (!text) return text;
  
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Splits a name string at the first comma
 * @param rawName - Name in format "Last, First" or just "Last"
 * @returns Object with last and first name parts
 */
export function splitName(rawName: string): { last: string; first: string } {
  if (!rawName) {
    return { last: '', first: '' };
  }

  const trimmed = rawName.trim();
  const commaIndex = trimmed.indexOf(',');
  
  if (commaIndex === -1) {
    // No comma found, treat entire string as last name
    return { last: trimmed, first: '' };
  }
  
  const last = trimmed.substring(0, commaIndex).trim();
  const first = trimmed.substring(commaIndex + 1).trim();
  
  return { last, first };
}

/**
 * Creates a normalized name key for matching purposes
 * Combines last and first name with pipe separator, normalized and lowercased
 */
export function nameKey(last: string, first: string): string {
  const normalizedLast = collapseSpaces(normalizeDiacritics(last || '')).toLowerCase();
  const normalizedFirst = collapseSpaces(normalizeDiacritics(first || '')).toLowerCase();
  
  return `${normalizedLast}|${normalizedFirst}`;
}

/**
 * Creates a normalized name key from a raw name string
 * Convenience function that combines splitName and nameKey
 */
export function nameKeyFromRaw(rawName: string): string {
  const { last, first } = splitName(rawName);
  return nameKey(last, first);
}
