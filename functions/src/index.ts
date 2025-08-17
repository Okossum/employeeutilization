import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions';
import { parseMitarbeiterXlsx } from './parseMitarbeiterXlsx';

// Export der neuen Funktion
export { parseMitarbeiterXlsx };

// Storage Trigger für Mitarbeiter-XLSX-Dateien
export const onMitarbeiterXlsxUploaded = onObjectFinalized({
  bucket: process.env.FIREBASE_STORAGE_BUCKET,
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 540,
}, async (event) => {
  const filePath = event.data.name;
  const bucket = event.data.bucket;
  
  logger.info(`Storage trigger fired for: ${filePath} in bucket: ${bucket}`);
  
  // Prüfe ob es sich um eine Mitarbeiter-XLSX-Datei handelt
  if (filePath && filePath.match(/^uploads\/mitarbeiter\/[^\/]+\/.*\.xlsx$/i)) {
    logger.info(`Processing Mitarbeiter XLSX: ${filePath}`);
    
    try {
      await parseMitarbeiterXlsx(bucket, filePath);
      logger.info(`Successfully processed: ${filePath}`);
    } catch (error) {
      logger.error(`Error processing ${filePath}:`, error);
      throw error;
    }
  } else {
    logger.info(`Skipping non-Mitarbeiter file: ${filePath}`);
  }
});
