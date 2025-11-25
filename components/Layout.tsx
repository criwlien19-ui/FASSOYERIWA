import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Wallet, Package, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Layout: React.FC = () => {
  const { currentUser } = useApp();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors duration-200 ${
      isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
    }`;

  if (!currentUser) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 shadow-lg z-50 flex justify-around items-center pb-safe">
        {/* Tout le monde a accès au Dashboard */}
        <NavLink to="/" className={navClass}>
          <LayoutDashboard size={24} className="mb-1" />
          <span>Accueil</span>
        </NavLink>

        {currentUser.accessRights.includes('COMPTA') && (
          <NavLink to="/compta" className={navClass}>
            <Wallet size={24} className="mb-1" />
            <span>Caisse</span>
          </NavLink>
        )}

        {currentUser.accessRights.includes('STOCK') && (
          <NavLink to="/stock" className={navClass}>
            <Package size={24} className="mb-1" />
            <span>Stock</span>
          </NavLink>
        )}

        {currentUser.accessRights.includes('RH') && (
          <NavLink to="/rh" className={navClass}>
            <Users size={24} className="mb-1" />
            <span>Équipe</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
};

export default Layout;