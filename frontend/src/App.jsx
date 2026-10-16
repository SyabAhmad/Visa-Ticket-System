import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Visas from './pages/Visas';
import VisaDetail from './pages/VisaDetail';
import Payments from './pages/Payments';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import Expenses from './pages/Expenses';
import ExpenseDetail from './pages/ExpenseDetail';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-page">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-secondary">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="visas" element={<Visas />} />
        <Route path="visas/:id" element={<VisaDetail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expenses/:id" element={<ExpenseDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="activity" element={<Activity />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'toast-custom',
              style: {
                fontSize: '13px',
                borderRadius: '10px',
                padding: '12px 16px',
                background: 'var(--card)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
              },
            }}
          />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
