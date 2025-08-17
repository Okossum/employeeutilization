import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Willkommen, {user?.email}
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Employee Utilization Management System
          </p>
        </div>

        {/* Quick Actions Overview */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Schnellzugriff</h2>
          <div className="text-center text-gray-600">
            <p>Verwenden Sie die Navigation oben, um zu den verschiedenen Bereichen zu gelangen:</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><strong>📋 Einsatzplan:</strong> Excel-Dateien hochladen und verarbeiten</p>
              <p><strong>📊 Berichte:</strong> Aktuelle Einsatzpläne und Statistiken anzeigen</p>
              <p><strong>👥 Mitarbeiter:</strong> Stammdaten verwalten</p>
              <p><strong>📤 Import:</strong> Mitarbeiterdaten importieren</p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg width="20" height="20" className=" text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">System bereit</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Alle Services sind verfügbar. Cloud Functions verarbeiten Uploads automatisch.</p>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
