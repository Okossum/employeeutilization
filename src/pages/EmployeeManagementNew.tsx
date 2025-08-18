import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Plus, Edit2, Trash2, Mail, Phone, 
  Building2, User, Award, MapPin, Calendar, Eye,
  Briefcase, Target, Star, Activity, Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  manager?: string;
  competenceCenter: string;
  lineOfBusiness: string;
  careerLevel: string;
  travelReadiness?: string;
  skills?: string[];
  isActive: boolean;
  createdAt: Date;
  notes?: string;
}

const EmployeeManagement: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCareerLevel, setSelectedCareerLevel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    manager: '',
    competenceCenter: '',
    lineOfBusiness: '',
    careerLevel: '',
    travelReadiness: '',
    notes: ''
  });

  // Load employees from Firestore
  const loadEmployees = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'employees'));
      const employeeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Employee[];
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !selectedDepartment || employee.department === selectedDepartment;
    const matchesCareerLevel = !selectedCareerLevel || employee.careerLevel === selectedCareerLevel;
    
    return matchesSearch && matchesDepartment && matchesCareerLevel;
  });

  // Get unique values for filters
  const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);
  const careerLevels = Array.from(new Set(employees.map(e => e.careerLevel))).filter(Boolean);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      manager: '',
      competenceCenter: '',
      lineOfBusiness: '',
      careerLevel: '',
      travelReadiness: '',
      notes: ''
    });
  };

  // Add employee
  const handleAddEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name und E-Mail sind erforderlich');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'employees'), {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        isActive: true,
        createdAt: new Date()
      });

      const newEmployee: Employee = {
        id: docRef.id,
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        isActive: true,
        createdAt: new Date()
      };

      setEmployees(prev => [...prev, newEmployee]);
      resetForm();
      setShowAddForm(false);
      toast.success('Mitarbeiter hinzugefügt');
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Fehler beim Hinzufügen des Mitarbeiters');
    }
  };

  // Update employee
  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    try {
      await updateDoc(doc(db, 'employees', editingEmployee.id), formData);
      setEmployees(prev => prev.map(emp => 
        emp.id === editingEmployee.id ? { ...emp, ...formData } : emp
      ));
      resetForm();
      setEditingEmployee(null);
      toast.success('Mitarbeiter aktualisiert');
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Fehler beim Aktualisieren des Mitarbeiters');
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (employee: Employee) => {
    if (window.confirm(`Möchten Sie ${employee.name} wirklich löschen?`)) {
      try {
        await deleteDoc(doc(db, 'employees', employee.id));
        setEmployees(prev => prev.filter(emp => emp.id !== employee.id));
        toast.success('Mitarbeiter gelöscht');
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error('Fehler beim Löschen des Mitarbeiters');
      }
    }
  };

  // Start editing
  const startEditing = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      department: employee.department,
      position: employee.position,
      manager: employee.manager || '',
      competenceCenter: employee.competenceCenter,
      lineOfBusiness: employee.lineOfBusiness,
      careerLevel: employee.careerLevel,
      travelReadiness: employee.travelReadiness || '',
      notes: employee.notes || ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Mitarbeiterdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mitarbeiterverwaltung</h1>
              <p className="text-sm text-gray-600 mt-1">
                Verwalten Sie Mitarbeiterprofile und -informationen
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {employees.length} Mitarbeiter
                  </span>
                </div>
              </div>
              <div className="bg-green-50 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    {employees.filter(e => e.isActive).length} Aktiv
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Mitarbeiter suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Bereiche</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={selectedCareerLevel}
                onChange={(e) => setSelectedCareerLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Level</option>
                {careerLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neuer Mitarbeiter
              </button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingEmployee) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Max Mustermann"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="max.mustermann@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+49 123 456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bereich</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="IT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Senior Developer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Career Level</label>
                  <select
                    value={formData.careerLevel}
                    onChange={(e) => setFormData({...formData, careerLevel: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Wählen Sie ein Level</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Manager">Manager</option>
                    <option value="Director">Director</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-4 mt-6">
                <button
                  onClick={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingEmployee ? 'Aktualisieren' : 'Hinzufügen'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          )}

          {/* Employees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <motion.div
                key={employee.id}
                layout
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => startEditing(employee)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{employee.department}</span>
                  </div>
                  {employee.manager && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Manager: {employee.manager}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      employee.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    {employee.careerLevel && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.careerLevel}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedDepartment || selectedCareerLevel 
                  ? 'Keine Mitarbeiter gefunden' 
                  : 'Noch keine Mitarbeiter'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || selectedDepartment || selectedCareerLevel
                  ? 'Versuchen Sie andere Filter oder fügen Sie neue Mitarbeiter hinzu.'
                  : 'Fügen Sie Ihren ersten Mitarbeiter hinzu, um zu beginnen.'
                }
              </p>
              {!searchTerm && !selectedDepartment && !selectedCareerLevel && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Mitarbeiter hinzufügen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeManagement;

