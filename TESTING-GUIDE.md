# Testing Guide - Employee Utilization

## 🧪 Test-Setup

Das Projekt verwendet **Vitest** für Unit-Tests und **Firebase Emulator** für Integration-Tests.

### Schnellstart

```bash
# Dependencies installieren
npm install

# Unit-Tests ausführen  
npm test

# Integration-Tests mit Emulator
npm run test:emulator

# Test UI öffnen
npm run test:ui

# Alle Tests einmalig ausführen
npm run test:run
```

## 📂 Test-Struktur

```
src/
├── lib/
│   ├── __tests__/              # Unit-Tests
│   │   ├── normalize.test.ts   # Namen-Normalisierung
│   │   ├── week.test.ts        # ISO-Wochen-Utils
│   │   ├── xlsxTriplets.test.ts # Excel Triplet Detection
│   │   └── utilization.test.ts # Auslastungsberechnung
│   └── ...
├── test/
│   ├── __fixtures__/           # Test-Daten
│   │   ├── test-employees.json # Employee-Testdaten
│   │   ├── sample-einsatzplan.csv
│   │   └── create-xlsx.js      # XLSX Generator
│   ├── __integration__/        # Integration-Tests
│   │   └── firebase-emulator.integration.test.ts
│   ├── setup.ts               # Unit-Test Setup
│   └── integration-setup.ts   # Emulator Setup
```

## 🔬 Unit-Tests

### Normalisierung (`normalize.test.ts`)
- **normalizeDiacritics**: ä→ae, ö→oe, ü→ue, ß→ss
- **splitName**: "Bäuerle, Jürgen" → {last: "Bäuerle", first: "Jürgen"}
- **nameKey**: "Bäuerle, Jürgen" → "baeuerle|juergen"

```bash
# Nur Normalisierungs-Tests
npm test normalize
```

### ISO-Wochen (`week.test.ts`)
- **formatJJWW**: (2025,33) → "25/33", (2026,1) → "26/01"
- **toIsoKey**: (2025,33) → "2025-W33"
- **calculateWeekOffset**: Wochen-Arithmetik mit Jahr-Rollover

```bash
# Nur Wochen-Tests
npm test week
```

### Triplet Detection (`xlsxTriplets.test.ts`)
- **detectTriplets**: Findet "Proj", "NKV (%)", "Ort" + Suffixe (.1, .2, ...)
- **validateTripletIndices**: Validiert Spalten-Indizes
- Headers: `["Proj","NKV (%)","Ort","Proj.1","NKV (%).1","Ort.1"...]`

```bash
# Nur Triplet-Tests
npm test triplets
```

### Auslastung (`utilization.test.ts`)
- **calculateUtilizationPct**: 100 - nkvPct, null preservation
- **Over-allocation**: nkv > 100 → negative utilization (ohne Clamping)
- **parseNumericValue**: Excel-Wert → number | null

```bash
# Nur Auslastungs-Tests
npm test utilization
```

## 🔥 Integration-Tests (Firebase Emulator)

### Voraussetzungen

```bash
# Firebase CLI installieren
npm install -g firebase-tools

# Firebase-Projekt verbinden
firebase use --add
```

### Tests ausführen

```bash
# Emulatoren starten + Tests
npm run test:emulator

# Manuell: Emulatoren starten
firebase emulators:start

# In separatem Terminal: Integration-Tests
npm run test:integration
```

### Test-Szenarien

#### Security Rules (`firebase-emulator.integration.test.ts`)

**Firestore Rules:**
- ✅ **Employees lesen**: Authentifizierte User
- ❌ **Employees schreiben**: Nur Service Accounts
- ✅ **Plans/Entries lesen**: Authentifizierte User
- ❌ **Plans/Entries schreiben**: Nur Service Accounts
- ✅ **Aliases erstellen**: Mit Audit-Feldern (createdBy, updatedBy)
- ❌ **Aliases**: Ohne Audit-Felder oder falsche User-ID

