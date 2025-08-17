/**
 * Firebase Cloud Function to import Excel "Einsatzplan" files
 */

import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import * as XLSX from 'xlsx';
import { parseAndNormalizeName, normalizeCompetenceCenter, createEntryDocId, createAliasDocId } from './lib/normalize';
import { parseA1Content, calculateWeekOffset } from './lib/isoWeek';

// Initialize Firebase Admin (if not already initialized)
try {
  initializeApp();
} catch (error) {
  // App already initialized
}

const storage = getStorage();
const db = getFirestore();

interface WeekData {
  index: number;
  isoYear: number;
  isoWeek: number;
  project: string | null;
  nkvPct: number | null;
  utilizationPct: number | null;
  location: string | null;
  isoKey: string;
}

interface MatchResult {
  status: 'matched' | 'unmatched' | 'duplicate';
  employeeIds: string[];
  chosenEmployeeId?: string;
}

interface ImportStats {
  matched: number;
  unmatched: number;
  duplicates: number;
  total: number;
}

interface PlanEntry {
  normalizedName: string;
  competenceCenter: string;
  rawName: string;
  lob: string | null;
  bereich: string | null;
  team: string | null;
  office: string | null;
  currentLocation: string | null;
  grade: string | null;
  skills: string | null;
  offeredAt: string | null;
  staffbar: boolean | null;
  ov: string | null;
  op: string | null;
  weeks: WeekData[];
  match: MatchResult;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

/**
 * Detects weekly triplet columns dynamically
 * @param headers - Array of header strings
 * @returns Array of triplet objects with column indices
 */
function detectWeeklyTriplets(headers: string[]): Array<{ proj: number; nkv: number; ort: number }> {
  const triplets: Array<{ proj: number; nkv: number; ort: number }> = [];
  
  // First try: Look for suffixed triplets (.1, .2, .3, etc.)
  let suffix = 1;
  while (true) {
    const projIdx = headers.findIndex(h => h === `Proj.${suffix}`);
    const nkvIdx = headers.findIndex(h => h === `NKV (%).${suffix}`);
    const ortIdx = headers.findIndex(h => h === `Ort.${suffix}`);
    
    // Stop if any of the three columns is missing
    if (projIdx < 0 || nkvIdx < 0 || ortIdx < 0) {
      break;
    }
    
    triplets.push({ proj: projIdx, nkv: nkvIdx, ort: ortIdx });
    suffix++;
  }
  
  // If no suffixed triplets found, look for repeated base triplets
  if (triplets.length === 0) {
    let startIndex = 0;
    while (startIndex < headers.length) {
      const projIdx = headers.indexOf('Proj', startIndex);
      const nkvIdx = headers.indexOf('NKV (%)', startIndex);
      const ortIdx = headers.indexOf('Ort', startIndex);
      
      // All three must be found and in reasonable proximity
      if (projIdx >= 0 && nkvIdx >= 0 && ortIdx >= 0) {
        // Check if they are close to each other (within 10 columns)
        const maxIdx = Math.max(projIdx, nkvIdx, ortIdx);
        const minIdx = Math.min(projIdx, nkvIdx, ortIdx);
        
        if (maxIdx - minIdx <= 10) {
          triplets.push({ proj: projIdx, nkv: nkvIdx, ort: ortIdx });
          startIndex = maxIdx + 1; // Start search after this triplet
        } else {
          break; // Triplet columns too far apart
        }
      } else {
        break; // No more complete triplets found
      }
    }
  }
  
  return triplets;
}

/**
 * Parses numeric value from cell, returns null if empty or invalid
 */
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return isNaN(num) ? null : num;
}

/**
 * Parses string value from cell, returns null if empty
 */
function parseStringValue(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value).trim() || null;
}

/**
 * Matches employee against database
 */
async function matchEmployee(normalizedName: string, competenceCenter: string): Promise<MatchResult> {
  try {
    // First check for alias
    const aliasId = createAliasDocId(normalizedName, competenceCenter);
    const aliasDoc = await db.collection('aliases').doc(aliasId).get();
    
    if (aliasDoc.exists) {
      const aliasData = aliasDoc.data();
      return {
        status: 'matched',
        employeeIds: [aliasData!.employeeId],
        chosenEmployeeId: aliasData!.employeeId
      };
    }
    
    // Query employees by normalizedName and competenceCenter
    const employeesQuery = await db.collection('employees')
      .where('normalizedName', '==', normalizedName)
      .where('competenceCenter', '==', competenceCenter)
      .get();
    
    const employeeIds = employeesQuery.docs.map(doc => doc.id);
    
    if (employeeIds.length === 0) {
      // Optional: Try legacy doc ID format as fallback
      const legacyDocId = `${normalizedName}|${competenceCenter.toLowerCase().trim()}`;
      const legacyDoc = await db.collection('employees').doc(legacyDocId).get();
      
      if (legacyDoc.exists) {
        return {
          status: 'matched',
          employeeIds: [legacyDocId],
          chosenEmployeeId: legacyDocId
        };
      }
      
      return {
        status: 'unmatched',
        employeeIds: []
      };
    } else if (employeeIds.length === 1) {
      return {
        status: 'matched',
        employeeIds,
        chosenEmployeeId: employeeIds[0]
      };
    } else {
      return {
        status: 'duplicate',
        employeeIds
      };
    }
  } catch (error) {
    logger.error(`Error matching employee ${normalizedName}|${competenceCenter}:`, error);
    return {
      status: 'unmatched',
      employeeIds: []
    };
  }
}

