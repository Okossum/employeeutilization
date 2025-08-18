/**
 * Debug script to test workload upload processing
 * Run with: node debug-workload.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import XLSX from 'xlsx';
import fs from 'fs';

// Firebase config for emulator
const firebaseConfig = {
  projectId: 'employee-utilization',
  storageBucket: 'employee-utilization.appspot.com'
};

// Initialize Firebase with emulator settings
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';

try {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
} catch (error) {
  // Already connected
}

console.log('🔧 Connected to Firebase emulators');

// Create test Excel file
const testData = [
  [],
  [],
  // Headers in row 3
  ['Name', 'CC', 'BL', 'Bereich', 'Team', 'Standort', 'LBS', 'Projekt', 'Kunde', 'KW 33', 'KW 34', 'KW 35', 'Summe Aufwand'],
  // Data
  ['Müller, Hans', 'IT Services', 'Digital', 'Software', 'Backend', 'München', 'Senior', 'Alpha', 'Customer A', 40, 35, 30, 105],
  ['Schmidt, Maria', 'Analytics', 'Data', 'Science', 'ML', 'Berlin', 'Expert', 'Beta', 'Customer B', 32, 40, 38, 110]
];

const ws = XLSX.utils.aoa_to_sheet(testData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Auslastung operativ');
const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

console.log('📊 Created test Excel file');

// Upload to Storage
async function testUpload() {
  try {
    const timestamp = Date.now();
    const filePath = `uploads/auslastung/test-user/${timestamp}.xlsx`;
    const storageRef = ref(storage, filePath);
    
    console.log('📤 Uploading to:', filePath);
    
    await uploadBytes(storageRef, buffer);
    console.log('✅ Upload completed');
    
    // Wait for Cloud Function processing
    console.log('⏳ Waiting 10 seconds for Cloud Function processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if workloads collection was created
    console.log('🔍 Checking workloads collection...');
    const workloadsSnapshot = await getDocs(collection(db, 'workloads'));
    
    console.log('📋 Workloads found:', workloadsSnapshot.size);
    
    workloadsSnapshot.forEach(doc => {
      console.log('📄 Workload:', doc.id, doc.data());
    });
    
    if (workloadsSnapshot.size > 0) {
      const latestDoc = workloadsSnapshot.docs[0];
      console.log('🔍 Checking entries subcollection...');
      
      const entriesSnapshot = await getDocs(collection(db, 'workloads', latestDoc.id, 'entries'));
      console.log('📊 Entries found:', entriesSnapshot.size);
      
      entriesSnapshot.forEach(doc => {
        console.log('👤 Entry:', doc.id, doc.data());
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpload();


