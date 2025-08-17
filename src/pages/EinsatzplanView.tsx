import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlanEntries } from '../hooks/usePlanEntries';
import { AliasService } from '../services/aliasService';
import { createWeekWindow, shiftWeekWindow, formatUtilization } from '../utils/dateUtils';
import toast from 'react-hot-toast';

import type { PlanEntry } from '../hooks/usePlanEntries';
import type { Employee } from '../services/aliasService';

interface Filters {
  status: string;
  competenceCenter: string;
  team: string;
  grade: string;
  search: string;
}

interface DuplicateDialogState {
  isOpen: boolean;
  entry: PlanEntry | null;
  candidates: Employee[];
  loading: boolean;
}

export default function EinsatzplanView() {
  const { user } = useAuth();
  const { plan, entries, loading, error, filterEntries } = usePlanEntries();
  
  // Week window state
  const [windowStart, setWindowStart] = useState<{ isoYear: number; isoWeek: number } | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    status: '',
    competenceCenter: '',
    team: '',
    grade: '',
    search: ''
  });

  // Duplicate resolution dialog state
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateDialogState>({
    isOpen: false,
    entry: null,
    candidates: [],
    loading: false
  });

  // Initialize window start when plan loads
  if (plan && !windowStart) {
    setWindowStart({ isoYear: plan.planYear, isoWeek: plan.planWeek });
  }

  // Create current week window
  const weekWindow = windowStart ? createWeekWindow(windowStart.isoYear, windowStart.isoWeek, 8) : [];

  // Filter entries
  const filteredEntries = filterEntries(entries, filters);

  // Get unique values for filter dropdowns
  const uniqueCompetenceCenters = AliasService.getUniqueValues<string>(entries, 'competenceCenter');
  const uniqueTeams = AliasService.getUniqueValues<string>(entries, 'team');
  const uniqueGrades = AliasService.getUniqueValues<string>(entries, 'grade');

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleWeekShift = (offset: number) => {
    if (!windowStart) return;
    
    const newWindow = shiftWeekWindow(windowStart.isoYear, windowStart.isoWeek, offset);
    setWindowStart(newWindow);
  };

  const handleResolveDuplicate = async (entry: PlanEntry) => {
    if (!user) return;

    setDuplicateDialog({
      isOpen: true,
      entry,
      candidates: [],
      loading: true
    });

    try {
      const candidates = await AliasService.getEmployeeDetails(entry.match.employeeIds);
      setDuplicateDialog(prev => ({
        ...prev,
        candidates,
        loading: false
      }));
    } catch (error) {
      toast.error('Fehler beim Laden der Kandidaten');
      setDuplicateDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSelectEmployee = async (employeeId: string) => {
    if (!duplicateDialog.entry || !plan || !user) return;

    try {
      // Create alias
      await AliasService.createAlias(
        duplicateDialog.entry.normalizedName,
        duplicateDialog.entry.competenceCenter,
        employeeId,
        user.uid
      );

      // Update entry
      await AliasService.resolveEntryDuplicate(
        plan.id,
        duplicateDialog.entry.id,
        employeeId
      );

      toast.success('Duplikat erfolgreich zugeordnet');
      setDuplicateDialog({
        isOpen: false,
        entry: null,
        candidates: [],
        loading: false
      });
    } catch (error) {
      toast.error('Fehler beim Zuordnen des Duplikats');
    }
  };

  const getMatchStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'matched':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'unmatched':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'duplicate':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getWeekData = (entry: PlanEntry, weekIndex: number) => {
    return entry.weeks.find(week => week.index === weekIndex) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Einsatzplan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="mb-4">
            <svg className="mx-auto text-red-400" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Fehler beim Laden</h2>
          <p className="text-gray-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Kein Plan gefunden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Einsatzplan KW {plan.planWeek}/{plan.planYear}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {plan.importStats.total} Mitarbeiter • {plan.importStats.matched} gematcht • {plan.importStats.duplicates} Duplikate
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">Alle</option>
                <option value="matched">Gematcht</option>
                <option value="unmatched">Nicht gematcht</option>
                <option value="duplicate">Duplikat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Competence Center</label>
              <select
                value={filters.competenceCenter}
                onChange={(e) => handleFilterChange('competenceCenter', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">Alle</option>
                {uniqueCompetenceCenters.map(cc => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                value={filters.team}
                onChange={(e) => handleFilterChange('team', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">Alle</option>
                {uniqueTeams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LBS</label>
              <select
                value={filters.grade}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">Alle</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Suche (Name)</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Mitarbeitername..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleWeekShift(-8)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              -8 Wochen
            </button>
            
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                Anzeigebereich: {weekWindow.length > 0 && `${weekWindow[0].jjww} - ${weekWindow[weekWindow.length - 1]?.jjww}`}
              </p>
              <p className="text-xs text-gray-500">8-Wochen-Fenster</p>
            </div>

            <button
              onClick={() => handleWeekShift(8)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              +8 Wochen
              <svg className="ml-2" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {filteredEntries.length} von {entries.length} Einträgen angezeigt
          </p>
        </div>

        {/* Data Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                    Geschäftsstelle
                  </th>
                  {weekWindow.map(week => (
                    <th key={week.index} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                      <div className="font-semibold">
                        Auslastung %<br/>({week.jjww})
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      {entry.rawName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={getMatchStatusBadge(entry.match.status)}>
                        {entry.match.status === 'matched' ? 'Gematcht' : 
                         entry.match.status === 'unmatched' ? 'Nicht gematcht' : 'Duplikat'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.competenceCenter}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.grade || ''}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.team || ''}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.office || ''}
                    </td>
                    {weekWindow.map(week => {
                      const weekData = getWeekData(entry, week.index);
                      const utilization = formatUtilization(weekData?.utilizationPct || null);
                      return (
                        <td key={week.index} className="px-2 py-4 text-center text-sm">
                          <div className="text-gray-900 font-medium">
                            {utilization && `${utilization}%`}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {entry.match.status === 'duplicate' && (
                        <button
                          onClick={() => handleResolveDuplicate(entry)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Zuordnen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No results message */}
        {filteredEntries.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">Keine Einträge gefunden, die den Filterkriterien entsprechen.</p>
          </div>
        )}
      </div>

      {/* Duplicate Resolution Dialog */}
      {duplicateDialog.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Duplikat zuordnen
              </h3>
              
              {duplicateDialog.entry && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-900">
                    {duplicateDialog.entry.rawName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {duplicateDialog.entry.competenceCenter}
                  </p>
                </div>
              )}

              {duplicateDialog.loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {duplicateDialog.candidates.map(candidate => {
                    const { name, details } = AliasService.getEmployeeDisplayInfo(candidate);
                    return (
                      <button
                        key={candidate.id}
                        onClick={() => handleSelectEmployee(candidate.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">{name}</div>
                        {details.map((detail, index) => (
                          <div key={index} className="text-xs text-gray-600">{detail}</div>
                        ))}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setDuplicateDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
