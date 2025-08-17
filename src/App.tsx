import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EmployeeManagement from './pages/EmployeeManagement';
import EmployeeDataUpload from './pages/EmployeeDataUpload';
import AdminEmployees from './pages/AdminEmployees';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EinsatzplanUploadPage from './pages/EinsatzplanUploadPage';
import EinsatzplanLatest from './pages/EinsatzplanLatest';
import EinsatzplanView from './pages/EinsatzplanView';
import WorkloadUploadPage from './pages/WorkloadUploadPage';
import WorkloadView from './pages/WorkloadView';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const RequireAuth: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{ padding: 16 }}>Lade…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ padding: 16, width: '100vw', boxSizing: 'border-box' }}>
          <nav style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
            <Link to="/" style={{ color: '#1f2937', textDecoration: 'none', fontWeight: 'bold' }}>🏠 Dashboard</Link>
            <span style={{ color: '#e5e7eb' }}>|</span>
            <Link to="/einsatzplan/upload" style={{ color: '#059669', textDecoration: 'none', fontWeight: 'bold' }}>📋 Einsatzplan Upload</Link>
            <Link to="/einsatzplan/view" style={{ color: '#059669', textDecoration: 'none', fontWeight: 'bold' }}>📊 Einsatzplan</Link>
            <Link to="/einsatzplan/latest" style={{ color: '#059669', textDecoration: 'none' }}>📈 Statistiken</Link>
            <span style={{ color: '#e5e7eb' }}>|</span>
            <Link to="/workload/upload" style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 'bold' }}>📈 Auslastung Upload</Link>
            <Link to="/workload/latest" style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 'bold' }}>💼 Auslastung</Link>
            <span style={{ color: '#e5e7eb' }}>|</span>
            <Link to="/employees" style={{ color: '#2563eb', textDecoration: 'none' }}>👥 Mitarbeiter</Link>
            <Link to="/upload" style={{ color: '#2563eb', textDecoration: 'none' }}>📤 Mitarbeiter Import</Link>
            <span style={{ color: '#e5e7eb' }}>|</span>
            <Link to="/admin/employees" style={{ color: '#6b7280', textDecoration: 'none' }}>⚙️ Admin</Link>
          </nav>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route
              path="/employees"
              element={
                <RequireAuth>
                  <EmployeeManagement />
                </RequireAuth>
              }
            />
            <Route
              path="/upload"
              element={
                <RequireAuth>
                  <EmployeeDataUpload />
                </RequireAuth>
              }
            />
            <Route
              path="/upload/mitarbeiter"
              element={
                <RequireAuth>
                  <EmployeeDataUpload />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/employees"
              element={
                <RequireAuth>
                  <AdminEmployees />
                </RequireAuth>
              }
            />
            <Route
              path="/einsatzplan/upload"
              element={
                <RequireAuth>
                  <EinsatzplanUploadPage />
                </RequireAuth>
              }
            />
            <Route
              path="/einsatzplan/latest"
              element={
                <RequireAuth>
                  <EinsatzplanLatest />
                </RequireAuth>
              }
            />
            <Route
              path="/einsatzplan/view"
              element={
                <RequireAuth>
                  <EinsatzplanView />
                </RequireAuth>
              }
            />
            <Route
              path="/workload/upload"
              element={
                <RequireAuth>
                  <WorkloadUploadPage />
                </RequireAuth>
              }
            />
            <Route
              path="/workload/latest"
              element={
                <RequireAuth>
                  <WorkloadView />
                </RequireAuth>
              }
            />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
