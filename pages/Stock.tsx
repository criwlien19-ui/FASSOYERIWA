
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, ScanLine, AlertTriangle, Edit2, Trash2, Package, Calculator, Check, X, ClipboardList, Coins, Image as ImageIcon, RefreshCw, ShieldAlert, Star, History, ArrowUpRight, ArrowDownLeft, Upload, Calendar } from 'lucide-react';
import { Product } from '../types';

const Stock: React.FC = () => {
  const { products, updateStock, addProduct, updateProduct, deleteProduct, currentUser, stockMovements } = useApp();
  const [filter, setFilter] = useState('');
  
  // View Mode: 'operations' (Standard +/-), 'inventory' (Full Count), or 'history' (Global Log)
  const [viewMode, setViewMode] = useState<'operations' | 'inventory' | 'history'>('operations');
  const [inventoryCounts, setInventoryCounts] = useState<{ [key: string]: string }>({});

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState<Product | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.accessRights.includes('ADMIN');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Filter for History Tab
  const filteredHistory = stockMovements
    .filter(m => 
        m.productName.toLowerCase().includes(filter.toLowerCase()) || 
        m.reason.toLowerCase().includes(filter.toLowerCase()) ||
        m.authorName.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  // Calculate Total Stock Value
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stockLevel), 0);

  const openModal = (product?: Product) => {
    if (product) {
        setEditingProduct(product);
        setName(product.name);
        setPrice(product.price.toString());
        setCategory(product.category);
        setStock(product.stockLevel.toString());
        setMinStock(product.minStockLevel.toString());
        setImageUrl(product.imageUrl || `https://picsum.photos/200/200?random=${Date.now()}`);
    } else {
        setEditingProduct(null);
        setName('');
        setPrice('');
        setCategory('Divers');
        setStock('');
        setMinStock('10');
        setImageUrl(`https://picsum.photos/200/200?random=${Date.now()}`);
    }
    setShowModal(true);
  };

  const openHistory = (product: Product) => {
      setSelectedProductHistory(product);
      setShowHistoryModal(true);
  };

  const generateRandomImage = () => {
      setImageUrl(`https://picsum.photos/200/200?random=${Date.now()}`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Check size (limit to ~2MB to avoid localStorage quota issues)
        if (file.size > 2000000) {
            alert("L'image est trop lourde (> 2Mo). Choisissez une image plus petite.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setImageUrl(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = parseInt(price) || 0;
    const stockVal = parseInt(stock) || 0;
    const minVal = parseInt(minStock) || 0;

    if (editingProduct) {
        updateProduct(editingProduct.id, {
            name,
            price: priceVal,
            category,
            stockLevel: stockVal,
            minStockLevel: minVal,
            imageUrl: imageUrl
        });
    } else {
        addProduct({
            name,
            price: priceVal,
            category,
            stockLevel: stockVal,
            minStockLevel: minVal,
            imageUrl: imageUrl
        });
    }
    setShowModal(false);
  };

  const handleDelete = () => {
      if (editingProduct && confirm("Supprimer ce produit définitivement ?")) {
          deleteProduct(editingProduct.id);
          setShowModal(false);
      }
  };

  const handleScan = () => {
      setIsScanning(true);
      setTimeout(() => {
          setIsScanning(false);
          alert("Bip ! Code barre simulé détecté.\n(Fonctionnalité caméra à venir dans la version Pro)");
      }, 1000);
  };

  // --- Inventory Logic ---
  const handleInventoryChange = (id: string, value: string) => {
      setInventoryCounts(prev => ({ ...prev, [id]: value }));
  };

  const submitInventoryAdjustment = (product: Product) => {
      const realCount = parseInt(inventoryCounts[product.id]);
      if (isNaN(realCount)) return;

      const diff = realCount - product.stockLevel;
      if (diff === 0) {
          // Just reset input
          setInventoryCounts(prev => {
              const newState = { ...prev };
              delete newState[product.id];
              return newState;
          });
          return;
      }

      if (confirm(`Confirmer l'inventaire pour ${product.name} ?\nAncien: ${product.stockLevel}\nNouveau: ${realCount}\nÉcart: ${diff > 0 ? '+' : ''}${diff}`)) {
          updateProduct(product.id, { stockLevel: realCount });
          // Clear input after update
          setInventoryCounts(prev => {
              const newState = { ...prev };
              delete newState[product.id];
              return newState;
          });
      }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });

  return (
    <div className="p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Mon Stock</h1>
            <div className="flex gap-2">
                <button 
                    onClick={handleScan}
                    className={`p-2 rounded-full transition-all ${isScanning ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}
                >
                    <ScanLine size={24} />
                </button>
                <button 
                    onClick={() => openModal()}
                    className="bg-emerald-600 p-2 rounded-full text-white shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
                >
                    <Plus size={24} />
                </button>
            </div>
        </div>

        {/* Valuation Card */}
        {viewMode !== 'history' && (
            <div className="bg-slate-800 rounded-2xl p-5 text-white mb-6 relative overflow-hidden shadow-lg">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Valeur Totale Stock</p>
                        <h2 className="text-3xl font-bold mt-1">{totalStockValue.toLocaleString()} <span className="text-sm font-normal text-slate-400">FCFA</span></h2>
                    </div>
                    <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center">
                        <Coins className="text-amber-400" />
                    </div>
                </div>
            </div>
        )}

        {/* Mode Toggle Tabs */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex mb-6 sticky top-0 z-10">
            <button 
                onClick={() => setViewMode('operations')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all uppercase ${viewMode === 'operations' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-400'}`}
            >
                <Package size={16} className="mb-0.5" /> Opérations
            </button>
            <button 
                onClick={() => setViewMode('inventory')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all uppercase ${viewMode === 'inventory' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-400'}`}
            >
                <ClipboardList size={16} className="mb-0.5" /> Inventaire
            </button>
            <button 
                onClick={() => setViewMode('history')}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all uppercase ${viewMode === 'history' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-slate-400'}`}
            >
                <History size={16} className="mb-0.5" /> Historique
            </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input 
                type="text" 
                placeholder={viewMode === 'inventory' ? "Compter un produit..." : viewMode === 'history' ? "Chercher un mouvement..." : "Rechercher un produit..."}
                className="w-full bg-white pl-10 pr-4 py-3 rounded-xl shadow-sm border border-slate-100 focus:outline-none focus:border-emerald-500"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
        </div>

        {/* === VIEW: OPERATIONS OR INVENTORY === */}
        {viewMode !== 'history' && (
            <div className="space-y-4">
                {filteredProducts.map(product => {
                    const stockPercentage = Math.min(100, Math.max(0, (product.stockLevel / Math.max(product.minStockLevel * 2, 50)) * 100));
                    const isLow = product.stockLevel <= product.minStockLevel;

                    // Inventory Calculation
                    const inputVal = inventoryCounts[product.id] ?? '';
                    const realCount = parseInt(inputVal);
                    const hasDiff = !isNaN(realCount) && realCount !== product.stockLevel;
                    const diff = isNaN(realCount) ? 0 : realCount - product.stockLevel;

                    return (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
                            {/* Header Part (Common) */}
                            <div className="flex p-3 gap-3 items-center border-b border-slate-50">
                                <div 
                                    onClick={() => openHistory(product)} 
                                    className="h-12 w-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer relative group"
                                >
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <History size={16} className="text-white" />
                                    </div>
                                </div>
                                <div className="flex-1" onClick={() => openHistory(product)}>
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{product.name}</h3>
                                    <p className="text-slate-400 text-xs">{product.category} • {product.price.toLocaleString()} F</p>
                                </div>
                                {viewMode === 'operations' && (
                                    <button 
                                        onClick={() => openModal(product)}
                                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Body Part (Mode Switched) */}
                            <div className="p-3">
                                {viewMode === 'inventory' ? (
                                    // INVENTORY MODE UI
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-center">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Théorique</span>
                                            <span className="text-xl font-bold text-slate-700">{product.stockLevel}</span>
                                        </div>
                                        
                                        <div className="flex-1 flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                            <Calculator size={16} className="text-slate-400 ml-2" />
                                            <input 
                                                type="number" 
                                                inputMode="numeric"
                                                value={inputVal}
                                                onChange={(e) => handleInventoryChange(product.id, e.target.value)}
                                                placeholder="Réel ?"
                                                className="w-full bg-transparent outline-none font-bold text-slate-800"
                                            />
                                        </div>

                                        {hasDiff ? (
                                            <button 
                                                onClick={() => submitInventoryAdjustment(product)}
                                                className={`px-3 py-2 rounded-lg font-bold text-sm text-white shadow-sm flex items-center gap-1 ${diff < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            >
                                                {diff > 0 ? '+' : ''}{diff} <Check size={14} />
                                            </button>
                                        ) : (
                                            <div className="w-16 h-8 flex items-center justify-center text-slate-300">
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // OPERATIONS MODE UI (+/-)
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>En stock: <strong className={isLow ? 'text-amber-600' : 'text-slate-800'}>{product.stockLevel}</strong></span>
                                            {isLow && <span className="text-amber-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Commander</span>}
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${stockPercentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => updateStock(product.id, -1, "Vente Rapide")} className="flex-1 bg-rose-50 text-rose-600 font-bold py-2 rounded-lg hover:bg-rose-100 active:scale-95 transition-all">-</button>
                                            <button onClick={() => updateStock(product.id, 1, "Réapprovisionnement")} className="flex-1 bg-emerald-50 text-emerald-600 font-bold py-2 rounded-lg hover:bg-emerald-100 active:scale-95 transition-all">+</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {filteredProducts.length === 0 && (
                    <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                        <Package size={48} className="mb-2 opacity-20" />
                        <p>Aucun produit trouvé.</p>
                    </div>
                )}
            </div>
        )}

        {/* === VIEW: HISTORY === */}
        {viewMode === 'history' && (
            <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                        <History size={48} className="mb-2 opacity-20" />
                        <p>Aucun mouvement enregistré.</p>
                    </div>
                ) : (
                    filteredHistory.map(move => (
                        <div key={move.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 p-2 rounded-full ${move.quantityChange > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {move.quantityChange > 0 ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{move.productName}</p>
                                    <p className="text-xs text-slate-500 font-medium mb-0.5">{move.reason}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <Calendar size={10} /> {formatDate(move.date)}
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        {move.authorName}
                                    </div>
                                </div>
                            </div>
                            <div className={`text-lg font-bold ${move.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {move.quantityChange > 0 ? '+' : ''}{move.quantityChange}
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-2xl p-6 animate-slide-up shadow-2xl no-scrollbar">
                    {/* ... (Existing Modal Content) ... */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {editingProduct ? <Edit2 size={20} className="text-emerald-600"/> : <Plus size={20} className="text-emerald-600"/>}
                            {editingProduct ? 'Modifier Produit' : 'Nouveau Produit'}
                        </h2>
                        {editingProduct && (
                            <button onClick={handleDelete} className="bg-rose-50 p-2 rounded-full text-rose-600 hover:bg-rose-100">
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSave} className="space-y-5">
                        
                        {/* Image Manager Section (Enhanced) */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
                             <div className="relative w-full h-48 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                {!isAdmin && (
                                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-[10px] text-slate-600 px-2 py-1 rounded-md shadow-sm border border-slate-200">
                                        Lecture seule
                                    </div>
                                )}
                             </div>
                             
                             {isAdmin ? (
                                <div className="w-full flex gap-2">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        hidden 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-slate-200 text-slate-700 p-2.5 rounded-xl hover:bg-slate-300 transition-colors shadow-sm"
                                        title="Importer depuis le téléphone"
                                    >
                                        <Upload size={18} />
                                    </button>
                                    <div className="relative flex-1">
                                        <ImageIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                                        <input 
                                            type="text"
                                            value={imageUrl.length > 50 ? imageUrl.substring(0, 47) + '...' : imageUrl}
                                            onChange={e => setImageUrl(e.target.value)}
                                            className="w-full pl-9 pr-2 py-2.5 text-xs bg-white rounded-xl border border-slate-200 outline-none focus:border-emerald-500 shadow-sm"
                                            placeholder="Ou coller une URL..."
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={generateRandomImage}
                                        className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl hover:bg-emerald-200 transition-colors shadow-sm"
                                        title="Image aléatoire"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                             ) : (
                                <div className="flex items-center justify-center w-full gap-2 text-xs text-slate-400 bg-white px-3 py-2 rounded-xl border border-slate-100 border-dashed">
                                    <ShieldAlert size={14} />
                                    <span>Seul le gérant peut modifier l'image</span>
                                </div>
                             )}
                        </div>

                        {/* Mandatory Fields Legend */}
                        <div className="flex justify-end">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                                <span className="text-rose-500 text-lg leading-none">*</span> Obligatoire
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                Nom du Produit <span className="text-rose-500 text-lg leading-none">*</span>
                            </label>
                            <input 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm" 
                                placeholder="Ex: Sac de Riz 50kg" 
                                required 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                                    Prix Vente <span className="text-rose-500 text-lg leading-none">*</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        inputMode="numeric"
                                        value={price} 
                                        onChange={e => setPrice(e.target.value)} 
                                        className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-bold text-emerald-700 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm" 
                                        placeholder="0" 
                                        required 
                                    />
                                    <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">FCFA</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Catégorie</label>
                                <select 
                                    value={category} 
                                    onChange={e => setCategory(e.target.value)} 
                                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm font-medium text-slate-700 appearance-none"
                                >
                                    <option value="Alimentaire">Alimentaire</option>
                                    <option value="Boissons">Boissons</option>
                                    <option value="Hygiène">Hygiène</option>
                                    <option value="Divers">Divers</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Stock Actuel</label>
                                <input 
                                    type="number" 
                                    inputMode="numeric"
                                    value={stock} 
                                    onChange={e => setStock(e.target.value)} 
                                    className="w-full p-2 bg-white rounded-lg border border-slate-200 text-center font-bold text-slate-800 outline-none focus:border-emerald-500" 
                                    placeholder="0" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-600 mb-1.5 flex items-center gap-1 justify-center">
                                    <AlertTriangle size={12} /> Seuil Alerte
                                </label>
                                <input 
                                    type="number" 
                                    inputMode="numeric" 
                                    value={minStock} 
                                    onChange={e => setMinStock(e.target.value)} 
                                    className="w-full p-2 bg-white rounded-lg border border-slate-200 text-center font-bold text-amber-600 outline-none focus:border-emerald-500" 
                                    placeholder="10" 
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Annuler</button>
                            <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-transform text-lg">
                                {editingProduct ? 'Enregistrer' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* HISTORY MODAL (Per Product) */}
        {showHistoryModal && selectedProductHistory && (
             <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full sm:max-w-md max-h-[80vh] overflow-hidden rounded-2xl animate-slide-up shadow-2xl flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0">
                         <div>
                             <h2 className="text-lg font-bold text-slate-800">{selectedProductHistory.name}</h2>
                             <p className="text-xs text-slate-500">Historique des mouvements</p>
                         </div>
                         <button onClick={() => setShowHistoryModal(false)} className="bg-white p-2 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                             <X size={18} />
                         </button>
                    </div>
                    
                    <div className="overflow-y-auto p-4 space-y-3 no-scrollbar">
                        {stockMovements.filter(m => m.productId === selectedProductHistory.id).length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <History size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Aucun mouvement enregistré.</p>
                            </div>
                        ) : (
                            stockMovements
                                .filter(m => m.productId === selectedProductHistory.id)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(move => (
                                <div key={move.id} className="bg-white border border-slate-100 rounded-lg p-3 flex justify-between items-center">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 p-1.5 rounded-full ${move.quantityChange > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {move.quantityChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{move.reason}</p>
                                            <p className="text-xs text-slate-400">{formatDate(move.date)} • Par {move.authorName}</p>
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold ${move.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {move.quantityChange > 0 ? '+' : ''}{move.quantityChange}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
             </div>
        )}
    </div>
  );
};

export default Stock;
