/**
 * Excel header triplet detection utilities
 * Detects recurring patterns of "Proj", "NKV (%)", "Ort" columns with optional suffixes
 */

export interface TripletIndices {
  proj: number;
  nkv: number;
  ort: number;
}

export interface TripletDetectionResult {
  count: number;
  indices: TripletIndices[];
}

/**
 * Detects triplets of project, NKV, and location columns in Excel headers
 * Looks for base patterns "Proj", "NKV (%)", "Ort" and their suffixed variants ".1", ".2", etc.
 * 
 * @param headers - Array of header strings from Excel sheet
 * @returns Object with count of triplets found and their column indices
 */
export function detectTriplets(headers: string[]): TripletDetectionResult {
  const triplets: TripletIndices[] = [];
  
  // Normalize headers for easier matching
  const normalizedHeaders = headers.map(h => (h || '').toString().trim());
  
  // Look for base triplet (without suffix)
  const baseTriplet = findTriplet(normalizedHeaders, '');
  if (baseTriplet) {
    triplets.push(baseTriplet);
  }
  
  // Look for numbered triplets (.1, .2, .3, etc.)
  let suffixNum = 1;
  while (true) {
    const suffix = `.${suffixNum}`;
    const triplet = findTriplet(normalizedHeaders, suffix);
    
    if (!triplet) {
      // Stop when we can't find a complete triplet
      break;
    }
    
    triplets.push(triplet);
    suffixNum++;
  }
  
  return {
    count: triplets.length,
    indices: triplets
  };
}

/**
 * Finds a single triplet with the given suffix
 * @param headers - Normalized header array
 * @param suffix - Suffix to look for (empty string for base, ".1", ".2", etc.)
 * @returns TripletIndices if all three columns found, null otherwise
 */
function findTriplet(headers: string[], suffix: string): TripletIndices | null {
  const projPattern = `Proj${suffix}`;
  const nkvPattern = `NKV (%)${suffix}`;
  const ortPattern = `Ort${suffix}`;
  
  const projIndex = findHeaderIndex(headers, projPattern);
  const nkvIndex = findHeaderIndex(headers, nkvPattern);
  const ortIndex = findHeaderIndex(headers, ortPattern);
  
  // All three must be found to constitute a valid triplet
  if (projIndex === -1 || nkvIndex === -1 || ortIndex === -1) {
    return null;
  }
  
  return {
    proj: projIndex,
    nkv: nkvIndex,
    ort: ortIndex
  };
}

/**
 * Finds the index of a header that matches the pattern (case-insensitive)
 * @param headers - Array of header strings
 * @param pattern - Pattern to match
 * @returns Index of matching header, or -1 if not found
 */
function findHeaderIndex(headers: string[], pattern: string): number {
  const normalizedPattern = pattern.toLowerCase();
  
  return headers.findIndex(header => 
    header.toLowerCase() === normalizedPattern
  );
}

/**
 * Validates that triplet indices are within valid range
 * @param triplets - Array of triplet indices to validate
 * @param maxIndex - Maximum valid index (usually headers.length - 1)
 * @returns true if all indices are valid
 */
export function validateTripletIndices(triplets: TripletIndices[], maxIndex: number): boolean {
  return triplets.every(triplet => {
    return triplet.proj >= 0 && triplet.proj <= maxIndex &&
           triplet.nkv >= 0 && triplet.nkv <= maxIndex &&
           triplet.ort >= 0 && triplet.ort <= maxIndex;
  });
}

/**
 * Gets the maximum week index based on the number of triplets found
 * Each triplet represents one week of data
 * @param tripletCount - Number of triplets detected
 * @returns Maximum week index (0-based)
 */
export function getMaxWeekIndex(tripletCount: number): number {
  return Math.max(0, tripletCount - 1);
}

/**
 * Creates a summary of detected triplets for logging/debugging
 * @param result - Result from detectTriplets
 * @returns Human-readable summary string
 */
export function createTripletSummary(result: TripletDetectionResult): string {
  if (result.count === 0) {
    return 'No triplets detected';
  }
  
  const summaries = result.indices.map((triplet, index) => {
    const suffix = index === 0 ? '' : `.${index}`;
    return `Triplet${suffix}: Proj@${triplet.proj}, NKV@${triplet.nkv}, Ort@${triplet.ort}`;
  });
  
  return `Found ${result.count} triplet(s):\n${summaries.join('\n')}`;
}

