import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export interface Customer {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  projects?: string[];
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  isActive: boolean;
  createdAt: Date;
}

interface CustomerContextType {
  customers: Customer[];
  projects: Project[];
  loading: boolean;
  addCustomer: (name: string) => Promise<string>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  addProject: (customerId: string, projectName: string) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Load customers from Firestore
  const loadCustomers = async () => {
    try {
      const customersQuery = query(collection(db, 'customers'));
      const snapshot = await getDocs(customersQuery);
      const customerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Customer[];
      setCustomers(customerData);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Fehler beim Laden der Kunden');
    }
  };

  // Load projects from Firestore
  const loadProjects = async () => {
    try {
      const projectsQuery = query(collection(db, 'projects'));
      const snapshot = await getDocs(projectsQuery);
      const projectData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Project[];
      setProjects(projectData);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Fehler beim Laden der Projekte');
    }
  };

  // Load all data
  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCustomers(), loadProjects()]);
    } finally {
      setLoading(false);
    }
  };

  // Add customer
  const addCustomer = async (name: string): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        name: name.trim(),
        isActive: true,
        createdAt: new Date()
      });
      
      const newCustomer: Customer = {
        id: docRef.id,
        name: name.trim(),
        isActive: true,
        createdAt: new Date()
      };
      
      setCustomers(prev => [...prev, newCustomer]);
      toast.success(`Kunde "${name}" hinzugefügt`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Fehler beim Hinzufügen des Kunden');
      throw error;
    }
  };

  // Update customer
  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      await updateDoc(doc(db, 'customers', id), updates);
      setCustomers(prev => prev.map(customer => 
        customer.id === id ? { ...customer, ...updates } : customer
      ));
      toast.success('Kunde aktualisiert');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Fehler beim Aktualisieren des Kunden');
      throw error;
    }
  };

  // Remove customer
  const removeCustomer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
      
      // Also remove associated projects
      const customerProjects = projects.filter(p => p.customerId === id);
      await Promise.all(customerProjects.map(p => removeProject(p.id)));
      
      setCustomers(prev => prev.filter(customer => customer.id !== id));
      toast.success('Kunde gelöscht');
    } catch (error) {
      console.error('Error removing customer:', error);
      toast.error('Fehler beim Löschen des Kunden');
      throw error;
    }
  };

  // Add project
  const addProject = async (customerId: string, projectName: string): Promise<string> => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Customer not found');

      const docRef = await addDoc(collection(db, 'projects'), {
        name: projectName.trim(),
        customerId,
        customerName: customer.name,
        isActive: true,
        createdAt: new Date()
      });
      
      const newProject: Project = {
        id: docRef.id,
        name: projectName.trim(),
        customerId,
        customerName: customer.name,
        isActive: true,
        createdAt: new Date()
      };
      
      setProjects(prev => [...prev, newProject]);
      toast.success(`Projekt "${projectName}" hinzugefügt`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Fehler beim Hinzufügen des Projekts');
      throw error;
    }
  };

  // Update project
  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      await updateDoc(doc(db, 'projects', id), updates);
      setProjects(prev => prev.map(project => 
        project.id === id ? { ...project, ...updates } : project
      ));
      toast.success('Projekt aktualisiert');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Fehler beim Aktualisieren des Projekts');
      throw error;
    }
  };

  // Remove project
  const removeProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      setProjects(prev => prev.filter(project => project.id !== id));
      toast.success('Projekt gelöscht');
    } catch (error) {
      console.error('Error removing project:', error);
      toast.error('Fehler beim Löschen des Projekts');
      throw error;
    }
  };

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const value = {
    customers,
    projects,
    loading,
    addCustomer,
    updateCustomer,
    removeCustomer,
    addProject,
    updateProject,
    removeProject,
    refreshData
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
}

