import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wallet, TrendingDown, Package, Bot, Settings, LogOut, Bell, X, ArrowRight, AlertTriangle, AlertCircle, CheckCircle, ClipboardList, Wifi, WifiOff, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { TransactionType } from '../types';

const Dashboard: React.FC = () => {
  const { cashBalance, mobileMoneyBalance, products, clients, employees, transactions, aiAdvice, refreshAdvice, isLoadingAI, currentUser, logout, notifications, isOnline } = useApp();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // --- PERIOD FILTER STATE ---
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');

  // --- PERMISSIONS ---
  const rights = currentUser?.accessRights || [];
  const isAdmin = rights.includes('ADMIN');
  const canViewFinance = isAdmin || rights.includes('COMPTA');
  const canViewStock = isAdmin || rights.includes('STOCK');
  const canViewRH = isAdmin || rights.includes('RH');

  // --- DATA CALCULATIONS ---
  const totalFunds = cashBalance + mobileMoneyBalance;
  const totalDebt = clients.reduce((acc, c) => acc + c.totalDebt, 0);
  const lowStockCount = products.filter(p => p.stockLevel < p.minStockLevel).length;
  const presentEmployees = employees.filter(e => e.isPresent).length;

  // --- FILTERED DATA LOGIC ---
  const getFilteredTransactions = () => {
      const now = new Date();
      return transactions.filter(t => {
          const tDate = new Date(t.date);
          if (period === 'day') {
              return tDate.toDateString() === now.toDateString();
          } else if (period === 'month') {
              return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
          } else if (period === 'year') {
              return tDate.getFullYear() === now.getFullYear();
          }
          return true;
      });
  };

  const filteredTx = getFilteredTransactions();
  
  // Calculate Period Totals (Paid only)
  const periodIncome = filteredTx
      .filter(t => (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT_PAYMENT) && t.status === 'PAYE')
      .reduce((acc, t) => acc + t.amount, 0);
      
  const periodExpense = filteredTx
      .filter(t => t.type === TransactionType.EXPENSE && t.status === 'PAYE')
      .reduce((acc, t) => acc + t.amount, 0);

  // Chart Data preparation (Flow vs Balance)
  const chartData = [
    { name: 'Entrées', amount: periodIncome, color: '#10b981' },
    { name: 'Sorties', amount: periodExpense, color: '#f43f5e' },
  ];

  useEffect(() => {
     if(canViewFinance && aiAdvice.includes("Cliquez")) {
         // Auto refresh if needed
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewFinance]);

  const handleNotificationClick = (route: string) => {
      setShowNotifications(false);
      navigate(route);
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in relative pb-24">
      {/* HEADER COMMIN */}
      <header className="flex justify-between items-center mb-2 z-20 relative">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              FASSO-YERIWA
              {isAdmin && (
                  isOnline ? (
                      <span title="Connecté Cloud">
                          <Wifi size={14} className="text-emerald-500" />
                      </span>
                  ) : (
                      <span title="Mode Hors-Ligne">
                          <WifiOff size={14} className="text-slate-400" />
                      </span>
                  )
              )}
          </h1>
          <p className="text-slate-500 text-sm">
            <span className="font-medium text-slate-400">Bonjour,</span> <span className="font-bold text-emerald-600">{currentUser?.name}</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-2 uppercase font-bold tracking-wider">{currentUser?.role}</span>
          </p>
        </div>
        <div className="flex gap-2">
            {/* Notification Bell */}
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
            >
                <Bell size={20} />
                {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm">
                        {notifications.length}
                    </span>
                )}
            </button>

            {currentUser?.accessRights.includes('ADMIN') && (
                <Link to="/admin" className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors">
                    <Settings size={20} />
                </Link>
            )}
            <button onClick={logout} className="h-10 w-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors">
                <LogOut size={20} />
            </button>
        </div>
      </header>

      {/* Notification Drawer */}
      {showNotifications && (
          <div className="absolute top-16 right-4 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 animate-slide-up overflow-hidden">
              <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 text-sm">Notifications ({notifications.length})</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={16} />
                  </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                          <p>Aucune alerte. Tout va bien ! 🎉</p>
                      </div>
                  ) : (
                      <div className="divide-y divide-slate-50">
                          {notifications.map(notif => (
                              <button 
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.route)}
                                className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                              >
                                  <div className={`mt-1 p-1.5 rounded-full ${notif.type === 'STOCK' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                      {notif.type === 'STOCK' ? <AlertTriangle size={14} /> : <AlertCircle size={14} />}
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-xs font-bold text-slate-700">{notif.title}</p>
                                      <p className="text-xs text-slate-500 line-clamp-2 leading-tight mt-0.5">{notif.message}</p>
                                  </div>
                                  <ArrowRight size={14} className="text-slate-300 mt-2" />
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- FINANCIAL DASHBOARD (Admin/Compta ONLY) --- */}
      {canViewFinance ? (
        <>
          {/* Main Total Card */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-emerald-100 text-sm font-medium mb-1">Total Disponible (Caisse + Mobile)</p>
              <h2 className="text-4xl font-bold">{totalFunds.toLocaleString()} FCFA</h2>
              <div className="mt-4 flex gap-4 text-sm opacity-90">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    Caisse: {(cashBalance/1000).toFixed(0)}k
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-200 rounded-full"></div>
                    Mobile: {(mobileMoneyBalance/1000).toFixed(0)}k
                </div>
              </div>
            </div>
            <Wallet className="absolute right-[-20px] bottom-[-20px] text-emerald-400 opacity-20 w-40 h-40" />
          </div>

          {/* PERIOD FILTER TABS */}
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex">
              <button 
                onClick={() => setPeriod('day')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${period === 'day' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                  Aujourd'hui
              </button>
              <button 
                onClick={() => setPeriod('month')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${period === 'month' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                  Ce Mois
              </button>
              <button 
                onClick={() => setPeriod('year')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${period === 'year' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                  Année
              </button>
          </div>

          {/* PERIOD STATS */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <ArrowDownCircle size={16} />
                      <span className="text-xs font-bold uppercase">Entrées</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-800">+{periodIncome.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600 opacity-70">
                      {period === 'day' ? "Aujourd'hui" : period === 'month' ? "Ce mois" : "Cette année"}
                  </p>
              </div>
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-2 text-rose-600 mb-1">
                      <ArrowUpCircle size={16} />
                      <span className="text-xs font-bold uppercase">Sorties</span>
                  </div>
                  <p className="text-2xl font-bold text-rose-800">-{periodExpense.toLocaleString()}</p>
                   <p className="text-[10px] text-rose-600 opacity-70">
                      {period === 'day' ? "Aujourd'hui" : period === 'month' ? "Ce mois" : "Cette année"}
                  </p>
              </div>
          </div>

          {/* Coach AI Section */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <Bot size={20} />
                    <h3>Coach Yeriwa</h3>
                </div>
                <button 
                    onClick={() => refreshAdvice()}
                    disabled={isLoadingAI}
                    className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                >
                    {isLoadingAI ? '...' : 'Actualiser'}
                </button>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed italic border-l-4 border-emerald-200 pl-3">
              "{aiAdvice}"
            </p>
          </div>

          {/* Visualization (Period) */}
          <div className="bg-white p-4 rounded-xl shadow-sm h-64 border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
                <Calendar size={14} /> Flux {period === 'day' ? 'du jour' : period === 'month' ? 'du mois' : 'annuel'}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{top: 5, right: 5, bottom: 5, left: -20}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={(value: number) => [`${value.toLocaleString()} FCFA`, '']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-rose-500">
              <div className="flex items-center gap-2 text-rose-600 mb-2">
                <TrendingDown size={20} />
                <span className="font-bold text-sm">Crédits</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{totalDebt.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Clients qui doivent</p>
            </div>

            {canViewStock && (
                <div onClick={() => navigate('/stock')} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 cursor-pointer active:scale-95 transition-transform ${lowStockCount > 0 ? 'border-amber-500' : 'border-emerald-500'}`}>
                <div className={`flex items-center gap-2 mb-2 ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    <Package size={20} />
                    <span className="font-bold text-sm">Stock</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{lowStockCount}</p>
                <p className="text-xs text-slate-400">{lowStockCount > 0 ? 'Produits en rupture' : 'Tout est OK'}</p>
                </div>
            )}
          </div>
        </>
      ) : (
        /* --- NON-FINANCIAL DASHBOARD (Operational) --- */
        <div className="space-y-4">
            <div className="bg-slate-100 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">Tableau de bord opérationnel</p>
                <p className="text-xs text-slate-400">Les données financières sont masquées.</p>
            </div>

            {/* View for STOCK Role */}
            {canViewStock && (
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 border-l-4 border-amber-500 pl-2">📦 Gestion de Stock</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => navigate('/stock')} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-transform">
                            <div className="bg-amber-100 w-10 h-10 rounded-full flex items-center justify-center text-amber-600 mb-3">
                                <AlertTriangle size={20} />
                            </div>
                            <p className="text-3xl font-bold text-slate-800">{lowStockCount}</p>
                            <p className="text-xs text-slate-500 font-bold">Alertes Rupture</p>
                        </div>
                        <div onClick={() => navigate('/stock')} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-transform">
                            <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center text-blue-600 mb-3">
                                <Package size={20} />
                            </div>
                            <p className="text-3xl font-bold text-slate-800">{products.length}</p>
                            <p className="text-xs text-slate-500 font-bold">Total Produits</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/stock')} className="w-full bg-slate-800 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg">
                        <ClipboardList size={20} />
                        Faire l'Inventaire
                    </button>
                </div>
            )}

            {/* View for RH Role */}
            {canViewRH && (
                 <div className="space-y-4 mt-6">
                    <h3 className="font-bold text-slate-700 border-l-4 border-purple-500 pl-2">👥 Gestion Équipe</h3>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center" onClick={() => navigate('/rh')}>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Présence Aujourd'hui</p>
                            <p className="text-3xl font-bold text-slate-800">{presentEmployees} <span className="text-sm font-normal text-slate-400">/ {employees.length}</span></p>
                        </div>
                        <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center text-purple-600">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;