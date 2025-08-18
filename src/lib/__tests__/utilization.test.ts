/**
 * Unit tests for utilization percentage calculations
 */

import { describe, it, expect } from 'vitest';

// Utility function to calculate utilization percentage
// This mirrors the logic from the Firebase function
function calculateUtilizationPct(nkvPct: number | null): number | null {
  if (nkvPct === null || nkvPct === undefined) {
    return null;
  }
  return 100 - nkvPct;
}

// Utility function to parse numeric values (from Excel processing)
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const num = Number(value);
  return isNaN(num) ? null : num;
}

describe('calculateUtilizationPct', () => {
  it('calculates basic utilization correctly', () => {
    expect(calculateUtilizationPct(20)).toBe(80);
    expect(calculateUtilizationPct(50)).toBe(50);
    expect(calculateUtilizationPct(0)).toBe(100);
  });

  it('preserves null values', () => {
    expect(calculateUtilizationPct(null)).toBeNull();
    expect(calculateUtilizationPct(undefined as any)).toBeNull();
  });

  it('allows NKV values over 100 without clamping', () => {
    expect(calculateUtilizationPct(120)).toBe(-20);
    expect(calculateUtilizationPct(150)).toBe(-50);
    expect(calculateUtilizationPct(200)).toBe(-100);
  });

  it('handles negative NKV values', () => {
    expect(calculateUtilizationPct(-10)).toBe(110);
    expect(calculateUtilizationPct(-50)).toBe(150);
  });

  it('handles decimal values', () => {
    expect(calculateUtilizationPct(25.5)).toBe(74.5);
    expect(calculateUtilizationPct(33.33)).toBe(66.67);
    expect(calculateUtilizationPct(0.1)).toBe(99.9);
  });

  it('handles edge cases', () => {
    expect(calculateUtilizationPct(100)).toBe(0);
    expect(calculateUtilizationPct(99.99)).toBe(0.009999999999990905); // Floating point precision
  });
});

describe('parseNumericValue', () => {
  it('parses valid numbers', () => {
    expect(parseNumericValue(25)).toBe(25);
    expect(parseNumericValue('25')).toBe(25);
    expect(parseNumericValue('25.5')).toBe(25.5);
    expect(parseNumericValue(0)).toBe(0);
    expect(parseNumericValue('0')).toBe(0);
  });

  it('returns null for invalid inputs', () => {
    expect(parseNumericValue(null)).toBeNull();
    expect(parseNumericValue(undefined)).toBeNull();
    expect(parseNumericValue('')).toBeNull();
    expect(parseNumericValue('invalid')).toBeNull();
    expect(parseNumericValue('25abc')).toBeNull();
  });

  it('handles edge cases', () => {
    expect(parseNumericValue('  25  ')).toBe(25); // String with spaces
    expect(parseNumericValue(Infinity)).toBe(Infinity);
    expect(parseNumericValue(-Infinity)).toBe(-Infinity);
    expect(parseNumericValue(NaN)).toBeNull();
  });

  it('handles scientific notation', () => {
    expect(parseNumericValue('1e2')).toBe(100);
    expect(parseNumericValue('2.5e1')).toBe(25);
  });
});

describe('Integration: parseNumericValue + calculateUtilizationPct', () => {
  function processNkvValue(rawValue: any): number | null {
    const nkvPct = parseNumericValue(rawValue);
    return calculateUtilizationPct(nkvPct);
  }

  it('processes valid NKV values to utilization', () => {
    expect(processNkvValue('20')).toBe(80);
    expect(processNkvValue(25)).toBe(75);
    expect(processNkvValue('50.5')).toBe(49.5);
  });

  it('preserves null through the chain', () => {
    expect(processNkvValue(null)).toBeNull();
    expect(processNkvValue('')).toBeNull();
    expect(processNkvValue('invalid')).toBeNull();
  });

  it('handles over-allocation without clamping', () => {
    expect(processNkvValue('120')).toBe(-20);
    expect(processNkvValue(150)).toBe(-50);
  });

  it('simulates Excel data processing', () => {
    // Simulate various Excel cell values
    const excelValues = [
      25,      // Number
      '30',    // String number
      '',      // Empty cell
      null,    // Null cell
      '45.5',  // Decimal string
      120,     // Over-allocation
      'N/A',   // Invalid text
      0,       // Zero allocation
      '  15  ' // Number with spaces
    ];

    const results = excelValues.map(processNkvValue);
    
    expect(results).toEqual([
      75,    // 100 - 25
      70,    // 100 - 30
      null,  // Empty -> null
      null,  // Null -> null
      54.5,  // 100 - 45.5
      -20,   // 100 - 120 (over-allocation)
      null,  // Invalid -> null
      100,   // 100 - 0
      85     // 100 - 15 (trimmed)
    ]);
  });
});

describe('Real-world scenarios', () => {
  it('handles typical employee allocation scenarios', () => {
    // Simulate a week of employee data
    const weeklyNkvData = [
      { name: 'John Doe', nkv: 25 },     // 75% utilization
      { name: 'Jane Smith', nkv: null },  // No data
      { name: 'Bob Wilson', nkv: 0 },     // 100% utilization
      { name: 'Alice Brown', nkv: 110 },  // Over-allocated
      { name: 'Tom Davis', nkv: 50 }      // 50% utilization
    ];

    const processed = weeklyNkvData.map(emp => ({
      name: emp.name,
      nkvPct: emp.nkv,
      utilizationPct: calculateUtilizationPct(emp.nkv)
    }));

    expect(processed).toEqual([
      { name: 'John Doe', nkvPct: 25, utilizationPct: 75 },
      { name: 'Jane Smith', nkvPct: null, utilizationPct: null },
      { name: 'Bob Wilson', nkvPct: 0, utilizationPct: 100 },
      { name: 'Alice Brown', nkvPct: 110, utilizationPct: -10 },
      { name: 'Tom Davis', nkvPct: 50, utilizationPct: 50 }
    ]);
  });

  it('maintains data integrity across multiple weeks', () => {
    // Simulate multi-week data processing
    const weeks = [
      [25, null, 0],     // Week 1
      [30, 45, null],    // Week 2  
      [null, 120, 15]    // Week 3
    ];

    const processed = weeks.map(week => 
      week.map(nkv => ({
        nkvPct: nkv,
        utilizationPct: calculateUtilizationPct(nkv)
      }))
    );

    expect(processed[0]).toEqual([
      { nkvPct: 25, utilizationPct: 75 },
      { nkvPct: null, utilizationPct: null },
      { nkvPct: 0, utilizationPct: 100 }
    ]);

    expect(processed[1]).toEqual([
      { nkvPct: 30, utilizationPct: 70 },
      { nkvPct: 45, utilizationPct: 55 },
      { nkvPct: null, utilizationPct: null }
    ]);

    expect(processed[2]).toEqual([
      { nkvPct: null, utilizationPct: null },
      { nkvPct: 120, utilizationPct: -20 },
      { nkvPct: 15, utilizationPct: 85 }
    ]);
  });
});

