import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Employee, ModuleAccess } from '../types';
import { Users, Shield, Plus, Edit2, Trash2, CheckCircle, Wallet, Package, ArrowLeft, Delete, Key, Download, Upload, Save, Camera, RefreshCw, CloudLightning } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Admin: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, currentUser, seedDatabase } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not ADMIN
  useEffect(() => {
    if (!currentUser?.accessRights.includes('ADMIN')) {
        alert("Accès refusé. Réservé aux administrateurs.");
        navigate('/');
    }
  }, [currentUser, navigate]);
  
  // CRUD State
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [salary, setSalary] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [rights, setRights] = useState<ModuleAccess[]>([]);

  // --- BACKUP LOGIC ---
  const handleExportData = () => {
      const data = localStorage.getItem('fasso_yeriwa_db');
      if (!data) return alert("Aucune donnée à exporter.");
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FASSO_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };
  
  const handleSeedData = async () => {
      if(confirm("Cela va injecter les données de démonstration (Produits, Clients) dans la base de données Cloud si elle est vide. Continuer ?")) {
          if (seedDatabase) {
              await seedDatabase();
          }
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm("ATTENTION : Cette action va REMPLACER toutes les données actuelles par celles du fichier. Êtes-vous sûr ?")) {
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = event.target?.result as string;
              // Validate minimal structure
              const parsed = JSON.parse(json);
              if (!parsed.employees || !parsed.transactions) throw new Error("Format invalide");
              
              localStorage.setItem('fasso_yeriwa_db', json);
              alert("Restauration réussie ! L'application va redémarrer.");
              window.location.reload();
          } catch (err) {
              alert("Erreur : Le fichier de sauvegarde est invalide ou corrompu.");
          }
      };
      reader.readAsText(file);
  };

  // --- PHOTO UPLOAD LOGIC ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2000000) {
            alert("L'image est trop lourde (> 2Mo).");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setPhotoUrl(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const generateRandomPhoto = () => {
      setPhotoUrl(`https://picsum.photos/200/200?random=${Date.now()}`);
  };

  // --- CRUD LOGIC ---

  const openModal = (emp?: Employee) => {
    if (emp) {
      setEditingEmp(emp);
      setName(emp.name);
      setRole(emp.role);
      setUsername(emp.username);
      setPassword(emp.password || '');
      setSalary(emp.salary.toString());
      setPhotoUrl(emp.photoUrl || `https://picsum.photos/200/200?random=${Date.now()}`);
      setRights(emp.accessRights);
    } else {
      setEditingEmp(null);
      setName('');
      setRole('');
      setUsername('');
      setPassword('');
      setSalary('');
      setPhotoUrl(`https://picsum.photos/200/200?random=${Date.now()}`);
      setRights(['COMPTA']); // Default
    }
    setShowModal(true);
  };

  const toggleRight = (module: ModuleAccess) => {
    setRights(prev => 
      prev.includes(module) 
        ? prev.filter(r => r !== module)
        : [...prev, module]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !salary || !username || !password) return;

    if (editingEmp) {
      updateEmployee(editingEmp.id, {
        name,
        role,
        username,
        password,
        salary: parseInt(salary),
        photoUrl: photoUrl,
        accessRights: rights
      });
    } else {
      addEmployee({
        name,
        role,
        username,
        password,
        salary: parseInt(salary),
        photoUrl: photoUrl,
        accessRights: rights
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
      deleteEmployee(id);
    }
  };

  // Helper for Toggle Cards
  const AccessToggle = ({ module, label, icon: Icon, colorClass }: { module: ModuleAccess, label: string, icon: any, colorClass: string }) => {
      const isActive = rights.includes(module);
      return (
        <button 
            type="button" 
            onClick={() => toggleRight(module)} 
            className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                isActive 
                ? `bg-white ${colorClass} shadow-md scale-[1.02]` 
                : 'bg-slate-50 border-slate-200 text-slate-400 grayscale'
            }`}
        >
            {isActive && <div className="absolute top-2 right-2 text-current"><CheckCircle size={16} /></div>}
            <Icon size={28} className={isActive ? "mb-1" : "mb-1 opacity-50"} />
            <span className="font-bold text-xs uppercase">{label}</span>
        </button>
      );
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="bg-slate-100 p-2 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">Administration</h1>
          </div>
      </div>

      <div className="p-4 space-y-8">
        
        {/* SECTION 1: GESTION EQUIPE */}
        <section>
            <div className="bg-slate-800 rounded-2xl p-6 text-white shadow-lg mb-6 flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold">{employees.length}</h2>
                    <p className="text-slate-400 text-sm">Comptes Employés</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="relative z-10 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform"
                >
                    <Plus size={20} /> Nouveau
                </button>
                <Users className="absolute -right-4 -bottom-4 text-slate-700 opacity-50 w-32 h-32" />
            </div>

            <div className="space-y-4">
                {employees.map(emp => (
                <div key={emp.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 relative group">
                    {emp.accessRights.includes('ADMIN') && (
                        <div className="absolute top-0 right-0 bg-slate-800 text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold flex items-center gap-1">
                            <Shield size={10} /> ADMIN
                        </div>
                    )}

                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                            <img src={emp.photoUrl} alt={emp.name} className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100 shadow-sm" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-800 leading-tight">{emp.name}</h3>
                            <p className="text-slate-500 text-sm font-medium mb-1">{emp.role}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded w-fit">
                                <Key size={10} /> ID: <strong className="text-slate-600">{emp.username}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {emp.accessRights.map(right => (
                            <span key={right} className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                right === 'COMPTA' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                right === 'STOCK' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                right === 'RH' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {right}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-50">
                        <button 
                            onClick={() => openModal(emp)}
                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Edit2 size={16} /> Modifier
                        </button>
                        {currentUser.id !== emp.id && (
                            <button 
                                onClick={() => handleDelete(emp.id)}
                                className="w-12 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
                ))}
            </div>
        </section>

        {/* SECTION 2: DONNÉES & SÉCURITÉ */}
        <section>
            <h3 className="text-slate-500 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                <Save size={14} /> Sauvegarde & Données
            </h3>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-600 mb-4">
                    Gérez vos données locales et Cloud.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <button 
                        onClick={handleExportData}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                        <Download size={24} />
                        <span className="font-bold text-sm">Sauvegarde Locale</span>
                    </button>
                    
                    <button 
                        onClick={handleImportClick}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <Upload size={24} />
                        <span className="font-bold text-sm">Restauration Locale</span>
                    </button>
                    {/* Hidden Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                </div>
                
                {/* Cloud Seed Button */}
                <button 
                    onClick={handleSeedData}
                    className="w-full py-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                >
                    <CloudLightning size={18} />
                    Initialiser Données Démo (Cloud)
                </button>
            </div>
        </section>

      </div>

      {/* Modal - Full Screen Mobile optimized */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-auto sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl animate-slide-up overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {editingEmp ? <Edit2 size={20} className="text-emerald-600"/> : <Plus size={20} className="text-emerald-600"/>}
                    {editingEmp ? 'Modifier Compte' : 'Nouveau Compte'}
                </h2>
                <button onClick={() => setShowModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-500">
                    <Delete size={20} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto no-scrollbar pb-20 sm:pb-0">
                
                {/* PHOTO UPLOAD SECTION */}
                <div className="flex flex-col items-center gap-3 mb-4">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 group">
                        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={24} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            ref={photoInputRef} 
                            hidden 
                            accept="image/*" 
                            onChange={handlePhotoUpload} 
                        />
                        <button 
                            type="button" 
                            onClick={() => photoInputRef.current?.click()}
                            className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                            <Upload size={14} /> Importer
                        </button>
                        <button 
                            type="button" 
                            onClick={generateRandomPhoto}
                            className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                            <RefreshCw size={14} /> Aléatoire
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><Key size={12}/> Identifiants Connexion</h3>
                    <div className="space-y-3">
                        <div>
                            <input 
                                value={username} 
                                onChange={e => setUsername(e.target.value.toLowerCase().trim())} 
                                className="w-full p-3 bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm font-medium placeholder:text-slate-300" 
                                required 
                                placeholder="Identifiant (ex: moussa)" 
                            />
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                Utilisez un prénom simple (ex: moussa). Evitez les espaces.
                            </p>
                        </div>
                        <div>
                            <input 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full p-3 bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-sm font-medium placeholder:text-slate-300" 
                                required 
                                placeholder="Mot de passe (6 carac. min)"
                                minLength={6}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nom Complet</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-medium" required placeholder="Ex: Moussa Diop" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Rôle</label>
                        <input value={role} onChange={e => setRole(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-medium" required placeholder="Ex: Vendeur" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Salaire (FCFA)</label>
                        <input type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-medium" required placeholder="0" />
                    </div>
                </div>

                <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-500 mb-3 uppercase flex items-center gap-2">
                        <Shield size={14} /> Permissions
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <AccessToggle 
                            module="COMPTA" 
                            label="Caisse" 
                            icon={Wallet} 
                            colorClass="border-blue-500 text-blue-700" 
                        />
                        <AccessToggle 
                            module="STOCK" 
                            label="Stock" 
                            icon={Package} 
                            colorClass="border-amber-500 text-amber-700" 
                        />
                        <AccessToggle 
                            module="RH" 
                            label="RH & Salaires" 
                            icon={Users} 
                            colorClass="border-purple-500 text-purple-700" 
                        />
                        <AccessToggle 
                            module="ADMIN" 
                            label="Admin (Patron)" 
                            icon={Shield} 
                            colorClass="border-slate-800 text-slate-800 bg-slate-100" 
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4 mt-auto">
                    <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-transform text-lg">
                        Sauvegarder
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;