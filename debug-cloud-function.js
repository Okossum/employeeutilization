/**
 * Direct Cloud Function debugging script
 * Tests the onWorkloadXlsxUploaded function logic directly
 */

import XLSX from 'xlsx';
import { parseAndNormalizeName, normalizeCompetenceCenter, createEntryDocId } from './src/lib/normalize.js';
import { calculateWeekOffset, parseA1Content } from './src/lib/isoWeek.js';

console.log('🔧 Testing Cloud Function logic directly...');

// Test data - exactly as expected by the Cloud Function
const testData = [
  [], // Row 1: empty
  [], // Row 2: empty  
  // Row 3: Headers (exactly as expected)
  ['Name', 'CC', 'BL', 'Bereich', 'Team', 'Standort', 'LBS', 'Projekt', 'Kunde', 'KW 33', 'KW 34', 'KW 35', 'Summe Aufwand'],
  // Row 4: Test data
  ['Müller, Hans', 'IT Services', 'Digital', 'Software', 'Backend', 'München', 'Senior', 'Alpha', 'Customer A', 40, 35, 30, 105]
];

console.log('📊 Test data created:');
console.log('📋 Headers (row 3):', testData[2]);
console.log('📋 Data (row 4):', testData[3]);

// Test 1: Excel parsing
console.log('\n🧪 Test 1: Excel parsing...');
try {
  const ws = XLSX.utils.aoa_to_sheet(testData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Auslastung operativ');
  
  console.log('✅ Excel file created successfully');
  console.log('📋 Sheet names:', wb.SheetNames);
  console.log('📋 Target sheet exists:', wb.SheetNames.includes('Auslastung operativ'));
  
  // Test 2: Sheet access
  const targetSheet = wb.Sheets['Auslastung operativ'];
  console.log('✅ Target sheet accessed');
  
  // Test 3: Header row parsing (row 3)
  const headerRow = XLSX.utils.sheet_to_json(targetSheet, { header: 1 })[2]; // Row 3 (0-indexed)
  console.log('📋 Header row parsed:', headerRow);
  
  // Test 4: Find KW columns
  const kwColumns = [];
  headerRow.forEach((cell, index) => {
    if (cell && typeof cell === 'string' && cell.startsWith('KW ')) {
      kwColumns.push({ index, header: cell });
    }
  });
  console.log('🔍 KW columns found:', kwColumns);
  
  // Test 5: Data row parsing
  const dataRow = XLSX.utils.sheet_to_json(targetSheet, { header: 1 })[3]; // Row 4 (0-indexed)
  console.log('📊 Data row parsed:', dataRow);
  
  // Test 6: Name normalization
  const rawName = dataRow[0]; // Name column
  console.log('👤 Raw name:', rawName);
  
  try {
    const normalizedName = parseAndNormalizeName(rawName);
    console.log('✅ Name normalized:', normalizedName);
  } catch (error) {
    console.error('❌ Name normalization failed:', error.message);
  }
  
  // Test 7: Competence center normalization
  const rawCC = dataRow[1]; // CC column
  console.log('🏢 Raw CC:', rawCC);
  
  try {
    const normalizedCC = normalizeCompetenceCenter(rawCC);
    console.log('✅ CC normalized:', normalizedCC);
  } catch (error) {
    console.error('❌ CC normalization failed:', error.message);
  }
  
  // Test 8: Weekly hours parsing
  console.log('📅 Testing weekly hours parsing...');
  const weeklyHours = [];
  kwColumns.forEach(({ index, header }) => {
    const hours = dataRow[index];
    if (typeof hours === 'number' && !isNaN(hours)) {
      weeklyHours.push({
        week: header,
        hours: hours
      });
    }
  });
  console.log('⏰ Weekly hours parsed:', weeklyHours);
  
  // Test 9: Entry ID creation
  try {
    const entryId = createEntryDocId('Müller, Hans', 'IT Services');
    console.log('🆔 Entry ID created:', entryId);
  } catch (error) {
    console.error('❌ Entry ID creation failed:', error.message);
  }
  
} catch (error) {
  console.error('❌ Excel parsing failed:', error);
  console.error('Stack:', error.stack);
}

console.log('\n🏁 Cloud Function logic test completed');


