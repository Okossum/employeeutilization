// Test usePlanEntries hook behavior by creating a standalone test
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

// Simulate the exact usePlanEntries logic step by step
async function testUsePlanEntriesLogic() {
  console.log('=== TESTING usePlanEntries HOOK LOGIC ===');
  
  let unsubscribePlan = null;
  let unsubscribeEntries = null;
  
  const state = {
    plan: null,
    entries: [],
    loading: true,
    error: null
  };
  
  function setState(updateFn) {
    const newState = updateFn(state);
    Object.assign(state, newState);
    console.log('State updated:', {
      plan: state.plan ? `${state.plan.planYear}-W${state.plan.planWeek}` : null,
      entriesCount: state.entries.length,
      loading: state.loading,
      error: state.error
    });
  }
  
  try {
    console.log('1. Setting loading state...');
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    let targetPlanId = null;
    
    console.log('2. Getting latest plan...');
    const plansRef = collection(db, 'plans');
    const latestPlanQuery = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
    const planSnapshot = await getDocs(latestPlanQuery);
    
    if (planSnapshot.empty) {
      console.log('❌ No plans found');
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Keine Einsatzpläne gefunden' 
      }));
      return state;
    }
    
    targetPlanId = planSnapshot.docs[0].id;
    console.log('✅ Target plan ID:', targetPlanId);
    
    console.log('3. Setting up plan subscription...');
    const planDocRef = doc(db, 'plans', targetPlanId);
    
    // Simulate onSnapshot for plan
    console.log('4. Simulating plan onSnapshot...');
    try {
      const planDoc = await planDocRef.get?.() || planSnapshot.docs[0];
      if (planDoc.exists()) {
        const planData = { id: planDoc.id, ...planDoc.data() };
        setState(prev => ({ ...prev, plan: planData }));
        console.log('✅ Plan data loaded');
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Plan nicht gefunden',
          loading: false 
        }));
        return state;
      }
    } catch (planError) {
      setState(prev => ({ 
        ...prev, 
        error: `Fehler beim Laden des Plans: ${planError.message}`,
        loading: false 
      }));
      return state;
    }
    
    console.log('5. Setting up entries subscription...');
    const entriesRef = collection(db, 'plans', targetPlanId, 'entries');
    
    // Simulate onSnapshot for entries
    console.log('6. Simulating entries onSnapshot...');
    try {
      const entriesSnapshot = await getDocs(entriesRef);
      const entriesData = entriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setState(prev => ({ 
        ...prev, 
        entries: entriesData,
        loading: false 
      }));
      console.log('✅ Entries data loaded');
      
      // Analyze first entry
      if (entriesData.length > 0) {
        const firstEntry = entriesData[0];
        console.log('First entry sample:', {
          id: firstEntry.id,
          rawName: firstEntry.rawName,
          weeksCount: firstEntry.weeks?.length,
          firstWeekUtil: firstEntry.weeks?.[0]?.utilizationPct
        });
      }
      
    } catch (entriesError) {
      setState(prev => ({ 
        ...prev, 
        error: `Fehler beim Laden der Einträge: ${entriesError.message}`,
        loading: false 
      }));
      return state;
    }
    
  } catch (error) {
    setState(prev => ({ 
      ...prev, 
      error: `Unerwarteter Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`,
      loading: false 
    }));
  }
  
  console.log('\n=== FINAL STATE ===');
  console.log('Plan loaded:', !!state.plan);
  console.log('Entries count:', state.entries.length);
  console.log('Loading:', state.loading);
  console.log('Error:', state.error);
  
  return state;
}

testUsePlanEntriesLogic().then(finalState => {
  console.log('\n=== HOOK TEST COMPLETE ===');
  if (finalState.error) {
    console.log('❌ Hook would fail with error:', finalState.error);
  } else if (finalState.entries.length > 0) {
    console.log('✅ Hook would return', finalState.entries.length, 'entries');
  } else {
    console.log('⚠️ Hook would return empty entries array');
  }
}).catch(console.error);
