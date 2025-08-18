// Debug authentication and data flow
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function debugAuthFlow() {
  console.log('=== AUTH FLOW DEBUG ===');
  
  try {
    // Check current auth state
    console.log('1. Checking auth state...');
    console.log('Current user:', auth.currentUser?.email || 'No user');
    
    // Try anonymous sign in (for testing)
    console.log('2. Trying anonymous auth...');
    const userCredential = await signInAnonymously(auth);
    console.log('✅ Anonymous auth successful:', userCredential.user.uid);
    
    // Now test data access with auth
    console.log('3. Testing data access with auth...');
    const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
    
    const plansRef = collection(db, 'plans');
    const latestPlanQuery = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
    const planSnapshot = await getDocs(latestPlanQuery);
    
    if (planSnapshot.empty) {
      console.log('❌ No plans accessible with auth');
    } else {
      console.log('✅ Plans accessible with auth:', planSnapshot.size);
      
      // Test entries access
      const targetPlanId = planSnapshot.docs[0].id;
      const entriesRef = collection(db, 'plans', targetPlanId, 'entries');
      const entriesSnapshot = await getDocs(entriesRef);
      
      console.log('✅ Entries accessible with auth:', entriesSnapshot.size);
    }
    
  } catch (error) {
    console.error('❌ Auth flow error:', error);
  }
}

debugAuthFlow();
