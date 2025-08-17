/**
 * Firebase Cloud Function to import Excel "Auslastung operativ" files
 */

import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import * as XLSX from 'xlsx';
import { parseAndNormalizeName, createAliasDocId } from './lib/normalize';

// Initialize Firebase Admin (if not already initialized)
try {
  initializeApp();
} catch (error) {
  // App already initialized
}

const storage = getStorage();
const db = getFirestore();

interface WeeklyPercent {
  isoYear: number;
  isoWeek: number;
  percent: number;
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

interface WorkloadEntry {
  normalizedName: string;
  competenceCenter: string;
  rawName: string;
  businessLine?: string | null;
  bereich?: string | null;
  team?: string | null;
  location?: string | null;
  grade?: string | null;
  project?: string | null;
  customer?: string | null;
  weeklyPercent: WeeklyPercent[];
  sumPercent: number;
  match: MatchResult;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

/**
 * Parses a header cell to extract ISO week number from "KW XX" or "KW YY/XX" format
 * @param headerValue - Header value like "KW 33", "KW33", "KW 25/01", etc.
 * @returns ISO week number or null if not a valid KW header
 */
export function parseKWHeader(headerValue: string): number | null {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }

  const trimmed = headerValue.trim();
  
  // Format 1: "KW XX" (e.g., "KW 33")
  const kwMatch1 = trimmed.match(/^KW\s*(\d+)$/i);
  if (kwMatch1) {
    const weekNum = parseInt(kwMatch1[1], 10);
    return (weekNum >= 1 && weekNum <= 53) ? weekNum : null;
  }
  
  // Format 2: "KW YY/XX" (e.g., "KW 25/01") - use the week part (XX)
  const kwMatch2 = trimmed.match(/^KW\s*(\d+)\/(\d+)$/i);
  if (kwMatch2) {
    const weekNum = parseInt(kwMatch2[2], 10); // Use the week part (second number)
    return (weekNum >= 1 && weekNum <= 53) ? weekNum : null;
  }
  
  return null;
}

/**
 * Finds KW (calendar week) columns in headers and returns their indices with week numbers
 * @param headers - Array of header strings from row 3
 * @returns Array of objects with column index and ISO week number
 */
function findKWColumns(headers: string[]): Array<{ index: number; isoWeek: number }> {
  const kwColumns: Array<{ index: number; isoWeek: number }> = [];
  
  logger.info('🔍 [findKWColumns] Analyzing headers:', headers);
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const weekNum = parseKWHeader(header);
    logger.info(`🔍 [findKWColumns] Header ${i}: "${header}" -> week: ${weekNum}`);
    
    if (weekNum !== null) {
      kwColumns.push({ index: i, isoWeek: weekNum });
      logger.info(`✅ [findKWColumns] Added KW column: index ${i}, week ${weekNum}`);
    }
  }
  
  logger.info(`📊 [findKWColumns] Found ${kwColumns.length} KW columns:`, kwColumns);
  return kwColumns;
}

/**
 * Parses numeric value from cell, returns 0 for empty cells, null for invalid values
 * @param value - Cell value to parse
 * @returns Parsed number, 0 for empty, null for invalid
 */
function parseHoursValue(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return 0; // Empty cells are 0 hours
  }
  
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return isNaN(num) ? null : num;
}

/**
 * Parses string value from cell, returns null if empty
 * @param value - Cell value to parse
 * @returns Trimmed string or null
 */
