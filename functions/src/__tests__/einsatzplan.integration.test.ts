/**
 * Integration tests for Einsatzplan processing
 */

import { parseAndNormalizeName } from '../lib/normalize';
import { calculateWeekOffset } from '../lib/isoWeek';

describe('Einsatzplan Integration Tests', () => {
  describe('Name processing pipeline', () => {
    it('should handle typical German employee names', () => {
      const testCases = [
        {
          input: 'Müller, Hans',
          expected: {
            lastName: 'Müller',
            firstName: 'Hans',
            normalizedName: 'mueller|hans'
          }
        },
        {
          input: 'Schmidt-Weber, Maria-José',
          expected: {
            lastName: 'Schmidt-Weber',
            firstName: 'Maria-José',
            normalizedName: 'schmidt-weber|maria-jose'
          }
        },
        {
          input: 'von Neumann, Johann',
          expected: {
            lastName: 'von Neumann',
            firstName: 'Johann',
            normalizedName: 'von neumann|johann'
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseAndNormalizeName(input);
        expect(result.lastName).toBe(expected.lastName);
        expect(result.firstName).toBe(expected.firstName);
        expect(result.normalizedName).toBe(expected.normalizedName);
      });
    });
  });

  describe('Week calculation pipeline', () => {
    it('should calculate utilization percentages correctly', () => {
      const testCases = [
        { nkvPct: 0, expected: 100 },
        { nkvPct: 25, expected: 75 },
        { nkvPct: 50, expected: 50 },
        { nkvPct: 100, expected: 0 },
        { nkvPct: 120, expected: -20 }, // Allow negative utilization
        { nkvPct: null, expected: null }
      ];

      testCases.forEach(({ nkvPct, expected }) => {
        const utilizationPct = nkvPct !== null ? 100 - nkvPct : null;
        expect(utilizationPct).toBe(expected);
      });
    });

    it('should calculate week sequences correctly', () => {
      const planYear = 2025;
      const planWeek = 33;
      const weeksToCalculate = 8;

      const weeks = [];
      for (let i = 0; i < weeksToCalculate; i++) {
        const weekInfo = calculateWeekOffset(planYear, planWeek, i);
        weeks.push({
          index: i,
          ...weekInfo
        });
      }

      expect(weeks).toHaveLength(8);
      expect(weeks[0].isoWeek).toBe(33);
      expect(weeks[0].isoYear).toBe(2025);
      expect(weeks[0].isoKey).toBe('2025-W33');
      
      expect(weeks[7].isoWeek).toBe(40);
      expect(weeks[7].isoYear).toBe(2025);
      expect(weeks[7].isoKey).toBe('2025-W40');
    });

    it('should handle year boundary in week calculations', () => {
      // Start at week 50, calculate 8 weeks (should cross into next year)
      const planYear = 2024;
      const planWeek = 50;
      const weeksToCalculate = 8;

      const weeks = [];
      for (let i = 0; i < weeksToCalculate; i++) {
        const weekInfo = calculateWeekOffset(planYear, planWeek, i);
        weeks.push({
          index: i,
          ...weekInfo
        });
      }

      expect(weeks[0].isoWeek).toBe(50);
      expect(weeks[0].isoYear).toBe(2024);
      
      // Week 57 doesn't exist, should roll over to next year
      const lastWeek = weeks[7];
      expect(lastWeek.isoYear).toBe(2025);
      expect(lastWeek.isoWeek).toBeLessThanOrEqual(5); // Should be early in next year
    });
  });

  describe('Data validation', () => {
    it('should handle missing and null values correctly', () => {
      const testValues = [
        { input: null, expected: null },
        { input: undefined, expected: null },
        { input: '', expected: null },
        { input: '0', expected: 0 },
        { input: '25.5', expected: 25.5 },
        { input: '100', expected: 100 },
        { input: 'invalid', expected: null }
      ];

      testValues.forEach(({ input, expected }) => {
        const parseNumericValue = (value: any): number | null => {
          if (value === null || value === undefined || value === '') {
            return null;
          }
          
          const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
          return isNaN(num) ? null : num;
        };

        const result = parseNumericValue(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle string values correctly', () => {
      const testValues = [
        { input: null, expected: null },
        { input: undefined, expected: null },
        { input: '', expected: null },
        { input: '  ', expected: null },
        { input: 'Project A', expected: 'Project A' },
        { input: '  Project B  ', expected: 'Project B' },
        { input: 0, expected: '0' }
      ];

      testValues.forEach(({ input, expected }) => {
        const parseStringValue = (value: any): string | null => {
          if (value === null || value === undefined || value === '') {
            return null;
          }
          return String(value).trim() || null;
        };

        const result = parseStringValue(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Header detection simulation', () => {
    it('should detect weekly triplets correctly', () => {
      const detectWeeklyTriplets = (headers: string[]): Array<{ proj: number; nkv: number; ort: number }> => {
        const triplets: Array<{ proj: number; nkv: number; ort: number }> = [];
        
        // Look for base triplet (without suffix)
        const baseProj = headers.findIndex(h => h === 'Proj');
        const baseNkv = headers.findIndex(h => h === 'NKV (%)');
        const baseOrt = headers.findIndex(h => h === 'Ort');
        
        if (baseProj >= 0 && baseNkv >= 0 && baseOrt >= 0) {
          triplets.push({ proj: baseProj, nkv: baseNkv, ort: baseOrt });
        }
        
        // Look for numbered triplets (.1, .2, .3, etc.)
        let suffix = 1;
        while (true) {
          const projIdx = headers.findIndex(h => h === `Proj.${suffix}`);
          const nkvIdx = headers.findIndex(h => h === `NKV (%).${suffix}`);
          const ortIdx = headers.findIndex(h => h === `Ort.${suffix}`);
          
          // Stop if any of the three columns is missing
          if (projIdx < 0 || nkvIdx < 0 || ortIdx < 0) {
            break;
          }
          
          triplets.push({ proj: projIdx, nkv: nkvIdx, ort: ortIdx });
          suffix++;
        }
        
        return triplets;
      };

      // Test case 1: Only base triplet
      const headers1 = ['Name', 'CC', 'Proj', 'NKV (%)', 'Ort'];
      const triplets1 = detectWeeklyTriplets(headers1);
      expect(triplets1).toHaveLength(1);
      expect(triplets1[0]).toEqual({ proj: 2, nkv: 3, ort: 4 });

      // Test case 2: Base + numbered triplets
      const headers2 = ['Name', 'CC', 'Proj', 'NKV (%)', 'Ort', 'Proj.1', 'NKV (%).1', 'Ort.1', 'Proj.2', 'NKV (%).2', 'Ort.2'];
      const triplets2 = detectWeeklyTriplets(headers2);
      expect(triplets2).toHaveLength(3);
      expect(triplets2[1]).toEqual({ proj: 5, nkv: 6, ort: 7 });
      expect(triplets2[2]).toEqual({ proj: 8, nkv: 9, ort: 10 });

      // Test case 3: Missing middle triplet (should stop at first gap)
      const headers3 = ['Name', 'CC', 'Proj', 'NKV (%)', 'Ort', 'Proj.1', 'NKV (%).1', 'Ort.1', 'Proj.3', 'NKV (%).3', 'Ort.3'];
      const triplets3 = detectWeeklyTriplets(headers3);
      expect(triplets3).toHaveLength(2); // Should stop at .2 missing

      // Test case 4: No triplets
      const headers4 = ['Name', 'CC', 'Team'];
      const triplets4 = detectWeeklyTriplets(headers4);
      expect(triplets4).toHaveLength(0);
    });
  });
});