**Storage Rules:**
- ✅ **uploads/einsatzplaene/**: Authentifizierte User read/write
- ❌ **Andere Pfade**: Komplett gesperrt

#### Employee Matching
- **Seeding**: Test-Employees aus `test-employees.json`
- **Duplicate Detection**: Mehrere Employees mit gleicher `normalizedName`
- **Match Status**: 'matched', 'unmatched', 'duplicate'

#### Plan Processing Workflow
- Service Account erstellt Plan + Entries
- User liest Plan/Entries
- Utilization-Berechnungen werden verifiziert
- Import-Statistiken werden geprüft

## 📊 Test-Daten

### Employee Fixtures (`test-employees.json`)
```json
[
  {
    "normalizedName": "koss|oliver",
    "competenceCenter": "CC AT-MUC CON",
    "firstName": "Oliver",
    "lastName": "Koss"
  },
  {
    "normalizedName": "duplicate|test",
    "competenceCenter": "CC AT-MUC CON"
  },
  {
    "normalizedName": "duplicate|test", 
    "competenceCenter": "CC AT-MUC CON"
  }
]
```

### Excel Test-Datei erstellen
```bash
# XLSX-Datei für Tests generieren
node src/test/__fixtures__/create-xlsx.js
```

**Generierte Daten:**
- Plan Info: JJ/WW: 25/01, Wochen: 4
- 5 Employees mit verschiedenen NKV-Werten
- 3 Triplets (base, .1, .2) 
- Test-Cases: null, 0, 25, 50, 120 (über-Allokation)

## 🚀 Continuous Integration

### GitHub Actions Beispiel
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:emulator
```

## 🔧 Debugging

### Unit-Tests debuggen
```bash
# Einzelner Test
npm test -- normalize.test.ts

# Watch-Mode
npm test -- --watch

# Test-Coverage
npm test -- --coverage
```

### Integration-Tests debuggen
```bash
# Emulator UI öffnen
firebase emulators:start
# → http://localhost:4000

# Logs anzeigen
firebase emulators:start --debug

# Einzelne Integration-Tests
npm run test:integration -- firebase-emulator
```

### Häufige Probleme

1. **"Firebase not initialized"**: Emulator läuft nicht
   ```bash
   firebase emulators:start --only firestore,storage,auth
   ```

2. **"Rules validation failed"**: Rules-Syntax prüfen
   ```bash
   firebase firestore:rules:validate
   ```

3. **"Port already in use"**: Andere Ports konfigurieren
   ```json
   // firebase.json
   "emulators": {
     "firestore": { "port": 8081 }
   }
   ```

## 📈 Performance & Best Practices

### Test-Performance
- **Parallele Tests**: Vitest läuft parallel per default
- **Setup/Teardown**: Cleanup nach jedem Test
- **Fixture Caching**: Statische Test-Daten cachen

### Test-Isolation
- **Emulator Reset**: `testEnv.clearFirestore()` nach jedem Test
- **Mock Firebase**: Unit-Tests ohne echte Firebase-Calls
- **Separate Contexts**: Verschiedene User-Contexts pro Test

### Code Coverage
```bash
# Coverage Report generieren
npm test -- --coverage --reporter=html

# Coverage-Schwellwerte setzen
# vitest.config.ts
test: {
  coverage: {
    threshold: {
      global: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
}
```

## 🎯 Test-Strategien

### 1. **Unit-Tests**: Kernlogik isoliert testen
- Pure Funktionen (normalize, week calculations)
- Input/Output-Validation
- Edge Cases & Error Handling

### 2. **Integration-Tests**: System-Interaktionen  
- Firebase Rules & Security
- End-to-End Workflows
- Real-World Szenarien

### 3. **Contract-Tests**: API-Kompatibilität
- CF Input/Output Formate
- Client-Server Interfaces
- Breaking Changes Detection

### 4. **Manual Tests**: UI & UX
- Emulator UI für Rules-Testing
- Browser-Tests für Frontend
- File Upload & Processing

