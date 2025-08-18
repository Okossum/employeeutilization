import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Building2, Edit2, Trash2, Users, 
  FolderOpen, Check, X, Calendar, Activity 
} from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';
import type { Customer, Project } from '../contexts/CustomerContext';

export function CustomerManagement() {
  const {
    customers,
    projects,
    loading,
    addCustomer,
    updateCustomer,
    removeCustomer,
    addProject,
    updateProject,
    removeProject
  } = useCustomers();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  
  // Project management
  const [showAddProjectForm, setShowAddProjectForm] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerProjects = (customerId: string): Project[] => {
    return projects.filter(project => project.customerId === customerId);
  };

  // Customer handlers
  const handleAddCustomer = async () => {
    if (newCustomerName.trim()) {
      try {
        await addCustomer(newCustomerName.trim());
        setNewCustomerName('');
        setShowAddCustomerForm(false);
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    if (editCustomerName.trim() && editCustomerName !== customer.name) {
      try {
        await updateCustomer(customer.id, { name: editCustomerName.trim() });
        setEditingCustomer(null);
        setEditCustomerName('');
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  const handleRemoveCustomer = async (customer: Customer) => {
    const customerProjects = getCustomerProjects(customer.id);
    const projectCount = customerProjects.length;
    
    const confirmMessage = projectCount > 0 
      ? `Möchten Sie den Kunden "${customer.name}" und ${projectCount} zugehörige Projekte wirklich löschen?`
      : `Möchten Sie den Kunden "${customer.name}" wirklich löschen?`;
      
    if (window.confirm(confirmMessage)) {
      try {
        await removeCustomer(customer.id);
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  // Project handlers
  const handleAddProject = async (customerId: string) => {
    if (newProjectName.trim()) {
      try {
        await addProject(customerId, newProjectName.trim());
        setNewProjectName('');
        setShowAddProjectForm(null);
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  const handleUpdateProject = async (project: Project) => {
    if (editProjectName.trim() && editProjectName !== project.name) {
      try {
        await updateProject(project.id, { name: editProjectName.trim() });
        setEditingProject(null);
        setEditProjectName('');
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  const handleRemoveProject = async (project: Project) => {
    if (window.confirm(`Möchten Sie das Projekt "${project.name}" wirklich löschen?`)) {
      try {
        await removeProject(project.id);
      } catch (error) {
        // Error is handled by context
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Kundendaten...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Kundenverwaltung</h1>
              <p className="text-sm text-gray-600 mt-1">
                Verwalten Sie Kunden und deren Projekte
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {customers.length} Kunden
                  </span>
                </div>
              </div>
              <div className="bg-green-50 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    {projects.length} Projekte
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Add */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Kunden suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowAddCustomerForm(true)}
              className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neuer Kunde
            </button>
          </div>

          {/* Add Customer Form */}
          {showAddCustomerForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Kundenname"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomer()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleAddCustomer}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Hinzufügen
                </button>
                <button
                  onClick={() => {
                    setShowAddCustomerForm(false);
                    setNewCustomerName('');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Abbrechen
                </button>
              </div>
            </motion.div>
          )}

          {/* Customers List */}
          <div className="space-y-4">
            {filteredCustomers.map((customer) => {
              const customerProjects = getCustomerProjects(customer.id);
              const isEditing = editingCustomer === customer.id;
              
              return (
                <motion.div
                  key={customer.id}
                  layout
                  className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
                >
                  {/* Customer Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editCustomerName}
                                onChange={(e) => setEditCustomerName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUpdateCustomer(customer)}
                                className="px-2 py-1 border border-gray-300 rounded text-lg font-semibold"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateCustomer(customer)}
                                className="p-1 text-green-600 hover:text-green-800"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCustomer(null);
                                  setEditCustomerName('');
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-gray-900">
                              {customer.name}
                            </h3>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Erstellt: {customer.createdAt.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FolderOpen className="w-4 h-4" />
                              <span>{customerProjects.length} Projekte</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className={`w-4 h-4 ${customer.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                              <span>{customer.isActive ? 'Aktiv' : 'Inaktiv'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowAddProjectForm(customer.id)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Projekt
                        </button>
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingCustomer(customer.id);
                              setEditCustomerName(customer.name);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveCustomer(customer)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Add Project Form */}
                  {showAddProjectForm === customer.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 py-3 bg-green-50 border-b border-gray-100"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Projektname"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddProject(customer.id)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={() => handleAddProject(customer.id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Hinzufügen
                        </button>
                        <button
                          onClick={() => {
                            setShowAddProjectForm(null);
                            setNewProjectName('');
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Abbrechen
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Projects List */}
                  {customerProjects.length > 0 && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {customerProjects.map((project) => {
                          const isEditingProject = editingProject === project.id;
                          
                          return (
                            <div
                              key={project.id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  {isEditingProject ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={editProjectName}
                                        onChange={(e) => setEditProjectName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateProject(project)}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleUpdateProject(project)}
                                        className="p-1 text-green-600 hover:text-green-800"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingProject(null);
                                          setEditProjectName('');
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <h4 className="font-medium text-gray-900 text-sm">
                                        {project.name}
                                      </h4>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {project.createdAt.toLocaleDateString()}
                                      </p>
                                    </>
                                  )}
                                </div>
                                {!isEditingProject && (
                                  <div className="flex items-center space-x-1 ml-2">
                                    <button
                                      onClick={() => {
                                        setEditingProject(project.id);
                                        setEditProjectName(project.name);
                                      }}
                                      className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveProject(project)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Versuchen Sie einen anderen Suchbegriff.'
                  : 'Fügen Sie Ihren ersten Kunden hinzu, um zu beginnen.'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddCustomerForm(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Kunden hinzufügen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerManagement;

