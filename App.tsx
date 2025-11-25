import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Compta from './pages/Compta';
import Stock from './pages/Stock';
import RH from './pages/RH';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { ModuleAccess } from './types';

// Helper component to check authentication
const RequireAuth = () => {
  const { currentUser } = useApp();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// Helper component to check specific module permissions
const RequirePermission = ({ module }: { module: ModuleAccess }) => {
  const { currentUser } = useApp();
  
  // Si pas connecté, auth gèrera. Si pas le droit, retour accueil.
  if (!currentUser || !currentUser.accessRights.includes(module)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Layout />}>
          {/* Dashboard accessible à tous les connectés */}
          <Route index element={<Dashboard />} />
          
          {/* Routes protégées par module */}
          <Route element={<RequirePermission module="COMPTA" />}>
            <Route path="compta" element={<Compta />} />
          </Route>

          <Route element={<RequirePermission module="STOCK" />}>
            <Route path="stock" element={<Stock />} />
          </Route>

          <Route element={<RequirePermission module="RH" />}>
            <Route path="rh" element={<RH />} />
          </Route>

          <Route element={<RequirePermission module="ADMIN" />}>
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
};

export default App;