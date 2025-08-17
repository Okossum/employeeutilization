import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EinsatzplanUpload from '../components/EinsatzplanUpload';

export default function EinsatzplanUploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Redirect in progress
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Einsatzplan hochladen</h1>
          <p className="mt-2 text-lg text-gray-600">
            Laden Sie eine Excel-Datei (.xlsx) mit dem aktuellen Einsatzplan hoch
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg width="20" height="20" className=" text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Anforderungen für die Excel-Datei</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Sheet-Name: "Einsatzplan"</li>
                  <li>A1-Zelle: "Einsatzplan-Export für KW X (YYYY). Stand: DD.MM.YYYY"</li>
                  <li>Header in Zeile 3 mit Spalten: Name, CC, Proj, NKV (%), Ort, etc.</li>
                  <li>Maximale Dateigröße: 50MB</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Component */}
        <EinsatzplanUpload className="mb-8" />

        {/* Additional Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Was passiert nach dem Upload?</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</div>
              </div>
              <div className="ml-3">
                <span className="font-medium text-gray-900">Upload:</span> Die Datei wird sicher in Firebase Storage gespeichert
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</div>
              </div>
              <div className="ml-3">
                <span className="font-medium text-gray-900">Verarbeitung:</span> Eine Cloud Function analysiert die Excel-Datei automatisch
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</div>
              </div>
              <div className="ml-3">
                <span className="font-medium text-gray-900">Matching:</span> Mitarbeiter werden gegen die bestehende Datenbank abgeglichen
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">4</div>
              </div>
              <div className="ml-3">
                <span className="font-medium text-gray-900">Fertig:</span> Der Einsatzplan ist verfügbar und Sie werden zur Übersicht weitergeleitet
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/einsatzplan/view')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Zur Einsatzplan-Ansicht
          </button>
        </div>
      </div>
    </div>
  );
}
