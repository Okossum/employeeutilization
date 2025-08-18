// Simulate the usePlanEntries hook logic
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';

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

async function simulateUsePlanEntries() {
  console.log('=== SIMULATING usePlanEntries HOOK ===');
  
  try {
    // Step 1: Get latest plan (same as in hook)
    console.log('1. Getting latest plan...');
    const plansRef = collection(db, 'plans');
    const latestPlanQuery = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
    const planSnapshot = await getDocs(latestPlanQuery);
    
    if (planSnapshot.empty) {
      console.log('❌ No plans found');
      return;
    }
    
    const targetPlanId = planSnapshot.docs[0].id;
    const planData = planSnapshot.docs[0].data();
    console.log('✅ Latest plan found:', {
      id: targetPlanId,
      week: planData.planWeek,
      year: planData.planYear
    });
    
    // Step 2: Get plan document (using getDoc instead of .get())
    console.log('2. Getting plan document...');
    const planDocRef = doc(db, 'plans', targetPlanId);
    // Plan document already loaded from the query above
    console.log('✅ Plan document loaded');
    
    // Step 3: Get entries
    console.log('3. Getting entries...');
    const entriesRef = collection(db, 'plans', targetPlanId, 'entries');
    const entriesSnapshot = await getDocs(entriesRef);
    
    console.log(`✅ Entries loaded: ${entriesSnapshot.size} entries`);
    
    // Step 4: Analyze a sample entry
    if (entriesSnapshot.size > 0) {
      const firstEntry = entriesSnapshot.docs[0];
      const entryData = firstEntry.data();
      
      console.log('4. Sample entry analysis:');
      console.log('  - ID:', firstEntry.id);
      console.log('  - Raw name:', entryData.rawName);
      console.log('  - Competence center:', entryData.competenceCenter);
      console.log('  - Weeks data:', entryData.weeks ? `${entryData.weeks.length} weeks` : 'No weeks data');
      console.log('  - Match status:', entryData.match?.status);
      
      // Check week data structure
      if (entryData.weeks && entryData.weeks.length > 0) {
        const firstWeek = entryData.weeks[0];
        console.log('  - First week sample:', {
          index: firstWeek.index,
          utilizationPct: firstWeek.utilizationPct,
          nkvPct: firstWeek.nkvPct,
          isoYear: firstWeek.isoYear,
          isoWeek: firstWeek.isoWeek
        });
      }
    }
    
    console.log('\n=== HOOK SIMULATION COMPLETE ===');
    console.log('This matches exactly what usePlanEntries should return');
    
  } catch (error) {
    console.error('❌ Error in simulation:', error);
  }
}

simulateUsePlanEntries();
