import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

// Screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import AccessDeniedScreen from './screens/AccessDeniedScreen';
import PatientsScreen from './screens/PatientsScreen';
import PatientDetailScreen from './screens/PatientDetailScreen';
import ConsultationScreen from './screens/ConsultationScreen';
import PrescriptionScreen from './screens/PrescriptionScreen';
import PrescriptionViewScreen from './screens/PrescriptionViewScreen';
import FinanceScreen from './screens/FinanceScreen';
import BookingScreen from './screens/BookingScreen';
import FollowUpScreen from './screens/FollowUpScreen';

// Components
import BottomNav from './components/BottomNav';

// Routes that show bottom nav
const PROTECTED_ROUTES = ['/dashboard', '/patients', '/finance', '/settings', '/consultation', '/prescription'];

function AppContent() {
  const { user, loading, isDoctor } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f4c81, #1a6bb5)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚕️</div>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          color: 'white',
          fontWeight: 600,
        }}>
          Pran Sanjeevani
        </p>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          marginTop: 24,
        }}/>
      </div>
    );
  }

  const isProtectedPath = PROTECTED_ROUTES.some(r => location.pathname.startsWith(r));
  const showBottomNav = user && isDoctor && isProtectedPath;

  return (
    <div className="app-container">
      <div className="screen">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            user ? <Navigate to="/dashboard" replace /> : <LoginScreen />
          } />
          <Route path="/book" element={<BookingScreen />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <DashboardScreen />
          } />
          <Route path="/patients" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <PatientsScreen />
          } />
          <Route path="/patients/:id" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <PatientDetailScreen />
          } />
          <Route path="/consultation/:id" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <ConsultationScreen />
          } />
          <Route path="/prescription/view/:id" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <PrescriptionViewScreen />
          } />
          <Route path="/prescription/new" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <PrescriptionScreen />
          } />
          <Route path="/prescription/:id" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <PrescriptionScreen />
          } />
          <Route path="/finance" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <FinanceScreen />
          } />
          <Route path="/followups" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <FollowUpScreen />
          } />
          <Route path="/settings" element={
            !user ? <Navigate to="/login" replace /> :
            !isDoctor ? <AccessDeniedScreen /> :
            <SettingsScreen />
          } />

          {/* Catch-all */}
          <Route path="*" element={
            <Navigate to={user && isDoctor ? '/dashboard' : '/login'} replace />
          } />
        </Routes>
      </div>

      {showBottomNav && <BottomNav />}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            borderRadius: 10,
            maxWidth: 340,
          },
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
