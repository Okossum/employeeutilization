import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import DebugConsole from '../components/DebugConsole';

interface WorkloadPlan {
  id: string;
  planWeek: number;
  planYear: number;
  generatedAt: Date;
  sourcePath: string;
  weeksCount: number;
  displayWeeks: number;
  importStats: {
    matched: number;
    unmatched: number;
    duplicates: number;
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface WorkloadEntry {
  id: string;
  normalizedName: string;
  competenceCenter: string;
  rawName: string;
  businessLine?: string;
  bereich?: string;
  team?: string;
  location?: string;
  grade?: string;
  project?: string;
  customer?: string;
  weeklyPercent: Array<{
    isoYear: number;
    isoWeek: number;
    percent: number;
  }>;
  sumPercent: number;
  match: {
    status: 'matched' | 'unmatched' | 'duplicate';
    employeeIds: string[];
    chosenEmployeeId?: string;
  };
}

interface Filters {
  status: 'all' | 'matched' | 'unmatched' | 'duplicate';
  competenceCenter: string;
  team: string;
  grade: string;
  search: string;
}

interface AssignDialogData {
  entry: WorkloadEntry;
  planId: string;
}

export default function WorkloadView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [latestPlan, setLatestPlan] = useState<WorkloadPlan | null>(null);
  const [entries, setEntries] = useState<WorkloadEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    competenceCenter: '',
    team: '',
    grade: '',
    search: ''
  });

  // Week sliding window
  const [weekOffset, setWeekOffset] = useState(0);
  const [displayWeeks] = useState(8);

  // Assignment dialog
  const [assignDialog, setAssignDialog] = useState<AssignDialogData | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    loadLatestWorkload();
  }, []);

  const loadLatestWorkload = async () => {
    console.log('🔄 [WorkloadView] Starting to load latest workload data');
    
    try {
      setLoading(true);
      setError(null);

      const plansQuery = query(
        collection(db, 'workloads'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const plansSnapshot = await getDocs(plansQuery);
      
      if (plansSnapshot.empty) {
        console.warn('⚠️ [WorkloadView] No workload plans found');
        setError('Noch keine Auslastungspläne verfügbar. Laden Sie zuerst eine Excel-Datei hoch.');
        return;
      }

      const planDoc = plansSnapshot.docs[0];
      const planData = {
        id: planDoc.id,
        ...planDoc.data(),
        generatedAt: planDoc.data().generatedAt?.toDate() || new Date(),
        createdAt: planDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: planDoc.data().updatedAt?.toDate() || new Date(),
      } as WorkloadPlan;

      console.log('✅ [WorkloadView] Latest plan loaded', {
        planId: planData.id,
        planWeek: planData.planWeek,
        planYear: planData.planYear,
        weeksCount: planData.weeksCount,
        importStats: planData.importStats
      });

      setLatestPlan(planData);

      // Get entries for this plan
      const entriesQuery = query(
        collection(db, 'workloads', planDoc.id, 'entries'),
        orderBy('rawName')
      );
      
      const entriesSnapshot = await getDocs(entriesQuery);
      const entriesData = entriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkloadEntry[];

      console.log('📊 [WorkloadView] Entries loaded', {
        entriesCount: entriesData.length,
        matchStatusBreakdown: {
          matched: entriesData.filter(e => e.match.status === 'matched').length,
          unmatched: entriesData.filter(e => e.match.status === 'unmatched').length,
          duplicate: entriesData.filter(e => e.match.status === 'duplicate').length
        }
      });

      setEntries(entriesData);

    } catch (error) {
      console.error('❌ [WorkloadView] Error loading workload data', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setError('Fehler beim Laden der Auslastungsdaten');
    } finally {
      setLoading(false);
    }
  };

  // Filter options
  const competenceCenters = useMemo(() => {
    const ccs = new Set(entries.map(e => e.competenceCenter).filter(Boolean));
    return Array.from(ccs).sort();
  }, [entries]);

  const teams = useMemo(() => {
    const teamSet = new Set(entries.map(e => e.team).filter(Boolean));
    return Array.from(teamSet).sort();
  }, [entries]);

  const grades = useMemo(() => {
    const gradeSet = new Set(entries.map(e => e.grade).filter(Boolean));
    return Array.from(gradeSet).sort();
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filters.status !== 'all' && entry.match.status !== filters.status) return false;
      if (filters.competenceCenter && entry.competenceCenter !== filters.competenceCenter) return false;
      if (filters.team && entry.team !== filters.team) return false;
      if (filters.grade && entry.grade !== filters.grade) return false;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableText = [
          entry.rawName,
          entry.project,
          entry.customer,
          entry.competenceCenter,
          entry.team,
          entry.location
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) return false;
      }

      return true;
    });
  }, [entries, filters]);

  // Week columns for display
  const weekColumns = useMemo(() => {
    if (!latestPlan) return [];

    const columns = [];
    for (let i = weekOffset; i < weekOffset + displayWeeks; i++) {
      const currentWeek = latestPlan.planWeek + i;
      let year = latestPlan.planYear;
      let week = currentWeek;

      // Handle year overflow
      if (week > 52) {
        year += Math.floor((week - 1) / 52);
        week = ((week - 1) % 52) + 1;
      }
      if (week < 1) {
        year -= Math.ceil(-week / 52);
        week = 52 + (week % 52);
      }

      columns.push({
        year,
        week,
        label: `${String(year).slice(-2)}/${String(week).padStart(2, '0')}`,
        isoKey: `${year}-W${String(week).padStart(2, '0')}`
      });
    }
    return columns;
  }, [latestPlan, weekOffset, displayWeeks]);

  const getPercentForWeek = (entry: WorkloadEntry, year: number, week: number): number => {
    const weekData = entry.weeklyPercent.find(w => w.isoYear === year && w.isoWeek === week);
    return weekData?.percent || 0;
  };

  const getStatusBadge = (entry: WorkloadEntry) => {
    switch (entry.match.status) {
      case 'matched':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Zugeordnet</span>;
      case 'unmatched':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Nicht gefunden</span>;
      case 'duplicate':
        return (
          <button
            onClick={() => handleAssignClick(entry)}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer"
          >
            Zuordnen
          </button>
        );
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unbekannt</span>;
    }
  };

  const handleAssignClick = (entry: WorkloadEntry) => {
    if (!latestPlan) return;
    setAssignDialog({ entry, planId: latestPlan.id });
    setSelectedEmployeeId(entry.match.employeeIds[0] || '');
  };

  const handleAssignment = async () => {
    if (!assignDialog || !selectedEmployeeId) return;

    try {
      const { entry, planId } = assignDialog;

      // Create alias document
      const aliasId = `${entry.normalizedName}|${entry.competenceCenter}`;
      await setDoc(doc(db, 'aliases', aliasId), {
        normalizedName: entry.normalizedName,
        competenceCenter: entry.competenceCenter,
        employeeId: selectedEmployeeId,
        createdAt: new Date(),
        createdBy: user?.uid
      });

      // Update entry document
      const entryRef = doc(db, 'workloads', planId, 'entries', entry.id);
      await updateDoc(entryRef, {
        'match.status': 'matched',
        'match.chosenEmployeeId': selectedEmployeeId,
        updatedAt: new Date()
      });

      // Update local state
      setEntries(prev => prev.map(e => 
        e.id === entry.id 
          ? { 
              ...e, 
              match: { 
                ...e.match, 
                status: 'matched' as const, 
                chosenEmployeeId: selectedEmployeeId 
              } 
            }
          : e
      ));

      setAssignDialog(null);
      setSelectedEmployeeId('');
    } catch (error) {
      console.error('Error assigning employee:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Anmeldung erforderlich</h1>
          <p className="text-gray-600">Sie müssen angemeldet sein, um Auslastungsdaten zu sehen.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Auslastungsdaten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Fehler</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <a
                    href="/workload/upload"
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Auslastungsplan hochladen
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Auslastungsübersicht</h1>
          <p className="mt-2 text-gray-600">
            Detaillierte Auslastungsdaten mit Filteroptionen und Wochensicht
          </p>
        </div>

        {/* Plan Info */}
        {latestPlan && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Plan</h3>
                <p className="text-lg font-semibold text-gray-900">
                  KW {latestPlan.planWeek} / {latestPlan.planYear}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Wochen</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {latestPlan.weeksCount}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Einträge</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {filteredEntries.length} / {entries.length}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Zugeordnet</h3>
                <p className="text-lg font-semibold text-green-600">
                  {latestPlan.importStats.matched}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Duplikate</h3>
                <p className="text-lg font-semibold text-yellow-600">
                  {latestPlan.importStats.duplicates}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filter</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Alle</option>
                <option value="matched">Zugeordnet</option>
                <option value="unmatched">Nicht gefunden</option>
                <option value="duplicate">Duplikate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Competence Center</label>
              <select
                value={filters.competenceCenter}
                onChange={(e) => setFilters(prev => ({ ...prev, competenceCenter: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Alle</option>
                {competenceCenters.map(cc => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                value={filters.team}
                onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Alle</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Alle</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Suche</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Name, Projekt, Kunde..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Wochensicht</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
              >
                ← Früher
              </button>
              <span className="text-sm text-gray-600">
                Wochen {weekColumns[0]?.label} - {weekColumns[weekColumns.length - 1]?.label}
              </span>
              <button
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
              >
                Später →
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LBS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Standort
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projekt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {weekColumns.map(week => (
                    <th key={week.isoKey} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-16">
                      {week.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summe
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.rawName}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.competenceCenter}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.grade || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.team || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.location || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.project || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.customer || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(entry)}
                    </td>
                    {weekColumns.map(week => {
                      const percent = getPercentForWeek(entry, week.year, week.week);
                      return (
                        <td key={week.isoKey} className="px-3 py-4 whitespace-nowrap text-center text-sm">
                          {percent > 0 ? (
                            <span className="font-medium text-gray-900">{Math.round(percent * 100)}%</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {Math.round(entry.sumPercent * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEntries.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">Keine Einträge gefunden</p>
            </div>
          )}
        </div>

        {/* Assignment Dialog */}
        {assignDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Mitarbeiter zuordnen
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Wählen Sie einen Mitarbeiter für <strong>{assignDialog.entry.rawName}</strong> aus:
              </p>
              
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
              >
                <option value="">Bitte wählen...</option>
                {assignDialog.entry.match.employeeIds.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setAssignDialog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAssignment}
                  disabled={!selectedEmployeeId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md"
                >
                  Zuordnen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <a
            href="/workload/upload"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Neuen Auslastungsplan hochladen
          </a>
        </div>

        {/* Debug Console */}
        <DebugConsole
          isOpen={debugConsoleOpen}
          onToggle={() => setDebugConsoleOpen(!debugConsoleOpen)}
        />
      </div>
    </div>
  );
}