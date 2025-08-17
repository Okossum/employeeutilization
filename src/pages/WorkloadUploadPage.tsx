import React, { useState } from 'react';
import WorkloadUpload from '../components/WorkloadUpload';
import DebugConsole from '../components/DebugConsole';

export default function WorkloadUploadPage() {
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Auslastungsplan hochladen
          </h1>
          <p className="mt-2 text-gray-600">
            Laden Sie Excel-Dateien mit Auslastungsdaten hoch. Die Daten werden automatisch verarbeitet und in der Übersicht verfügbar gemacht.
          </p>
        </div>

        {/* Upload Component */}
        <div className="bg-white shadow rounded-lg p-6">
          <WorkloadUpload />
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            📖 Hilfe und Anleitung
          </h2>
          
          <div className="space-y-6">
            {/* Format Requirements */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Dateiformat-Anforderungen:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <strong>Dateityp:</strong> Excel (.xlsx)</li>
                <li>• <strong>Sheet-Name:</strong> "Auslastung operativ"</li>
                <li>• <strong>Maximale Größe:</strong> 50 MB</li>
                <li>• <strong>Header-Zeile:</strong> Zeile 3 (1-basiert)</li>
              </ul>
            </div>

            {/* Column Structure */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Spaltenstruktur:
              </h3>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono">
                <div className="grid grid-cols-1 gap-1">
                  <div>Name | CC | BL | Bereich | Team | Standort | LBS | Projekt | Kunde | KW 33 | KW 34 | ... | Summe Aufwand</div>
                </div>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 mt-2">
                <li>• <strong>Name:</strong> Format "Nachname, Vorname"</li>
                <li>• <strong>CC:</strong> Competence Center (exakt wie in Mitarbeiterdaten)</li>
                <li>• <strong>KW XX:</strong> Kalenderwoche mit Stundenzahl</li>
                <li>• Leere Zellen werden als 0 Stunden interpretiert</li>
              </ul>
            </div>

            {/* Processing */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Verarbeitung:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Automatische Zuordnung zu bestehenden Mitarbeitern</li>
                <li>• Normalisierung von Namen und Umlauten</li>
                <li>• Erstellung von Import-Statistiken</li>
                <li>• Übersicht über matched/unmatched Datensätze</li>
              </ul>
            </div>

            {/* Example */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Beispiel-Datenzeile:
              </h3>
              <div className="bg-gray-50 rounded p-3">
                <table className="text-xs font-mono">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">CC</th>
                      <th className="px-2 py-1 text-left">BL</th>
                      <th className="px-2 py-1 text-left">KW 33</th>
                      <th className="px-2 py-1 text-left">KW 34</th>
                      <th className="px-2 py-1 text-left">Summe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1">Müller, Hans</td>
                      <td className="px-2 py-1">IT Services</td>
                      <td className="px-2 py-1">Digital</td>
                      <td className="px-2 py-1">40</td>
                      <td className="px-2 py-1">35</td>
                      <td className="px-2 py-1">75</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Links */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Weiterführende Links:
              </h3>
              <div className="flex space-x-4 text-sm">
                <a 
                  href="/workload/latest" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  → Aktuelle Auslastung anzeigen
                </a>
                <a 
                  href="/employees" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  → Mitarbeiterverwaltung
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Console */}
      <DebugConsole
        isOpen={debugConsoleOpen}
        onToggle={() => setDebugConsoleOpen(!debugConsoleOpen)}
      />
    </div>
  );
}
