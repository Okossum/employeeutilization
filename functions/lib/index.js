"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMitarbeiterXlsxUploaded = exports.parseMitarbeiterXlsx = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const parseMitarbeiterXlsx_1 = require("./parseMitarbeiterXlsx");
Object.defineProperty(exports, "parseMitarbeiterXlsx", { enumerable: true, get: function () { return parseMitarbeiterXlsx_1.parseMitarbeiterXlsx; } });
// Storage Trigger für Mitarbeiter-XLSX-Dateien
exports.onMitarbeiterXlsxUploaded = (0, storage_1.onObjectFinalized)({
    bucket: process.env.FIREBASE_STORAGE_BUCKET,
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 540,
}, async (event) => {
    const filePath = event.data.name;
    const bucket = event.data.bucket;
    firebase_functions_1.logger.info(`Storage trigger fired for: ${filePath} in bucket: ${bucket}`);
    // Prüfe ob es sich um eine Mitarbeiter-XLSX-Datei handelt
    if (filePath && filePath.match(/^uploads\/mitarbeiter\/[^\/]+\/.*\.xlsx$/i)) {
        firebase_functions_1.logger.info(`Processing Mitarbeiter XLSX: ${filePath}`);
        try {
            await (0, parseMitarbeiterXlsx_1.parseMitarbeiterXlsx)(bucket, filePath);
            firebase_functions_1.logger.info(`Successfully processed: ${filePath}`);
        }
        catch (error) {
            firebase_functions_1.logger.error(`Error processing ${filePath}:`, error);
            throw error;
        }
    }
    else {
        firebase_functions_1.logger.info(`Skipping non-Mitarbeiter file: ${filePath}`);
    }
});
//# sourceMappingURL=index.js.map