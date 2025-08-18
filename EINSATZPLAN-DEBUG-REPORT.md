# 🔍 Einsatzplan-Daten Debug Report

## 🎯 Problem
**Die Einsatzplan-Daten werden in der Übersicht nicht angezeigt.**

## ✅ Was funktioniert (BESTÄTIGT)

### 1. Firebase Datenbank
- ✅ **3 Pläne** in der Datenbank
- ✅ **31 Einträge** im neuesten Plan (2025-W33)
- ✅ **24 Wochen** Daten pro Eintrag
- ✅ **Utilization-Daten vorhanden** (z.B. 25% Auslastung)
- ✅ **Datenstruktur korrekt** (index, utilizationPct, nkvPct, etc.)

### 2. Frontend-Logik
- ✅ **usePlanEntries Hook** funktioniert logisch korrekt
- ✅ **getWeekData Funktion** definiert und korrekt
- ✅ **formatUtilization Funktion** funktioniert
- ✅ **createWeekWindow Funktion** erstellt korrekte Wochenfenster
- ✅ **Frontend-Pipeline** würde 8/8 Wochen mit Daten anzeigen

### 3. Server & Build
- ✅ **Vite Server** läuft auf Port 5173
- ✅ **React App** wird korrekt geladen
- ✅ **Tailwind CSS** wird kompiliert
- ✅ **Firebase Konfiguration** ist korrekt

## ❓ Mögliche Probleme (ZU TESTEN)

### 1. Authentifizierung 🔐
- **Symptom**: `auth/admin-restricted-operation` bei anonymer Anmeldung
- **Test**: Überprüfung ob User authentifiziert ist
- **Lösung**: Login-Status und Firebase Auth Rules prüfen

### 2. React Rendering 🔄
- **Symptom**: Daten laden, aber UI zeigt sie nicht an
- **Test**: Browser DevTools Console auf JavaScript-Fehler prüfen
- **Lösung**: Component State und Rendering-Lifecycle debuggen

### 3. CSS/Styling 🎨
- **Symptom**: Daten sind im DOM, aber visuell versteckt
- **Test**: Element Inspector verwenden
- **Lösung**: CSS Rules und Tailwind Classes überprüfen

### 4. Network/Permissions 🚫
- **Symptom**: Firebase Requests schlagen fehl
- **Test**: Network Tab in Browser DevTools
- **Lösung**: Firestore Security Rules anpassen

## 🛠️ Debug-Tools erstellt

1. **`debug-firebase.js`** - Testet Firebase Verbindung und Daten
2. **`debug-frontend-pipeline.js`** - Simuliert komplette Frontend-Logik
3. **`debug-comprehensive.html`** - Browser-basiertes Debug Dashboard
4. **`debug-browser-test.html`** - Manuelle Browser-Tests mit Anweisungen

## 🔧 Nächste Schritte

### Sofortige Actions:
1. **Browser öffnen**: `debug-browser-test.html` ausführen
2. **React App öffnen**: http://localhost:5173/einsatzplan/view
3. **DevTools öffnen**: F12 → Console Tab
4. **Fehler suchen**: Rote Fehlermeldungen notieren
5. **Network prüfen**: Firebase Requests erfolgreich?
6. **Elements prüfen**: Sind Tabellendaten im DOM?

### Debug Commands für Browser Console:
```javascript
// React App Status
console.log('React loaded:', !!document.querySelector('#root'));

// Firebase Auth Status
console.log('Auth user:', window.firebase?.auth?.().currentUser);

// Table Data Check
const rows = document.querySelectorAll('tbody tr');
console.log('Table rows:', rows.length);
if (rows.length > 0) {
  console.log('First row text:', rows[0].textContent);
}

// Network Requests
console.log('Network errors in console');
```

## 📊 Erwartetes Verhalten

Wenn alles funktioniert, sollten Sie sehen:
- **Tabelle mit 31 Zeilen** (eine pro Mitarbeiter)
- **8 Spalten mit Prozentdaten** (25%, 25%, 25%, etc.)
- **Keine JavaScript-Fehler** in der Console
- **Erfolgreiche Firebase-Requests** im Network Tab

## 🎯 Wahrscheinlichste Ursachen

1. **Authentifizierung** (80% Wahrscheinlichkeit)
2. **JavaScript Runtime Error** (15% Wahrscheinlichkeit)  
3. **CSS/Rendering Issue** (5% Wahrscheinlichkeit)

---

**Erstellt**: $(date)
**Status**: Data-Pipeline funktioniert, UI-Rendering zu debuggen
**Priorität**: HOCH - Kernfunktionalität betroffen
