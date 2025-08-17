"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// parseKWHeader is now internal function, testing through detectKWColumns instead
const isoWeek_1 = require("../lib/isoWeek");
describe('ISO Week utilities', () => {
    describe('parseKWHeader', () => {
        it('should parse valid KW headers', () => {
            expect(parseKWHeader('KW 33')).toBe(33);
            expect(parseKWHeader('KW33')).toBe(33);
            expect(parseKWHeader('kw 1')).toBe(1);
            expect(parseKWHeader(' KW 52 ')).toBe(52);
            expect(parseKWHeader('KW  15')).toBe(15);
        });
        it('should return null for invalid headers', () => {
            expect(parseKWHeader('KW 0')).toBeNull();
            expect(parseKWHeader('KW 54')).toBeNull();
            expect(parseKWHeader('Week 33')).toBeNull();
            expect(parseKWHeader('KW')).toBeNull();
            expect(parseKWHeader('KWabc')).toBeNull();
            expect(parseKWHeader('33')).toBeNull();
            expect(parseKWHeader('')).toBeNull();
            expect(parseKWHeader(null)).toBeNull();
            expect(parseKWHeader(undefined)).toBeNull();
        });
        it('should handle edge cases for week numbers', () => {
            expect(parseKWHeader('KW 1')).toBe(1);
            expect(parseKWHeader('KW 53')).toBe(53);
            expect(parseKWHeader('KW 0')).toBeNull();
            expect(parseKWHeader('KW 54')).toBeNull();
        });
    });
    describe('getISOWeekInfo', () => {
        it('should get correct ISO week info for known dates', () => {
            // January 1, 2025 is in week 1 of 2025
            const date1 = new Date(2025, 0, 1); // January 1, 2025
            const info1 = (0, isoWeek_1.getISOWeekInfo)(date1);
            expect(info1.isoYear).toBe(2025);
            expect(info1.isoWeek).toBe(1);
            // December 30, 2024 might be in week 1 of 2025 (depends on weekday)
            const date2 = new Date(2024, 11, 30); // December 30, 2024
            const info2 = (0, isoWeek_1.getISOWeekInfo)(date2);
            expect(info2.isoWeek).toBeGreaterThan(0);
            expect(info2.isoWeek).toBeLessThanOrEqual(53);
        });
    });
    describe('createISOKey', () => {
        it('should create correct ISO key format', () => {
            expect((0, isoWeek_1.createISOKey)(2025, 1)).toBe('2025-W01');
            expect((0, isoWeek_1.createISOKey)(2025, 33)).toBe('2025-W33');
            expect((0, isoWeek_1.createISOKey)(2024, 52)).toBe('2024-W52');
        });
        it('should pad single-digit weeks with zero', () => {
            expect((0, isoWeek_1.createISOKey)(2025, 5)).toBe('2025-W05');
            expect((0, isoWeek_1.createISOKey)(2025, 9)).toBe('2025-W09');
        });
    });
    describe('calculateWeekOffset', () => {
        it('should calculate correct week offsets', () => {
            const base = (0, isoWeek_1.calculateWeekOffset)(2025, 10, 0);
            expect(base.isoYear).toBe(2025);
            expect(base.isoWeek).toBe(10);
            expect(base.isoKey).toBe('2025-W10');
            const next = (0, isoWeek_1.calculateWeekOffset)(2025, 10, 1);
            expect(next.isoWeek).toBe(11);
            const prev = (0, isoWeek_1.calculateWeekOffset)(2025, 10, -1);
            expect(prev.isoWeek).toBe(9);
        });
        it('should handle year boundaries correctly', () => {
            // Week 52 + 2 weeks should go into next year
            const result = (0, isoWeek_1.calculateWeekOffset)(2024, 52, 2);
            expect(result.isoYear).toBe(2025);
            expect(result.isoWeek).toBeGreaterThan(0);
            expect(result.isoWeek).toBeLessThanOrEqual(53);
            // Week 2 - 3 weeks should go into previous year
            const result2 = (0, isoWeek_1.calculateWeekOffset)(2025, 2, -3);
            expect(result2.isoYear).toBe(2024);
            expect(result2.isoWeek).toBeGreaterThan(50);
        });
    });
    describe('parseGermanDate', () => {
        it('should parse valid German date formats', () => {
            const date1 = (0, isoWeek_1.parseGermanDate)('17.08.2025');
            expect(date1.getFullYear()).toBe(2025);
            expect(date1.getMonth()).toBe(7); // August is month 7 (0-based)
            expect(date1.getDate()).toBe(17);
            const date2 = (0, isoWeek_1.parseGermanDate)('1.1.2024');
            expect(date2.getFullYear()).toBe(2024);
            expect(date2.getMonth()).toBe(0); // January
            expect(date2.getDate()).toBe(1);
        });
        it('should throw error for invalid formats', () => {
            expect(() => (0, isoWeek_1.parseGermanDate)('2025-08-17')).toThrow('Invalid German date format');
            expect(() => (0, isoWeek_1.parseGermanDate)('17/08/2025')).toThrow('Invalid German date format');
            expect(() => (0, isoWeek_1.parseGermanDate)('abc')).toThrow('Invalid German date format');
            expect(() => (0, isoWeek_1.parseGermanDate)('')).toThrow('Invalid German date format');
        });
        it('should throw error for invalid dates', () => {
            expect(() => (0, isoWeek_1.parseGermanDate)('32.01.2025')).toThrow('Invalid date');
            expect(() => (0, isoWeek_1.parseGermanDate)('01.13.2025')).toThrow('Invalid date');
            expect(() => (0, isoWeek_1.parseGermanDate)('29.02.2023')).toThrow('Invalid date'); // Not a leap year
        });
    });
    describe('parseA1Content', () => {
        it('should parse valid A1 content', () => {
            const result1 = (0, isoWeek_1.parseA1Content)('Einsatzplan-Export für KW 33 (2025). Stand: 17.08.2025');
            expect(result1.planWeek).toBe(33);
            expect(result1.planYear).toBe(2025);
            expect(result1.generatedAt.getFullYear()).toBe(2025);
            expect(result1.generatedAt.getMonth()).toBe(7); // August
            expect(result1.generatedAt.getDate()).toBe(17);
            const result2 = (0, isoWeek_1.parseA1Content)('Auslastung für KW 1 (2024). Stand: 1.1.2024');
            expect(result2.planWeek).toBe(1);
            expect(result2.planYear).toBe(2024);
        });
        it('should handle different formats', () => {
            const result = (0, isoWeek_1.parseA1Content)('Plan KW  15  ( 2025 ) Stand:  5.4.2025 ');
            expect(result.planWeek).toBe(15);
            expect(result.planYear).toBe(2025);
            expect(result.generatedAt.getDate()).toBe(5);
            expect(result.generatedAt.getMonth()).toBe(3); // April
        });
        it('should throw error for missing information', () => {
            expect(() => (0, isoWeek_1.parseA1Content)('Invalid content')).toThrow('Could not extract KW and year');
            expect(() => (0, isoWeek_1.parseA1Content)('KW 33 (2025)')).toThrow('Could not extract date');
            expect(() => (0, isoWeek_1.parseA1Content)('Stand: 17.08.2025')).toThrow('Could not extract KW and year');
        });
    });
});
//# sourceMappingURL=isoWeek.test.js.map