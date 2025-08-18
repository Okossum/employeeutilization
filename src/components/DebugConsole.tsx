import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

interface DebugConsoleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function DebugConsole({ isOpen, onToggle }: DebugConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    // Intercept console.log, console.warn, console.error
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      addLog('info', args.join(' '), args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args.join(' '), args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '), args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const addLog = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    // Only capture workload-related logs
    if (message.includes('[WorkloadUpload]') || 
        message.includes('[WorkloadView]') || 
        message.includes('[onWorkloadXlsxUploaded]')) {
      
      const logEntry: LogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data
      };

      setLogs(prev => [...prev.slice(-49), logEntry]); // Keep last 50 logs
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return 'ℹ️';
      case 'warn':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📝';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-600';
      case 'warn':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Debug Console öffnen"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-96 h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">🐛 Debug Console</span>
          <span className="text-xs text-gray-500">({filteredLogs.length} logs)</span>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">Alle</option>
            <option value="info">Info</option>
            <option value="warn">Warnung</option>
            <option value="error">Fehler</option>
          </select>
          <button
            onClick={clearLogs}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            title="Logs löschen"
          >
            🗑️
          </button>
          <button
            onClick={onToggle}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            title="Console schließen"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Keine Logs gefunden
            <br />
            <span className="text-xs">Laden Sie eine Auslastungsdatei hoch, um Logs zu sehen</span>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="mb-2 border-b border-gray-100 pb-1">
              <div className="flex items-start space-x-2">
                <span className="text-gray-400 text-xs">{log.timestamp}</span>
                <span className={`${getLevelColor(log.level)}`}>
                  {getLevelIcon(log.level)}
                </span>
              </div>
              <div className="mt-1 pl-4">
                <div className={`${getLevelColor(log.level)} break-words`}>
                  {log.message}
                </div>
                {log.data && log.data.length > 1 && (
                  <details className="mt-1">
                    <summary className="text-gray-500 cursor-pointer text-xs">
                      Details anzeigen
                    </summary>
                    <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-1 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Status */}
      <div className="border-t border-gray-200 p-2 bg-gray-50">
        <div className="text-xs text-gray-600 text-center">
          Workload Upload Debugging aktiv
        </div>
      </div>
    </div>
  );
}


