/**
 * Setup for Firebase Emulator integration tests
 */

import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { join } from 'path';

// Global test environment
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Read the security rules
  const firestoreRules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');
  const storageRules = readFileSync(join(process.cwd(), 'storage.rules'), 'utf8');
  
  testEnv = await initializeTestEnvironment({
    projectId: 'employee-utilization-test',
    firestore: {
      rules: firestoreRules,
      host: '127.0.0.1',
      port: 8080
    },
    storage: {
      rules: storageRules,
      host: '127.0.0.1',
      port: 9199
    }
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

afterEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  }
});

// Export for use in tests
export { testEnv };

// Helper to get authenticated context
export function getAuthenticatedContext(uid: string, customClaims?: Record<string, any>) {
  return testEnv.authenticatedContext(uid, customClaims);
}

// Helper to get unauthenticated context
export function getUnauthenticatedContext() {
  return testEnv.unauthenticatedContext();
}

// Helper to get service account context (for Cloud Functions)
export function getServiceAccountContext() {
  return testEnv.authenticatedContext('service-account', {
    firebase: {
      sign_in_provider: 'custom'
    }
  });
}

