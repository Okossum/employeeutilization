/**
 * Unit tests for normalization utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeDiacritics, 
  collapseSpaces, 
  splitName, 
  nameKey, 
  nameKeyFromRaw 
} from '../normalize';

describe('normalizeDiacritics', () => {
  it('converts German umlauts and eszett correctly', () => {
    expect(normalizeDiacritics('ä')).toBe('ae');
    expect(normalizeDiacritics('Ä')).toBe('Ae');
    expect(normalizeDiacritics('ö')).toBe('oe');
    expect(normalizeDiacritics('Ö')).toBe('Oe');
    expect(normalizeDiacritics('ü')).toBe('ue');
    expect(normalizeDiacritics('Ü')).toBe('Ue');
    expect(normalizeDiacritics('ß')).toBe('ss');
  });

  it('handles complex names with multiple diacritics', () => {
    expect(normalizeDiacritics('Bäuerle')).toBe('Baeuerle');
    expect(normalizeDiacritics('Müller')).toBe('Mueller');
    expect(normalizeDiacritics('Jürgen')).toBe('Juergen');
    expect(normalizeDiacritics('Weiß')).toBe('Weiss');
  });

  it('leaves regular characters unchanged', () => {
    expect(normalizeDiacritics('Smith')).toBe('Smith');
    expect(normalizeDiacritics('Jones123')).toBe('Jones123');
  });

  it('handles empty and null inputs', () => {
    expect(normalizeDiacritics('')).toBe('');
    expect(normalizeDiacritics(null as any)).toBe(null);
    expect(normalizeDiacritics(undefined as any)).toBe(undefined);
  });
});

describe('collapseSpaces', () => {
  it('trims leading and trailing spaces', () => {
    expect(collapseSpaces('  hello  ')).toBe('hello');
  });

  it('collapses multiple internal spaces to single space', () => {
    expect(collapseSpaces('hello    world')).toBe('hello world');
    expect(collapseSpaces('a  b   c    d')).toBe('a b c d');
  });

  it('handles tabs and other whitespace', () => {
    expect(collapseSpaces('hello\t\tworld')).toBe('hello world');
    expect(collapseSpaces('hello\n\nworld')).toBe('hello world');
  });

  it('handles empty and null inputs', () => {
    expect(collapseSpaces('')).toBe('');
    expect(collapseSpaces('   ')).toBe('');
    expect(collapseSpaces(null as any)).toBe(null);
    expect(collapseSpaces(undefined as any)).toBe(undefined);
  });
});

describe('splitName', () => {
  it('splits name at first comma correctly', () => {
    const result = splitName('Doe, John');
    expect(result).toEqual({ last: 'Doe', first: 'John' });
  });

  it('handles names with middle names', () => {
    const result = splitName('Doe, John Michael');
    expect(result).toEqual({ last: 'Doe', first: 'John Michael' });
  });

  it('handles names with multiple commas', () => {
    const result = splitName('Doe, Jr., John');
    expect(result).toEqual({ last: 'Doe', first: 'Jr., John' });
  });

  it('handles names without comma (last name only)', () => {
    const result = splitName('Doe');
    expect(result).toEqual({ last: 'Doe', first: '' });
  });

  it('handles names with extra spaces', () => {
    const result = splitName('  Doe  ,  John  ');
    expect(result).toEqual({ last: 'Doe', first: 'John' });
  });

  it('handles empty inputs', () => {
    expect(splitName('')).toEqual({ last: '', first: '' });
    expect(splitName(null as any)).toEqual({ last: '', first: '' });
    expect(splitName(undefined as any)).toEqual({ last: '', first: '' });
  });

  it('handles edge cases', () => {
    expect(splitName(',')).toEqual({ last: '', first: '' });
    expect(splitName('Doe,')).toEqual({ last: 'Doe', first: '' });
    expect(splitName(',John')).toEqual({ last: '', first: 'John' });
  });
});

describe('nameKey', () => {
  it('creates normalized key with pipe separator', () => {
    const result = nameKey('Doe', 'John');
    expect(result).toBe('doe|john');
  });

  it('normalizes diacritics in both parts', () => {
    const result = nameKey('Bäuerle', 'Jürgen');
    expect(result).toBe('baeuerle|juergen');
  });

  it('collapses spaces in both parts', () => {
    const result = nameKey('Van  Der  Berg', 'John   Michael');
    expect(result).toBe('van der berg|john michael');
  });

  it('handles empty parts', () => {
    expect(nameKey('Doe', '')).toBe('doe|');
    expect(nameKey('', 'John')).toBe('|john');
    expect(nameKey('', '')).toBe('|');
  });

  it('handles mixed case consistently', () => {
    expect(nameKey('DOE', 'JOHN')).toBe('doe|john');
    expect(nameKey('dOe', 'JoHn')).toBe('doe|john');
  });
});

describe('nameKeyFromRaw', () => {
  it('processes the example case correctly', () => {
    const result = nameKeyFromRaw('Bäuerle, Jürgen');
    expect(result).toBe('baeuerle|juergen');
  });

  it('handles complex names with spaces and diacritics', () => {
    const result = nameKeyFromRaw('Van Der Müller, Hans-Jürgen');
    expect(result).toBe('van der mueller|hans-juergen');
  });

  it('handles names without comma', () => {
    const result = nameKeyFromRaw('Bäuerle');
    expect(result).toBe('baeuerle|');
  });

  it('handles names with extra whitespace', () => {
    const result = nameKeyFromRaw('  Müller  ,  Jürgen  ');
    expect(result).toBe('mueller|juergen');
  });

  it('handles empty input', () => {
    expect(nameKeyFromRaw('')).toBe('|');
  });

  it('processes various real-world examples', () => {
    expect(nameKeyFromRaw('Koss, Oliver')).toBe('koss|oliver');
    expect(nameKeyFromRaw('Weiß, Jürgen')).toBe('weiss|juergen');
    expect(nameKeyFromRaw('Schäfer-Gümbel, Thorsten')).toBe('schaefer-guembel|thorsten');
  });
});

