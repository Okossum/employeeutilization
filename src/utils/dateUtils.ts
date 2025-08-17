/**
 * Date and week formatting utilities for Einsatzplan
 */

/**
 * Formats ISO year and week to JJ/WW format
 * @param isoYear - Full ISO year (e.g., 2025)
 * @param isoWeek - ISO week number (e.g., 33)
 * @returns Formatted string like "25/33"
 */
export function formatJJWW(isoYear: number, isoWeek: number): string {
  const shortYear = (isoYear % 100).toString().padStart(2, '0');
  const paddedWeek = isoWeek.toString().padStart(2, '0');
  return `${shortYear}/${paddedWeek}`;
}

/**
 * Formats utilization percentage for display
 * @param utilizationPct - Utilization percentage (can be null)
 * @returns Formatted string or empty string for null values
 */
export function formatUtilization(utilizationPct: number | null): string {
  if (utilizationPct === null || utilizationPct === undefined) {
    return '';
  }
  
  // Round to 1 decimal place if needed, otherwise show as integer
  const rounded = Math.round(utilizationPct * 10) / 10;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
}

/**
 * Creates a week window starting from a specific week
 * @param startIsoYear - Starting ISO year
 * @param startIsoWeek - Starting ISO week
 * @param windowSize - Number of weeks to include (default: 8)
 * @returns Array of week objects with isoYear, isoWeek, and JJWW format
 */
export function createWeekWindow(
  startIsoYear: number, 
  startIsoWeek: number, 
  windowSize: number = 8
): Array<{ isoYear: number; isoWeek: number; jjww: string; index: number }> {
  const weeks: Array<{ isoYear: number; isoWeek: number; jjww: string; index: number }> = [];
  
  let currentYear = startIsoYear;
  let currentWeek = startIsoWeek;
  
  for (let i = 0; i < windowSize; i++) {
    weeks.push({
      isoYear: currentYear,
      isoWeek: currentWeek,
      jjww: formatJJWW(currentYear, currentWeek),
      index: i
    });
    
    // Advance to next week
    currentWeek++;
    
    // Handle year rollover (simplified - assumes 52 weeks per year for now)
    if (currentWeek > 52) {
      currentWeek = 1;
      currentYear++;
    }
  }
  
  return weeks;
}

/**
 * Shifts a week window by a given offset
 * @param currentYear - Current year
 * @param currentWeek - Current week
 * @param offset - Number of weeks to shift (positive = forward, negative = backward)
 * @returns New week position
 */
export function shiftWeekWindow(
  currentYear: number, 
  currentWeek: number, 
  offset: number
): { isoYear: number; isoWeek: number } {
  let newYear = currentYear;
  let newWeek = currentWeek + offset;
  
  // Handle forward overflow
  while (newWeek > 52) {
    newWeek -= 52;
    newYear++;
  }
  
  // Handle backward underflow
  while (newWeek < 1) {
    newWeek += 52;
    newYear--;
  }
  
  return { isoYear: newYear, isoWeek: newWeek };
}
