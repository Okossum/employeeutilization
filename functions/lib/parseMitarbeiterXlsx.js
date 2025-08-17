"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMitarbeiterXlsx = parseMitarbeiterXlsx;
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const XLSX = require("xlsx");
const firebase_functions_1 = require("firebase-functions");
const identity_1 = require("./identity");
// Firebase Admin initialisieren
if (!app_1.initializeApp.length) {
    (0, app_1.initializeApp)();
}
const storage = (0, storage_1.getStorage)();
const db = (0, firestore_1.getFirestore)();
/**
 * Parst eine Mitarbeiter-XLSX-Datei und verarbeitet sie
 */
async function parseMitarbeiterXlsx(bucketName, filePath) {
    firebase_functions_1.logger.info(`Starting to parse: ${filePath}`);
    try {
        // Datei aus Storage herunterladen
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        firebase_functions_1.logger.info(`Downloaded file, size: ${buffer.length} bytes`);
        // XLSX parsen
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            throw new Error('No worksheet found in XLSX file');
        }
        firebase_functions_1.logger.info(`Processing worksheet: ${sheetName}`);
        // Header-Zeile finden
        const headerRowIndex = findHeaderRow(worksheet);
        firebase_functions_1.logger.info(`Header found at row: ${headerRowIndex}`);
        // Daten ab der Header-Zeile extrahieren
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const data = [];
        for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
            const rowData = {};
            let hasData = false;
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                if (cell) {
                    const headerCellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
                    const headerCell = worksheet[headerCellAddress];
                    const header = headerCell ? String(headerCell.v).trim() : '';
                    if (header) {
                        let value = cell.v;
                        // Hyperlink-URL extrahieren falls vorhanden
                        if (header === 'Link zum Profil' && cell.l) {
                            value = cell.l.Target || cell.v;
                        }
                        rowData[header] = value;
                        if (value !== undefined && value !== null && value !== '') {
                            hasData = true;
                        }
                    }
                }
            }
            if (hasData) {
                data.push(rowData);
            }
        }
        firebase_functions_1.logger.info(`Extracted ${data.length} data rows`);
        // Jede Zeile verarbeiten
        const sourceFileId = generateSourceFileId(filePath);
        for (let i = 0; i < data.length; i++) {
            const rowData = data[i];
            const rowIndex = headerRowIndex + 1 + i;
            try {
                await processMitarbeiterRow(rowData, rowIndex, sourceFileId);
            }
            catch (error) {
                firebase_functions_1.logger.error(`Error processing row ${rowIndex}:`, error);
                // Staging-Row trotzdem erstellen für Debugging
                await createStagingRow(sourceFileId, rowIndex, rowData);
            }
        }
        // Source-File Status aktualisieren
        await updateSourceFileStatus(sourceFileId, 'processed', filePath);
        firebase_functions_1.logger.info(`Successfully processed ${data.length} rows from ${filePath}`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`Error parsing ${filePath}:`, error);
        // Source-File Status auf Error setzen
        const sourceFileId = generateSourceFileId(filePath);
        await updateSourceFileStatus(sourceFileId, 'error', filePath);
        throw error;
    }
}
/**
 * Findet die Header-Zeile in der Excel-Datei
 */
function findHeaderRow(worksheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    // Suche in den ersten 15 Zeilen nach Header mit "Vorname" und "E-Mail"
    for (let row = 0; row <= Math.min(14, range.e.r); row++) {
        let hasVorname = false;
        let hasEmail = false;
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            if (cell) {
                const cellValue = String(cell.v).toLowerCase();
                if (cellValue.includes('vorname'))
                    hasVorname = true;
                if (cellValue.includes('e-mail') || cellValue.includes('email'))
                    hasEmail = true;
            }
        }
        if (hasVorname && hasEmail) {
            return row;
        }
    }
    // Fallback: Zeile 8 (Index 7)
    return 7;
}
/**
 * Verarbeitet eine einzelne Mitarbeiter-Zeile
 */
