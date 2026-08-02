import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientDetails from './pages/ClientDetails';
import DriverDetails from './pages/DriverDetails';
import PricingSettings from './pages/PricingSettings';
import RechargeRequests from './pages/RechargeRequests';
import RouteTracker from './components/RouteTracker';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(localStorage.getItem('adminToken') !== null);
    };

    checkAuth();

    const handleAuthChange = () => checkAuth();
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  return (
    <>
      <RouteTracker />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/client/:id" element={isAuthenticated ? <ClientDetails /> : <Navigate to="/login" />} />
        <Route path="/driver/:id" element={isAuthenticated ? <DriverDetails /> : <Navigate to="/login" />} />
        <Route path="/pricing-settings" element={isAuthenticated ? <PricingSettings /> : <Navigate to="/login" />} />
        <Route path="/recharge-requests" element={isAuthenticated ? <RechargeRequests /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? (localStorage.getItem('lastRoute') || '/dashboard') : '/login'} />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
