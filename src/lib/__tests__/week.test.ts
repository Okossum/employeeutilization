/**
 * Unit tests for ISO week utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  formatJJWW, 
  toIsoKey, 
  calculateWeekOffset, 
  getCurrentISOWeek, 
  parseIsoKey, 
  getISOWeekStart 
} from '../week';

describe('formatJJWW', () => {
  it('formats year and week with zero padding', () => {
    expect(formatJJWW(2025, 33)).toBe('25/33');
    expect(formatJJWW(2026, 1)).toBe('26/01');
    expect(formatJJWW(2024, 52)).toBe('24/52');
  });

  it('handles edge cases', () => {
    expect(formatJJWW(2000, 1)).toBe('00/01');
    expect(formatJJWW(1999, 53)).toBe('99/53');
    expect(formatJJWW(2024, 9)).toBe('24/09');
  });

  it('handles century rollover', () => {
    expect(formatJJWW(2099, 1)).toBe('99/01');
    expect(formatJJWW(2100, 1)).toBe('00/01');
  });
});

describe('toIsoKey', () => {
  it('creates ISO week key format', () => {
    expect(toIsoKey(2025, 33)).toBe('2025-W33');
    expect(toIsoKey(2026, 1)).toBe('2026-W01');
    expect(toIsoKey(2024, 52)).toBe('2024-W52');
  });

  it('pads week numbers with zero', () => {
    expect(toIsoKey(2024, 1)).toBe('2024-W01');
    expect(toIsoKey(2024, 9)).toBe('2024-W09');
    expect(toIsoKey(2024, 10)).toBe('2024-W10');
  });
});

describe('calculateWeekOffset', () => {
  it('calculates forward offsets correctly', () => {
    // Week 1 + 1 week = Week 2
    const result = calculateWeekOffset(2024, 1, 1);
    expect(result.isoYear).toBe(2024);
    expect(result.isoWeek).toBe(2);
    expect(result.isoKey).toBe('2024-W02');
  });

  it('calculates backward offsets correctly', () => {
    // Week 5 - 2 weeks = Week 3
    const result = calculateWeekOffset(2024, 5, -2);
    expect(result.isoYear).toBe(2024);
    expect(result.isoWeek).toBe(3);
    expect(result.isoKey).toBe('2024-W03');
  });

  it('handles year rollover forward', () => {
    // Week 52 of 2024 + 2 weeks should go into 2025
    const result = calculateWeekOffset(2024, 52, 2);
    expect(result.isoYear).toBe(2025);
    expect(result.isoWeek).toBe(2);
    expect(result.isoKey).toBe('2025-W02');
  });

  it('handles year rollover backward', () => {
    // Week 2 of 2025 - 4 weeks should go back to 2024
    const result = calculateWeekOffset(2025, 2, -4);
    expect(result.isoYear).toBe(2024);
    expect(result.isoWeek).toBeGreaterThan(50); // Should be in late 2024
  });

  it('handles zero offset (same week)', () => {
    const result = calculateWeekOffset(2024, 26, 0);
    expect(result.isoYear).toBe(2024);
    expect(result.isoWeek).toBe(26);
    expect(result.isoKey).toBe('2024-W26');
  });

  it('handles large offsets', () => {
    // 26 weeks forward from week 1 should be around week 27
    const result = calculateWeekOffset(2024, 1, 26);
    expect(result.isoYear).toBe(2024);
    expect(result.isoWeek).toBe(27);
  });
});

describe('parseIsoKey', () => {
  it('parses valid ISO keys correctly', () => {
    expect(parseIsoKey('2024-W01')).toEqual({ isoYear: 2024, isoWeek: 1 });
    expect(parseIsoKey('2025-W33')).toEqual({ isoYear: 2025, isoWeek: 33 });
    expect(parseIsoKey('2024-W52')).toEqual({ isoYear: 2024, isoWeek: 52 });
  });

  it('returns null for invalid formats', () => {
    expect(parseIsoKey('2024-W')).toBeNull();
    expect(parseIsoKey('2024-1')).toBeNull();
    expect(parseIsoKey('W01-2024')).toBeNull();
    expect(parseIsoKey('invalid')).toBeNull();
    expect(parseIsoKey('')).toBeNull();
  });

  it('validates week ranges', () => {
    expect(parseIsoKey('2024-W00')).toBeNull(); // Week 0 invalid
    expect(parseIsoKey('2024-W54')).toBeNull(); // Week 54 invalid
    expect(parseIsoKey('2024-W01')).toEqual({ isoYear: 2024, isoWeek: 1 }); // Week 1 valid
    expect(parseIsoKey('2024-W53')).toEqual({ isoYear: 2024, isoWeek: 53 }); // Week 53 valid
  });
});

describe('getCurrentISOWeek', () => {
  it('returns current week data in correct format', () => {
    const result = getCurrentISOWeek();
    
    expect(typeof result.isoYear).toBe('number');
    expect(typeof result.isoWeek).toBe('number');
    expect(typeof result.isoKey).toBe('string');
    
    expect(result.isoYear).toBeGreaterThan(2020);
    expect(result.isoWeek).toBeGreaterThanOrEqual(1);
    expect(result.isoWeek).toBeLessThanOrEqual(53);
    
    expect(result.isoKey).toMatch(/^\d{4}-W\d{2}$/);
    expect(result.isoKey).toBe(toIsoKey(result.isoYear, result.isoWeek));
  });
});

describe('getISOWeekStart', () => {
  it('returns Monday for week start', () => {
    const monday = getISOWeekStart(2024, 1);
    expect(monday.getDay()).toBe(1); // Monday = 1
  });

  it('returns consistent dates for same week', () => {
    const start1 = getISOWeekStart(2024, 26);
    const start2 = getISOWeekStart(2024, 26);
    expect(start1.getTime()).toBe(start2.getTime());
  });

  it('handles year boundaries correctly', () => {
    // Week 1 of 2025 might start in late December 2024
    const start = getISOWeekStart(2025, 1);
    expect(start).toBeInstanceOf(Date);
    expect(start.getDay()).toBe(1); // Should be Monday
  });
});

describe('Integration: formatJJWW and calculateWeekOffset', () => {
  it('works together for week sequence', () => {
    const base = { year: 2024, week: 1 };
    
    // Generate a sequence of weeks
    const weeks = [];
    for (let i = 0; i < 5; i++) {
      const offset = calculateWeekOffset(base.year, base.week, i);
      weeks.push(formatJJWW(offset.isoYear, offset.isoWeek));
    }
    
    expect(weeks).toEqual(['24/01', '24/02', '24/03', '24/04', '24/05']);
  });
});

describe('Edge cases and year transitions', () => {
  it('handles ISO week year edge cases', () => {
    // Test some known edge cases where ISO week year differs from calendar year
    // December 29, 2014 was in ISO week 2015-W01
    const result = calculateWeekOffset(2015, 1, 0);
    expect(result.isoYear).toBe(2015);
    expect(result.isoWeek).toBe(1);
  });

  it('handles leap years correctly', () => {
    // 2024 is a leap year, should handle correctly
    const result = calculateWeekOffset(2024, 1, 52);
    expect(result.isoYear).toBeGreaterThanOrEqual(2024);
  });
});
