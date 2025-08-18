/**
 * Script to create a sample XLSX file for testing
 * Run with: node src/test/__fixtures__/create-xlsx.js
 */

import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample data for testing
const data = [
  // Header row with plan info
  ['JJ/WW:', '25/01', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ['Wochen:', '4', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  
  // Column headers
  ['Name', 'CC', 'LoB', 'Bereich', 'Team', 'Geschäftsstelle', 'akt. Einsatzort', 'LBS', 'Kompetenz', 'Angeboten bei', 'Staffbar', 'OV', 'OP', 'Proj', 'NKV (%)', 'Ort', 'Proj.1', 'NKV (%).1', 'Ort.1', 'Proj.2', 'NKV (%).2', 'Ort.2'],
  
  // Employee data
  ['Koss, Oliver', 'CC AT-MUC CON', 'Technology', 'IT Development', 'Frontend Team', 'München', 'München', 'Senior', 'React TypeScript', 'Client A', 'true', 'OV123', 'OP456', 'Project Alpha', 25, 'Munich', 'Project Beta', 30, 'Munich', 'Project Gamma', 0, 'Munich'],
  ['Müller, Anna', 'CC AT-MUC CON', 'Consulting', 'Business Analysis', 'BA Team', 'München', 'Wien', 'Manager', 'SAP Business', 'Client B', 'true', 'OV124', 'OP457', 'Project Delta', 50, 'Vienna', 'Project Epsilon', null, 'Vienna', 'Project Zeta', 75, 'Remote'],
  ['Schmidt, Thomas', 'CC DE-BER DEV', 'Technology', 'Backend Development', 'API Team', 'Berlin', 'Berlin', 'Principal', 'Java Spring', 'Client C', 'false', 'OV125', 'OP458', 'Project Theta', 0, 'Berlin', 'Project Iota', 100, 'Berlin', 'Project Kappa', 25, 'Berlin'],
  ['Weiß, Julia', 'CC DE-BER DEV', 'Technology', 'Data Science', 'ML Team', 'Berlin', 'Remote', 'Senior', 'Python ML', 'Client D', 'true', 'OV126', 'OP459', 'Project Lambda', 45, 'Remote', 'Project Mu', 20, 'Remote', '', 40, 'Remote'],
  ['Duplicate, Test', 'CC AT-MUC CON', 'Technology', 'Testing', 'QA Team', 'München', 'München', 'Junior', 'Test Automation', 'Client E', 'true', 'OV127', 'OP460', 'Project Nu', 60, 'Munich', 'Project Xi', 80, 'Munich', 'Project Omicron', 15, 'Munich']
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(data);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Einsatzplan');

// Write to file
const filePath = join(__dirname, 'sample-einsatzplan.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`Sample XLSX file created at: ${filePath}`);
console.log('File contains:');
console.log('- Plan info (JJ/WW: 25/01, Wochen: 4)');
console.log('- 5 employees with test data');
console.log('- 3 triplets (base, .1, .2)');
console.log('- Various NKV values including nulls and over-allocation');
console.log('- Test cases for duplicate detection (name normalization)');

