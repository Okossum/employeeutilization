# Einsatzplan XLSX Import Function

## Übersicht

Diese Cloud Function importiert Excel "Einsatzplan" Dateien automatisch, wenn sie in Firebase Storage unter `uploads/einsatzplaene/{userId}/{timestamp}.xlsx` hochgeladen werden.

## Funktionsweise

### 1. Trigger
- **Path Pattern**: `uploads/einsatzplaene/{userId}/*.xlsx`
- **Event**: `onObjectFinalized` (Firebase Storage)
- **Runtime**: Node.js 20, 512MB RAM, 540s Timeout

### 2. Excel-Struktur
- **Sheet**: "Einsatzplan"
- **A1**: "Einsatzplan-Export für KW 33 (2025). Stand: 17.08.2025"
- **Header Row**: Zeile 3 (0-basiert: Index 2)
- **Spalten**: Name, CC, LoB, Bereich, Team, etc.
- **Wochen-Triplets**: Proj, NKV (%), Ort (mit Suffixen .1, .2, ...)

### 3. Datenverarbeitung

#### Name-Normalisierung
- Input: "Müller, Hans" → Output: "mueller|hans"
- Umlaute: ä→ae, ö→oe, ü→ue, ß→ss
- Europäische Diakritika werden normalisiert
- Case-insensitive Matching

#### Competence Center Handling
- **WICHTIG**: Exakte String-Gleichheit, nur `trim()`
- Keine Normalisierung von Groß-/Kleinschreibung
- Spaces werden beibehalten

#### Utilization Berechnung
```typescript
utilizationPct = nkvPct !== null ? 100 - nkvPct : null
// Erlaubt Werte > 100 (keine Begrenzung)
```

### 4. Employee Matching (Reihenfolge)

1. **Alias Check**: `aliases/{normalizedName|competenceCenter}`
2. **Query**: `employees.where('normalizedName', '==', name).where('competenceCenter', '==', cc)`
3. **Legacy Fallback**: `employees/{normalizedName|competenceCenter.toLowerCase()}`

**Results:**
- 0 Matches → `unmatched`
- 1 Match → `matched` + `chosenEmployeeId`
- >1 Matches → `duplicate` + `employeeIds[]`

### 5. Output-Datenmodell

#### `plans/{planId}`
```typescript
{
  planWeek: number,              // z.B. 33
  planYear: number,              // z.B. 2025
  generatedAt: Timestamp,        // aus "Stand: DD.MM.YYYY"
  sourcePath: string,            // Storage-Pfad
  columns: string[],             // Header-Array
  weeksCount: number,            // Anzahl erkannter Triplets
  displayWeeks: 8,               // Fixwert
  importStats: {
    matched: number,
    unmatched: number,
    duplicates: number,
    total: number
  },
  createdAt, updatedAt
}
```

#### `plans/{planId}/entries/{entryId}`
```typescript
{
  normalizedName: string,        // "mueller|hans"
  competenceCenter: string,      // Exakt aus Excel (nur trimmed)
  rawName: string,              // Original "Müller, Hans"
  
  // Optional fields
  lob?, bereich?, team?, office?, currentLocation?,
  grade?, skills?, offeredAt?, staffbar?, ov?, op?,
  
  weeks: Array<{
    index: number,               // 0, 1, 2, ...
    isoYear: number,            // 2025
    isoWeek: number,            // 33, 34, 35, ...
    project: string|null,       // Proj-Spalte
    nkvPct: number|null,        // NKV (%)-Spalte
    utilizationPct: number|null, // 100 - nkvPct
    location: string|null,      // Ort-Spalte
    isoKey: string             // "2025-W33"
  }>,
  
  match: {
    status: "matched"|"unmatched"|"duplicate",
    employeeIds: string[],
    chosenEmployeeId?: string
  },
  
  createdAt, updatedAt
}
```

## Wichtige Features

### ✅ Was wird gemacht
- Dynamische Erkennung von Wochen-Triplets (.1, .2, .3, ...)
- ISO-Wochen-Berechnung mit Jahresübergang
- Robuste Name-Normalisierung mit Umlauten
- Exakte CC-Matching (keine Normalisierung)
- Batch-Writes für Performance
- Strukturierte Error-Behandlung

### ❌ Was wird NICHT gemacht
- "Verfügbar ab" Spalten werden komplett ignoriert
- Keine Begrenzung von NKV% auf 100%
- Keine automatische CC-Normalisierung
- Keine Löschung existierender Plans

## Tests

```bash
cd functions
npm test                    # Alle Tests
npm run test:watch         # Watch-Mode
npm run test:coverage      # Coverage-Report
```

**Test-Coverage:**
- ✅ Name-Parsing und Normalisierung
- ✅ ISO-Wochen-Berechnungen
- ✅ Triplet-Erkennung
- ✅ Utilization-Berechnung
- ✅ Integration-Szenarien

## Deployment

```bash
npm run build
npm run deploy
```

**Environment:**
- Node.js 20
- firebase-functions ^5.1.0
- date-fns ^3.6.0
- xlsx ^0.18.5

## Error Handling

- Row-Level: Fehlerhafte Zeilen werden geloggt, Processing fortsetzt
- Function-Level: Gesamte Function schlägt fehl bei kritischen Fehlern
- Firestore: Atomare Batch-Writes
- Logging: Strukturierte Logs mit `logger.info/warn/error`

## Bekannte Einschränkungen

1. **Speicher**: 512MB für große Excel-Dateien
2. **Timeout**: 540s für Processing
3. **Batch Size**: Firestore Batch-Limit (500 Operations)
4. **Sheet Name**: Muss exakt "Einsatzplan" heißen
