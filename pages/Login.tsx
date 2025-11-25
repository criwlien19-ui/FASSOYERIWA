import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, ShieldCheck, Mail } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  // On utilise "username" dans l'UI mais on le convertit en email fake pour Supabase
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // NETTOYAGE ROBUSTE : On enlève les espaces et on met en minuscule pour correspondre à l'enregistrement
    const cleanUsername = username.trim().replace(/\s+/g, '').toLowerCase();
    
    // Construction de l'email technique pour Supabase
    // Ex: si l'utilisateur tape "admin ", on envoie "admin@fasso-app.com"
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@fasso-app.com`;

    try {
        const success = await login(email, password);
        if (success) {
            navigate('/');
        } else {
            setError('Connexion échouée. Vérifiez vos accès.');
        }
    } catch (err) {
        setError('Erreur de connexion serveur.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 border border-slate-100 animate-slide-up">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100">
                <ShieldCheck size={40} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">FASSO-YERIWA</h1>
            <p className="text-slate-500 text-sm mt-1">Version Cloud (Supabase)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="relative">
                    <User className="absolute left-4 top-4 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Identifiant (ex: admin)"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                        required
                    />
                </div>
                <div className="relative">
                    <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mot de passe"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                        required
                    />
                </div>
            </div>

            {error && (
                <div className="text-rose-500 text-sm text-center font-medium bg-rose-50 p-2 rounded-lg">
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
                {loading ? 'CONNEXION...' : <>CONNEXION <ArrowRight size={20} /></>}
            </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">
                Note: Demandez à l'administrateur de créer votre compte.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;