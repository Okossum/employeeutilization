import React, { useState, useMemo, useEffect } from 'react';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { formatJJWW } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, TrendingUp, TrendingDown, User, Building, Users as TeamIcon, GraduationCap, ArrowLeft, ArrowRight, Database, FileSpreadsheet, Download, Settings, Columns, MessageSquare, Star, Target, Ticket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

interface EmployeeData {
  id: string;
  name: string;
  competenceCenter: string;
  team: string;
  businessLine: string;
  grade: string;
  location?: string;
}

interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
}

export default function Overview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workloadData, setWorkloadData] = useState<WorkloadEntry[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [utilizationData, setUtilizationData] = useState<UtilizationData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Current week and year
  const currentWeek = getISOWeek(new Date());
  const currentYear = getISOWeekYear(new Date());

  // Week ranges - FIXED: Use plan-based weeks like WorkloadView
  const pastWeeks = useMemo(() => {
    // If we have workload data, extract actual weeks from the data
    if (workloadData.length > 0 && workloadData[0].weeklyPercent.length > 0) {
      // Get unique weeks from workload data and sort them
      const allWeeks = workloadData.flatMap(entry => 
        entry.weeklyPercent.map(wp => ({ year: wp.isoYear, week: wp.isoWeek }))
      );
      
      const uniqueWeeks = Array.from(
        new Set(allWeeks.map(w => `${w.year}-${w.week}`))
      )
      .map(key => {
        const [year, week] = key.split('-').map(Number);
        return { year, week };
      })
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.week - b.week)
      .slice(-8); // Take last 8 weeks (most recent)
      
      return uniqueWeeks.map(({ year, week }) => ({
        year,
        week,
        label: formatJJWW(year, week)
      }));
    }
    
    // Fallback: use current week calculation
    return Array.from({ length: 8 }, (_, i) => {
      const week = currentWeek - 7 + i;
      const year = week > 0 ? currentYear : currentYear - 1;
      const adjustedWeek = week > 0 ? week : 52 + week;
      return { 
        year, 
        week: adjustedWeek, 
        label: formatJJWW(year, adjustedWeek)
      };
    });
  }, [workloadData, currentWeek, currentYear]);

  // ✅ FIXED: Calculate future weeks based on latest plan's start week
  const futureWeeks = useMemo(() => {
    // If we have plan data, use its start week for future weeks calculation
    if (utilizationData.length > 0) {
      // Extract unique weeks from utilization data and sort them
      const uniqueWeeks = [...new Set(utilizationData.map(item => item.week))]
        .sort()
        .slice(0, 8); // Take first 8 weeks from plan
      
      return uniqueWeeks.map(weekLabel => {
        const [yearStr, weekStr] = weekLabel.split('-KW');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        return { 
          year, 
          week, 
          label: formatJJWW(year, week) // ✅ FIXED: Use YY/WW format
        };
      });
    }
    
    // Fallback: use current week + 1 as before with YY/WW format
    return Array.from({ length: 8 }, (_, i) => {
      const week = currentWeek + 1 + i;
      const year = week > 52 ? currentYear + 1 : currentYear;
      const adjustedWeek = week > 52 ? week - 52 : week;
      return { 
        year, 
        week: adjustedWeek, 
        label: formatJJWW(year, adjustedWeek) // ✅ FIXED: Use YY/WW format
      };
    });
  }, [utilizationData, currentWeek, currentYear]);

  useEffect(() => {
    loadData();
  }, []);



  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load workload data (past weeks) - from WorkloadView
      const workloadQuery = query(
        collection(db, 'workloads'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const workloadSnapshot = await getDocs(workloadQuery);
      console.log('🔧 DEBUG: Workload snapshot:', workloadSnapshot.docs.length, 'plans found');
      if (!workloadSnapshot.empty) {
        const planDoc = workloadSnapshot.docs[0];
        const entriesQuery = query(
          collection(db, 'workloads', planDoc.id, 'entries'),
          orderBy('rawName')
        );
        
        const entriesSnapshot = await getDocs(entriesQuery);
        const entries = entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WorkloadEntry[];
        
        console.log('🔧 DEBUG: Setting workload data:', entries.length, 'entries');
        setWorkloadData(entries);
      }

      // Load employee data (center column) - Employee Management
      const employeesQuery = query(collection(db, 'employees'), orderBy('name'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employees = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmployeeData[];
      
      setEmployeeData(employees);

      // Load utilization data (future weeks) - from EinsatzplanView (plans collection)
      const plansQuery = query(
        collection(db, 'plans'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const plansSnapshot = await getDocs(plansQuery);
      const transformedUtilization: UtilizationData[] = [];
      
      if (!plansSnapshot.empty) {
        const latestPlan = plansSnapshot.docs[0];
        const planData = latestPlan.data();
        
        // Load entries from the latest plan
        const entriesQuery = query(
          collection(db, 'plans', latestPlan.id, 'entries'),
          orderBy('rawName')
        );
        
        const entriesSnapshot = await getDocs(entriesQuery);
        
        // Transform plan entries to utilization data
        entriesSnapshot.docs.forEach(doc => {
          const entry = doc.data();
          const person = entry.rawName || '';
          
          // Process each week in the entry
          if (entry.weeks && Array.isArray(entry.weeks)) {
            entry.weeks.forEach((weekData: any) => {
              // ✅ FIXED: Use the already correct isoYear/isoWeek from weekData
              // instead of calculating from planWeek + index
              if (weekData.isoYear && weekData.isoWeek && weekData.utilizationPct !== null) {
                transformedUtilization.push({
                  person: person,
                  week: `${weekData.isoYear}-KW${String(weekData.isoWeek).padStart(2, '0')}`,
                  utilization: weekData.utilizationPct,
                  isHistorical: false // Future weeks from Einsatzplan
                });
              }
            });
          }
        });
      }
      
      setUtilizationData(transformedUtilization);
      
      // DEBUG: Log the loaded data  
      console.log('🔧 DEBUG Overview loaded data:', {
        workloadEntries: workloadData.length,
        employeeEntries: employeeData.length,
        utilizationEntries: transformedUtilization.length,
        sampleUtilization: transformedUtilization.slice(0, 3),
        sampleWeeks: transformedUtilization.map(u => u.week).slice(0, 10)
      });

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadValue = (entry: WorkloadEntry, year: number, week: number): number => {
    const weekData = entry.weeklyPercent.find(w => w.isoYear === year && w.isoWeek === week);
    return weekData?.percent || 0;
  };

  const getUtilizationValue = (person: string, year: number, week: number): number | null => {
    const targetWeek = `${year}-KW${String(week).padStart(2, '0')}`;
    const weekData = utilizationData.find(item => 
      item.person === person && 
      item.week === targetWeek
    );
    
    // DEBUG: Log for first few calls
    if (Math.random() < 0.01) { // Only log 1% of calls to avoid spam
      console.log('🔧 DEBUG getUtilizationValue:', {
        person,
        targetWeek,
        found: !!weekData,
        value: weekData?.utilization,
        totalUtilizationData: utilizationData.length
      });
    }
    
    return weekData?.utilization || null;
  };

  // KPI Data calculation - EXACTLY like UtilizationReportView
  const kpiData = useMemo(() => {
    const historicalData = workloadData.flatMap(entry => 
      pastWeeks.map(week => ({
        utilization: getWorkloadValue(entry, week.year, week.week) * 100
      }))
    ).filter(item => item.utilization > 0);
    
    const forecastData = utilizationData.filter(item => item.utilization !== null);
    
    const avgHistorical = historicalData.length > 0 ? historicalData.reduce((sum, item) => sum + item.utilization, 0) / historicalData.length : 0;
    const avgForecast = forecastData.length > 0 ? forecastData.reduce((sum, item) => sum + (item.utilization || 0), 0) / forecastData.length : 0;
    const overUtilized = [...historicalData, ...forecastData].filter(item => (item.utilization || 0) > 100).length;
    const missingValues = utilizationData.filter(item => item.utilization === null).length;
    
    return {
      avgHistorical: Math.round(avgHistorical),
      avgForecast: Math.round(avgForecast),
      overUtilized,
      missingValues,
      lookbackWeeks: pastWeeks.length,
      forecastWeeks: futureWeeks.length
    };
  }, [workloadData, utilizationData, pastWeeks, futureWeeks]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Bitte anmelden</h2>
          <p className="text-gray-600">Zugriff nur für angemeldete Benutzer.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Übersichtsdaten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="w-full">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - EXACTLY like UtilizationReportView */}
      <header className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mitarbeiter-Übersicht {currentYear}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Rückblick 8W · Mitarbeiter-Info · Vorblick 8W · ISO-KW
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Database className="w-4 h-4" />
              Aktualisieren
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - EXACTLY like UtilizationReportView structure */}
      <main className="w-full p-4 space-y-6">
        
        {/* KPI Cards - EXACTLY like UtilizationReportView */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ø Rückblick</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.avgHistorical}%</p>
                <p className="text-xs text-gray-500">{kpiData.lookbackWeeks} Wochen</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mitarbeiter</p>
                <p className="text-2xl font-bold text-gray-900">{employeeData.length}</p>
                <p className="text-xs text-gray-500">Gesamt</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ø Vorblick</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.avgForecast}%</p>
                <p className="text-xs text-gray-500">{kpiData.forecastWeeks} Wochen</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Star className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Überlastung</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.overUtilized}</p>
                <p className="text-xs text-gray-500">&gt; 100%</p>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Single Table Layout - EXACTLY like UtilizationReportView */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Detailansicht nach Person
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Kombinierte Ansicht: Rückblick (8 Wochen) · Mitarbeiter-Info · Vorblick (8 Wochen)
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {/* Past Weeks Header */}
                  {pastWeeks.map(week => (
                    <th key={week.label} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-12">
                      {week.label}
                    </th>
                  ))}
                  
                  {/* Employee Info Header - EXACTLY like UtilizationReportView with bg-gray-100 */}
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">
                    Mitarbeiter
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">
                    CC
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">
                    Team
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-100 min-w-20">
                    LBS
                  </th>
                  
                  {/* Future Weeks Header */}
                  {futureWeeks.map(week => (
                    <th key={week.label} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-12">
                      {week.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workloadData.slice(0, 20).map((entry) => {
                  // Find corresponding employee data
                  const employee = employeeData.find(emp => emp.name === entry.rawName);
                  
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      {/* Past Weeks - Workload Data */}
                      {pastWeeks.map(week => {
                        const value = getWorkloadValue(entry, week.year, week.week);
                        let bgColor = 'bg-gray-100';
                        if (value > 0.9) bgColor = 'bg-green-100';
                        else if (value > 0.8) bgColor = 'bg-yellow-100';
                        else if (value > 0) bgColor = 'bg-red-100';
                        
                        return (
                          <td key={week.label} className="px-1 py-2 text-center text-xs">
                            {value > 0 ? (
                              <span className={`inline-block px-2 py-1 rounded ${bgColor}`}>
                                <span className="flex items-center justify-center gap-1">
                                  {Math.round(value * 100)}%
                                  {value > 1 && <Star className="w-3 h-3 text-yellow-500" />}
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}
                      
                      {/* Employee Info - Center Section with bg-gray-50 */}
                      <td className="px-2 py-1 text-sm font-medium text-gray-900 bg-gray-50">
                        {entry.rawName}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-500 bg-gray-50">
                        {entry.competenceCenter || employee?.competenceCenter || '-'}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-500 bg-gray-50">
                        {entry.team || employee?.team || '-'}
                      </td>
                      <td className="px-2 py-1 text-sm text-gray-500 bg-gray-50">
                        {entry.grade || employee?.grade || '-'}
                      </td>
                      
                      {/* Future Weeks - Utilization Data */}
                      {futureWeeks.map(week => {
                        const value = getUtilizationValue(entry.rawName, week.year, week.week);
                        let bgColor = 'bg-gray-100';
                        if (value !== null && value !== undefined) {
                          if (value > 90) bgColor = 'bg-green-100';
                          else if (value > 80) bgColor = 'bg-yellow-100';
                          else bgColor = 'bg-red-100';
                        }
                        
                        return (
                          <td key={week.label} className="px-1 py-2 text-center text-xs">
                            {value !== null ? (
                              <span className={`inline-block px-2 py-1 rounded ${bgColor}`}>
                                <span className="flex items-center justify-center gap-1">
                                  {Math.round(value)}%
                                  {value > 100 && <Star className="w-3 h-3 text-yellow-500" />}
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
