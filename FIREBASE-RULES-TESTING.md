# Firebase Security Rules Testing Guide

## Übersicht

Diese Anleitung erklärt, wie Sie die Firebase Security Rules mit dem Firebase Emulator Suite testen können.

## 🔧 Setup

### 1. Firebase CLI installieren (falls noch nicht vorhanden)
```bash
npm install -g firebase-tools
```

### 2. Firebase-Projekt initialisieren
```bash
firebase login
firebase use --add  # Wählen Sie Ihr Firebase-Projekt
```

## 🚀 Emulator starten

### Alle Emulatoren starten
```bash
firebase emulators:start
```

### Nur bestimmte Emulatoren starten
```bash
firebase emulators:start --only firestore,storage,auth
```

Nach dem Start sind folgende URLs verfügbar:
- **Emulator UI**: http://localhost:4000
- **Firestore**: http://localhost:8080
- **Storage**: http://localhost:9199  
- **Auth**: http://localhost:9099

## 🧪 Testing der Security Rules

### 1. Automatisierte Tests erstellen

Erstellen Sie eine Test-Datei `tests/security-rules.test.js`:

```javascript
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

describe('Security Rules Tests', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'your-project-id',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8'),
      },
      storage: {
        rules: require('fs').readFileSync('storage.rules', 'utf8'),
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('Firestore Rules', () => {
    test('Authenticated user can read employees', async () => {
      const alice = testEnv.authenticatedContext('alice', { uid: 'alice' });
      const doc = alice.firestore().doc('employees/emp1');
      await assertSucceeds(doc.get());
    });

    test('Unauthenticated user cannot read employees', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const doc = unauth.firestore().doc('employees/emp1');
      await assertFails(doc.get());
    });

    test('User can create alias with valid audit fields', async () => {
      const alice = testEnv.authenticatedContext('alice', { uid: 'alice' });
      const doc = alice.firestore().doc('aliases/alias1');
      
      await assertSucceeds(doc.set({
        originalName: 'John Doe',
        aliasName: 'J. Doe',
        createdAt: new Date(),
        createdBy: 'alice',
        updatedAt: new Date(),
        updatedBy: 'alice'
      }));
    });

    test('User cannot create alias without audit fields', async () => {
      const alice = testEnv.authenticatedContext('alice', { uid: 'alice' });
      const doc = alice.firestore().doc('aliases/alias2');
      
      await assertFails(doc.set({
        originalName: 'John Doe',
        aliasName: 'J. Doe'
      }));
    });
  });

  describe('Storage Rules', () => {
    test('Authenticated user can upload to einsatzplaene', async () => {
      const alice = testEnv.authenticatedContext('alice', { uid: 'alice' });
      const file = alice.storage().ref('uploads/einsatzplaene/test.xlsx');
      await assertSucceeds(file.put(new Uint8Array()));
    });

    test('Unauthenticated user cannot upload', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const file = unauth.storage().ref('uploads/einsatzplaene/test.xlsx');
      await assertFails(file.put(new Uint8Array()));
    });
  });
});
```

### 2. Tests ausführen

```bash
# Jest installieren (falls noch nicht vorhanden)
npm install --save-dev jest @firebase/rules-unit-testing

# Tests ausführen
npm test
```

## 🔍 Manuelle Tests über Emulator UI

### 1. Emulator UI öffnen
Gehen Sie zu http://localhost:4000

### 2. Test-User erstellen
1. Klicken Sie auf "Authentication"
2. Erstellen Sie Test-User mit verschiedenen UIDs

### 3. Firestore testen
1. Gehen Sie zu "Firestore"
2. Versuchen Sie Dokumente zu lesen/schreiben
3. Prüfen Sie die Logs für Security-Rule-Violations

### 4. Storage testen
1. Gehen Sie zu "Storage" 
2. Versuchen Sie Files hochzuladen
3. Prüfen Sie verschiedene Pfade und Dateitypen

## 📝 Häufige Test-Szenarien

### Firestore
- ✅ **Employees lesen**: Authentifizierte User
- ❌ **Employees schreiben**: Nur Service Accounts
- ✅ **Plans lesen**: Authentifizierte User  
- ❌ **Plans schreiben**: Nur Service Accounts
- ✅ **Aliases erstellen**: Mit korrekten Audit-Feldern
- ❌ **Aliases erstellen**: Ohne Audit-Felder
- ✅ **Aliases aktualisieren**: Eigene Aliases
- ❌ **Aliases aktualisieren**: Fremde Aliases

### Storage
- ✅ **Upload nach uploads/einsatzplaene/**: Authentifizierte User
- ❌ **Upload nach anderen Pfaden**: Alle User
- ✅ **Download**: Authentifizierte User
- ❌ **Download**: Unauthentifizierte User

## 🛠️ Debugging

### Rule-Logs anzeigen
```bash
# In separatem Terminal
firebase emulators:start --debug
```

### Rules-Simulator verwenden
1. Emulator UI → Firestore → Rules tab
2. Simulieren Sie verschiedene Requests
3. Sehen Sie sofort das Ergebnis

### Console-Logs
Firestore-Rules-Violations werden in der Browser-Console angezeigt.

## 🚀 Deployment

### Rules deployen
```bash
# Nur Rules
firebase deploy --only firestore:rules,storage

# Alles deployen  
firebase deploy
```

### Rules validieren vor Deployment
```bash
firebase firestore:rules:validate
```

## 📚 Zusätzliche Ressourcen

- [Firebase Security Rules Dokumentation](https://firebase.google.com/docs/rules)
- [Emulator Suite Dokumentation](https://firebase.google.com/docs/emulator-suite)
- [Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
