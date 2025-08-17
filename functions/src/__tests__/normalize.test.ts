/**
 * Unit tests for normalize.ts functions
 */

import {
  normalizeDiacritics,
  parseAndNormalizeName,
  nameKey,
  normalizeCompetenceCenter,
  createEntryDocId,
  createAliasDocId
} from '../lib/normalize';

describe('normalize.ts', () => {
  describe('normalizeDiacritics', () => {
    it('should normalize German umlauts', () => {
      expect(normalizeDiacritics('Müller')).toBe('mueller');
      expect(normalizeDiacritics('Ömer')).toBe('oemer');
      expect(normalizeDiacritics('Äpfel')).toBe('aepfel');
      expect(normalizeDiacritics('Weiß')).toBe('weiss');
    });

    it('should normalize other European diacritics', () => {
      expect(normalizeDiacritics('José')).toBe('jose');
      expect(normalizeDiacritics('François')).toBe('francois');
      expect(normalizeDiacritics('Łukasz')).toBe('lukasz');
      expect(normalizeDiacritics('Škoda')).toBe('skoda');
    });

    it('should convert to lowercase', () => {
      expect(normalizeDiacritics('MUELLER')).toBe('mueller');
      expect(normalizeDiacritics('Schmidt')).toBe('schmidt');
    });

    it('should handle empty and special characters', () => {
      expect(normalizeDiacritics('')).toBe('');
      expect(normalizeDiacritics('O\'Connor')).toBe('o\'connor');
      expect(normalizeDiacritics('Jean-Pierre')).toBe('jean-pierre');
    });
  });

  describe('parseAndNormalizeName', () => {
    it('should parse valid name formats', () => {
      const result1 = parseAndNormalizeName('Schmidt, Hans');
      expect(result1.lastName).toBe('Schmidt');
      expect(result1.firstName).toBe('Hans');
      expect(result1.normalizedName).toBe('schmidt|hans');
      expect(result1.rawName).toBe('Schmidt, Hans');

      const result2 = parseAndNormalizeName('Müller,Maria');
      expect(result2.lastName).toBe('Müller');
      expect(result2.firstName).toBe('Maria');
      expect(result2.normalizedName).toBe('mueller|maria');
    });

    it('should handle names with spaces', () => {
      const result = parseAndNormalizeName('von Neumann, John');
      expect(result.lastName).toBe('von Neumann');
      expect(result.firstName).toBe('John');
      expect(result.normalizedName).toBe('von neumann|john');
    });

    it('should handle names with diacritics', () => {
      const result = parseAndNormalizeName('Müller-Weiß, François');
      expect(result.lastName).toBe('Müller-Weiß');
      expect(result.firstName).toBe('François');
      expect(result.normalizedName).toBe('mueller-weiss|francois');
    });

    it('should throw error for invalid formats', () => {
      expect(() => parseAndNormalizeName('Schmidt Hans')).toThrow('Invalid name format');
      expect(() => parseAndNormalizeName('Schmidt,')).toThrow('Invalid name components');
      expect(() => parseAndNormalizeName(',Hans')).toThrow('Invalid name components');
      expect(() => parseAndNormalizeName('')).toThrow('Invalid name format');
    });
  });

  describe('nameKey', () => {
    it('should create normalized name keys', () => {
      expect(nameKey('Schmidt', 'Hans')).toBe('schmidt|hans');
      expect(nameKey('Müller', 'María')).toBe('mueller|maria');
      expect(nameKey('O\'Connor', 'Sean')).toBe('o\'connor|sean');
    });

    it('should handle multiple spaces', () => {
      expect(nameKey('von  Neumann', 'John   Paul')).toBe('von neumann|john paul');
    });

    it('should handle empty strings', () => {
      expect(nameKey('', '')).toBe('|');
      expect(nameKey('Schmidt', '')).toBe('schmidt|');
    });
  });

  describe('normalizeCompetenceCenter', () => {
    it('should only trim whitespace', () => {
      expect(normalizeCompetenceCenter('  Software Development  ')).toBe('Software Development');
      expect(normalizeCompetenceCenter('Consulting')).toBe('Consulting');
      expect(normalizeCompetenceCenter('')).toBe('');
    });

    it('should preserve case and internal spaces', () => {
      expect(normalizeCompetenceCenter('IT Management & Operations')).toBe('IT Management & Operations');
      expect(normalizeCompetenceCenter('Data Science')).toBe('Data Science');
    });
  });

  describe('createEntryDocId', () => {
    it('should create proper document IDs', () => {
      expect(createEntryDocId('schmidt|hans', 'Software Development'))
        .toBe('schmidt|hans|Software Development');
      expect(createEntryDocId('mueller|maria', 'Consulting'))
        .toBe('mueller|maria|Consulting');
    });

    it('should handle competence centers with spaces', () => {
      expect(createEntryDocId('doe|john', 'IT Management & Operations'))
        .toBe('doe|john|IT Management & Operations');
    });
  });

  describe('createAliasDocId', () => {
    it('should create proper alias document IDs', () => {
      expect(createAliasDocId('schmidt|hans', 'Software Development'))
        .toBe('schmidt|hans|Software Development');
    });

    it('should be identical to createEntryDocId output', () => {
      const normalizedName = 'mueller|maria';
      const cc = 'Data Science';
      expect(createAliasDocId(normalizedName, cc))
        .toBe(createEntryDocId(normalizedName, cc));
    });
  });
});
