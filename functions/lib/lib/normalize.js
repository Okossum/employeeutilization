"use strict";
/**
 * Normalization utilities for employee names and data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDiacritics = normalizeDiacritics;
exports.parseAndNormalizeName = parseAndNormalizeName;
exports.nameKey = nameKey;
exports.normalizeCompetenceCenter = normalizeCompetenceCenter;
exports.createEntryDocId = createEntryDocId;
exports.createAliasDocId = createAliasDocId;
/**
 * Normalizes diacritics and special characters for consistent matching
 * ä->ae, ö->oe, ü->ue, ß->ss, etc.
 */
function normalizeDiacritics(str) {
    return str
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/à|á|â|ã|å|ā|ă|ą/g, 'a')
        .replace(/è|é|ê|ë|ē|ė|ę/g, 'e')
        .replace(/ì|í|î|ï|ī|į/g, 'i')
        .replace(/ò|ó|ô|õ|ø|ō|ő/g, 'o')
        .replace(/ù|ú|û|ū|ů|ű|ų/g, 'u')
        .replace(/ý|ÿ|ỳ/g, 'y')
        .replace(/ñ|ń|ň/g, 'n')
        .replace(/ç|ć|č/g, 'c')
        .replace(/š|ś/g, 's')
        .replace(/ž|ź|ż/g, 'z')
        .replace(/ł/g, 'l')
        .replace(/đ/g, 'd')
        .replace(/ř/g, 'r')
        .replace(/ť/g, 't');
}
/**
 * Parses a name string in format "Last, First" and returns normalized components
 * @param nameStr - Name in format "Last, First" or "Last,First"
 * @returns Object with lastName, firstName, and normalizedName
 */
function parseAndNormalizeName(nameStr) {
    const trimmed = nameStr.trim();
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) {
        throw new Error(`Invalid name format. Expected "Last, First" but got: "${nameStr}"`);
    }
    const lastName = trimmed.substring(0, commaIndex).trim();
    const firstName = trimmed.substring(commaIndex + 1).trim();
    if (!lastName || !firstName) {
        throw new Error(`Invalid name components. Last: "${lastName}", First: "${firstName}"`);
    }
    const normalizedName = nameKey(lastName, firstName);
    return {
        lastName,
        firstName,
        normalizedName,
        rawName: trimmed
    };
}
/**
 * Creates a normalized name key for consistent employee matching
 * @param lastName - Last name
 * @param firstName - First name
 * @returns Normalized key in format "lastname|firstname"
 */
function nameKey(lastName, firstName) {
    const normalizedLast = normalizeDiacritics(lastName)
        .replace(/\s+/g, ' ') // collapse multiple spaces
        .trim();
    const normalizedFirst = normalizeDiacritics(firstName)
        .replace(/\s+/g, ' ') // collapse multiple spaces
        .trim();
    return `${normalizedLast}|${normalizedFirst}`;
}
/**
 * Creates a competence center key by trimming whitespace but preserving case and spaces
 * @param cc - Competence center string
 * @returns Trimmed competence center string
 */
function normalizeCompetenceCenter(cc) {
    return cc.trim();
}
/**
 * Creates a document ID for plan entries
 * @param normalizedName - Normalized name key
 * @param competenceCenter - Exact competence center (trimmed only)
 * @returns Document ID in format "normalizedname|competencecenter"
 */
function createEntryDocId(normalizedName, competenceCenter) {
    return `${normalizedName}|${competenceCenter}`;
}
/**
 * Creates an alias document ID
 * @param normalizedName - Normalized name key
 * @param competenceCenter - Exact competence center (trimmed only)
 * @returns Alias document ID in format "normalizedname|competencecenter"
 */
function createAliasDocId(normalizedName, competenceCenter) {
    return `${normalizedName}|${competenceCenter}`;
}
//# sourceMappingURL=normalize.js.map