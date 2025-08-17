"use strict";
/**
 * ISO week utilities for plan generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getISOWeekInfo = getISOWeekInfo;
exports.createISOKey = createISOKey;
exports.getDateFromISOWeek = getDateFromISOWeek;
exports.calculateWeekOffset = calculateWeekOffset;
exports.parseGermanDate = parseGermanDate;
exports.parseA1Content = parseA1Content;
const date_fns_1 = require("date-fns");
/**
 * Gets ISO week and year for a given date
 * @param date - Date to get ISO week for
 * @returns Object with isoWeek and isoYear
 */
function getISOWeekInfo(date) {
    return {
        isoWeek: (0, date_fns_1.getISOWeek)(date),
        isoYear: (0, date_fns_1.getISOWeekYear)(date)
    };
}
/**
 * Creates an ISO week key string
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number
 * @returns ISO key in format "YYYY-Www" (e.g., "2025-W33")
 */
function createISOKey(isoYear, isoWeek) {
    const weekStr = isoWeek.toString().padStart(2, '0');
    return `${isoYear}-W${weekStr}`;
}
/**
 * Gets the date of the Monday of a given ISO week
 * @param isoYear - ISO year
 * @param isoWeek - ISO week number
 * @returns Date object for the Monday of that week
 */
function getDateFromISOWeek(isoYear, isoWeek) {
    // January 4th is always in the first week of the year
    const jan4 = new Date(isoYear, 0, 4);
    const jan4Week = (0, date_fns_1.getISOWeek)(jan4);
    // Calculate the difference in weeks
    const weeksDiff = isoWeek - jan4Week;
    // Find the Monday of Jan 4th's week
    const jan4Day = jan4.getDay();
    const mondayOffset = jan4Day === 0 ? -6 : 1 - jan4Day; // Sunday = 0, Monday = 1
    const jan4Monday = new Date(jan4);
    jan4Monday.setDate(jan4.getDate() + mondayOffset);
    // Add the week difference
    return (0, date_fns_1.addWeeks)(jan4Monday, weeksDiff);
}
/**
 * Calculates ISO week info for a plan week offset
 * @param planYear - Base plan year
 * @param planWeek - Base plan week
 * @param weekOffset - Number of weeks to add (can be negative)
 * @returns ISO week info for the calculated week
 */
function calculateWeekOffset(planYear, planWeek, weekOffset) {
    const baseDate = getDateFromISOWeek(planYear, planWeek);
    const offsetDate = (0, date_fns_1.addWeeks)(baseDate, weekOffset);
    const isoWeek = (0, date_fns_1.getISOWeek)(offsetDate);
    const isoYear = (0, date_fns_1.getISOWeekYear)(offsetDate);
    const isoKey = createISOKey(isoYear, isoWeek);
    return { isoWeek, isoYear, isoKey };
}
/**
 * Parses a German date string (DD.MM.YYYY) to a Date object
 * @param dateStr - Date string in DD.MM.YYYY format
 * @returns Date object
 */
function parseGermanDate(dateStr) {
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
function parseA1Content(a1Content) {
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
//# sourceMappingURL=isoWeek.js.map