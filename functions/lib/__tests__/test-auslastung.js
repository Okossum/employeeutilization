"use strict";
/**
 * Integration test for workload XLSX upload
 * Creates a test Excel file and tests the complete import flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testWorkloadData = void 0;
exports.createTestWorkloadExcel = createTestWorkloadExcel;
exports.testWorkloadImport = testWorkloadImport;
const XLSX = require("xlsx");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
// Test data for workload Excel
const testWorkloadData = [
    // Row 1: Empty (as per Excel format)
    [],
    // Row 2: Empty
    [],
    // Row 3: Headers (index 2)
    [
        'Name',
        'CC',
        'BL',
        'Bereich',
        'Team',
        'Standort',
        'LBS',
        'Projekt',
        'Kunde',
        'KW 33',
        'KW 34',
        'KW 35',
        'KW 36',
        'Summe Aufwand'
    ],
    // Row 4+: Data rows
    [
        'Müller, Hans',
        'IT Services',
        'Digital',
        'Software Development',
        'Backend Team',
        'München',
        'Senior',
        'Project Alpha',
        'Customer A',
        40,
        35,
        40,
        32,
        147
    ],
    [
        'Schmidt, Maria',
        'Business Analytics & Data Science',
        'Analytics',
        'Data Science',
        'ML Team',
        'Berlin',
        'Expert',
        'Project Beta',
        'Customer B',
        32,
        40,
        38,
        40,
        150
    ],
    [
        'Weber, Thomas',
        'Strategy & Operations',
        'Consulting',
        'Strategy',
        'Operations',
        'Hamburg',
        'Manager',
        'Project Gamma',
        'Customer C',
        25,
        30,
        35,
        40,
        130
    ],
    // Test edge cases
    [
        'Özkan, José',
        'HR-Services',
        'HR',
        'People & Culture',
        'Recruiting',
        'Frankfurt',
        'Junior',
        '',
        '',
        0,
        '',
        null,
        20,
        20
    ]
];
exports.testWorkloadData = testWorkloadData;
/**
 * Creates a test Excel file for workload import
 */
function createTestWorkloadExcel() {
    const ws = XLSX.utils.aoa_to_sheet(testWorkloadData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auslastung operativ');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
/**
 * Integration test helper that uploads a test file and verifies processing
 */
async function testWorkloadImport() {
    const errors = [];
    try {
        // Initialize Firebase (if needed)
        try {
            (0, app_1.initializeApp)();
        }
        catch (e) {
            // Already initialized
        }
        const storage = (0, storage_1.getStorage)();
        const db = (0, firestore_1.getFirestore)();
        // Create test file
        const testFile = createTestWorkloadExcel();
        const timestamp = Date.now();
        const filePath = `uploads/auslastung/test-user/${timestamp}.xlsx`;
        // Upload to Storage (this should trigger the function)
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        await file.save(testFile, {
            metadata: {
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });
        console.log(`Test file uploaded: ${filePath}`);
        // Wait a bit for function to process
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Check if workload documents were created
        const workloadsSnapshot = await db.collection('workloads')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (workloadsSnapshot.empty) {
            errors.push('No workload documents found after upload');
            return { success: false, errors };
        }
        const planDoc = workloadsSnapshot.docs[0];
        const planData = planDoc.data();
        const planId = planDoc.id;
        console.log(`Found plan: ${planId}`, planData.importStats);
        // Check entries
        const entriesSnapshot = await planDoc.ref.collection('entries').get();
        console.log(`Found ${entriesSnapshot.size} entries`);
        // Verify some entries
        const entries = entriesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Check specific test entries
        const muellerEntry = entries.find((e) => e.rawName === 'Müller, Hans');
        const schmidtEntry = entries.find((e) => e.rawName === 'Schmidt, Maria');
        if (!muellerEntry) {
            errors.push('Müller, Hans entry not found');
        }
        else {
            console.log('Müller entry:', {
                normalizedName: muellerEntry.normalizedName,
                competenceCenter: muellerEntry.competenceCenter,
                weeklyHours: muellerEntry.weeklyHours,
                sumHours: muellerEntry.sumHours,
                match: muellerEntry.match
            });
        }
        if (!schmidtEntry) {
            errors.push('Schmidt, Maria entry not found');
        }
        // Cleanup test file
        await file.delete();
        return {
            success: errors.length === 0,
            planId,
            errors,
            stats: planData.importStats
        };
    }
    catch (error) {
        errors.push(`Test failed: ${error}`);
        return { success: false, errors };
    }
}
//# sourceMappingURL=test-auslastung.js.map