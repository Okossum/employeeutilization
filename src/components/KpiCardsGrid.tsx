import React from 'react';
import { TrendingUp, TrendingDown, Users, Target, Clock, AlertTriangle } from 'lucide-react';

interface KpiCardData {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

interface KpiCardsGridProps {
  data?: any[];
  className?: string;
}

export function KpiCardsGrid({ data, className = '' }: KpiCardsGridProps) {
  // Calculate KPIs from data or use mock data
  const calculateKpis = (): KpiCardData[] => {
    if (!data || data.length === 0) {
      // Mock KPIs for demonstration
      return [
        {
          title: 'Durchschnittliche Auslastung',
          value: '73%',
          change: 5.2,
          changeType: 'increase',
          icon: <Target className="w-6 h-6" />,
          description: 'Über alle Mitarbeiter',
          color: 'blue'
        },
        {
          title: 'Aktive Mitarbeiter',
          value: 142,
          change: 8,
          changeType: 'increase',
          icon: <Users className="w-6 h-6" />,
          description: 'Mit Auslastungsdaten',
          color: 'green'
        },
        {
          title: 'Überauslastung',
          value: '18%',
          change: -2.1,
          changeType: 'decrease',
          icon: <AlertTriangle className="w-6 h-6" />,
          description: 'Über 100% ausgelastet',
          color: 'red'
        },
        {
          title: 'Freie Kapazität',
          value: '27%',
          change: 3.4,
          changeType: 'increase',
          icon: <Clock className="w-6 h-6" />,
          description: 'Verfügbare Ressourcen',
          color: 'purple'
        }
      ];
    }

    // Calculate real KPIs from data
    const totalEntries = data.length;
    const avgUtilization = data.reduce((sum, item) => sum + (item.utilization || 0), 0) / totalEntries;
    const overUtilized = data.filter(item => (item.utilization || 0) > 100).length;
    const underUtilized = data.filter(item => (item.utilization || 0) < 50).length;

    return [
      {
        title: 'Durchschnittliche Auslastung',
        value: `${Math.round(avgUtilization)}%`,
        icon: <Target className="w-6 h-6" />,
        description: 'Über alle Mitarbeiter',
        color: avgUtilization > 80 ? 'red' : avgUtilization > 60 ? 'yellow' : 'green'
      },
      {
        title: 'Datenpunkte',
        value: totalEntries,
        icon: <Users className="w-6 h-6" />,
        description: 'Auslastungseinträge',
        color: 'blue'
      },
      {
        title: 'Überauslastung',
        value: overUtilized,
        icon: <AlertTriangle className="w-6 h-6" />,
        description: 'Über 100% ausgelastet',
        color: 'red'
      },
      {
        title: 'Unterauslastung',
        value: underUtilized,
        icon: <Clock className="w-6 h-6" />,
        description: 'Unter 50% ausgelastet',
        color: 'gray'
      }
    ];
  };

  const kpis = calculateKpis();

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      gray: 'bg-gray-50 text-gray-600 border-gray-200'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  const getTrendIcon = (changeType?: string) => {
    if (changeType === 'increase') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (changeType === 'decrease') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {kpis.map((kpi, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${getColorClasses(kpi.color)}`}>
              {kpi.icon}
            </div>
            {kpi.change !== undefined && (
              <div className="flex items-center space-x-1">
                {getTrendIcon(kpi.changeType)}
                <span className={`text-sm font-medium ${
                  kpi.changeType === 'increase' ? 'text-green-600' : 
                  kpi.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change}%
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {kpi.title}
            </h3>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {kpi.value}
            </div>
            {kpi.description && (
              <p className="text-sm text-gray-600">
                {kpi.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KpiCardsGrid;

