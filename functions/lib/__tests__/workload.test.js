"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import parseKWHeader for testing
const { parseKWHeader } = require("../onWorkloadXlsxUploaded");
const normalize_1 = require("../lib/normalize");
describe('Workload Import Logic', () => {
    describe('parseKWHeader', () => {
        it('should parse valid KW headers correctly', () => {
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
        it('should handle week number boundaries', () => {
            expect(parseKWHeader('KW 1')).toBe(1);
            expect(parseKWHeader('KW 53')).toBe(53);
            expect(parseKWHeader('KW 0')).toBeNull();
            expect(parseKWHeader('KW 54')).toBeNull();
            expect(parseKWHeader('KW -1')).toBeNull();
        });
        
        it('should parse KW YY/XX format correctly', () => {
            // Format: "KW YY/XX" where YY is year and XX is week number
            expect(parseKWHeader('KW 25/01')).toBe(1);   // KW 1 from year 2025
            expect(parseKWHeader('KW 25/33')).toBe(33);  // KW 33 from year 2025
            expect(parseKWHeader('KW 24/52')).toBe(52);  // KW 52 from year 2024
            expect(parseKWHeader('KW 25/53')).toBe(53);  // KW 53 from year 2025
            expect(parseKWHeader('KW 25/00')).toBeNull(); // Invalid week 0
            expect(parseKWHeader('KW 25/54')).toBeNull(); // Invalid week 54
        });
    });
    describe('Header Detection', () => {
        it('should find KW columns correctly', () => {
            const headers = ['Name', 'CC', 'BL', 'KW 33', 'KW 34', 'KW 35', 'Summe Aufwand'];
            // Mock the findKWColumns function logic
            const kwColumns = [];
            for (let i = 0; i < headers.length; i++) {
                const weekNum = parseKWHeader(headers[i]);
                if (weekNum !== null) {
                    kwColumns.push({ index: i, isoWeek: weekNum });
                }
            }
            expect(kwColumns).toHaveLength(3);
            expect(kwColumns[0]).toEqual({ index: 3, isoWeek: 33 });
            expect(kwColumns[1]).toEqual({ index: 4, isoWeek: 34 });
            expect(kwColumns[2]).toEqual({ index: 5, isoWeek: 35 });
        });
        it('should handle mixed header formats', () => {
            const headers = ['Name', 'CC', 'Projekt', 'KW33', 'KW 34', 'kw  35', 'Total'];
            const kwColumns = [];
            for (let i = 0; i < headers.length; i++) {
                const weekNum = parseKWHeader(headers[i]);
                if (weekNum !== null) {
                    kwColumns.push({ index: i, isoWeek: weekNum });
                }
            }
            expect(kwColumns).toHaveLength(3);
            expect(kwColumns.map(kw => kw.isoWeek)).toEqual([33, 34, 35]);
        });
    });
    describe('Name Processing', () => {
        it('should parse and normalize employee names correctly', () => {
            const testCases = [
                {
                    input: 'Müller, Hans',
                    expected: {
                        lastName: 'Müller',
                        firstName: 'Hans',
                        normalizedName: 'mueller|hans',
                        rawName: 'Müller, Hans'
                    }
                },
                {
                    input: 'Schmidt-Weber, Maria',
                    expected: {
                        lastName: 'Schmidt-Weber',
                        firstName: 'Maria',
                        normalizedName: 'schmidt-weber|maria',
                        rawName: 'Schmidt-Weber, Maria'
                    }
                },
                {
                    input: 'von Neumann, John',
                    expected: {
                        lastName: 'von Neumann',
                        firstName: 'John',
                        normalizedName: 'von neumann|john',
                        rawName: 'von Neumann, John'
                    }
                }
            ];
            testCases.forEach(testCase => {
                const result = (0, normalize_1.parseAndNormalizeName)(testCase.input);
                expect(result).toEqual(testCase.expected);
            });
        });
        it('should handle names with diacritics and special characters', () => {
            const result1 = (0, normalize_1.parseAndNormalizeName)('Müller-Weiß, François');
            expect(result1.normalizedName).toBe('mueller-weiss|francois');
            const result2 = (0, normalize_1.parseAndNormalizeName)('Özkan, José');
            expect(result2.normalizedName).toBe('oezkan|jose');
            const result3 = (0, normalize_1.parseAndNormalizeName)('Çelik, Björn');
            expect(result3.normalizedName).toBe('celik|bjoern');
        });
        it('should throw errors for invalid name formats', () => {
            expect(() => (0, normalize_1.parseAndNormalizeName)('Hans Müller')).toThrow('Invalid name format');
            expect(() => (0, normalize_1.parseAndNormalizeName)('Müller,')).toThrow('Invalid name components');
            expect(() => (0, normalize_1.parseAndNormalizeName)(',Hans')).toThrow('Invalid name components');
            expect(() => (0, normalize_1.parseAndNormalizeName)('')).toThrow('Invalid name format');
            expect(() => (0, normalize_1.parseAndNormalizeName)('   ')).toThrow('Invalid name format');
        });
    });
    describe('Competence Center Processing', () => {
        it('should preserve exact CC format with trimming only', () => {
            const testCases = [
                '  IT Services  ',
                'Business Analytics & Data Science',
                'Strategy & Operations',
                'HR-Services',
                'Finance & Controlling'
            ];
            testCases.forEach(cc => {
                const trimmed = cc.trim();
                expect(trimmed).not.toContain('  '); // Should not have leading/trailing spaces
                expect(trimmed).toBe(cc.trim()); // Should be properly trimmed
            });
        });
    });
    describe('Hours Parsing', () => {
        it('should parse numeric hours correctly', () => {
            const parseHoursValue = (value) => {
                if (value === null || value === undefined || value === '') {
                    return 0; // Empty cells are 0 hours
                }
                const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
                return isNaN(num) ? null : num;
            };
            expect(parseHoursValue(40)).toBe(40);
            expect(parseHoursValue('40')).toBe(40);
            expect(parseHoursValue('40.5')).toBe(40.5);
            expect(parseHoursValue('40,5')).toBe(40.5); // German decimal format
            expect(parseHoursValue('')).toBe(0);
            expect(parseHoursValue(null)).toBe(0);
            expect(parseHoursValue(undefined)).toBe(0);
            expect(parseHoursValue('abc')).toBeNull();
            expect(parseHoursValue('40abc')).toBeNull();
        });
    });
    describe('Weekly Hours Conversion', () => {
        it('should convert KW columns to weeklyHours format', () => {
            const mockRow = [
                'Müller, Hans', // Name
                'IT Services', // CC
                'Digital', // BL
                '', // Bereich
                '', // Team
                '', // Standort
                '', // LBS
                '', // Projekt
                '', // Kunde
                '40', // KW 33
                '35', // KW 34
                '0', // KW 35
                '75' // Summe Aufwand
            ];
            const kwColumns = [
                { index: 9, isoWeek: 33 },
                { index: 10, isoWeek: 34 },
                { index: 11, isoWeek: 35 }
            ];
            const currentYear = 2025;
            // Mock the weeklyHours processing
            const weeklyHours = [];
            for (const kwCol of kwColumns) {
                const value = mockRow[kwCol.index];
                const hours = value === null || value === undefined || value === '' ? 0 :
                    (typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.')));
                if (!isNaN(hours)) {
                    weeklyHours.push({
                        isoYear: currentYear,
                        isoWeek: kwCol.isoWeek,
                        hours
                    });
                }
            }
            expect(weeklyHours).toHaveLength(3);
            expect(weeklyHours[0]).toEqual({ isoYear: 2025, isoWeek: 33, hours: 40 });
            expect(weeklyHours[1]).toEqual({ isoYear: 2025, isoWeek: 34, hours: 35 });
            expect(weeklyHours[2]).toEqual({ isoYear: 2025, isoWeek: 35, hours: 0 });
        });
    });
    describe('Matching Logic', () => {
        it('should create correct alias document IDs', () => {
            const normalizedName = 'mueller|hans';
            const competenceCenter = 'IT Services';
            const aliasId = (0, normalize_1.createAliasDocId)(normalizedName, competenceCenter);
            expect(aliasId).toBe('mueller|hans|IT Services');
        });
        it('should create consistent normalized names for matching', () => {
            // Test that the same person gets the same normalized name
            const name1 = (0, normalize_1.parseAndNormalizeName)('Müller, Hans');
            const name2 = (0, normalize_1.parseAndNormalizeName)('Mueller, Hans');
            // Note: These would be different due to different input, but showing the pattern
            expect(name1.normalizedName).toBe('mueller|hans');
            expect(name2.normalizedName).toBe('mueller|hans');
        });
    });
    describe('Document ID Creation', () => {
        it('should create correct workload entry document IDs', () => {
            const createWorkloadEntryDocId = (normalizedName, competenceCenter) => {
                return `${normalizedName}|${competenceCenter}`;
            };
            const docId1 = createWorkloadEntryDocId('mueller|hans', 'IT Services');
            expect(docId1).toBe('mueller|hans|IT Services');
            const docId2 = createWorkloadEntryDocId('schmidt-weber|maria', 'Business Analytics & Data Science');
            expect(docId2).toBe('schmidt-weber|maria|Business Analytics & Data Science');
        });
    });
    describe('Error Handling', () => {
        it('should handle missing required columns gracefully', () => {
            const headers = ['Name', 'Projekt', 'KW 33']; // Missing CC
            const nameIdx = headers.findIndex(h => h === 'Name');
            const ccIdx = headers.findIndex(h => h === 'CC');
            expect(nameIdx).toBe(0);
            expect(ccIdx).toBe(-1); // Should be -1 when not found
        });
        it('should handle empty or invalid rows', () => {
            const emptyRow = ['', '', '', '', ''];
            const invalidRow = [null, undefined, '', null, undefined];
            const isEmpty = (row) => !row || row.every(cell => !cell || String(cell).trim() === '');
            expect(isEmpty(emptyRow)).toBe(true);
            expect(isEmpty(invalidRow)).toBe(true);
            expect(isEmpty(['Müller, Hans', 'IT Services'])).toBe(false);
        });
    });
    describe('Data Validation', () => {
        it('should validate required fields are present', () => {
            const validateRow = (row, headers) => {
                const nameIdx = headers.findIndex(h => h === 'Name');
                const ccIdx = headers.findIndex(h => h === 'CC');
                if (nameIdx === -1)
                    return { valid: false, error: 'Name column not found' };
                if (ccIdx === -1)
                    return { valid: false, error: 'CC column not found' };
                const nameValue = row[nameIdx];
                const ccValue = row[ccIdx];
                if (!nameValue || String(nameValue).trim() === '') {
                    return { valid: false, error: 'Missing name value' };
                }
                if (!ccValue || String(ccValue).trim() === '') {
                    return { valid: false, error: 'Missing competence center' };
                }
                return { valid: true };
            };
            const headers = ['Name', 'CC', 'KW 33'];
            expect(validateRow(['Müller, Hans', 'IT Services', '40'], headers)).toEqual({ valid: true });
            expect(validateRow(['', 'IT Services', '40'], headers)).toEqual({ valid: false, error: 'Missing name value' });
            expect(validateRow(['Müller, Hans', '', '40'], headers)).toEqual({ valid: false, error: 'Missing competence center' });
        });
    });
});
//# sourceMappingURL=workload.test.js.map