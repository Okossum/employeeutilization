/**
 * Unit tests for Excel triplet detection utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  detectTriplets, 
  validateTripletIndices, 
  getMaxWeekIndex, 
  createTripletSummary 
} from '../xlsxTriplets';

describe('detectTriplets', () => {
  it('detects base triplet without suffix', () => {
    const headers = ['Name', 'Proj', 'NKV (%)', 'Ort', 'Other'];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(1);
    expect(result.indices).toHaveLength(1);
    expect(result.indices[0]).toEqual({
      proj: 1,
      nkv: 2,
      ort: 3
    });
  });

  it('detects multiple triplets with suffixes', () => {
    const headers = [
      'Name', 
      'Proj', 'NKV (%)', 'Ort',
      'Proj.1', 'NKV (%).1', 'Ort.1',
      'Proj.2', 'NKV (%).2', 'Ort.2',
      'Other'
    ];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(3);
    expect(result.indices).toHaveLength(3);
    
    // Base triplet
    expect(result.indices[0]).toEqual({
      proj: 1,
      nkv: 2,
      ort: 3
    });
    
    // First suffixed triplet
    expect(result.indices[1]).toEqual({
      proj: 4,
      nkv: 5,
      ort: 6
    });
    
    // Second suffixed triplet
    expect(result.indices[2]).toEqual({
      proj: 7,
      nkv: 8,
      ort: 9
    });
  });

  it('stops when incomplete triplet found', () => {
    const headers = [
      'Name',
      'Proj', 'NKV (%)', 'Ort',        // Complete base triplet
      'Proj.1', 'NKV (%).1', 'Ort.1',  // Complete .1 triplet
      'Proj.2', 'NKV (%).2',           // Incomplete .2 triplet (missing Ort.2)
      'Other'
    ];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(2); // Should stop at .2 due to missing Ort.2
    expect(result.indices).toHaveLength(2);
  });

  it('handles missing base triplet but finds suffixed ones', () => {
    const headers = [
      'Name',
      'SomeOther', 'Column',          // No base triplet
      'Proj.1', 'NKV (%).1', 'Ort.1', // Complete .1 triplet
      'Other'
    ];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(0); // Should be 0 because base triplet is missing
  });

  it('handles case insensitive matching', () => {
    const headers = ['name', 'proj', 'nkv (%)', 'ort', 'other'];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(1);
    expect(result.indices[0]).toEqual({
      proj: 1,
      nkv: 2,
      ort: 3
    });
  });

  it('handles empty headers array', () => {
    const result = detectTriplets([]);
    expect(result.count).toBe(0);
    expect(result.indices).toHaveLength(0);
  });

  it('handles no triplets found', () => {
    const headers = ['Name', 'Age', 'Department', 'Salary'];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(0);
    expect(result.indices).toHaveLength(0);
  });

  it('handles mixed order columns', () => {
    const headers = [
      'Name',
      'Ort', 'Proj', 'NKV (%)',       // Mixed order base triplet
      'Other'
    ];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(1);
    expect(result.indices[0]).toEqual({
      proj: 2,  // Proj is at index 2
      nkv: 3,   // NKV (%) is at index 3
      ort: 1    // Ort is at index 1
    });
  });

  it('handles realistic Excel headers', () => {
    const headers = [
      'Name', 'CC', 'LoB', 'Bereich', 'Team', 'Geschäftsstelle',
      'akt. Einsatzort', 'LBS', 'Kompetenz', 'Angeboten bei',
      'Staffbar', 'OV', 'OP',
      'Proj', 'NKV (%)', 'Ort',
      'Proj.1', 'NKV (%).1', 'Ort.1',
      'Proj.2', 'NKV (%).2', 'Ort.2',
      'Proj.3', 'NKV (%).3', 'Ort.3'
    ];
    const result = detectTriplets(headers);
    
    expect(result.count).toBe(4);
    expect(result.indices).toHaveLength(4);
    
    // Verify base triplet positions
    expect(result.indices[0]).toEqual({
      proj: 13,
      nkv: 14,
      ort: 15
    });
  });
});

describe('validateTripletIndices', () => {
  it('validates correct indices', () => {
    const triplets = [
      { proj: 1, nkv: 2, ort: 3 },
      { proj: 4, nkv: 5, ort: 6 }
    ];
    expect(validateTripletIndices(triplets, 10)).toBe(true);
  });

  it('rejects negative indices', () => {
    const triplets = [
      { proj: -1, nkv: 2, ort: 3 }
    ];
    expect(validateTripletIndices(triplets, 10)).toBe(false);
  });

  it('rejects indices exceeding maximum', () => {
    const triplets = [
      { proj: 1, nkv: 2, ort: 11 } // ort exceeds max of 10
    ];
    expect(validateTripletIndices(triplets, 10)).toBe(false);
  });

  it('handles empty triplets array', () => {
    expect(validateTripletIndices([], 10)).toBe(true);
  });
});

describe('getMaxWeekIndex', () => {
  it('calculates max week index correctly', () => {
    expect(getMaxWeekIndex(1)).toBe(0);
    expect(getMaxWeekIndex(4)).toBe(3);
    expect(getMaxWeekIndex(10)).toBe(9);
  });

  it('handles edge cases', () => {
    expect(getMaxWeekIndex(0)).toBe(0);
    expect(getMaxWeekIndex(-1)).toBe(0); // Should not return negative
  });
});

describe('createTripletSummary', () => {
  it('creates summary for no triplets', () => {
    const result = { count: 0, indices: [] };
    const summary = createTripletSummary(result);
    expect(summary).toBe('No triplets detected');
  });

  it('creates summary for single triplet', () => {
    const result = {
      count: 1,
      indices: [{ proj: 1, nkv: 2, ort: 3 }]
    };
    const summary = createTripletSummary(result);
    expect(summary).toContain('Found 1 triplet(s)');
    expect(summary).toContain('Triplet: Proj@1, NKV@2, Ort@3');
  });

  it('creates summary for multiple triplets', () => {
    const result = {
      count: 3,
      indices: [
        { proj: 1, nkv: 2, ort: 3 },
        { proj: 4, nkv: 5, ort: 6 },
        { proj: 7, nkv: 8, ort: 9 }
      ]
    };
    const summary = createTripletSummary(result);
    
    expect(summary).toContain('Found 3 triplet(s)');
    expect(summary).toContain('Triplet: Proj@1, NKV@2, Ort@3');
    expect(summary).toContain('Triplet.1: Proj@4, NKV@5, Ort@6');
    expect(summary).toContain('Triplet.2: Proj@7, NKV@8, Ort@9');
  });
});

describe('Integration scenarios', () => {
  it('handles real-world complex header structure', () => {
    // Simulate a realistic Excel header with gaps and mixed content
    const headers = [
      'Employee Name', 'CC', 'Department', '', 'Notes',
      'Week 1 Proj', 'Week 1 NKV (%)', 'Week 1 Ort',  // Not matching pattern
      'Proj', 'NKV (%)', 'Ort',                        // Base triplet
      'Proj.1', 'NKV (%).1', 'Ort.1',                  // .1 triplet
      'Comments', 'Status',
      'Proj.2', 'NKV (%).2', 'Ort.2',                  // .2 triplet
      'Final Notes'
    ];
    
    const result = detectTriplets(headers);
    expect(result.count).toBe(3);
    
    // Validate positions are correct
    expect(result.indices[0]).toEqual({ proj: 8, nkv: 9, ort: 10 });
    expect(result.indices[1]).toEqual({ proj: 11, nkv: 12, ort: 13 });
    expect(result.indices[2]).toEqual({ proj: 16, nkv: 17, ort: 18 });
  });

  it('works with validation and summary together', () => {
    const headers = ['Name', 'Proj', 'NKV (%)', 'Ort', 'Proj.1', 'NKV (%).1', 'Ort.1'];
    const result = detectTriplets(headers);
    
    expect(validateTripletIndices(result.indices, headers.length - 1)).toBe(true);
    expect(getMaxWeekIndex(result.count)).toBe(1);
    
    const summary = createTripletSummary(result);
    expect(summary).toContain('Found 2 triplet(s)');
  });
});
