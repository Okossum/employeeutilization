import React, { useState, useMemo, useEffect } from 'react';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Download, FileSpreadsheet, AlertCircle, Users, 
  TrendingUp, Star, Info, Minus, Plus, Calendar, Database,
  Target, User, Columns, ArrowLeft, MessageSquare, X 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { KpiCardsGrid } from '../components/KpiCardsGrid';

// Types for data structures
interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
}

interface UploadedFile {
  name: string;
  data: any[];
  isValid: boolean;
  error?: string;
}

export function UtilizationReportView() {
  const { user } = useAuth();
  const [showAllData, setShowAllData] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  }>({});
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);

  // Mock data for demonstration
  const mockData: UtilizationData[] = useMemo(() => {
    const persons = ['Müller, Anna', 'Schmidt, Peter', 'Weber, Lisa', 'Fischer, Tom'];
    const data: UtilizationData[] = [];
    
    // Generate data for current week and next 8 weeks
    const currentDate = new Date();
    for (let weekOffset = 0; weekOffset < 9; weekOffset++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + (weekOffset * 7));
      const year = getISOWeekYear(date);
      const week = getISOWeek(date);
      const weekString = `${year}-KW${week.toString().padStart(2, '0')}`;
      
      persons.forEach(person => {
        data.push({
          person,
          week: weekString,
          utilization: Math.floor(Math.random() * 100),
          isHistorical: weekOffset === 0
        });
      });
    }
    
    return data;
  }, []);

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

  // Get unique persons and weeks
  const allPersons = Array.from(new Set(mockData.map(d => d.person))).sort();
  const allWeeks = Array.from(new Set(mockData.map(d => d.week))).sort();
  
  // Filter data based on selected persons
  const filteredData = mockData.filter(d => 
    selectedPersons.length === 0 || selectedPersons.includes(d.person)
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KpiCardsGrid data={filteredData} />
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Auslastungsbericht</h1>
              <p className="text-sm text-gray-600 mt-1">
                Detaillierte Übersicht über Mitarbeiterauslastung und Planung
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Settings className="w-4 h-4 mr-2" />
                Einstellungen
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personen filtern
                </label>
                <select
                  multiple
                  value={selectedPersons}
                  onChange={(e) => setSelectedPersons(Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  size={4}
                >
                  {allPersons.map(person => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredData.length} Datenpunkte • {allPersons.length} Personen • {allWeeks.length} Wochen
              </div>
              <button
                onClick={() => setSelectedPersons([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Filter zurücksetzen
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  {allWeeks.map(week => (
                    <th key={week} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {week.split('-')[1]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allPersons
                  .filter(person => selectedPersons.length === 0 || selectedPersons.includes(person))
                  .map(person => (
                  <tr key={person} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person}
                    </td>
                    {allWeeks.map(week => {
                      const dataPoint = filteredData.find(d => d.person === person && d.week === week);
                      const utilization = dataPoint?.utilization || 0;
                      
                      return (
                        <td key={week} className="px-3 py-4 whitespace-nowrap text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            utilization >= 80 
                              ? 'bg-red-100 text-red-800'
                              : utilization >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {utilization}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Daten verfügbar
              </h3>
              <p className="text-gray-600">
                Keine Auslastungsdaten für die ausgewählten Filter gefunden.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UtilizationReportView;