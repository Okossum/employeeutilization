/**
 * Script to create a test Excel file for workload import testing
 * Run with: node test-excel-creator.mjs
 */

import XLSX from 'xlsx';
import fs from 'fs';

// Test data matching the expected format
const testData = [
  // Row 1: Empty (Excel format)
  [],
  // Row 2: Empty  
  [],
  // Row 3: Headers (row 3, index 2)
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
  // Data rows
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
  [
    'Özkan, José',
    'HR-Services', 
    'HR',
    'People & Culture',
    'Recruiting',
    'Frankfurt',
    'Junior',
    'Project Delta',
    'Customer D',
    0,
    20,
    '',
    15,
    35
  ],
  [
    'von Neumann, John',
    'Finance & Controlling',
    'Finance',
    'Controlling',
    'FP&A',
    'Stuttgart',
    'Manager',
    '',
    '',
    40,
    40,
    40,
    40,
    160
  ]
];

console.log('Creating test Excel file...');

// Create worksheet
const ws = XLSX.utils.aoa_to_sheet(testData);

// Create workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Auslastung operativ');

// Write to file
const filename = 'test-auslastung.xlsx';
XLSX.writeFile(wb, filename);

console.log(`✅ Test Excel file created: ${filename}`);
console.log('📋 Test data includes:');
console.log('- 5 employees with different scenarios');
console.log('- Mixed hours (numbers, empty cells, strings)');
console.log('- Names with diacritics (Özkan, José)');
console.log('- Compound names (von Neumann)');
console.log('- Various competence centers');
console.log('- Empty project/customer fields');
console.log('');
console.log('🧪 To test:');
console.log('1. Upload this file to uploads/auslastung/{userId}/ in Firebase Storage');
console.log('2. Check Cloud Function logs');
console.log('3. Verify workloads collection in Firestore');
