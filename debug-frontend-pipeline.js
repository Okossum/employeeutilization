// Test the complete frontend data pipeline
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

// Simulate the EinsatzplanView rendering pipeline
async function testFrontendPipeline() {
  console.log('=== FRONTEND PIPELINE DEBUG ===');
  
  try {
    // Step 1: Load data (same as usePlanEntries)
    console.log('1. Loading plan and entries...');
    const plansRef = collection(db, 'plans');
    const latestPlanQuery = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
    const planSnapshot = await getDocs(latestPlanQuery);
    
    if (planSnapshot.empty) {
      console.log('❌ No plans found - this would show "Keine Einsatzpläne gefunden"');
      return;
    }
    
    const plan = planSnapshot.docs[0].data();
    const targetPlanId = planSnapshot.docs[0].id;
    
    const entriesRef = collection(db, 'plans', targetPlanId, 'entries');
    const entriesSnapshot = await getDocs(entriesRef);
    const entries = entriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Data loaded:', {
      planWeek: plan.planWeek,
      planYear: plan.planYear,
      entriesCount: entries.length
    });
    
    // Step 2: Simulate window creation
    console.log('2. Creating week window...');
    const windowStart = { isoYear: plan.planYear, isoWeek: plan.planWeek };
    
    // Simulate createWeekWindow function
    function createWeekWindow(startIsoYear, startIsoWeek, windowSize = 8) {
      const weeks = [];
      let currentYear = startIsoYear;
      let currentWeek = startIsoWeek;
      
      for (let i = 0; i < windowSize; i++) {
        weeks.push({
          isoYear: currentYear,
          isoWeek: currentWeek,
          jjww: `${currentYear.toString().slice(-2)}/${currentWeek.toString().padStart(2, '0')}`,
          index: i
        });
        
        currentWeek++;
        if (currentWeek > 52) {
          currentWeek = 1;
          currentYear++;
        }
      }
      
      return weeks;
    }
    
    const weekWindow = createWeekWindow(windowStart.isoYear, windowStart.isoWeek, 8);
    console.log('✅ Week window created:', weekWindow.map(w => w.jjww));
    
    // Step 3: Simulate filterEntries (no filters applied)
    console.log('3. Filtering entries...');
    const filteredEntries = entries; // No filters applied
    console.log('✅ Filtered entries:', filteredEntries.length);
    
    // Step 4: Simulate table row rendering
    console.log('4. Simulating table rendering...');
    
    // Simulate getWeekData function
    function getWeekData(entry, weekIndex) {
      return entry.weeks.find(week => week.index === weekIndex) || null;
    }
    
    // Simulate formatUtilization function
    function formatUtilization(utilizationPct) {
      if (utilizationPct === null || utilizationPct === undefined) {
        return null;
      }
      const rounded = Math.round(utilizationPct * 10) / 10;
      return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
    }
    
    // Test first entry
    if (filteredEntries.length > 0) {
      const firstEntry = filteredEntries[0];
      console.log('Testing first entry:', firstEntry.rawName);
      console.log('Entry weeks count:', firstEntry.weeks?.length);
      
      if (firstEntry.weeks && firstEntry.weeks.length > 0) {
        console.log('First few weeks:', firstEntry.weeks.slice(0, 3).map(w => ({
          index: w.index,
          utilization: w.utilizationPct,
          nkv: w.nkvPct
        })));
        
        console.log('\\n5. Testing table cell rendering...');
        weekWindow.forEach((week, idx) => {
          const weekData = getWeekData(firstEntry, week.index);
          const utilization = formatUtilization(weekData?.utilizationPct || null);
          
          console.log(`Week ${week.jjww} (index ${week.index}):`, {
            weekData: weekData ? {
              index: weekData.index,
              utilizationPct: weekData.utilizationPct,
              nkvPct: weekData.nkvPct
            } : null,
            formattedUtilization: utilization,
            displayText: utilization ? `${utilization}%` : 'EMPTY'
          });
        });
        
        // Count how many weeks would show data
        let visibleWeeks = 0;
        weekWindow.forEach(week => {
          const weekData = getWeekData(firstEntry, week.index);
          const utilization = formatUtilization(weekData?.utilizationPct || null);
          if (utilization) visibleWeeks++;
        });
        
        console.log(`\\n📊 RESULT: ${visibleWeeks}/${weekWindow.length} weeks would show data`);
        
        if (visibleWeeks === 0) {
          console.log('❌ NO DATA WOULD BE VISIBLE - This is the problem!');
          console.log('Debugging week index mismatch...');
          
          // Check if there's an index mismatch
          const entryWeekIndices = firstEntry.weeks.map(w => w.index).sort((a, b) => a - b);
          const windowIndices = weekWindow.map(w => w.index);
          
          console.log('Entry week indices:', entryWeekIndices);
          console.log('Window week indices:', windowIndices);
          console.log('Overlap:', windowIndices.filter(i => entryWeekIndices.includes(i)));
          
        } else {
          console.log('✅ Data should be visible in the table');
        }
        
      } else {
        console.log('❌ Entry has no weeks data');
      }
    } else {
      console.log('❌ No entries to display');
    }
    
  } catch (error) {
    console.error('❌ Pipeline error:', error);
  }
}

testFrontendPipeline();