async function processMitarbeiterRow(rowData, rowIndex, sourceFileId) {
    // Staging-Row erstellen
    await createStagingRow(sourceFileId, rowIndex, rowData);
    // Daten extrahieren
    const firstName = String(rowData.Vorname || '').trim();
    const lastName = String(rowData.Nachname || '').trim();
    const email = rowData['E-Mail'] ? String(rowData['E-Mail']).trim().toLowerCase() : null;
    const company = String(rowData.Firma || '').trim();
    const businessLine = String(rowData['Business Line'] || '').trim();
    const businessUnit = String(rowData['Business Unit'] || '').trim();
    const competenceCenter = String(rowData['Competence Center'] || '').trim();
    const teamName = String(rowData.Teamname || '').trim();
    const location = String(rowData.Standort || '').trim();
    const grade = String(rowData.Karrierestufe || '').trim();
    if (!firstName || !lastName) {
        firebase_functions_1.logger.warn(`Row ${rowIndex}: Missing firstName or lastName, skipping employee creation`);
        return;
    }
    // Einheitliche ID mit nameCcId
    const id = (0, identity_1.nameCcId)(firstName, lastName, competenceCenter);
    // Employee-Dokument mit buildEmployeeDoc erstellen
    const employeeCore = {
        firstName,
        lastName,
        competenceCenter,
        businessLine: businessLine || undefined,
        businessUnit: businessUnit || undefined,
        team: teamName || undefined,
        grade: grade || undefined,
        company: company || undefined,
        location: location || undefined,
        email
    };
    const employeeDoc = (0, identity_1.buildEmployeeDoc)(employeeCore);
    // updatedAt mit serverTimestamp setzen
    employeeDoc.updatedAt = new Date();
    // Employee idempotent upserten
    await db.doc(`employees/${id}`).set(Object.assign(Object.assign({}, employeeDoc), { createdAt: firestore_1.FieldValue.serverTimestamp() }), { merge: true });
    // Optional: Andere CCs für dieselbe Person deaktivieren
    try {
        await (0, identity_1.deactivateOtherCCs)(db, (0, identity_1.nameKey)(firstName, lastName), id);
    }
    catch (error) {
        firebase_functions_1.logger.warn(`Could not deactivate other CCs for ${firstName} ${lastName}:`, error);
    }
    firebase_functions_1.logger.info(`Processed employee: ${id} (${firstName} ${lastName})`);
}
/**
 * Erstellt eine Staging-Row
 */
async function createStagingRow(sourceFileId, rowIndex, data) {
    const rowKey = `${sourceFileId}:${rowIndex}`;
    const stagingRow = {
        sourceFileId,
        rowIndex,
        data,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await db.collection('stagingRows').doc(rowKey).set(stagingRow);
}
/**
 * Generiert eine Source-File-ID aus dem Dateipfad
 */
function generateSourceFileId(filePath) {
    return filePath.replace(/[^a-zA-Z0-9]/g, '_');
}
/**
 * Aktualisiert den Status einer Source-Datei
 */
async function updateSourceFileStatus(sourceFileId, status, filePath) {
    try {
        // Suche nach der sourceFile-Dokument basierend auf dem Dateipfad
        const sourceFilesQuery = await db.collection('sourceFiles')
            .where('filePath', '==', filePath)
            .limit(1)
            .get();
        if (!sourceFilesQuery.empty) {
            const docRef = sourceFilesQuery.docs[0].ref;
            await docRef.update({
                status,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            // Fallback: Verwende die sourceFileId
            await db.collection('sourceFiles').doc(sourceFileId).set({
                status,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    }
    catch (error) {
        firebase_functions_1.logger.warn(`Could not update source file status for ${sourceFileId}:`, error);
    }
}
//# sourceMappingURL=parseMitarbeiterXlsx.js.map