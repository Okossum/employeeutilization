import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface WeekData {
  index: number;
  isoYear: number;
  isoWeek: number;
  project?: string | null;
  nkvPct: number | null;
  utilizationPct: number | null;
  location?: string | null;
  isoKey: string;
}

export interface MatchResult {
  status: 'matched' | 'unmatched' | 'duplicate';
  employeeIds: string[];
  chosenEmployeeId?: string;
}

export interface PlanEntry {
  id: string;
  normalizedName: string;
  competenceCenter: string;
  rawName: string;
  lob: string | null;
  bereich: string | null;
  team: string | null;
  office: string | null;
  currentLocation: string | null;
  grade: string | null;
  skills: string | null;
  offeredAt: string | null;
  staffbar: boolean | null;
  ov: string | null;
  op: string | null;
  weeks: WeekData[];
  match: MatchResult;
  createdAt: any;
  updatedAt: any;
}

export interface Plan {
  id: string;
  planWeek: number;
  planYear: number;
  generatedAt: any;
  sourcePath: string;
  columns: string[];
  weeksCount: number;
  displayWeeks: number;
  importStats: {
    matched: number;
    unmatched: number;
    duplicates: number;
    total: number;
  };
  createdAt: any;
  updatedAt: any;
}

export interface PlanEntriesState {
  plan: Plan | null;
  entries: PlanEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and manage plan entries
 * @param planId - Optional specific plan ID, otherwise loads latest
 * @returns Plan entries state and utilities
 */
export function usePlanEntries(planId?: string) {
  const [state, setState] = useState<PlanEntriesState>({
    plan: null,
    entries: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let unsubscribePlan: (() => void) | null = null;
    let unsubscribeEntries: (() => void) | null = null;

    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        let targetPlanId = planId;

        // If no specific plan ID, get the latest plan
        if (!targetPlanId) {
          const plansRef = collection(db, 'plans');
          const latestPlanQuery = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
          const planSnapshot = await getDocs(latestPlanQuery);
          
          if (planSnapshot.empty) {
            setState(prev => ({ 
              ...prev, 
              loading: false, 
              error: 'Keine Einsatzpläne gefunden' 
            }));
            return;
          }

          targetPlanId = planSnapshot.docs[0].id;
        }

        // Subscribe to plan document
        const planDocRef = doc(db, 'plans', targetPlanId);
        unsubscribePlan = onSnapshot(planDocRef, (planDoc) => {
          if (planDoc.exists()) {
            const planData = { id: planDoc.id, ...planDoc.data() } as Plan;
            setState(prev => ({ ...prev, plan: planData }));
          } else {
            setState(prev => ({ 
              ...prev, 
              error: 'Plan nicht gefunden',
              loading: false 
            }));
          }
        }, (error) => {
          setState(prev => ({ 
            ...prev, 
            error: `Fehler beim Laden des Plans: ${error.message}`,
            loading: false 
          }));
        });

        // Subscribe to entries subcollection
        const entriesRef = collection(db, 'plans', targetPlanId, 'entries');
        unsubscribeEntries = onSnapshot(entriesRef, (entriesSnapshot) => {
          const entriesData: PlanEntry[] = entriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PlanEntry[];

          setState(prev => ({ 
            ...prev, 
            entries: entriesData,
            loading: false 
          }));
        }, (error) => {
          setState(prev => ({ 
            ...prev, 
            error: `Fehler beim Laden der Einträge: ${error.message}`,
            loading: false 
          }));
        });

      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: `Unerwarteter Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          loading: false 
        }));
      }
    };

    loadData();

    // Cleanup function
    return () => {
      if (unsubscribePlan) unsubscribePlan();
      if (unsubscribeEntries) unsubscribeEntries();
    };
  }, [planId]);

  /**
   * Refresh the data
   */
  const refresh = () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
  };

  /**
   * Filter entries by various criteria
   */
  const filterEntries = (
    entries: PlanEntry[],
    filters: {
      status?: string;
      competenceCenter?: string;
      team?: string;
      grade?: string;
      search?: string;
    }
  ): PlanEntry[] => {
    return entries.filter(entry => {
      // Status filter
      if (filters.status && entry.match.status !== filters.status) {
        return false;
      }

      // Competence Center filter
      if (filters.competenceCenter && entry.competenceCenter !== filters.competenceCenter) {
        return false;
      }

      // Team filter
      if (filters.team && entry.team !== filters.team) {
        return false;
      }

      // Grade filter
      if (filters.grade && entry.grade !== filters.grade) {
        return false;
      }

      // Search filter (name only)
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase();
        const nameMatch = entry.rawName.toLowerCase().includes(searchTerm);
        
        if (!nameMatch) {
          return false;
        }
      }

      return true;
    });
  };

  return {
    ...state,
    refresh,
    filterEntries
  };
}
