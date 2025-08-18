import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  planWeek: number;
  planYear: number;
  generatedAt: string;
  sourcePath: string;
  weeksCount: number;
  importStats: {
    matched: number;
    unmatched: number;
    duplicates: number;
    total: number;
  };
  createdAt: any;
}

export default function EinsatzplanLatest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestPlan, setLatestPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchLatestPlan = async () => {
      try {
        const plansRef = collection(db, 'plans');
        const q = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setLatestPlan({
            id: doc.id,
            ...doc.data()
          } as Plan);
        } else {
          setError('Noch keine Einsatzpläne gefunden');
        }
      } catch (err) {
        console.error('Error fetching latest plan:', err);
        setError('Fehler beim Laden des aktuellen Einsatzplans');
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPlan();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade aktuellen Einsatzplan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="mb-4">
            <svg className="mx-auto text-gray-400" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Keine Einsatzpläne gefunden</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/einsatzplan/upload')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Einsatzplan hochladen
          </button>
        </div>
      </div>
    );
  }

  if (!latestPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Kein Einsatzplan gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Aktueller Einsatzplan</h1>
          <p className="mt-2 text-sm text-gray-600">
            KW {latestPlan.planWeek} ({latestPlan.planYear})
          </p>
        </div>

        {/* Plan Overview Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan-Übersicht</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Week Info */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">KW {latestPlan.planWeek}</div>
              <div className="text-sm text-gray-500">{latestPlan.planYear}</div>
            </div>

            {/* Weeks Count */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{latestPlan.weeksCount}</div>
              <div className="text-sm text-gray-500">Wochen</div>
            </div>

            {/* Total Entries */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{latestPlan.importStats.total}</div>
              <div className="text-sm text-gray-500">Mitarbeiter</div>
            </div>

            {/* Matched */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{latestPlan.importStats.matched}</div>
              <div className="text-sm text-gray-500">Gematcht</div>
            </div>
          </div>
        </div>

        {/* Import Statistics */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Import-Statistiken</h2>
          
          <div className="space-y-4">
            {/* Matched */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Erfolgreich gematcht</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(latestPlan.importStats.matched / latestPlan.importStats.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900 min-w-[3rem] text-right">
                  {latestPlan.importStats.matched}
                </span>
              </div>
            </div>

            {/* Unmatched */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Nicht gematcht</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(latestPlan.importStats.unmatched / latestPlan.importStats.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900 min-w-[3rem] text-right">
                  {latestPlan.importStats.unmatched}
                </span>
              </div>
            </div>

            {/* Duplicates */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Duplikate</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${(latestPlan.importStats.duplicates / latestPlan.importStats.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900 min-w-[3rem] text-right">
                  {latestPlan.importStats.duplicates}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/einsatzplan/upload')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Neuen Einsatzplan hochladen
          </button>
          
          <button
            onClick={() => navigate('/plans')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Alle Pläne anzeigen
          </button>
        </div>
      </div>
    </div>
  );
}
