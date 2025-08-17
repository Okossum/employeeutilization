"use strict";
/**
 * Unit tests for normalize.ts functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const normalize_1 = require("../lib/normalize");
describe('normalize.ts', () => {
    describe('normalizeDiacritics', () => {
        it('should normalize German umlauts', () => {
            expect((0, normalize_1.normalizeDiacritics)('Müller')).toBe('mueller');
            expect((0, normalize_1.normalizeDiacritics)('Ömer')).toBe('oemer');
            expect((0, normalize_1.normalizeDiacritics)('Äpfel')).toBe('aepfel');
            expect((0, normalize_1.normalizeDiacritics)('Weiß')).toBe('weiss');
        });
        it('should normalize other European diacritics', () => {
            expect((0, normalize_1.normalizeDiacritics)('José')).toBe('jose');
            expect((0, normalize_1.normalizeDiacritics)('François')).toBe('francois');
            expect((0, normalize_1.normalizeDiacritics)('Łukasz')).toBe('lukasz');
            expect((0, normalize_1.normalizeDiacritics)('Škoda')).toBe('skoda');
        });
        it('should convert to lowercase', () => {
            expect((0, normalize_1.normalizeDiacritics)('MUELLER')).toBe('mueller');
            expect((0, normalize_1.normalizeDiacritics)('Schmidt')).toBe('schmidt');
        });
        it('should handle empty and special characters', () => {
            expect((0, normalize_1.normalizeDiacritics)('')).toBe('');
            expect((0, normalize_1.normalizeDiacritics)('O\'Connor')).toBe('o\'connor');
            expect((0, normalize_1.normalizeDiacritics)('Jean-Pierre')).toBe('jean-pierre');
        });
    });
    describe('parseAndNormalizeName', () => {
        it('should parse valid name formats', () => {
            const result1 = (0, normalize_1.parseAndNormalizeName)('Schmidt, Hans');
            expect(result1.lastName).toBe('Schmidt');
            expect(result1.firstName).toBe('Hans');
            expect(result1.normalizedName).toBe('schmidt|hans');
            expect(result1.rawName).toBe('Schmidt, Hans');
            const result2 = (0, normalize_1.parseAndNormalizeName)('Müller,Maria');
            expect(result2.lastName).toBe('Müller');
            expect(result2.firstName).toBe('Maria');
            expect(result2.normalizedName).toBe('mueller|maria');
        });
        it('should handle names with spaces', () => {
            const result = (0, normalize_1.parseAndNormalizeName)('von Neumann, John');
            expect(result.lastName).toBe('von Neumann');
            expect(result.firstName).toBe('John');
            expect(result.normalizedName).toBe('von neumann|john');
        });
        it('should handle names with diacritics', () => {
            const result = (0, normalize_1.parseAndNormalizeName)('Müller-Weiß, François');
            expect(result.lastName).toBe('Müller-Weiß');
            expect(result.firstName).toBe('François');
            expect(result.normalizedName).toBe('mueller-weiss|francois');
        });
        it('should throw error for invalid formats', () => {
            expect(() => (0, normalize_1.parseAndNormalizeName)('Schmidt Hans')).toThrow('Invalid name format');
            expect(() => (0, normalize_1.parseAndNormalizeName)('Schmidt,')).toThrow('Invalid name components');
            expect(() => (0, normalize_1.parseAndNormalizeName)(',Hans')).toThrow('Invalid name components');
            expect(() => (0, normalize_1.parseAndNormalizeName)('')).toThrow('Invalid name format');
        });
    });
    describe('nameKey', () => {
        it('should create normalized name keys', () => {
            expect((0, normalize_1.nameKey)('Schmidt', 'Hans')).toBe('schmidt|hans');
            expect((0, normalize_1.nameKey)('Müller', 'María')).toBe('mueller|maria');
            expect((0, normalize_1.nameKey)('O\'Connor', 'Sean')).toBe('o\'connor|sean');
        });
        it('should handle multiple spaces', () => {
            expect((0, normalize_1.nameKey)('von  Neumann', 'John   Paul')).toBe('von neumann|john paul');
        });
        it('should handle empty strings', () => {
            expect((0, normalize_1.nameKey)('', '')).toBe('|');
            expect((0, normalize_1.nameKey)('Schmidt', '')).toBe('schmidt|');
        });
    });
    describe('normalizeCompetenceCenter', () => {
        it('should only trim whitespace', () => {
            expect((0, normalize_1.normalizeCompetenceCenter)('  Software Development  ')).toBe('Software Development');
            expect((0, normalize_1.normalizeCompetenceCenter)('Consulting')).toBe('Consulting');
            expect((0, normalize_1.normalizeCompetenceCenter)('')).toBe('');
        });
        it('should preserve case and internal spaces', () => {
            expect((0, normalize_1.normalizeCompetenceCenter)('IT Management & Operations')).toBe('IT Management & Operations');
            expect((0, normalize_1.normalizeCompetenceCenter)('Data Science')).toBe('Data Science');
        });
    });
    describe('createEntryDocId', () => {
        it('should create proper document IDs', () => {
            expect((0, normalize_1.createEntryDocId)('schmidt|hans', 'Software Development'))
                .toBe('schmidt|hans|Software Development');
            expect((0, normalize_1.createEntryDocId)('mueller|maria', 'Consulting'))
                .toBe('mueller|maria|Consulting');
        });
        it('should handle competence centers with spaces', () => {
            expect((0, normalize_1.createEntryDocId)('doe|john', 'IT Management & Operations'))
                .toBe('doe|john|IT Management & Operations');
        });
    });
    describe('createAliasDocId', () => {
        it('should create proper alias document IDs', () => {
            expect((0, normalize_1.createAliasDocId)('schmidt|hans', 'Software Development'))
                .toBe('schmidt|hans|Software Development');
        });
        it('should be identical to createEntryDocId output', () => {
            const normalizedName = 'mueller|maria';
            const cc = 'Data Science';
            expect((0, normalize_1.createAliasDocId)(normalizedName, cc))
                .toBe((0, normalize_1.createEntryDocId)(normalizedName, cc));
        });
    });
});
//# sourceMappingURL=normalize.test.js.map