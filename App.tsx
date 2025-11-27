import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import { ModuleAccess } from './types';
import { Loader2 } from 'lucide-react';

// Lazy Loading des pages pour optimiser le bundle initial
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Compta = lazy(() => import('./pages/Compta'));
const Stock = lazy(() => import('./pages/Stock'));
const RH = lazy(() => import('./pages/RH'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));

// Composant de chargement pendant le lazy loading
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-emerald-600">
    <Loader2 className="animate-spin" size={48} />
  </div>
);

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
  
  if (!currentUser || !currentUser.accessRights.includes(module)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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