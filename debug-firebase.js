// Firebase Debug Script
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDczsAzylUqlnqUxm5Ld5yKlp4IuDSBbi0",
  authDomain: "employee-utilization.firebaseapp.com",
  projectId: "employee-utilization",
  storageBucket: "employee-utilization.firebasestorage.app",
  messagingSenderId: "301802878680",
  appId: "1:301802878680:web:3c77e7e1c9d1c5b5f1a0c4",
  measurementId: "G-52VVYH9QQF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugFirebase() {
  console.log('=== FIREBASE CONNECTION DEBUG ===');
  
  try {
    // Check plans collection
    console.log('\n1. Checking plans collection...');
    const plansRef = collection(db, 'plans');
    const plansSnapshot = await getDocs(plansRef);
    console.log(`Found ${plansSnapshot.size} plans`);
    
    if (!plansSnapshot.empty) {
      const latestPlanQuery = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
      const latestPlanSnapshot = await getDocs(latestPlanQuery);
      
      if (!latestPlanSnapshot.empty) {
        const latestPlan = latestPlanSnapshot.docs[0];
        const planData = latestPlan.data();
        console.log('Latest plan ID:', latestPlan.id);
        console.log('Plan data:', {
          planWeek: planData.planWeek,
          planYear: planData.planYear,
          weeksCount: planData.weeksCount,
          importStats: planData.importStats
        });
        
        // Check entries for this plan
        console.log('\n2. Checking entries for latest plan...');
        const entriesRef = collection(db, 'plans', latestPlan.id, 'entries');
        const entriesSnapshot = await getDocs(entriesRef);
        console.log(`Found ${entriesSnapshot.size} entries`);
        
        if (entriesSnapshot.size > 0) {
          const firstEntry = entriesSnapshot.docs[0];
          const entryData = firstEntry.data();
          console.log('Sample entry:', {
            id: firstEntry.id,
            rawName: entryData.rawName,
            competenceCenter: entryData.competenceCenter,
            weekCount: entryData.weeks?.length || 0,
            matchStatus: entryData.match?.status
          });
        }
      }
    } else {
      console.log('No plans found in database!');
    }
    
    // Check employees collection
    console.log('\n3. Checking employees collection...');
    const employeesRef = collection(db, 'employees');
    const employeesSnapshot = await getDocs(employeesRef);
    console.log(`Found ${employeesSnapshot.size} employees`);
    
  } catch (error) {
    console.error('Firebase error:', error);
  }
}

debugFirebase();
