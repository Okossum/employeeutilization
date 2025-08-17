"use strict";
/**
 * Firebase Cloud Function to import Excel "Einsatzplan" files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEinsatzplanXlsxUploaded = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const storage_2 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const XLSX = require("xlsx");
const normalize_1 = require("./lib/normalize");
const isoWeek_1 = require("./lib/isoWeek");
// Initialize Firebase Admin (if not already initialized)
try {
    (0, app_1.initializeApp)();
}
catch (error) {
    // App already initialized
}
const storage = (0, storage_2.getStorage)();
const db = (0, firestore_1.getFirestore)();
/**
 * Detects weekly triplet columns dynamically
 * @param headers - Array of header strings
 * @returns Array of triplet objects with column indices
 */
function detectWeeklyTriplets(headers) {
    const triplets = [];
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
                }
                else {
                    break; // Triplet columns too far apart
                }
            }
            else {
                break; // No more complete triplets found
            }
        }
    }
    return triplets;
}
/**
 * Parses numeric value from cell, returns null if empty or invalid
 */
function parseNumericValue(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return isNaN(num) ? null : num;
}
/**
 * Parses string value from cell, returns null if empty
 */
function parseStringValue(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    return String(value).trim() || null;
}
/**
 * Matches employee against database
 */
async function matchEmployee(normalizedName, competenceCenter) {
    try {
        // First check for alias
        const aliasId = (0, normalize_1.createAliasDocId)(normalizedName, competenceCenter);
        const aliasDoc = await db.collection('aliases').doc(aliasId).get();
        if (aliasDoc.exists) {
            const aliasData = aliasDoc.data();
            return {
                status: 'matched',
                employeeIds: [aliasData.employeeId],
                chosenEmployeeId: aliasData.employeeId
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
        }
        else if (employeeIds.length === 1) {
            return {
                status: 'matched',
                employeeIds,
                chosenEmployeeId: employeeIds[0]
            };
        }
        else {
            return {
                status: 'duplicate',
                employeeIds
            };
        }
    }
    catch (error) {
        firebase_functions_1.logger.error(`Error matching employee ${normalizedName}|${competenceCenter}:`, error);
        return {
            status: 'unmatched',
            employeeIds: []
        };
    }
}
/**
 * Processes a single row from the Excel sheet
 */
async function processRow(row, headers, triplets, planYear, planWeek) {
    try {
        // Get name column (should be first column or find by header)
        const nameIdx = headers.findIndex(h => h === 'Name') || 0;
        const nameValue = parseStringValue(row[nameIdx]);
        if (!nameValue) {
            return { entry: null, error: 'Missing name' };
        }
        // Parse and normalize name
        const nameInfo = (0, normalize_1.parseAndNormalizeName)(nameValue);
        // Get competence center
        const ccIdx = headers.findIndex(h => h === 'CC');
        const ccValue = parseStringValue(row[ccIdx]);
        if (!ccValue) {
            return { entry: null, error: 'Missing competence center' };
        }
        const competenceCenter = (0, normalize_1.normalizeCompetenceCenter)(ccValue);
        // Get other fields (return null instead of undefined for Firestore compatibility)
        const getFieldValue = (fieldName) => {
            const idx = headers.findIndex(h => h === fieldName);
            return idx >= 0 ? parseStringValue(row[idx]) : null;
        };
        const getBooleanValue = (fieldName) => {
            const idx = headers.findIndex(h => h === fieldName);
            if (idx < 0)
                return null;
            const value = row[idx];
            if (value === null || value === undefined || value === '')
                return null;
            const str = String(value).toLowerCase().trim();
            return str === 'true' || str === '1' || str === 'ja' || str === 'yes';
        };
        // Process weekly data
        const weeks = [];
        for (let i = 0; i < triplets.length; i++) {
            const triplet = triplets[i];
            const nkvPct = parseNumericValue(row[triplet.nkv]);
            // Calculate utilization percentage (allow values > 100, no clamping)
            const utilizationPct = nkvPct !== null ? 100 - nkvPct : null;
            // Calculate ISO week info
            const weekInfo = (0, isoWeek_1.calculateWeekOffset)(planYear, planWeek, i);
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
        const entry = {
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        return { entry };
    }
    catch (error) {
        return { entry: null, error: String(error) };
    }
}
/**
 * Main function to process Einsatzplan XLSX upload
 */
exports.onEinsatzplanXlsxUploaded = (0, storage_1.onObjectFinalized)({
    bucket: process.env.FIREBASE_STORAGE_BUCKET,
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 540,
}, async (event) => {
    const filePath = event.data.name;
    const bucket = event.data.bucket;
    firebase_functions_1.logger.info(`Storage trigger fired for: ${filePath} in bucket: ${bucket}`);
    // Check if it's an Einsatzplan XLSX file
    if (!filePath || !filePath.match(/^uploads\/einsatzplaene\/[^\/]+\/.*\.xlsx$/i)) {
        firebase_functions_1.logger.info(`Skipping non-Einsatzplan file: ${filePath}`);
        return;
    }
    firebase_functions_1.logger.info(`Processing Einsatzplan XLSX: ${filePath}`);
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
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        if (data.length < 3) {
            throw new Error('Sheet must have at least 3 rows (A1, empty, header)');
        }
        // Parse A1 content
        const a1Content = data[0][0];
        if (!a1Content) {
            throw new Error('Cell A1 is empty');
        }
        const planInfo = (0, isoWeek_1.parseA1Content)(String(a1Content));
        firebase_functions_1.logger.info('Plan info:', planInfo);
        // Get headers from row 3 (index 2)
        const headers = data[2].map(h => String(h || '').trim());
        firebase_functions_1.logger.info('Headers:', headers);
        // Detect weekly triplets
        const triplets = detectWeeklyTriplets(headers);
        const weeksCount = triplets.length;
        if (weeksCount === 0) {
            throw new Error('No weekly triplets (Proj, NKV (%), Ort) found in headers');
        }
        firebase_functions_1.logger.info(`Detected ${weeksCount} weekly triplets`);
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        // Process data rows (starting from row 4, index 3)
        const importStats = { matched: 0, unmatched: 0, duplicates: 0, total: 0 };
        const entries = {};
        const errors = [];
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
            const docId = (0, normalize_1.createEntryDocId)(entry.normalizedName, entry.competenceCenter);
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
        firebase_functions_1.logger.info(`Plan document created: ${planId}`);
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
            firebase_functions_1.logger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Committed ${currentBatch.length} entries`);
        }
        firebase_functions_1.logger.info(`All batches committed. Total entries: ${entryEntries.length}`);
        // Log results
        firebase_functions_1.logger.info(`Successfully processed ${importStats.total} rows:`);
        firebase_functions_1.logger.info(`- Matched: ${importStats.matched}`);
        firebase_functions_1.logger.info(`- Unmatched: ${importStats.unmatched}`);
        firebase_functions_1.logger.info(`- Duplicates: ${importStats.duplicates}`);
        firebase_functions_1.logger.info(`- Plan ID: ${planId}`);
        if (errors.length > 0) {
            firebase_functions_1.logger.warn(`Processing errors (${errors.length}):`, errors);
        }
    }
    catch (error) {
        firebase_functions_1.logger.error(`Error processing ${filePath}:`, error);
        throw error;
    }
});
//# sourceMappingURL=onEinsatzplanXlsxUploaded.js.map