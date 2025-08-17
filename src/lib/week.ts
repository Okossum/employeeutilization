/**
 * ISO week utilities for date formatting and week calculations
 */

import { startOfISOWeek, addWeeks, getISOWeek, getISOWeekYear } from 'date-fns';

/**
 * Formats ISO year and week as "JJ/WW" with zero padding
 * @param isoYear - ISO year (4 digits)
 * @param isoWeek - ISO week number (1-53)
 * @returns Formatted string like "24/01" for 2024 week 1
 */
export function formatJJWW(isoYear: number, isoWeek: number): string {
  // Take last 2 digits of year
  const shortYear = String(isoYear).slice(-2).padStart(2, '0');
  const paddedWeek = String(isoWeek).padStart(2, '0');
  
  return `${shortYear}/${paddedWeek}`;
}

/**
 * Creates ISO week key in format "YYYY-Www"
 * @param isoYear - ISO year (4 digits)
 * @param isoWeek - ISO week number (1-53)
 * @returns ISO key like "2024-W01"
 */
export function toIsoKey(isoYear: number, isoWeek: number): string {
  const paddedWeek = String(isoWeek).padStart(2, '0');
  return `${isoYear}-W${paddedWeek}`;
}

/**
 * Calculates the ISO week and year for a date offset from a base week
 * @param baseYear - Base ISO year
 * @param baseWeek - Base ISO week
 * @param weekOffset - Number of weeks to add (can be negative)
 * @returns Object with isoYear, isoWeek and isoKey
 */
export function calculateWeekOffset(
  baseYear: number, 
  baseWeek: number, 
  weekOffset: number
): { isoYear: number; isoWeek: number; isoKey: string } {
  // Create a date for the start of the base ISO week
  // We need to find a date that falls in the specified ISO week
  // Start with January 4th (always in week 1) and adjust
  const baseDate = new Date(baseYear, 0, 4); // January 4th of base year
  const startOfBaseYear = startOfISOWeek(baseDate);
  
  // Calculate the target date by adding weeks
  const targetWeekStart = addWeeks(startOfBaseYear, baseWeek - 1 + weekOffset);
  
  // Get ISO week and year for the target date
  const isoYear = getISOWeekYear(targetWeekStart);
  const isoWeek = getISOWeek(targetWeekStart);
  const isoKey = toIsoKey(isoYear, isoWeek);
  
  return { isoYear, isoWeek, isoKey };
}

/**
 * Gets the current ISO week and year
 * @returns Object with current isoYear, isoWeek and isoKey
 */
export function getCurrentISOWeek(): { isoYear: number; isoWeek: number; isoKey: string } {
  const now = new Date();
  const isoYear = getISOWeekYear(now);
  const isoWeek = getISOWeek(now);
  const isoKey = toIsoKey(isoYear, isoWeek);
  
  return { isoYear, isoWeek, isoKey };
}

/**
 * Parses an ISO week key back to year and week numbers
 * @param isoKey - ISO key in format "YYYY-Www" (e.g., "2024-W01")
 * @returns Object with isoYear and isoWeek, or null if invalid format
 */
export function parseIsoKey(isoKey: string): { isoYear: number; isoWeek: number } | null {
  const match = isoKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  
  const isoYear = parseInt(match[1], 10);
  const isoWeek = parseInt(match[2], 10);
  
  // Validate week range
  if (isoWeek < 1 || isoWeek > 53) return null;
  
  return { isoYear, isoWeek };
}

/**
 * Gets the start date of an ISO week
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number
 * @returns Date object representing Monday of that week
 */
export function getISOWeekStart(isoYear: number, isoWeek: number): Date {
  // Start with January 4th (always in week 1) of the target year
  const jan4 = new Date(isoYear, 0, 4);
  const startOfYear = startOfISOWeek(jan4);
  
  // Add the appropriate number of weeks
  return addWeeks(startOfYear, isoWeek - 1);
}
