import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@components/ProtectedRoute';
import {
  LoginPage,
  DashboardPage,
  UsersPage,
  ProvidersPage,
  VerificationsPage,
  AppointmentsPage,
  FinancialPage,
  AnalyticsPage,
  SettingsPage,
} from '@pages/index';
import './styles/index.css';

function App() {
  // Check for environment variables and show helpful error
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: '600px',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>⚠️ Configuration Error</h1>
          <p style={{ marginBottom: '1rem', color: '#374151' }}>
            <strong>Missing environment variables.</strong> Please configure the following in Cloudflare Pages:
          </p>
          <ul style={{ listStyleType: 'none', padding: 0, marginBottom: '1rem' }}>
            <li style={{ 
              padding: '0.5rem',
              backgroundColor: !import.meta.env.VITE_SUPABASE_URL ? '#fee2e2' : '#d1fae5',
              marginBottom: '0.5rem',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {!import.meta.env.VITE_SUPABASE_URL ? '❌' : '✅'} VITE_SUPABASE_URL
            </li>
            <li style={{ 
              padding: '0.5rem',
              backgroundColor: !import.meta.env.VITE_SUPABASE_ANON_KEY ? '#fee2e2' : '#d1fae5',
              marginBottom: '0.5rem',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {!import.meta.env.VITE_SUPABASE_ANON_KEY ? '❌' : '✅'} VITE_SUPABASE_ANON_KEY
            </li>
          </ul>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Go to your Cloudflare Pages project → Settings → Environment variables → Add the missing variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/providers"
          element={
            <ProtectedRoute>
              <ProvidersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verifications"
          element={
            <ProtectedRoute>
              <VerificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financial"
          element={
            <ProtectedRoute>
              <FinancialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
