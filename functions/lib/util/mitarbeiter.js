"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeString = normalizeString;
exports.normalizeStringUpperCase = normalizeStringUpperCase;
exports.normalizeStringTitleCase = normalizeStringTitleCase;
exports.normalizeStringRemoveDiacritics = normalizeStringRemoveDiacritics;
exports.parseBooleanDe = parseBooleanDe;
exports.parseDateDe = parseDateDe;
exports.parseNumber = parseNumber;
exports.normalizeMitarbeiterRow = normalizeMitarbeiterRow;
exports.createNormalizedName = createNormalizedName;
exports.createEmailDocId = createEmailDocId;
exports.createDeterministicHash = createDeterministicHash;
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);
/**
 * Normalisiert einen String (trim, mehrfache Whitespaces reduzieren)
 */
function normalizeString(value) {
    if (!value || typeof value !== 'string')
        return '';
    return value.trim().replace(/\s+/g, ' ');
}
/**
 * Normalisiert einen String zu GROSSBUCHSTABEN
 */
function normalizeStringUpperCase(value) {
    if (!value || typeof value !== 'string')
        return '';
    return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
/**
 * Normalisiert einen String zu Title Case (erster Buchstabe jedes Wortes groß)
 */
function normalizeStringTitleCase(value) {
    if (!value || typeof value !== 'string')
        return '';
    return value.trim().replace(/\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
/**
 * Normalisiert einen String und entfernt Diakritika
 */
function normalizeStringRemoveDiacritics(value) {
    const normalized = normalizeString(value);
    return normalized
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
/**
 * Parst deutsche Boolean-Werte
 */
function parseBooleanDe(value) {
    if (!value || typeof value !== 'string')
        return null;
    const normalized = value.trim().toLowerCase();
    const trueValues = ['ja', 'yes', 'true', 'y', '1'];
    const falseValues = ['nein', 'no', 'false', 'n', '0'];
    if (trueValues.includes(normalized))
        return true;
    if (falseValues.includes(normalized))
        return false;
    return null;
}
/**
 * Parst deutsche Datumswerte
 */
function parseDateDe(value) {
    if (!value || typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    try {
        // Versuche verschiedene Datumsformate zu parsen
        const parsed = dayjs(trimmed, ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'DD/MM/YYYY']);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
/**
 * Parst eine Zahl oder gibt null zurück
 */
function parseNumber(value) {
    if (!value || typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? null : parsed;
}
/**
 * Normalisiert eine Mitarbeiter-Zeile
 */
function normalizeMitarbeiterRow(row) {
    return {
        firstName: normalizeString(row.Vorname || ''),
        lastName: normalizeString(row.Nachname || ''),
        email: normalizeString(row['E-Mail'] || '').toLowerCase(),
        company: normalizeString(row.Firma || ''),
        businessLine: normalizeString(row['Business Line'] || ''), // Behalte Original-Formatierung
        bereich: normalizeString(row.Bereich || row['Bereich'] || ''), // Leer falls nicht vorhanden
        competenceCenter: normalizeString(row['Competence Center'] || ''), // Behalte Original-Formatierung
        teamName: normalizeString(row.Teamname || row['Team Name'] || row.Team || ''), // Behalte Original-Formatierung
        location: normalizeString(row.Standort || ''),
        grade: normalizeString(row.Karrierestufe || ''), // Behalte Original-Formatierung
        experienceSinceYear: parseNumber(row['Erfahrung seit Jahr'] || row['IT seit'] || row['Experience Since Year'] || ''),
        availableFrom: parseDateDe(row['Verfügbar ab']),
        availableForStaffing: parseBooleanDe(row['Verfügbar für Staffing']),
        profileUrl: normalizeString(row['Link zum Profil'] || ''), // Sollte die URL korrekt übernehmen
    };
}
/**
 * Erstellt einen normalisierten Namen für Duplikatserkennung
 */
function createNormalizedName(firstName, lastName) {
    const normalizedFirstName = normalizeStringRemoveDiacritics(firstName);
    const normalizedLastName = normalizeStringRemoveDiacritics(lastName);
    return `${normalizedLastName}|${normalizedFirstName}`;
}
/**
 * Erstellt eine sichere Document-ID aus einer E-Mail
 */
function createEmailDocId(email) {
    if (!email)
        return '';
    return email
        .toLowerCase()
        .replace(/@/g, '(at)')
        .replace(/\./g, '(dot)');
}
/**
 * Erstellt einen deterministischen Hash für den Fall, dass keine E-Mail vorhanden ist
 */
function createDeterministicHash(data) {
    const combined = `${data.normalizedName}|${data.competenceCenter}|${data.company}|${data.teamName}`;
    // Einfacher Hash-Algorithmus
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
}
//# sourceMappingURL=mitarbeiter.js.map