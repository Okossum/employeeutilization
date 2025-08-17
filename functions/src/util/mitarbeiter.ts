import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface MitarbeiterRow {
  Vorname: string;
  Nachname: string;
  'E-Mail': string;
  Firma: string;
  'Business Line': string;
  'Competence Center': string;
  Teamname: string;
  Standort: string;
  Karrierestufe: string;
  'Erfahrung seit Jahr': string;
  'Verfügbar ab': string;
  'Verfügbar für Staffing': string;
  'Link zum Profil': string;
}

export interface NormalizedMitarbeiter {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  businessLine: string;
  bereich: string;
  competenceCenter: string;
  teamName: string;
  location: string;
  grade: string;
  experienceSinceYear: number | null;
  availableFrom: string | null;
  availableForStaffing: boolean | null;
  profileUrl: string | null;
}

export interface StagingRow {
  sourceFileId: string;
  rowIndex: number;
  data: any;
  createdAt: FirebaseFirestore.FieldValue;
}

export interface EmployeeDocument {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  businessLine: string;
  competenceCenter: string;
  teamName: string;
  location: string;
  grade: string;
  experienceSinceYear: number | null;
  availableFrom: string | null;
  availableForStaffing: boolean | null;
  profileUrl: string | null;
  externalIds: Record<string, any>;
  active: boolean;
  normalizedName: string;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  duplicateHint?: boolean;
}

/**
 * Normalisiert einen String (trim, mehrfache Whitespaces reduzieren)
 */
export function normalizeString(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Normalisiert einen String zu GROSSBUCHSTABEN
 */
export function normalizeStringUpperCase(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Normalisiert einen String zu Title Case (erster Buchstabe jedes Wortes groß)
 */
export function normalizeStringTitleCase(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Normalisiert einen String und entfernt Diakritika
 */
export function normalizeStringRemoveDiacritics(value: string): string {
  const normalized = normalizeString(value);
  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Parst deutsche Boolean-Werte
 */
export function parseBooleanDe(value: string): boolean | null {
  if (!value || typeof value !== 'string') return null;
  
  const normalized = value.trim().toLowerCase();
  const trueValues = ['ja', 'yes', 'true', 'y', '1'];
  const falseValues = ['nein', 'no', 'false', 'n', '0'];
  
  if (trueValues.includes(normalized)) return true;
  if (falseValues.includes(normalized)) return false;
  
  return null;
}

/**
 * Parst deutsche Datumswerte
 */
export function parseDateDe(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  try {
    // Versuche verschiedene Datumsformate zu parsen
    const parsed = dayjs(trimmed, ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'DD/MM/YYYY']);
    
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Parst eine Zahl oder gibt null zurück
 */
export function parseNumber(value: string): number | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalisiert eine Mitarbeiter-Zeile
 */
export function normalizeMitarbeiterRow(row: any): NormalizedMitarbeiter {
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
export function createNormalizedName(firstName: string, lastName: string): string {
  const normalizedFirstName = normalizeStringRemoveDiacritics(firstName);
  const normalizedLastName = normalizeStringRemoveDiacritics(lastName);
  return `${normalizedLastName}|${normalizedFirstName}`;
}

/**
 * Erstellt eine sichere Document-ID aus einer E-Mail
 */
export function createEmailDocId(email: string): string {
  if (!email) return '';
  return email
    .toLowerCase()
    .replace(/@/g, '(at)')
    .replace(/\./g, '(dot)');
}

/**
 * Erstellt einen deterministischen Hash für den Fall, dass keine E-Mail vorhanden ist
 */
export function createDeterministicHash(data: {
  normalizedName: string;
  competenceCenter: string;
  company: string;
  teamName: string;
}): string {
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
