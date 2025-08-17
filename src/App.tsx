import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EmployeeManagement from './pages/EmployeeManagement';
import EmployeeDataUpload from './pages/EmployeeDataUpload';
import AdminEmployees from './pages/AdminEmployees';
import Login from './pages/Login';
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
        <div style={{ padding: 16 }}>
          <nav style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
            <Link to="/employees">Employee Management</Link>
            <Link to="/upload">Employee Data Upload</Link>
            <Link to="/admin/employees">Admin: Mitarbeiter</Link>
            <Link to="/login">Login</Link>
          </nav>
          <Routes>
            <Route path="/" element={<Navigate to="/employees" replace />} />
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
          </Routes>
          <Toaster position="top-right" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
