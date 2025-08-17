/**
 * ISO week utilities for plan generation
 */

import { getISOWeek, getISOWeekYear, addWeeks } from 'date-fns';

/**
 * Gets ISO week and year for a given date
 * @param date - Date to get ISO week for
 * @returns Object with isoWeek and isoYear
 */
export function getISOWeekInfo(date: Date): { isoWeek: number; isoYear: number } {
  return {
    isoWeek: getISOWeek(date),
    isoYear: getISOWeekYear(date)
  };
}

/**
 * Creates an ISO week key string
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number
 * @returns ISO key in format "YYYY-Www" (e.g., "2025-W33")
 */
export function createISOKey(isoYear: number, isoWeek: number): string {
  const weekStr = isoWeek.toString().padStart(2, '0');
  return `${isoYear}-W${weekStr}`;
}

/**
 * Gets the date of the Monday of a given ISO week
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number
 * @returns Date object for the Monday of that week
 */
export function getDateFromISOWeek(isoYear: number, isoWeek: number): Date {
  // January 4th is always in the first week of the year
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Week = getISOWeek(jan4);
  
  // Calculate the difference in weeks
  const weeksDiff = isoWeek - jan4Week;
  
  // Find the Monday of Jan 4th's week
  const jan4Day = jan4.getDay();
  const mondayOffset = jan4Day === 0 ? -6 : 1 - jan4Day; // Sunday = 0, Monday = 1
  const jan4Monday = new Date(jan4);
  jan4Monday.setDate(jan4.getDate() + mondayOffset);
  
  // Add the week difference
  return addWeeks(jan4Monday, weeksDiff);
}

/**
 * Calculates ISO week info for a plan week offset
 * @param planYear - Base plan year
 * @param planWeek - Base plan week
 * @param weekOffset - Number of weeks to add (can be negative)
 * @returns ISO week info for the calculated week
 */
export function calculateWeekOffset(
  planYear: number,
  planWeek: number,
  weekOffset: number
): { isoWeek: number; isoYear: number; isoKey: string } {
  const baseDate = getDateFromISOWeek(planYear, planWeek);
  const offsetDate = addWeeks(baseDate, weekOffset);
  
  const isoWeek = getISOWeek(offsetDate);
  const isoYear = getISOWeekYear(offsetDate);
  const isoKey = createISOKey(isoYear, isoWeek);
  
  return { isoWeek, isoYear, isoKey };
}

/**
 * Parses a German date string (DD.MM.YYYY) to a Date object
 * @param dateStr - Date string in DD.MM.YYYY format
 * @returns Date object
 */
export function parseGermanDate(dateStr: string): Date {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid German date format. Expected DD.MM.YYYY but got: "${dateStr}"`);
  }
  
  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Validate the date is valid
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: "${dateStr}"`);
  }
  
  return date;
}

/**
 * Parses the A1 cell content to extract plan information
 * @param a1Content - Content of cell A1 (e.g., "Einsatzplan-Export für KW 33 (2025). Stand: 17.08.2025")
 * @returns Object with planWeek, planYear, and generatedAt
 */
export function parseA1Content(a1Content: string): {
  planWeek: number;
  planYear: number;
  generatedAt: Date;
} {
  // Extract KW and year: "KW 33 (2025)"
  const kwMatch = a1Content.match(/KW\s+(\d+)\s*\((\d{4})\)/i);
  if (!kwMatch) {
    throw new Error(`Could not extract KW and year from A1: "${a1Content}"`);
  }
  
  const planWeek = parseInt(kwMatch[1]);
  const planYear = parseInt(kwMatch[2]);
  
  // Extract date: "Stand: 17.08.2025"
  const dateMatch = a1Content.match(/Stand:\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
  if (!dateMatch) {
    throw new Error(`Could not extract date from A1: "${a1Content}"`);
  }
  
  const generatedAt = parseGermanDate(dateMatch[1]);
  
  return {
    planWeek,
    planYear,
    generatedAt
  };
}