/**
 * Processes a single row from the Excel sheet
 */
async function processRow(
  row: any[],
  headers: string[],
  triplets: Array<{ proj: number; nkv: number; ort: number }>,
  planYear: number,
  planWeek: number
): Promise<{ entry: PlanEntry | null; error?: string }> {
  try {
    // Get name column (should be first column or find by header)
    const nameIdx = headers.findIndex(h => h === 'Name') || 0;
    const nameValue = parseStringValue(row[nameIdx]);
    
    if (!nameValue) {
      return { entry: null, error: 'Missing name' };
    }
    
    // Parse and normalize name
    const nameInfo = parseAndNormalizeName(nameValue);
    
    // Get competence center
    const ccIdx = headers.findIndex(h => h === 'CC');
    const ccValue = parseStringValue(row[ccIdx]);
    
    if (!ccValue) {
      return { entry: null, error: 'Missing competence center' };
    }
    
    const competenceCenter = normalizeCompetenceCenter(ccValue);
    
    // Get other fields (return null instead of undefined for Firestore compatibility)
    const getFieldValue = (fieldName: string): string | null => {
      const idx = headers.findIndex(h => h === fieldName);
      return idx >= 0 ? parseStringValue(row[idx]) : null;
    };
    
    const getBooleanValue = (fieldName: string): boolean | null => {
      const idx = headers.findIndex(h => h === fieldName);
      if (idx < 0) return null;
      const value = row[idx];
      if (value === null || value === undefined || value === '') return null;
      const str = String(value).toLowerCase().trim();
      return str === 'true' || str === '1' || str === 'ja' || str === 'yes';
    };
    
    // Process weekly data
    const weeks: WeekData[] = [];
    for (let i = 0; i < triplets.length; i++) {
      const triplet = triplets[i];
      
      const nkvPct = parseNumericValue(row[triplet.nkv]);
      
      // Calculate utilization percentage (allow values > 100, no clamping)
      const utilizationPct = nkvPct !== null ? 100 - nkvPct : null;
      
      // Calculate ISO week info
      const weekInfo = calculateWeekOffset(planYear, planWeek, i);
      
      weeks.push({
        index: i,
        isoYear: weekInfo.isoYear,
        isoWeek: weekInfo.isoWeek,
        project: parseStringValue(row[triplet.proj]),
        nkvPct,
        utilizationPct,
        location: parseStringValue(row[triplet.ort]),
        isoKey: weekInfo.isoKey
      });
    }
    
    // Match employee
    const match = await matchEmployee(nameInfo.normalizedName, competenceCenter);
    
    // Create entry
    const entry: PlanEntry = {
      normalizedName: nameInfo.normalizedName,
      competenceCenter,
      rawName: nameInfo.rawName,
      lob: getFieldValue('LoB'),
      bereich: getFieldValue('Bereich'),
      team: getFieldValue('Team'),
      office: getFieldValue('Geschäftsstelle'),
      currentLocation: getFieldValue('akt. Einsatzort'),
      grade: getFieldValue('LBS'),
      skills: getFieldValue('Kompetenz'),
      offeredAt: getFieldValue('Angeboten bei'),
      staffbar: getBooleanValue('Staffbar'),
      ov: getFieldValue('OV'),
      op: getFieldValue('OP'),
      weeks,
      match,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    return { entry };
  } catch (error) {
    return { entry: null, error: String(error) };
  }
}

/**
 * Main function to process Einsatzplan XLSX upload
 */
export const onEinsatzplanXlsxUploaded = onObjectFinalized({
  bucket: process.env.FIREBASE_STORAGE_BUCKET,
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540,
}, async (event) => {
  const filePath = event.data.name;
  const bucket = event.data.bucket;
  
  logger.info(`Storage trigger fired for: ${filePath} in bucket: ${bucket}`);
  
  // Check if it's an Einsatzplan XLSX file
  if (!filePath || !filePath.match(/^uploads\/einsatzplaene\/[^\/]+\/.*\.xlsx$/i)) {
    logger.info(`Skipping non-Einsatzplan file: ${filePath}`);
    return;
  }
  
  logger.info(`Processing Einsatzplan XLSX: ${filePath}`);
  
  try {
    // Download file from Storage
    const file = storage.bucket(bucket).file(filePath);
    const [fileBuffer] = await file.download();
    
    // Parse XLSX
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get "Einsatzplan" sheet
    const sheetName = 'Einsatzplan';
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found. Available sheets: ${Object.keys(workbook.Sheets).join(', ')}`);
    }
    
    // Convert to array of arrays
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    if (data.length < 3) {
      throw new Error('Sheet must have at least 3 rows (A1, empty, header)');
    }
    
    // Parse A1 content
    const a1Content = data[0][0];
    if (!a1Content) {
      throw new Error('Cell A1 is empty');
    }
    
    const planInfo = parseA1Content(String(a1Content));
    logger.info('Plan info:', planInfo);
    
    // Get headers from row 3 (index 2)
    const headers: string[] = data[2].map(h => String(h || '').trim());
    logger.info('Headers:', headers);
    
    // Detect weekly triplets
    const triplets = detectWeeklyTriplets(headers);
    const weeksCount = triplets.length;
    
    if (weeksCount === 0) {
      throw new Error('No weekly triplets (Proj, NKV (%), Ort) found in headers');
    }
    
    logger.info(`Detected ${weeksCount} weekly triplets`);
    
    // Create plan document
    const planId = `${planInfo.planYear}-W${planInfo.planWeek.toString().padStart(2, '0')}-${Date.now()}`;
    
    const planData = {
      planWeek: planInfo.planWeek,
      planYear: planInfo.planYear,
      generatedAt: planInfo.generatedAt,
      sourcePath: filePath,
      columns: headers,
      weeksCount,
      displayWeeks: 8,
      importStats: {
        matched: 0,
        unmatched: 0,
        duplicates: 0,
        total: 0
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    // Process data rows (starting from row 4, index 3)
    const importStats: ImportStats = { matched: 0, unmatched: 0, duplicates: 0, total: 0 };
    const entries: { [docId: string]: PlanEntry } = {};
    const errors: string[] = [];
    
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }
      
      importStats.total++;
      
      const result = await processRow(row, headers, triplets, planInfo.planYear, planInfo.planWeek);
      
      if (result.error || !result.entry) {
        errors.push(`Row ${i + 1}: ${result.error || 'Unknown error'}`);
        importStats.unmatched++;
        continue;
      }
      
      const entry = result.entry;
      const docId = createEntryDocId(entry.normalizedName, entry.competenceCenter);
      
      // Check for duplicates within the file
      if (entries[docId]) {
        errors.push(`Row ${i + 1}: Duplicate entry for ${entry.rawName} (${entry.competenceCenter})`);
        importStats.duplicates++;
        continue;
      }
      
      entries[docId] = entry;
      
      // Update stats based on match status
      switch (entry.match.status) {
        case 'matched':
          importStats.matched++;
          break;
        case 'unmatched':
          importStats.unmatched++;
          break;
        case 'duplicate':
          importStats.duplicates++;
          break;
      }
    }
    
    // Update plan data with final stats
    planData.importStats = importStats;
    
    // Write to Firestore in smaller batches (max 100 docs per batch)
    const BATCH_SIZE = 100;
    const planRef = db.collection('plans').doc(planId);
    const entriesCollection = planRef.collection('entries');
    
    // First write the plan document
    await planRef.set(planData);
    logger.info(`Plan document created: ${planId}`);
    
    // Write entry documents in batches
    const entryEntries = Object.entries(entries);
    for (let i = 0; i < entryEntries.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const currentBatch = entryEntries.slice(i, i + BATCH_SIZE);
      
      currentBatch.forEach(([docId, entry]) => {
        const entryRef = entriesCollection.doc(docId);
        batch.set(entryRef, entry);
      });
      
      await batch.commit();
      logger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Committed ${currentBatch.length} entries`);
    }
    
    logger.info(`All batches committed. Total entries: ${entryEntries.length}`);
    
    // Log results
    logger.info(`Successfully processed ${importStats.total} rows:`);
    logger.info(`- Matched: ${importStats.matched}`);
    logger.info(`- Unmatched: ${importStats.unmatched}`);
    logger.info(`- Duplicates: ${importStats.duplicates}`);
    logger.info(`- Plan ID: ${planId}`);
    
    if (errors.length > 0) {
      logger.warn(`Processing errors (${errors.length}):`, errors);
    }
    
  } catch (error) {
    logger.error(`Error processing ${filePath}:`, error);
    throw error;
  }
});
