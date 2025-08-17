import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  businessLine: string;
  competenceCenter: string;
  teamName: string;
  location: string;
  grade: string;
  experienceSinceYear: number | null;
  availableFrom: string | null;
  availableForStaffing: boolean | null;
  profileUrl: string | null;
  externalIds: Record<string, any>;
  active: boolean;
  normalizedName: string;
  duplicateHint?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DuplicateGroup {
  type: 'email' | 'name';
  key: string;
  employees: Employee[];
}



const AdminEmployees: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [competenceCenterFilter, setCompetenceCenterFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<'all' | 'duplicates'>('all');
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);


  const db = getFirestore();

  // Admin-Status prüfen (vereinfacht - in Produktion über Firestore Rules)
  useEffect(() => {
    if (user?.email) {
      // Einfache Admin-Erkennung - in Produktion über Firestore Rules
      setIsAdmin(user.email.includes('admin') || user.email.includes('steward'));
    }
  }, [user]);

  // Mitarbeiter laden
  useEffect(() => {
    if (!user) return;

    const employeesQuery = query(
      collection(db, 'employees'),
      orderBy('lastName', 'asc')
    );

    const unsubscribe = onSnapshot(employeesQuery, (snapshot) => {
      const loadedEmployees: Employee[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        loadedEmployees.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Employee);
      });

      setEmployees(loadedEmployees);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user, db]);

  // Dubletten erkennen
  useEffect(() => {
    const groups: DuplicateGroup[] = [];
    const emailMap = new Map<string, Employee[]>();
    const nameMap = new Map<string, Employee[]>();

    employees.forEach((employee) => {
      // E-Mail-Dubletten
      if (employee.email) {
        const emailKey = employee.email.toLowerCase();
        if (!emailMap.has(emailKey)) {
          emailMap.set(emailKey, []);
        }
        emailMap.get(emailKey)!.push(employee);
      }

      // Name + Competence Center Dubletten
      const nameKey = `${employee.normalizedName}|${employee.competenceCenter}`;
      if (!nameMap.has(nameKey)) {
        nameMap.set(nameKey, []);
      }
      nameMap.get(nameKey)!.push(employee);
    });

    // Gruppen mit mehr als 1 Eintrag
    emailMap.forEach((employees, email) => {
      if (employees.length > 1) {
        groups.push({ type: 'email', key: email, employees });
      }
    });

    nameMap.forEach((employees, nameKey) => {
      if (employees.length > 1) {
        groups.push({ type: 'name', key: nameKey, employees });
      }
    });

    setDuplicateGroups(groups);
  }, [employees]);

  // Gefilterte und durchsuchte Mitarbeiter
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Suche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.firstName.toLowerCase().includes(term) ||
          emp.lastName.toLowerCase().includes(term) ||
          emp.email.toLowerCase().includes(term)
      );
    }

    // Active Filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((emp) => emp.active === (activeFilter === 'active'));
    }

    // Competence Center Filter
    if (competenceCenterFilter) {
      filtered = filtered.filter((emp) => emp.competenceCenter === competenceCenterFilter);
    }

    // Grade Filter
    if (gradeFilter) {
      filtered = filtered.filter((emp) => emp.grade === gradeFilter);
    }

    return filtered;
  }, [employees, searchTerm, activeFilter, competenceCenterFilter, gradeFilter]);

  // Paginierung
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  // Eindeutige Werte für Filter
  const competenceCenters = useMemo(() => 
    [...new Set(employees.map(emp => emp.competenceCenter).filter(Boolean))].sort(),
    [employees]
  );

  const grades = useMemo(() => 
    [...new Set(employees.map(emp => emp.grade).filter(Boolean))].sort(),
    [employees]
  );

  const handleToggleActive = async (employeeId: string, newActive: boolean) => {
    if (!isAdmin) return;

    try {
      await updateDoc(doc(db, 'employees', employeeId), {
        active: newActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Mitarbeiter ${newActive ? 'aktiviert' : 'deaktiviert'}`);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!isAdmin) return;

    if (window.confirm('Mitarbeiter wirklich löschen?')) {
      try {
        await deleteDoc(doc(db, 'employees', employeeId));
        toast.success('Mitarbeiter gelöscht');
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  if (isLoading) {
    return <div style={{ padding: 16 }}>Lade Mitarbeiter...</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Mitarbeiter-Verwaltung</h1>

      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ borderBottom: '1px solid #ddd' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'all' ? '2px solid #007bff' : '2px solid transparent',
              color: activeTab === 'all' ? '#007bff' : '#666',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            Alle Mitarbeiter ({filteredEmployees.length})
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'duplicates' ? '2px solid #007bff' : '2px solid transparent',
              color: activeTab === 'duplicates' ? '#007bff' : '#666',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            Dubletten ({duplicateGroups.length})
          </button>
        </div>
      </div>

      {/* Filter und Suche */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Suche nach Name oder E-Mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            minWidth: 250,
          }}
        />

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
          }}
        >
          <option value="all">Alle Status</option>
          <option value="active">Nur Aktive</option>
          <option value="inactive">Nur Inaktive</option>
        </select>

        <select
          value={competenceCenterFilter}
          onChange={(e) => setCompetenceCenterFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
          }}
        >
          <option value="">Alle Competence Centers</option>
          {competenceCenters.map((cc) => (
            <option key={cc} value={cc}>{cc}</option>
          ))}
        </select>

        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
          }}
        >
          <option value="">Alle Grade</option>
          {grades.map((grade) => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>
      </div>

      {/* Mitarbeiter-Tabelle */}
      {activeTab === 'all' && (
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>E-Mail</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Firma</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Competence Center</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Team</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Grade</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Dubletten-Hinweis</th>
                  {isAdmin && (
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Aktionen</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((employee) => (
                  <tr key={employee.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {employee.firstName} {employee.lastName}
                        </div>
                        {employee.duplicateHint && (
                          <span style={{ fontSize: '12px', color: '#dc3545' }}>⚠️ Dublette</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>{employee.email}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{employee.company}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{employee.competenceCenter}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{employee.teamName}</td>
                    <td style={{ padding: '12px', color: '#666' }}>{employee.grade}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: employee.active ? '#d4edda' : '#f8d7da',
                        color: employee.active ? '#155724' : '#721c24',
                      }}>
                        {employee.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {employee.duplicateHint && (
                        <span style={{ color: '#dc3545', fontSize: '14px' }}>⚠️</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>

                          <button
                            onClick={() => handleToggleActive(employee.id, !employee.active)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: employee.active ? '#dc3545' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            {employee.active ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginierung */}
          {totalPages > 1 && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  borderRadius: 4,
                }}
              >
                Zurück
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === page ? '#007bff' : 'white',
                    color: currentPage === page ? 'white' : '#333',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  borderRadius: 4,
                }}
              >
                Weiter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dubletten-Tab */}
      {activeTab === 'duplicates' && (
        <div>
          {duplicateGroups.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>Keine Dubletten gefunden.</p>
          ) : (
            duplicateGroups.map((group, index) => (
              <div key={index} style={{ marginBottom: 24, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#f8f9fa', 
                  borderBottom: '1px solid #ddd',
                  fontWeight: 500
                }}>
                  {group.type === 'email' ? 'E-Mail-Dublette' : 'Name + Competence Center Dublette'}: {group.key}
                </div>
                
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    {group.employees.map((employee, empIndex) => (
                      <div key={employee.id} style={{ 
                        flex: 1, 
                        padding: '12px', 
                        border: '1px solid #ddd', 
                        borderRadius: 4,
                        backgroundColor: empIndex === 0 ? '#e7f3ff' : '#fff'
                      }}>
                        <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                          {employee.firstName} {employee.lastName}
                          {empIndex === 0 && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#007bff' }}>(Ziel)</span>}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          <div>E-Mail: {employee.email}</div>
                          <div>Firma: {employee.company}</div>
                          <div>Competence Center: {employee.competenceCenter}</div>
                          <div>Team: {employee.teamName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {isAdmin && (
                    <button
                      onClick={() => {
                        // Merge-Dialog öffnen
                        const sourceEmployee = group.employees[1];
                        const targetEmployee = group.employees[0];
                        // Hier würde der Merge-Dialog geöffnet werden
                        alert(`Merge von ${sourceEmployee.firstName} ${sourceEmployee.lastName} nach ${targetEmployee.firstName} ${targetEmployee.lastName}`);
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Dubletten zusammenführen
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Toast-Container */}
      <div id="toast-container" />
    </div>
  );
};

export default AdminEmployees;