function parseStringValue(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Matches employee against database using the specified order:
 * 1. Check aliases/{normalizedName|exactCC}
 * 2. Query employees by normalizedName and competenceCenter  
 * 3. Optional: Legacy doc-id direct lookup
 */
async function matchEmployee(normalizedName: string, competenceCenter: string): Promise<MatchResult> {
  try {
    // 1. Check for alias first
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
    
    // 2. Query employees by normalizedName and competenceCenter
    const employeesQuery = await db.collection('employees')
      .where('normalizedName', '==', normalizedName)
      .where('competenceCenter', '==', competenceCenter)
      .get();
    
    const employeeIds = employeesQuery.docs.map(doc => doc.id);
    
    if (employeeIds.length === 0) {
      // 3. Optional: Try legacy doc ID format as fallback
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
 * Processes a single data row from the Excel sheet
 */
async function processRow(
  row: any[],
  headers: string[],
  kwColumns: Array<{ index: number; isoWeek: number }>,
  currentYear: number
): Promise<{ entry: WorkloadEntry | null; error?: string }> {
  try {
    // Get columns based on fixed positions (A=0, B=1, C=2, D=3, E=4)
    const businessLineIdx = 0; // Spalte A: Business Line / LoB
    const bereichIdx = 1;      // Spalte B: Business Unit / Bereich
    const ccIdx = 2;           // Spalte C: Competence Center / CC
    const teamIdx = 3;         // Spalte D: Team (optional/leer möglich)
    const employeeIdx = 4;     // Spalte E: Name (z.B. Müller, Christian)
    
    // Extract and validate business line
    const businessLineValue = parseStringValue(row[businessLineIdx]);
    if (!businessLineValue) {
      return { entry: null, error: 'Missing business line value' };
    }
    
    // Extract and validate bereich
    const bereichValue = parseStringValue(row[bereichIdx]);
    if (!bereichValue) {
      return { entry: null, error: 'Missing bereich value' };
    }
    
    // Extract and validate competence center
    const ccValue = parseStringValue(row[ccIdx]);
    if (!ccValue) {
      return { entry: null, error: 'Missing competence center' };
    }
    
    const competenceCenter = ccValue.trim();
    
    // Extract team (optional)
    const teamValue = parseStringValue(row[teamIdx]);
    
    // Extract and validate employee name
    const nameValue = parseStringValue(row[employeeIdx]);
    if (!nameValue) {
      return { entry: null, error: 'Missing employee name' };
    }
    
    // Parse name in "Last, First" format
    let nameInfo;
    try {
      nameInfo = parseAndNormalizeName(nameValue);
    } catch (error) {
      return { entry: null, error: `Invalid name format: ${error}` };
    }
    
    // Set other fields (not available in this structure)
    const businessLine = businessLineValue;
    const bereich = bereichValue;
    const team = teamValue;
    const location = null; // Not available in this structure
    const grade = null;     // Not available in this structure
    const project = null;   // Not available in this structure
    const customer = null;  // Not available in this structure
    
    // Process weekly percent from KW columns (starting from column F, index 5)
    const weeklyPercent: WeeklyPercent[] = [];
    for (const kwCol of kwColumns) {
      // KW columns start from index 5 (column F), not from kwCol.index
      const actualColumnIndex = kwCol.index + 5;
      const percent = parseHoursValue(row[actualColumnIndex]);
      if (percent !== null) {
        weeklyPercent.push({
          isoYear: currentYear,
          isoWeek: kwCol.isoWeek,
          percent
        });
      }
    }
    

    
    // Match employee
    const match = await matchEmployee(nameInfo.normalizedName, competenceCenter);
    
    // Create workload entry
    const entry: WorkloadEntry = {
      normalizedName: nameInfo.normalizedName,
      competenceCenter,
      rawName: nameInfo.rawName,
      businessLine,
      bereich,
      team,
      location,
      grade,
      project,
      customer,
      weeklyPercent,
      sumPercent: 0,
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
 * Creates a document ID for workload entries
 * @param normalizedName - Normalized name key
 * @param competenceCenter - Exact competence center (trimmed only)
 * @returns Document ID in format "normalizedname|competencecenter"
 */
function createWorkloadEntryDocId(normalizedName: string, competenceCenter: string): string {
  return `${normalizedName}|${competenceCenter}`;
}

/**
 * Main function to process Workload XLSX upload
 */
export const onWorkloadXlsxUploaded = onObjectFinalized({
  bucket: process.env.FIREBASE_STORAGE_BUCKET,
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540,
}, async (event) => {
  const filePath = event.data.name;
  const bucket = event.data.bucket;
  const startTime = Date.now();
  
  logger.info('🚀 [onWorkloadXlsxUploaded] Function triggered', {
    filePath,
    bucket,
    eventId: event.id,
    timestamp: new Date().toISOString()
  });
  
  // Check if it's a workload XLSX file in the correct path
  if (!filePath || !filePath.match(/^uploads\/auslastung\/[^\/]+\/.*\.xlsx$/i)) {
    logger.info('⏭️ [onWorkloadXlsxUploaded] Skipping non-workload file', {
      filePath,
      reason: 'Path does not match pattern: uploads/auslastung/{userId}/*.xlsx'
    });
    return;
  }
  
  logger.info('✅ [onWorkloadXlsxUploaded] File path validated, starting processing', {
    filePath,
    pattern: 'uploads/auslastung/{userId}/*.xlsx'
  });
  
  try {
    // Download file from Storage
    logger.info('📥 [onWorkloadXlsxUploaded] Downloading file from Storage', { filePath });
    const file = storage.bucket(bucket).file(filePath);
    const [fileBuffer] = await file.download();
    
    logger.info('📊 [onWorkloadXlsxUploaded] File downloaded successfully', {
      fileSize: fileBuffer.length,
      fileSizeMB: Math.round(fileBuffer.length / 1024 / 1024 * 100) / 100
    });
    
    // Parse XLSX
    logger.info('📋 [onWorkloadXlsxUploaded] Parsing XLSX file');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    logger.info('📑 [onWorkloadXlsxUploaded] Workbook parsed', {
      sheetNames: Object.keys(workbook.Sheets),
      sheetCount: Object.keys(workbook.Sheets).length
    });
    
    // Get "Export" sheet
    const sheetName = 'Export';
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      const availableSheets = Object.keys(workbook.Sheets);
      logger.error('❌ [onWorkloadXlsxUploaded] Required sheet not found', {
        requiredSheet: sheetName,
        availableSheets
      });
      throw new Error(`Sheet "${sheetName}" not found. Available sheets: ${availableSheets.join(', ')}`);
    }
    
    logger.info('✅ [onWorkloadXlsxUploaded] Found required sheet', { sheetName });
    
    // Convert to array of arrays
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    logger.info('📋 [onWorkloadXlsxUploaded] Sheet converted to data array', {
      totalRows: data.length,
      dataPreview: data.slice(0, 3).map((row, i) => ({ row: i + 1, data: row }))
    });
    
    if (data.length < 3) {
      logger.error('❌ [onWorkloadXlsxUploaded] Insufficient rows in sheet', {
        actualRows: data.length,
        requiredRows: 3,
        reason: 'Headers must be in row 3'
      });
      throw new Error('Sheet must have at least 3 rows (headers in row 3)');
    }
    
    // Get headers from row 3 (index 2)
    const headers: string[] = data[2].map(h => String(h || '').trim());
    logger.info('🏷️ [onWorkloadXlsxUploaded] Headers extracted from row 3', {
      headers,
      headerCount: headers.length
    });
    
    // Find KW columns
    const kwColumns = findKWColumns(headers);
    const weeksCount = kwColumns.length;
    
    logger.info('📅 [onWorkloadXlsxUploaded] KW columns analysis', {
      kwColumns: kwColumns.map(kw => ({ index: kw.index, header: headers[kw.index], isoWeek: kw.isoWeek })),
      weeksCount
    });
    
    if (weeksCount === 0) {
      logger.error('❌ [onWorkloadXlsxUploaded] No KW columns found', {
        headers,
        searchPattern: 'KW XX format'
      });
      throw new Error('No KW (calendar week) columns found in headers');
    }
    
    logger.info(`✅ [onWorkloadXlsxUploaded] Found ${weeksCount} KW columns:`, 
      kwColumns.map(kw => `KW ${kw.isoWeek} at index ${kw.index}`));
    
    // Determine plan year and week from file timestamp or first KW column
    const currentYear = new Date().getFullYear();
    const firstWeek = kwColumns[0].isoWeek;
    
    // Create plan document
    const planId = `${currentYear}-W${firstWeek.toString().padStart(2, '0')}-${Date.now()}`;
    
    const planData = {
      planWeek: firstWeek,
      planYear: currentYear,
      generatedAt: FieldValue.serverTimestamp(),
      sourcePath: filePath,
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
    
    // Process data rows (starting from row 9, index 8) - skip total rows
    const importStats: ImportStats = { matched: 0, unmatched: 0, duplicates: 0, total: 0 };
    const entries: { [docId: string]: WorkloadEntry } = {};
    const errors: string[] = [];
    
    for (let i = 8; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }
      
      importStats.total++;
      
      const result = await processRow(row, headers, kwColumns, currentYear);
      
      if (result.error || !result.entry) {
        errors.push(`Row ${i + 1}: ${result.error || 'Unknown error'}`);
        importStats.unmatched++;
        continue;
      }
      
      const entry = result.entry;
      const docId = createWorkloadEntryDocId(entry.normalizedName, entry.competenceCenter);
      
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
    
    // Write to Firestore in batches
    const BATCH_SIZE = 100;
    const planRef = db.collection('workloads').doc(planId);
    const entriesCollection = planRef.collection('entries');
    
    // First write the plan document
    await planRef.set(planData);
    logger.info(`Workload plan document created: ${planId}`);
    
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
      logger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Committed ${currentBatch.length} workload entries`);
    }
    
    logger.info(`All batches committed. Total workload entries: ${entryEntries.length}`);
    
    const processingTime = Date.now() - startTime;
    
    // Log results
    logger.info('🎉 [onWorkloadXlsxUploaded] Processing completed successfully', {
      planId,
      processingTimeMs: processingTime,
      processingTimeSec: Math.round(processingTime / 1000 * 100) / 100,
      statistics: {
        totalRows: importStats.total,
        matched: importStats.matched,
        unmatched: importStats.unmatched,
        duplicates: importStats.duplicates,
        successRate: Math.round((importStats.matched / importStats.total) * 100)
      },
      dataWritten: {
        planDocument: 1,
        entryDocuments: entryEntries.length,
        totalBatches: Math.ceil(entryEntries.length / BATCH_SIZE)
      }
    });
    
    if (errors.length > 0) {
      logger.warn(`⚠️ [onWorkloadXlsxUploaded] Processing errors encountered`, {
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Log first 10 errors
        totalErrors: errors.length
      });
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('💥 [onWorkloadXlsxUploaded] Fatal error during processing', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime
    });
    throw error;
  }
});
