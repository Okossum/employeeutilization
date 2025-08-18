import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { User as UserIcon, ChevronDown, LogOut, Menu, X } from 'lucide-react';
import EmployeeManagement from './pages/EmployeeManagementNew';
import EmployeeDataUpload from './pages/EmployeeDataUpload';
import AdminEmployees from './pages/AdminEmployees';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EinsatzplanUploadPage from './pages/EinsatzplanUploadPage';
import EinsatzplanLatest from './pages/EinsatzplanLatest';
import EinsatzplanView from './pages/EinsatzplanView';
import WorkloadUploadPage from './pages/WorkloadUploadPage';
import WorkloadView from './pages/WorkloadView';
import UtilizationReportView from './pages/UtilizationReportView';
import Overview from './pages/Overview';
import CustomerManagement from './pages/CustomerManagement';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CustomerProvider } from './contexts/CustomerContext';

const RequireAuth: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  // TEMPORARY: Bypass authentication for debugging
  console.log('🔧 DEBUG: Auth bypassed!', { user, isLoading });
  return <>{children}</>;
  
  // Original auth logic (commented out for debugging)
  /*
  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-600">Lade…</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
  */
};

// Navigation component
const AppHeader: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigation = [
    { name: '🏠 Dashboard', to: '/', color: 'text-gray-900' },
    { name: '📊 Übersicht', to: '/overview', color: 'text-purple-600' },
    { name: '📋 Einsatzplan Upload', to: '/einsatzplan/upload', color: 'text-green-600' },
    { name: '📊 Einsatzplan', to: '/einsatzplan/view', color: 'text-green-600' },
    { name: '📈 Statistiken', to: '/einsatzplan/latest', color: 'text-green-600' },
    { name: '📈 Auslastung Upload', to: '/workload/upload', color: 'text-red-600' },
    { name: '💼 Auslastung', to: '/workload/latest', color: 'text-red-600' },
    { name: '📊 Auslastungsbericht', to: '/utilization/report', color: 'text-red-600' },
    { name: '👥 Mitarbeiter', to: '/employees', color: 'text-blue-600' },
    { name: '📤 Mitarbeiter Import', to: '/upload', color: 'text-blue-600' },
    { name: '🏢 Kundenverwaltung', to: '/customers', color: 'text-indigo-600' },
    { name: '⚙️ Admin', to: '/admin/employees', color: 'text-gray-600' },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Employee Utilization</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors ${item.color}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* User dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                className="flex items-center space-x-2 p-2 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => setUserMenuOpen(!isUserMenuOpen)}
              >
                <UserIcon className="h-5 w-5" />
                <span className="hidden sm:block text-sm">{user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                      Angemeldet als {user?.email}
                    </div>
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await signOut();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Abmelden
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 ${item.color}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <CustomerProvider>
                    <div>
                      <AppHeader />
                      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                        <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/overview" element={<Overview />} />
                        <Route path="/employees" element={<EmployeeManagement />} />
                        <Route path="/upload" element={<EmployeeDataUpload />} />
                        <Route path="/upload/mitarbeiter" element={<EmployeeDataUpload />} />
                        <Route path="/admin/employees" element={<AdminEmployees />} />
                        <Route path="/einsatzplan/upload" element={<EinsatzplanUploadPage />} />
                        <Route path="/einsatzplan/latest" element={<EinsatzplanLatest />} />
                        <Route path="/einsatzplan/view" element={<EinsatzplanView />} />
                        <Route path="/workload/upload" element={<WorkloadUploadPage />} />
                        <Route path="/workload/latest" element={<WorkloadView />} />
                        <Route path="/utilization/report" element={<UtilizationReportView />} />
                        <Route path="/customers" element={<CustomerManagement />} />
                        </Routes>
                      </main>
                    </div>
                  </CustomerProvider>
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
