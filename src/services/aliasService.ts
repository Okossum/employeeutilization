import { 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  collection,
  getDocs,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  competenceCenter?: string;
  teamName?: string;
  location?: string;
  grade?: string;
  normalizedName?: string;
}

export interface AliasData {
  employeeId: string;
  createdAt: any;
  createdBy: string;
}

/**
 * Service for managing employee aliases and duplicate resolution
 */
export class AliasService {
  /**
   * Creates or updates an alias for a normalized name and competence center
   */
  static async createAlias(
    normalizedName: string,
    competenceCenter: string,
    employeeId: string,
    userId: string
  ): Promise<void> {
    const aliasId = `${normalizedName}|${competenceCenter}`;
    const aliasRef = doc(db, 'aliases', aliasId);

    const aliasData: AliasData = {
      employeeId,
      createdAt: serverTimestamp(),
      createdBy: userId
    };

    await setDoc(aliasRef, aliasData);
  }

  /**
   * Updates a plan entry's match status to resolved
   */
  static async resolveEntryDuplicate(
    planId: string,
    entryId: string,
    chosenEmployeeId: string
  ): Promise<void> {
    const entryRef = doc(db, 'plans', planId, 'entries', entryId);
    
    await updateDoc(entryRef, {
      'match.status': 'matched',
      'match.chosenEmployeeId': chosenEmployeeId,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Fetches employee details for candidate IDs
   */
  static async getEmployeeDetails(employeeIds: string[]): Promise<Employee[]> {
    if (employeeIds.length === 0) {
      return [];
    }

    try {
      const employees: Employee[] = [];
      
      // Note: Firestore 'in' queries are limited to 10 items, so we might need to batch
      const batchSize = 10;
      for (let i = 0; i < employeeIds.length; i += batchSize) {
        const batch = employeeIds.slice(i, i + batchSize);
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('__name__', 'in', batch));
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          employees.push({
            id: doc.id,
            ...doc.data()
          } as Employee);
        });
      }

      return employees;
    } catch (error) {
      console.error('Error fetching employee details:', error);
      return employeeIds.map(id => ({ id })); // Return minimal data if fetch fails
    }
  }

  /**
   * Gets unique values for filter dropdowns
   */
  static getUniqueValues<T>(
    items: any[], 
    fieldPath: string
  ): T[] {
    const values = new Set<T>();
    
    items.forEach(item => {
      const value = this.getNestedValue(item, fieldPath);
      if (value !== null && value !== undefined && value !== '') {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  }

  /**
   * Helper to get nested object values
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Formats employee display name
   */
  static formatEmployeeName(employee: Employee): string {
    if (employee.firstName && employee.lastName) {
      return `${employee.lastName}, ${employee.firstName}`;
    }
    if (employee.firstName || employee.lastName) {
      return employee.firstName || employee.lastName || employee.id;
    }
    return employee.id;
  }

  /**
   * Gets employee display info for the duplicate resolution dialog
   */
  static getEmployeeDisplayInfo(employee: Employee): {
    name: string;
    details: string[];
  } {
    const name = this.formatEmployeeName(employee);
    const details: string[] = [];

    if (employee.email) details.push(`📧 ${employee.email}`);
    if (employee.competenceCenter) details.push(`🏢 ${employee.competenceCenter}`);
    if (employee.teamName) details.push(`👥 ${employee.teamName}`);
    if (employee.location) details.push(`📍 ${employee.location}`);
    if (employee.grade) details.push(`⭐ ${employee.grade}`);

    return { name, details };
  }
}
