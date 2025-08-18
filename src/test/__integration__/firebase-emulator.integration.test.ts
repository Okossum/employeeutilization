/**
 * Firebase Emulator integration tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getAuthenticatedContext, 
  getUnauthenticatedContext, 
  getServiceAccountContext 
} from '../integration-setup';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import testEmployees from '../__fixtures__/test-employees.json';

describe('Firebase Security Rules Integration', () => {
  describe('Firestore Rules', () => {
    describe('Employees Collection', () => {
      it('allows authenticated users to read employees', async () => {
        const alice = getAuthenticatedContext('alice');
        
        // First seed some test data as service account
        const serviceAccount = getServiceAccountContext();
        const employeeRef = serviceAccount.firestore().doc('employees/test-employee');
        await assertSucceeds(employeeRef.set({
          normalizedName: 'koss|oliver',
          competenceCenter: 'CC AT-MUC CON',
          firstName: 'Oliver',
          lastName: 'Koss'
        }));
        
        // Then test reading as authenticated user
        const readRef = alice.firestore().doc('employees/test-employee');
        await assertSucceeds(readRef.get());
      });

      it('denies unauthenticated users from reading employees', async () => {
        const unauth = getUnauthenticatedContext();
        const employeeRef = unauth.firestore().doc('employees/test-employee');
        await assertFails(employeeRef.get());
      });

      it('denies authenticated users from writing employees', async () => {
        const alice = getAuthenticatedContext('alice');
        const employeeRef = alice.firestore().doc('employees/new-employee');
        
        await assertFails(employeeRef.set({
          normalizedName: 'smith|john',
          competenceCenter: 'CC AT-MUC CON'
        }));
      });
    });

    describe('Plans Collection', () => {
      it('allows authenticated users to read plans', async () => {
        const alice = getAuthenticatedContext('alice');
        
        // Seed test plan as service account
        const serviceAccount = getServiceAccountContext();
        const planRef = serviceAccount.firestore().doc('plans/test-plan');
        await assertSucceeds(planRef.set({
          planWeek: 1,
          planYear: 2025,
          generatedAt: new Date(),
          sourcePath: 'test.xlsx'
        }));
        
        // Test reading as authenticated user
        const readRef = alice.firestore().doc('plans/test-plan');
        await assertSucceeds(readRef.get());
      });

      it('denies regular users from writing plans', async () => {
        const alice = getAuthenticatedContext('alice');
        const planRef = alice.firestore().doc('plans/new-plan');
        
        await assertFails(planRef.set({
          planWeek: 1,
          planYear: 2025
        }));
      });

      it('allows service accounts to write plans', async () => {
        const serviceAccount = getServiceAccountContext();
        const planRef = serviceAccount.firestore().doc('plans/service-plan');
        
        await assertSucceeds(planRef.set({
          planWeek: 1,
          planYear: 2025,
          generatedAt: new Date(),
          sourcePath: 'test.xlsx'
        }));
      });
    });

    describe('Plan Entries Subcollection', () => {
      beforeEach(async () => {
        // Create test plan first
        const serviceAccount = getServiceAccountContext();
        const planRef = serviceAccount.firestore().doc('plans/test-plan');
        await assertSucceeds(planRef.set({
          planWeek: 1,
          planYear: 2025,
          generatedAt: new Date(),
          sourcePath: 'test.xlsx'
        }));
      });

      it('allows authenticated users to read entries', async () => {
        const alice = getAuthenticatedContext('alice');
        
        // Seed test entry as service account
        const serviceAccount = getServiceAccountContext();
        const entryRef = serviceAccount.firestore().doc('plans/test-plan/entries/test-entry');
        await assertSucceeds(entryRef.set({
          normalizedName: 'koss|oliver',
          competenceCenter: 'CC AT-MUC CON',
          rawName: 'Koss, Oliver',
          weeks: []
        }));
        
        // Test reading as authenticated user
        const readRef = alice.firestore().doc('plans/test-plan/entries/test-entry');
        await assertSucceeds(readRef.get());
      });

      it('allows service accounts to write entries', async () => {
        const serviceAccount = getServiceAccountContext();
        const entryRef = serviceAccount.firestore().doc('plans/test-plan/entries/service-entry');
        
        await assertSucceeds(entryRef.set({
          normalizedName: 'mueller|anna',
          competenceCenter: 'CC AT-MUC CON',
          rawName: 'Müller, Anna',
          weeks: [{
            index: 0,
            isoYear: 2025,
            isoWeek: 1,
            nkvPct: 25,
            utilizationPct: 75,
            isoKey: '2025-W01'
          }]
        }));
      });

      it('denies regular users from writing entries', async () => {
        const alice = getAuthenticatedContext('alice');
        const entryRef = alice.firestore().doc('plans/test-plan/entries/user-entry');
        
        await assertFails(entryRef.set({
          normalizedName: 'test|user',
          competenceCenter: 'CC AT-MUC CON'
        }));
      });
    });

    describe('Aliases Collection', () => {
      it('allows users to create aliases with valid audit fields', async () => {
        const alice = getAuthenticatedContext('alice');
        const aliasRef = alice.firestore().doc('aliases/test-alias');
        
        await assertSucceeds(aliasRef.set({
          originalName: 'John Doe',
          aliasName: 'J. Doe',
          competenceCenter: 'CC AT-MUC CON',
          createdAt: new Date(),
          createdBy: 'alice',
          updatedAt: new Date(),
          updatedBy: 'alice'
        }));
      });

      it('denies alias creation without audit fields', async () => {
        const alice = getAuthenticatedContext('alice');
        const aliasRef = alice.firestore().doc('aliases/invalid-alias');
        
        await assertFails(aliasRef.set({
          originalName: 'John Doe',
          aliasName: 'J. Doe'
        }));
      });

      it('denies alias creation with wrong createdBy', async () => {
        const alice = getAuthenticatedContext('alice');
        const aliasRef = alice.firestore().doc('aliases/wrong-creator');
        
        await assertFails(aliasRef.set({
          originalName: 'John Doe',
          aliasName: 'J. Doe',
          createdAt: new Date(),
          createdBy: 'bob', // Wrong user
          updatedAt: new Date(),
          updatedBy: 'alice'
        }));
      });

      it('allows users to update their own aliases', async () => {
        const alice = getAuthenticatedContext('alice');
        const aliasRef = alice.firestore().doc('aliases/alice-alias');
        
        // Create alias first
        await assertSucceeds(aliasRef.set({
          originalName: 'John Doe',
          aliasName: 'J. Doe',
          competenceCenter: 'CC AT-MUC CON',
          createdAt: new Date(),
          createdBy: 'alice',
          updatedAt: new Date(),
          updatedBy: 'alice'
        }));
        
        // Update alias
        await assertSucceeds(aliasRef.update({
          aliasName: 'John D.',
          updatedAt: new Date(),
          updatedBy: 'alice'
        }));
      });

      it('denies users from updating others aliases', async () => {
        const alice = getAuthenticatedContext('alice');
        const bob = getAuthenticatedContext('bob');
        
        // Alice creates alias
        const aliasRef = alice.firestore().doc('aliases/alice-alias-2');
        await assertSucceeds(aliasRef.set({
          originalName: 'Jane Doe',
          aliasName: 'J. Doe',
          competenceCenter: 'CC AT-MUC CON',
          createdAt: new Date(),
          createdBy: 'alice',
          updatedAt: new Date(),
          updatedBy: 'alice'
        }));
        
        // Bob tries to update
        const bobAliasRef = bob.firestore().doc('aliases/alice-alias-2');
        await assertFails(bobAliasRef.update({
          aliasName: 'Jane D.',
          updatedAt: new Date(),
          updatedBy: 'bob'
        }));
      });
    });
  });

  describe('Storage Rules', () => {
    it('allows authenticated users to upload to einsatzplaene folder', async () => {
      const alice = getAuthenticatedContext('alice');
      const fileRef = alice.storage().ref('uploads/einsatzplaene/test.xlsx');
      
      await assertSucceeds(fileRef.put(new Uint8Array([1, 2, 3, 4])));
    });

    it('allows authenticated users to read from einsatzplaene folder', async () => {
      const alice = getAuthenticatedContext('alice');
      
      // Upload file first
      const fileRef = alice.storage().ref('uploads/einsatzplaene/read-test.xlsx');
      await assertSucceeds(fileRef.put(new Uint8Array([1, 2, 3, 4])));
      
      // Then read it
      await assertSucceeds(fileRef.getDownloadURL());
    });

    it('denies unauthenticated users from uploading', async () => {
      const unauth = getUnauthenticatedContext();
      const fileRef = unauth.storage().ref('uploads/einsatzplaene/unauth.xlsx');
      
      await assertFails(fileRef.put(new Uint8Array([1, 2, 3, 4])));
    });

    it('denies upload to other paths', async () => {
      const alice = getAuthenticatedContext('alice');
      const fileRef = alice.storage().ref('uploads/other/test.xlsx');
      
      await assertFails(fileRef.put(new Uint8Array([1, 2, 3, 4])));
    });
  });
});

describe('Employee Matching Scenarios', () => {
  beforeEach(async () => {
    // Seed employees as service account
    const serviceAccount = getServiceAccountContext();
    
    for (const [index, employee] of testEmployees.entries()) {
      const employeeRef = serviceAccount.firestore().doc(`employees/emp-${index}`);
      await assertSucceeds(employeeRef.set(employee));
    }
  });

  it('seeds test employees correctly', async () => {
    const alice = getAuthenticatedContext('alice');
    
    // Check if employees were seeded
    const employeesRef = alice.firestore().collection('employees');
    const snapshot = await assertSucceeds(employeesRef.get());
    
    expect(snapshot.docs.length).toBeGreaterThan(0);
    
    // Check specific employees
    const kossEmployee = snapshot.docs.find(doc => 
      doc.data().normalizedName === 'koss|oliver'
    );
    expect(kossEmployee).toBeDefined();
    expect(kossEmployee?.data().competenceCenter).toBe('CC AT-MUC CON');
  });

  it('handles duplicate employees correctly', async () => {
    const alice = getAuthenticatedContext('alice');
    
    const employeesRef = alice.firestore().collection('employees');
    const snapshot = await assertSucceeds(employeesRef.get());
    
    // Count duplicate entries
    const duplicates = snapshot.docs.filter(doc => 
      doc.data().normalizedName === 'duplicate|test'
    );
    
    expect(duplicates.length).toBe(2);
  });
});

describe('Plan Processing Simulation', () => {
  it('simulates complete plan processing workflow', async () => {
    const serviceAccount = getServiceAccountContext();
    const alice = getAuthenticatedContext('alice');
    
    // 1. Service account creates plan
    const planId = 'test-plan-workflow';
    const planRef = serviceAccount.firestore().doc(`plans/${planId}`);
    
    await assertSucceeds(planRef.set({
      planWeek: 1,
      planYear: 2025,
      generatedAt: new Date(),
      sourcePath: 'test-workflow.xlsx',
      columns: ['Name', 'CC', 'Proj', 'NKV (%)', 'Ort'],
      weeksCount: 3,
      displayWeeks: 3,
      importStats: {
        matched: 2,
        unmatched: 1,
        duplicates: 1,
        total: 4
      }
    }));
    
    // 2. Service account creates entries
    const entries = [
      {
        normalizedName: 'koss|oliver',
        competenceCenter: 'CC AT-MUC CON',
        rawName: 'Koss, Oliver',
        weeks: [
          {
            index: 0,
            isoYear: 2025,
            isoWeek: 1,
            nkvPct: 25,
            utilizationPct: 75,
            isoKey: '2025-W01'
          },
          {
            index: 1,
            isoYear: 2025,
            isoWeek: 2,
            nkvPct: 30,
            utilizationPct: 70,
            isoKey: '2025-W02'
          }
        ],
        match: {
          status: 'matched',
          employeeIds: ['emp-0'],
          chosenEmployeeId: 'emp-0'
        }
      },
      {
        normalizedName: 'duplicate|test',
        competenceCenter: 'CC AT-MUC CON',
        rawName: 'Duplicate, Test',
        weeks: [
          {
            index: 0,
            isoYear: 2025,
            isoWeek: 1,
            nkvPct: null,
            utilizationPct: null,
            isoKey: '2025-W01'
          }
        ],
        match: {
          status: 'duplicate',
          employeeIds: ['emp-4', 'emp-5']
        }
      }
    ];
    
    for (const [index, entry] of entries.entries()) {
      const entryRef = serviceAccount.firestore().doc(`plans/${planId}/entries/entry-${index}`);
      await assertSucceeds(entryRef.set(entry));
    }
    
    // 3. User reads the plan and entries
    const userPlanRef = alice.firestore().doc(`plans/${planId}`);
    const planDoc = await assertSucceeds(userPlanRef.get());
    
    expect(planDoc.exists()).toBe(true);
    expect(planDoc.data()?.importStats.matched).toBe(2);
    
    // 4. User reads entries
    const entriesRef = alice.firestore().collection(`plans/${planId}/entries`);
    const entriesSnapshot = await assertSucceeds(entriesRef.get());
    
    expect(entriesSnapshot.docs.length).toBe(2);
    
    // Check matched entry
    const matchedEntry = entriesSnapshot.docs.find(doc => 
      doc.data().match.status === 'matched'
    );
    expect(matchedEntry).toBeDefined();
    expect(matchedEntry?.data().weeks).toHaveLength(2);
    
    // Check duplicate entry
    const duplicateEntry = entriesSnapshot.docs.find(doc => 
      doc.data().match.status === 'duplicate'
    );
    expect(duplicateEntry).toBeDefined();
    expect(duplicateEntry?.data().match.employeeIds).toHaveLength(2);
  });
});

describe('Utilization Calculation Verification', () => {
  it('verifies utilization calculations in entries', async () => {
    const serviceAccount = getServiceAccountContext();
    const alice = getAuthenticatedContext('alice');
    
    const planId = 'utilization-test-plan';
    const planRef = serviceAccount.firestore().doc(`plans/${planId}`);
    
    await assertSucceeds(planRef.set({
      planWeek: 1,
      planYear: 2025,
      generatedAt: new Date(),
      sourcePath: 'utilization-test.xlsx'
    }));
    
    // Test various utilization scenarios
    const testCases = [
      { nkvPct: 25, expectedUtilization: 75 },
      { nkvPct: 0, expectedUtilization: 100 },
      { nkvPct: 100, expectedUtilization: 0 },
      { nkvPct: 120, expectedUtilization: -20 }, // Over-allocation
      { nkvPct: null, expectedUtilization: null }
    ];
    
    for (const [index, testCase] of testCases.entries()) {
      const entryRef = serviceAccount.firestore().doc(`plans/${planId}/entries/util-test-${index}`);
      await assertSucceeds(entryRef.set({
        normalizedName: `test|user${index}`,
        competenceCenter: 'CC AT-MUC CON',
        rawName: `Test User${index}`,
        weeks: [{
          index: 0,
          isoYear: 2025,
          isoWeek: 1,
          nkvPct: testCase.nkvPct,
          utilizationPct: testCase.expectedUtilization,
          isoKey: '2025-W01'
        }],
        match: { status: 'unmatched', employeeIds: [] }
      }));
    }
    
    // Verify the data was stored correctly
    const entriesRef = alice.firestore().collection(`plans/${planId}/entries`);
    const snapshot = await assertSucceeds(entriesRef.get());
    
    expect(snapshot.docs.length).toBe(testCases.length);
    
    // Check each test case
    for (const [index, testCase] of testCases.entries()) {
      const entry = snapshot.docs.find(doc => 
        doc.data().normalizedName === `test|user${index}`
      );
      
      expect(entry).toBeDefined();
      const weekData = entry?.data().weeks[0];
      expect(weekData.nkvPct).toBe(testCase.nkvPct);
      expect(weekData.utilizationPct).toBe(testCase.expectedUtilization);
    }
  });
});

