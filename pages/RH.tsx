
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, Banknote, ShieldAlert, Users, Coins, UserX, CheckCircle, Smartphone, Wallet, History, Calendar } from 'lucide-react';
import { PaymentMethod, TransactionType } from '../types';

const RH: React.FC = () => {
  const { employees, transactions, requestAdvance, payEmployee, toggleAttendance } = useApp();
  
  // View State
  const [activeTab, setActiveTab] = useState<'team' | 'history'>('team');

  // Advance Modal State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  // Pay Salary Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payEmp, setPayEmp] = useState<{id: string, name: string, netAmount: number} | null>(null);

  const stats = {
      totalEmployees: employees.length,
      presentToday: employees.filter(e => e.isPresent).length,
      totalAdvances: employees.reduce((acc, e) => acc + e.advancesTaken, 0),
      unpaidCount: employees.filter(e => !e.isPaid).length
  };

  // Filter HR Transactions for History
  const hrTransactions = transactions.filter(t => t.relatedEmployeeId !== undefined);

  // --- Advance Logic ---
  const openAdvanceModal = (id: string) => {
      setSelectedEmpId(id);
      setAdvanceAmount('');
      setPaymentMethod(PaymentMethod.CASH);
      setShowAdvanceModal(true);
  };

  const handleAdvanceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedEmpId && advanceAmount) {
          requestAdvance(selectedEmpId, parseInt(advanceAmount), paymentMethod);
          setShowAdvanceModal(false);
      }
  };

  // --- Pay Salary Logic ---
  const openPayModal = (id: string, name: string, netAmount: number) => {
      setPayEmp({ id, name, netAmount });
      setPaymentMethod(PaymentMethod.CASH);
      setShowPayModal(true);
  };

  const handlePaySubmit = () => {
      if (payEmp) {
          payEmployee(payEmp.id, paymentMethod);
          setShowPayModal(false);
          setPayEmp(null);
      }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="pb-24">
        {/* Header Tabs */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-10 mb-4">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Gestion RH</h1>
            <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('team')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'team' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                    <Users size={16} /> Mon Équipe
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                    <History size={16} /> Historique
                </button>
            </div>
        </div>

        {activeTab === 'team' ? (
            <div className="p-4 pt-0">
                {/* RH Dashboard */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                            <Users size={16} /> PRÉSENCE
                        </div>
                        <div className="text-2xl font-bold text-slate-800">
                            {stats.presentToday} <span className="text-sm text-slate-400 font-normal">/ {stats.totalEmployees}</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-rose-500 text-xs font-bold mb-1">
                            <Coins size={16} /> AVANCES
                        </div>
                        <div className="text-2xl font-bold text-rose-600">
                            {(stats.totalAdvances/1000).toFixed(0)}k <span className="text-sm text-slate-400 font-normal">FCFA</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {employees.map(employee => {
                        const maxAdvance = employee.salary * 0.3; // Rule: Max 30% of salary
                        const canTakeAdvance = employee.advancesTaken < maxAdvance && !employee.isPaid;
                        const netToPay = employee.salary - employee.advancesTaken;

                        return (
                            <div key={employee.id} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${employee.isPaid ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}>
                                {/* Header */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="relative">
                                        <img src={employee.photoUrl} alt={employee.name} className={`w-14 h-14 rounded-xl object-cover border-2 ${employee.isPresent ? 'border-emerald-400' : 'border-slate-200 grayscale'}`} />
                                        <button 
                                            onClick={() => toggleAttendance(employee.id)}
                                            className={`absolute -bottom-2 -right-1 p-1 rounded-full border-2 border-white shadow-sm ${employee.isPresent ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}
                                        >
                                            {employee.isPresent ? <UserCheck size={12} /> : <UserX size={12} />}
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-lg text-slate-800">{employee.name}</h3>
                                            {employee.isPaid ? (
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                    <CheckCircle size={10} /> PAYÉ
                                                </span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">
                                                    EN ATTENTE
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-500 text-sm">{employee.role}</p>
                                    </div>
                                </div>

                                {/* Salary & Advances Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">Avances: <span className="font-bold text-rose-500">{employee.advancesTaken.toLocaleString()}</span></span>
                                        <span className="text-slate-400">Plafond: {maxAdvance.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all ${canTakeAdvance ? 'bg-amber-400' : 'bg-rose-400'}`} 
                                            style={{ width: `${Math.min(100, (employee.advancesTaken / maxAdvance) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Action Buttons Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Advance Button */}
                                    <button 
                                        onClick={() => openAdvanceModal(employee.id)}
                                        disabled={!canTakeAdvance}
                                        className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border ${
                                            canTakeAdvance 
                                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                                            : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                        }`}
                                    >
                                        <Banknote size={16} className={canTakeAdvance ? "text-amber-500" : ""} />
                                        Avance
                                    </button>

                                    {/* Pay Salary Button */}
                                    {employee.isPaid ? (
                                        <button disabled className="bg-emerald-100 text-emerald-700 border border-emerald-200 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 opacity-80 cursor-default">
                                            <CheckCircle size={16} /> Solde Versé
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => openPayModal(employee.id, employee.name, netToPay)}
                                            className="bg-slate-800 text-white py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-700 shadow-lg shadow-slate-200"
                                        >
                                            <Wallet size={16} /> Payer Solde
                                        </button>
                                    )}
                                </div>
                                
                                {!employee.isPaid && (
                                    <div className="mt-2 text-center">
                                        <span className="text-[10px] text-slate-400">Reste à payer : </span>
                                        <span className="text-xs font-bold text-slate-700">{netToPay.toLocaleString()} FCFA</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            <div className="p-4 pt-0">
                <div className="bg-slate-800 text-white p-5 rounded-2xl mb-6 shadow-lg">
                     <h3 className="text-slate-300 text-xs font-bold uppercase mb-1">Total Versé (Ce mois)</h3>
                     <p className="text-3xl font-bold">
                       {hrTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} <span className="text-sm font-normal text-slate-400">FCFA</span>
                     </p>
                </div>

                <div className="space-y-3">
                    {hrTransactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                             <History size={48} className="mx-auto mb-2 opacity-20" />
                             <p>Aucun historique de paiement pour le moment.</p>
                        </div>
                    ) : (
                        hrTransactions.map(t => {
                            const isAdvance = t.description.toLowerCase().includes('avance');
                            return (
                                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${isAdvance ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {isAdvance ? <Banknote size={18} /> : <CheckCircle size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{t.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Calendar size={10} />
                                                {formatDate(t.date)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">-{t.amount.toLocaleString()}</p>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.method === PaymentMethod.MOBILE_MONEY ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {t.method === PaymentMethod.MOBILE_MONEY ? 'Wave/OM' : 'Espèces'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}

        {/* MODAL AVANCE */}
        {showAdvanceModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full sm:max-w-md rounded-2xl p-6 animate-slide-up shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-600">
                        <Banknote /> Nouvelle Avance
                    </h2>
                    <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Montant (FCFA)</label>
                            <input 
                                type="number" 
                                value={advanceAmount} 
                                onChange={e => setAdvanceAmount(e.target.value)} 
                                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-2xl font-bold text-center outline-none focus:border-rose-500" 
                                placeholder="5000" 
                                autoFocus
                                required 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Moyen de paiement</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setPaymentMethod(PaymentMethod.CASH)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${paymentMethod === PaymentMethod.CASH ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200'}`}>
                                    <Banknote size={20} /> Espèces
                                </button>
                                <button type="button" onClick={() => setPaymentMethod(PaymentMethod.MOBILE_MONEY)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${paymentMethod === PaymentMethod.MOBILE_MONEY ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200'}`}>
                                    <Smartphone size={20} /> Wave/OM
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowAdvanceModal(false)} className="flex-1 p-3 text-slate-500 font-bold">Annuler</button>
                            <button type="submit" className="flex-1 bg-rose-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-rose-200">Valider</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL PAIEMENT SOLDE */}
        {showPayModal && payEmp && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full sm:max-w-md rounded-2xl p-6 animate-slide-up shadow-2xl">
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-800">
                        <Wallet /> Verser Salaire
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">Vous allez verser le solde restant à <strong>{payEmp.name}</strong>.</p>
                    
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6 text-center">
                        <span className="block text-emerald-600 text-xs font-bold uppercase mb-1">Net à Payer</span>
                        <span className="block text-4xl font-bold text-emerald-800">{payEmp.netAmount.toLocaleString()}</span>
                        <span className="block text-emerald-600 text-xs mt-1">FCFA</span>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 mb-2">Payer via</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setPaymentMethod(PaymentMethod.CASH)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${paymentMethod === PaymentMethod.CASH ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200'}`}>
                                <Banknote size={20} /> Espèces
                            </button>
                            <button onClick={() => setPaymentMethod(PaymentMethod.MOBILE_MONEY)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${paymentMethod === PaymentMethod.MOBILE_MONEY ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200'}`}>
                                <Smartphone size={20} /> Wave/OM
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowPayModal(false)} className="flex-1 p-3 text-slate-500 font-bold">Retour</button>
                        <button onClick={handlePaySubmit} className="flex-1 bg-slate-800 text-white p-3 rounded-xl font-bold shadow-lg">Confirmer</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default RH;
