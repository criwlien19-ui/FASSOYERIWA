
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TransactionType, PaymentMethod, Client, Transaction, TransactionItem, Product } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Banknote, Smartphone, BookOpen, User, MessageCircle, Share2, Receipt, ShoppingCart, Plus, Minus, Trash2, Printer, FileText, Clock, CheckCircle, AlertTriangle, FileCheck, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';

const Compta: React.FC = () => {
  const { transactions, addTransaction, addClientDebt, clients, currentUser, products, validateTransaction } = useApp();
  const [activeTab, setActiveTab] = useState<'journal' | 'credit' | 'bills'>('journal');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.INCOME);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null); // For Detail Modal

  // Payment Confirmation Modal State
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [txToPay, setTxToPay] = useState<Transaction | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  // Form State
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isPending, setIsPending] = useState(false); // New: Facture en attente
  
  // Detailed Sale Mode State
  const [isDetailedSale, setIsDetailedSale] = useState(false);
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [searchProd, setSearchProd] = useState('');

  // Credit Form State
  const [clientName, setClientName] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  const cartTotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);

  // --- Bill Manager Data ---
  const unpaidTransactions = transactions.filter(t => t.status === 'IMPAYE');
  const unpaidIncomes = unpaidTransactions.filter(t => t.type === TransactionType.INCOME || t.type === TransactionType.DEBT_PAYMENT);
  const unpaidExpenses = unpaidTransactions.filter(t => t.type === TransactionType.EXPENSE);
  const totalReceivable = unpaidIncomes.reduce((acc, t) => acc + t.amount, 0);
  const totalPayable = unpaidExpenses.reduce((acc, t) => acc + t.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalAmount = parseInt(amount || '0');
    let finalDesc = desc;

    if (modalType === TransactionType.INCOME && isDetailedSale) {
        if (cart.length === 0) return alert("Le panier est vide !");
        finalAmount = cartTotal;
        finalDesc = desc || "Vente (Facture)";
    } else {
        if (finalAmount <= 0) return;
        finalDesc = desc || (modalType === TransactionType.INCOME ? 'Recette diverse' : 'Dépense diverse');
    }

    if (modalType === TransactionType.CREDIT_SALE) {
        addClientDebt(clientName, finalAmount, parseInt(paidAmount || '0'));
    } else {
        addTransaction({
          type: modalType,
          amount: finalAmount,
          description: finalDesc,
          method: method,
          status: isPending ? 'IMPAYE' : 'PAYE',
          items: (modalType === TransactionType.INCOME && isDetailedSale) ? cart : undefined
        });
    }

    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount('');
    setDesc('');
    setMethod(PaymentMethod.CASH);
    setClientName('');
    setPaidAmount('');
    setIsDetailedSale(false);
    setIsPending(false);
    setCart([]);
    setSearchProd('');
  };

  const openModal = (type: TransactionType) => {
    setModalType(type);
    setShowModal(true);
  };

  // Triggered when clicking "Valider" on a specific transaction
  const initiatePayment = (tx: Transaction, e: React.MouseEvent) => {
      e?.stopPropagation?.();
      setTxToPay(tx);
      setPayMethod(tx.method); // Default to original method
      setShowPaymentConfirm(true);
  };

  const confirmPayment = () => {
      if (txToPay) {
          validateTransaction(txToPay.id, payMethod);
          setShowPaymentConfirm(false);
          setTxToPay(null);
          // If detailed view was open, close it
          if (selectedTx?.id === txToPay.id) {
              setSelectedTx(null);
          }
      }
  };

  // Cart Management
  const addToCart = (product: Product) => {
      setCart(prev => {
          const existing = prev.find(item => item.productId === product.id);
          if (existing) {
              return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
          }
          return [...prev, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price }];
      });
  };

  const updateCartQty = (prodId: string, change: number) => {
      setCart(prev => prev.map(item => {
          if (item.productId === prodId) {
              const newQty = Math.max(1, item.quantity + change);
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const removeFromCart = (prodId: string) => {
      setCart(prev => prev.filter(item => item.productId !== prodId));
  };

  // Helper to format currency safely for PDF (avoids weird unicode spaces that jsPDF might render as slash)
  const formatCurrency = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  // Helper for WhatsApp Share
  const shareOnWhatsApp = (tx: Transaction) => {
    const isCredit = tx.status === 'IMPAYE';
    const dateStr = new Date(tx.date).toLocaleDateString('fr-FR');
    const itemsList = tx.items 
        ? tx.items.map(i => `- ${i.quantity}x ${i.productName} (${formatCurrency(i.quantity * i.unitPrice)} F)`).join('\n')
        : '';

    const text = `
🧾 *FASSO-YERIWA - ${isCredit ? 'FACTURE' : 'REÇU'}*
-------------------------
📅 Date: ${dateStr}
📝 Motif: ${tx.description}
${itemsList ? `\n🛒 *Détail:*\n${itemsList}\n` : ''}
💰 *MONTANT: ${formatCurrency(tx.amount)} FCFA*
-------------------------
${isCredit ? '⚠️ Statut: EN ATTENTE' : '✅ Statut: PAYÉ'}
📍 Khothiary, Sénégal
📞 78 293 14 68
    `.trim();

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const generateInvoice = (tx: Transaction) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const themeColor = [16, 185, 129]; // Emerald-500

      // 1. Header Background
      doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // 2. Company Name (White)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("FASSO-YERIWA", 15, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("Solutions de Gestion Simplifiée", 15, 28);

      // 3. Invoice Title (Right aligned in header)
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const title = tx.status === 'IMPAYE' ? "FACTURE PROFORMA" : "REÇU DE PAIEMENT";
      doc.text(title, pageWidth - 15, 20, { align: 'right' });
      doc.setFontSize(10);
      doc.text(`N° ${tx.id.toUpperCase().substring(0, 8)}`, pageWidth - 15, 28, { align: 'right' });

      // Reset Text Color
      doc.setTextColor(50, 50, 50);

      // 4. Company Details (Left)
      let yPos = 55;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("ÉMETTEUR:", 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text("FASSO-YERIWA Inc.", 15, yPos + 5);
      doc.text("Khothiary, Sénégal", 15, yPos + 10);
      doc.text("Tél: 78 293 14 68", 15, yPos + 15);

      // 5. Client Details (Right)
      doc.setFont('helvetica', 'bold');
      doc.text("CLIENT:", pageWidth / 2 + 10, yPos);
      doc.setFont('helvetica', 'normal');
      
      const client = clients.find(c => c.id === tx.relatedClientId);
      const clientName = client ? client.name : (tx.description.split(':')[1] || "Client Divers");
      
      doc.text(clientName.trim(), pageWidth / 2 + 10, yPos + 5);
      if (client?.phone) doc.text(`Tél: ${client.phone}`, pageWidth / 2 + 10, yPos + 10);
      doc.text(`Date: ${new Date(tx.date).toLocaleDateString('fr-FR')}`, pageWidth / 2 + 10, yPos + 15);

      // 6. Items Table
      yPos += 30;
      
      // Table Header
      doc.setFillColor(245, 247, 250); // Slate-50
      doc.rect(15, yPos, pageWidth - 30, 10, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 113, 128); // Slate-500
      doc.text("DÉSIGNATION", 20, yPos + 7);
      doc.text("QTÉ", 110, yPos + 7, { align: 'center' });
      doc.text("P.U.", 140, yPos + 7, { align: 'right' });
      doc.text("TOTAL", 185, yPos + 7, { align: 'right' });

      // Table Rows
      yPos += 15;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      let totalAmount = tx.amount;
      
      if (tx.items && tx.items.length > 0) {
          tx.items.forEach(item => {
              const itemTotal = item.quantity * item.unitPrice;
              doc.text(item.productName, 20, yPos);
              doc.text(item.quantity.toString(), 110, yPos, { align: 'center' });
              doc.text(formatCurrency(item.unitPrice), 140, yPos, { align: 'right' });
              doc.text(formatCurrency(itemTotal), 185, yPos, { align: 'right' });
              yPos += 8;
          });
      } else {
          // Fallback if no items (just simple transaction)
          doc.text(tx.description, 20, yPos);
          doc.text("1", 110, yPos, { align: 'center' });
          doc.text(formatCurrency(tx.amount), 140, yPos, { align: 'right' });
          doc.text(formatCurrency(tx.amount), 185, yPos, { align: 'right' });
          yPos += 8;
      }

      // 7. Footer Totals
      yPos += 5;
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("NET À PAYER", 130, yPos);
      doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
      doc.text(`${formatCurrency(totalAmount)} FCFA`, 185, yPos, { align: 'right' });
      
      // 8. Legal Text
      yPos += 20;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Arrêté la présente facture à la somme de ${formatCurrency(totalAmount)} FCFA.`, 15, yPos);
      
      // Status Badge in Footer
      if (tx.status === 'PAYE') {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(16, 185, 129); // Green
          doc.text("PAYÉ / ACQUITTÉ", 15, yPos + 10);
      } else {
          doc.setTextColor(225, 29, 72); // Rose-600
          doc.text("EN ATTENTE DE PAIEMENT", 15, yPos + 10);
      }

      // Signature Box
      doc.setTextColor(50, 50, 50);
      doc.text("Signature & Cachet", pageWidth - 50, yPos + 20);

      doc.save(`FASSO_${tx.status === 'IMPAYE' ? 'PROFORMA' : 'RECU'}_${tx.id.substring(0,6)}.pdf`);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProd.toLowerCase()));

  return (
    <div className="pb-24">
        {/* Header Tabs */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-10 mb-4">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Caisse & Journal</h1>
            <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('journal')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'journal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                    <BookOpen size={16} /> Journal
                </button>
                <button 
                    onClick={() => setActiveTab('credit')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'credit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                    <User size={16} /> Carnet Crédit
                </button>
                <button 
                    onClick={() => setActiveTab('bills')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 relative ${activeTab === 'bills' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                    <FileText size={16} /> Factures
                    {unpaidTransactions.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                            {unpaidTransactions.length}
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-0">
            {activeTab === 'journal' && (
                <>
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button 
                            onClick={() => openModal(TransactionType.INCOME)}
                            className="bg-emerald-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
                        >
                            <ArrowDownCircle size={24} />
                            <span className="font-bold">Entrée (Vente)</span>
                        </button>
                        <button 
                            onClick={() => openModal(TransactionType.EXPENSE)}
                            className="bg-rose-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 active:scale-95 transition-transform"
                        >
                            <ArrowUpCircle size={24} />
                            <span className="font-bold">Sortie (Dépense)</span>
                        </button>
                    </div>

                    {/* Transactions List */}
                    <div className="space-y-3">
                        {transactions.map(t => (
                            <div key={t.id} onClick={() => setSelectedTx(selectedTx?.id === t.id ? null : t)} className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer transition-all ${selectedTx?.id === t.id ? 'ring-2 ring-emerald-500' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 p-2 rounded-full ${
                                            t.type === TransactionType.INCOME || t.type === TransactionType.DEBT_PAYMENT 
                                                ? 'bg-emerald-100 text-emerald-600' 
                                                : 'bg-rose-100 text-rose-600'
                                        }`}>
                                            {t.type === TransactionType.INCOME || t.type === TransactionType.DEBT_PAYMENT ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-800">{t.description}</p>
                                                {t.status === 'IMPAYE' && (
                                                    <span className="bg-amber-100 text-amber-600 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                        <Clock size={10} /> En attente
                                                    </span>
                                                )}
                                                {t.items && t.items.length > 0 && (
                                                    <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                        <ShoppingCart size={10} /> {t.items.length}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(t.date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })} 
                                                • {t.method === PaymentMethod.MOBILE_MONEY ? 'Mobile Money' : 'Espèces'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-lg ${
                                            t.type === TransactionType.INCOME || t.type === TransactionType.DEBT_PAYMENT 
                                                ? 'text-emerald-600' 
                                                : 'text-rose-600'
                                        }`}>
                                            {t.type === TransactionType.INCOME || t.type === TransactionType.DEBT_PAYMENT ? '+' : '-'}{t.amount.toLocaleString()}
                                        </p>
                                        <span className="text-[10px] text-slate-400">FCFA</span>
                                    </div>
                                </div>
                                
                                {/* Expanded Details */}
                                {selectedTx?.id === t.id && (
                                    <div className="mt-4 pt-4 border-t border-slate-50 animate-fade-in">
                                        {t.items && (
                                            <div className="mb-3 bg-slate-50 p-3 rounded-lg">
                                                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Détail Panier</p>
                                                {t.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm text-slate-700 mb-1">
                                                        <span>{item.quantity}x {item.productName}</span>
                                                        <span>{(item.quantity * item.unitPrice).toLocaleString()} F</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="flex gap-2">
                                            {t.status === 'IMPAYE' ? (
                                                <button 
                                                    onClick={(e) => initiatePayment(t, e)}
                                                    className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={16} /> Encaisser
                                                </button>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); generateInvoice(t); }}
                                                        className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200"
                                                    >
                                                        <Printer size={16} /> PDF
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); shareOnWhatsApp(t); }}
                                                        className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100"
                                                    >
                                                        <MessageCircle size={16} /> WhatsApp
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'credit' && (
                <div>
                    <button 
                        onClick={() => openModal(TransactionType.CREDIT_SALE)}
                        className="w-full bg-slate-800 text-white p-4 rounded-xl flex items-center justify-center gap-2 mb-6 shadow-lg active:scale-95 transition-transform"
                    >
                        <Plus size={20} />
                        <span className="font-bold">Nouveau Crédit Client</span>
                    </button>

                    <div className="space-y-3">
                        {clients.filter(c => c.totalDebt > 0).map(client => (
                            <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-rose-500 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800">{client.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <a href={`tel:${client.phone}`} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 hover:bg-slate-200 flex items-center gap-1">
                                            <Smartphone size={12} /> {client.phone || 'Non renseigné'}
                                        </a>
                                        <a href={`https://wa.me/${client.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 flex items-center gap-1">
                                            <MessageCircle size={12} /> WhatsApp
                                        </a>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">Doit</p>
                                    <p className="text-xl font-bold text-rose-600">{client.totalDebt.toLocaleString()} F</p>
                                </div>
                            </div>
                        ))}
                        {clients.filter(c => c.totalDebt > 0).length === 0 && (
                            <div className="text-center py-10 text-slate-400">
                                <User size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Aucun client débiteur. Bravo !</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'bills' && (
                 <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                         <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                             <p className="text-xs text-emerald-600 font-bold uppercase mb-1">À Recevoir</p>
                             <p className="text-2xl font-bold text-emerald-800">{totalReceivable.toLocaleString()} <span className="text-sm">F</span></p>
                         </div>
                         <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                             <p className="text-xs text-rose-600 font-bold uppercase mb-1">À Payer</p>
                             <p className="text-2xl font-bold text-rose-800">{totalPayable.toLocaleString()} <span className="text-sm">F</span></p>
                         </div>
                     </div>

                     <div className="space-y-3">
                         <h3 className="text-sm font-bold text-slate-500 uppercase">Factures en attente</h3>
                         {unpaidTransactions.length === 0 ? (
                             <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                 <FileCheck size={32} className="mx-auto mb-2 opacity-30" />
                                 <p>Tout est à jour !</p>
                             </div>
                         ) : (
                             unpaidTransactions.map(t => (
                                 <div key={t.id} onClick={(e) => initiatePayment(t, e)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-emerald-300 transition-colors">
                                     <div className="flex items-center gap-3">
                                         <div className="bg-amber-100 text-amber-600 p-2 rounded-full">
                                             <Clock size={20} />
                                         </div>
                                         <div>
                                             <p className="font-bold text-slate-800">{t.description}</p>
                                             <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</p>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="font-bold text-slate-800">{t.amount.toLocaleString()} F</p>
                                         <span className="text-[10px] text-amber-600 font-bold uppercase">Impayé</span>
                                     </div>
                                 </div>
                             ))
                         )}
                     </div>
                 </div>
            )}
        </div>

        {/* --- MODALS --- */}

        {/* MAIN TRANSACTION MODAL */}
        {showModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-auto rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up shadow-2xl flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {modalType === TransactionType.INCOME ? <ArrowDownCircle className="text-emerald-500" /> : 
                             modalType === TransactionType.EXPENSE ? <ArrowUpCircle className="text-rose-500" /> : 
                             <User className="text-slate-800" />}
                            
                            {modalType === TransactionType.INCOME ? 'Nouvelle Recette' : 
                             modalType === TransactionType.EXPENSE ? 'Nouvelle Dépense' : 'Nouveau Crédit'}
                        </h2>
                        <button onClick={() => {setShowModal(false); resetForm();}} className="bg-slate-100 p-2 rounded-full text-slate-500">
                            <ArrowDownCircle className="rotate-180" size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 flex-1 overflow-y-auto no-scrollbar pb-20 sm:pb-0">
                        
                        {/* SWITCH MODE VENTE */}
                        {modalType === TransactionType.INCOME && (
                             <div className="bg-slate-100 p-1 rounded-lg flex mb-4">
                                 <button type="button" onClick={() => setIsDetailedSale(false)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${!isDetailedSale ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>
                                     Montant Simple
                                 </button>
                                 <button type="button" onClick={() => setIsDetailedSale(true)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${isDetailedSale ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>
                                     Vente Détaillée (Panier)
                                 </button>
                             </div>
                        )}

                        {modalType === TransactionType.CREDIT_SALE ? (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nom du Client</label>
                                    <input 
                                        type="text" 
                                        list="client-list"
                                        value={clientName} 
                                        onChange={e => setClientName(e.target.value)} 
                                        className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800 outline-none focus:border-emerald-500" 
                                        placeholder="Rechercher ou saisir..." 
                                        required 
                                    />
                                    <datalist id="client-list">
                                        {clients.map(c => <option key={c.id} value={c.name} />)}
                                    </datalist>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Montant Total</label>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-xl font-bold outline-none" placeholder="0" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-600 mb-1">Acompte Versé</label>
                                        <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xl font-bold text-emerald-700 outline-none" placeholder="0" />
                                    </div>
                                </div>
                            </>
                        ) : isDetailedSale ? (
                            /* --- MODE PANIER --- */
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Chercher un produit..." 
                                        value={searchProd}
                                        onChange={(e) => setSearchProd(e.target.value)}
                                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Results */}
                                {searchProd && (
                                    <div className="max-h-32 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-sm">
                                        {filteredProducts.map(p => (
                                            <div key={p.id} onClick={() => {addToCart(p); setSearchProd('');}} className="p-3 border-b border-slate-50 hover:bg-emerald-50 flex justify-between cursor-pointer">
                                                <span className="font-bold text-sm">{p.name}</span>
                                                <span className="text-emerald-600 text-sm">{p.price} F</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Cart Items */}
                                <div className="bg-slate-50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                                    {cart.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Panier vide</p>}
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-slate-800">{item.productName}</p>
                                                <p className="text-[10px] text-slate-400">{item.unitPrice} F/u</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => updateCartQty(item.productId, -1)} className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-600">-</button>
                                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                <button type="button" onClick={() => updateCartQty(item.productId, 1)} className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-600">+</button>
                                                <button type="button" onClick={() => removeFromCart(item.productId)} className="text-rose-400 ml-2"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center border-t pt-2">
                                    <span className="font-bold text-slate-500">Total Panier</span>
                                    <span className="text-xl font-bold text-emerald-600">{cartTotal.toLocaleString()} F</span>
                                </div>
                            </div>
                        ) : (
                            /* --- MODE SIMPLE --- */
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Montant (FCFA)</label>
                                    <input 
                                        type="number" 
                                        inputMode="numeric"
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)} 
                                        className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-3xl font-bold text-center outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" 
                                        placeholder="0" 
                                        required 
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Motif / Description</label>
                                    <input 
                                        type="text" 
                                        value={desc} 
                                        onChange={e => setDesc(e.target.value)} 
                                        className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500" 
                                        placeholder={modalType === TransactionType.INCOME ? "Ex: Vente Riz" : "Ex: Transport"} 
                                    />
                                </div>
                            </>
                        )}
                        
                        {/* COMMON: PAYMENT METHOD */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Mode de Paiement</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setMethod(PaymentMethod.CASH)} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${method === PaymentMethod.CASH ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold ring-1 ring-emerald-500' : 'border-slate-200 text-slate-500'}`}>
                                    <Banknote size={24} />
                                    <span className="text-xs">Espèces</span>
                                </button>
                                <button type="button" onClick={() => setMethod(PaymentMethod.MOBILE_MONEY)} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${method === PaymentMethod.MOBILE_MONEY ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-slate-200 text-slate-500'}`}>
                                    <Smartphone size={24} />
                                    <span className="text-xs">Wave / OM</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* TOGGLE PENDING */}
                        {modalType !== TransactionType.CREDIT_SALE && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div onClick={() => setIsPending(!isPending)} className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPending ? 'bg-amber-400' : 'bg-slate-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPending ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-xs font-bold text-slate-600">Marquer comme impayé (Facture)</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="submit" className={`w-full text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform text-lg flex items-center justify-center gap-2 ${modalType === TransactionType.EXPENSE ? 'bg-rose-500 shadow-rose-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
                                <CheckCircle /> Valider
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* PAYMENT CONFIRMATION MODAL */}
        {showPaymentConfirm && txToPay && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-in">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmer le paiement</h3>
                    <p className="text-slate-500 text-sm mb-4">
                        Vous allez encaisser <strong>{txToPay.amount.toLocaleString()} FCFA</strong> pour "{txToPay.description}".
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button onClick={() => setPayMethod(PaymentMethod.CASH)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold ${payMethod === PaymentMethod.CASH ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                            <Banknote size={18} /> Espèces
                        </button>
                        <button onClick={() => setPayMethod(PaymentMethod.MOBILE_MONEY)} className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold ${payMethod === PaymentMethod.MOBILE_MONEY ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                            <Smartphone size={18} /> Wave
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowPaymentConfirm(false)} className="flex-1 py-3 text-slate-500 font-bold">Annuler</button>
                        <button onClick={confirmPayment} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg">Confirmer</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Compta;
