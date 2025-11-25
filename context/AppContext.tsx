import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppContextType, Transaction, TransactionType, PaymentMethod, Client, Employee, Product, AppNotification, StockMovement } from '../types';
import { INITIAL_STATE } from '../constants';
import { getBusinessAdvice } from '../services/geminiService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initialisation Lazy avec localStorage pour le support Offline immédiat
  const [state, setState] = useState<AppState>(() => {
      try {
          const saved = localStorage.getItem('fasso_yeriwa_db');
          return saved ? JSON.parse(saved) : INITIAL_STATE;
      } catch (e) {
          console.error("Erreur chargement sauvegarde locale", e);
          return INITIAL_STATE;
      }
  });

  const [aiAdvice, setAiAdvice] = useState<string>("Cliquez sur le Coach pour une analyse.");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 2. Persistance automatique dans localStorage à chaque changement d'état
  useEffect(() => {
      localStorage.setItem('fasso_yeriwa_db', JSON.stringify(state));
  }, [state]);

  // --- SUPABASE SYNC ---

  // 3. Récupération des données Cloud et Fusion intelligente
  useEffect(() => {
    const fetchData = async () => {
      // Si Supabase n'est pas configuré (URL par défaut), on reste en local sans erreur
      if (!isSupabaseConfigured) {
          console.log("Supabase non configuré : Mode Démo Locale actif.");
          return;
      }

      try {
          // Utilisation de Promise.allSettled pour ne pas bloquer tout le chargement si une table échoue
          const results = await Promise.allSettled([
              supabase.from('products').select('*'),
              supabase.from('clients').select('*'),
              supabase.from('employees').select('*'),
              supabase.from('transactions').select('*, items:transaction_items(*)').order('date', { ascending: false }).limit(100)
          ]);

          const productsResult = results[0];
          const clientsResult = results[1];
          const employeesResult = results[2];
          const transactionsResult = results[3];

          // Traitement sécurisé des résultats
          const products = productsResult.status === 'fulfilled' ? productsResult.value.data : null;
          const clients = clientsResult.status === 'fulfilled' ? clientsResult.value.data : null;
          const employees = employeesResult.status === 'fulfilled' ? employeesResult.value.data : null;
          const transactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value.data : null;

          if (products || clients || employees || transactions) {
             
             setState(prev => {
                 let newState = { ...prev };

                 // Mapping Products
                 if (products && products.length > 0) {
                     newState.products = products.map((p: any) => ({
                         id: p.id, name: p.name, category: p.category, price: p.price, 
                         stockLevel: p.stock_level, minStockLevel: p.min_stock_level, imageUrl: p.image_url
                     }));
                 }

                 // Mapping Clients
                 if (clients && clients.length > 0) {
                     newState.clients = clients.map((c: any) => ({
                         id: c.id, name: c.name, phone: c.phone, totalDebt: c.total_debt
                     }));
                 }

                 // Mapping Employees
                 if (employees && employees.length > 0) {
                     newState.employees = employees.map((e: any) => ({
                         id: e.id, name: e.name, role: e.role, username: e.username,
                         salary: e.salary, advancesTaken: e.advances_taken, isPaid: e.is_paid,
                         isPresent: e.is_present, photoUrl: e.photo_url, accessRights: e.access_rights || []
                     }));
                 }

                 // Mapping Transactions
                 if (transactions && transactions.length > 0) {
                     const mappedTransactions = transactions.map((t: any) => ({
                         id: t.id, date: t.date, type: t.type, amount: t.amount,
                         description: t.description, method: t.method, status: t.status || 'PAYE',
                         relatedClientId: t.related_client_id,
                         relatedEmployeeId: t.related_employee_id,
                         items: t.items?.map((i: any) => ({
                             productId: i.product_id, productName: i.product_name, quantity: i.quantity, unitPrice: i.unit_price
                         })),
                         isSynced: true // Venant du serveur, c'est synchronisé
                     }));

                     // Fusion intelligente : Garder les locales non-synchro + Cloud
                     const unsyncedTx = prev.transactions.filter(t => t.isSynced === false);
                     newState.transactions = [...unsyncedTx, ...mappedTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                 }

                 // CRITIQUE : Si la base cloud est vide, ne PAS écraser l'admin local s'il n'existe pas dans le cloud
                 // Cela permet à admin/123 de survivre au premier chargement
                 const adminExists = newState.employees.some(e => e.username === 'admin');
                 if (!adminExists) {
                     const localAdmin = INITIAL_STATE.employees.find(e => e.username === 'admin');
                     if (localAdmin) {
                         newState.employees.push(localAdmin);
                     }
                 }

                 return newState;
             });
          }
      } catch (error) {
          console.warn("Erreur générale chargement Supabase:", error);
      }
    };

    fetchData();

    // Listen to network status
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => {
        window.removeEventListener('online', () => setIsOnline(true));
        window.removeEventListener('offline', () => setIsOnline(false));
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    try {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase.from('employees').select('*').eq('auth_user_id', session.user.id).single();
                if(data) {
                    setState(prev => ({ ...prev, currentUser: {
                        id: data.id, name: data.name, role: data.role, username: data.username,
                        salary: data.salary, advancesTaken: data.advances_taken, isPaid: data.is_paid,
                        isPresent: data.is_present, photoUrl: data.photo_url, accessRights: data.access_rights
                    }}));
                }
            }
            supabase.auth.onAuthStateChange((_event, session) => {
                // Gestion changement état auth
            });
        };
        initAuth();
    } catch (e) { console.warn("Auth init error", e); }
  }, []);


  // --- LOGIC ---

  // Notifications logic
  useEffect(() => {
    const newNotifs: AppNotification[] = [];
    state.products.forEach(p => {
        if (p.stockLevel <= p.minStockLevel) {
            newNotifs.push({
                id: `stock-${p.id}`,
                type: 'STOCK',
                title: 'Stock Critique',
                message: `${p.name} est bientôt épuisé (${p.stockLevel} restants).`,
                severity: p.stockLevel === 0 ? 'high' : 'medium',
                route: '/stock'
            });
        }
    });
    state.clients.forEach(c => {
        if (c.totalDebt > 0) {
            newNotifs.push({
                id: `debt-${c.id}`,
                type: 'DEBT',
                title: 'Dette Impayée',
                message: `${c.name} doit ${c.totalDebt.toLocaleString()} FCFA.`,
                severity: 'medium',
                route: '/compta'
            });
        }
    });
    setNotifications(newNotifs);
  }, [state.products, state.clients]);

  // AUTH
  const login = async (email: string, pass: string): Promise<boolean> => {
    // Nettoyage de l'entrée utilisateur pour être robuste (ex: "admin " -> "admin")
    const cleanInput = email.trim();
    const cleanUsername = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;

    // 1. BACKDOOR DE SECOURS (Toujours active pour éviter le lockout)
    if (cleanUsername.toLowerCase() === 'admin' && pass === '123') {
         let adminUser = state.employees.find(e => e.username === 'admin');
         if (!adminUser) {
             const defaultAdmin = INITIAL_STATE.employees.find(e => e.username === 'admin');
             if (defaultAdmin) adminUser = defaultAdmin;
         }
         if (adminUser) {
             setState(prev => ({ ...prev, currentUser: adminUser! }));
             return true;
         }
    }

    // 2. Connexion Cloud
    if (isSupabaseConfigured) {
        try {
            // Reconstitution de l'email technique si l'utilisateur a juste entré son username
            const authEmail = cleanInput.includes('@') 
                ? cleanInput 
                : `${cleanInput.replace(/\s+/g, '').toLowerCase()}@fasso-app.com`;

            const { error } = await supabase.auth.signInWithPassword({
                email: authEmail,
                password: pass
            });
            if (!error) return true;
        } catch (e) {
            console.warn("Supabase Login failed, trying Local Mode", e);
        }
    }

    // 3. Connexion Locale
    const localUser = state.employees.find(
        emp => emp.username.toLowerCase() === cleanUsername.toLowerCase() && emp.password === pass
    );

    if (localUser) {
        setState(prev => ({ ...prev, currentUser: localUser }));
        return true;
    }
    
    return false;
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
        try { await supabase.auth.signOut(); } catch (e) {}
    }
    setState(prev => ({ ...prev, currentUser: null }));
  };

  // TRANSACTIONS
  const addTransaction = async (tData: Omit<Transaction, 'id' | 'date'>) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    // Par défaut, une transaction est considérée comme PAYE si non spécifié
    const status = tData.status || 'PAYE';
    
    const newTx: Transaction = {
      ...tData,
      status: status,
      id: tempId,
      date: new Date().toISOString(),
      isSynced: false
    };

    let cashChange = 0;
    let mmChange = 0;
    
    // On n'impacte la trésorerie que si c'est PAYÉ
    if (status === 'PAYE') {
        if (newTx.method === PaymentMethod.CASH) {
          cashChange = newTx.type === TransactionType.INCOME || newTx.type === TransactionType.DEBT_PAYMENT ? newTx.amount : -newTx.amount;
        } else if (newTx.method === PaymentMethod.MOBILE_MONEY) {
          mmChange = newTx.type === TransactionType.INCOME || newTx.type === TransactionType.DEBT_PAYMENT ? newTx.amount : -newTx.amount;
        }
    }

    setState(prev => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
        cashBalance: prev.cashBalance + cashChange,
        mobileMoneyBalance: prev.mobileMoneyBalance + mmChange
    }));

    if (isSupabaseConfigured) {
        try {
            const { data: savedTx, error } = await supabase.from('transactions').insert({
                type: tData.type,
                amount: tData.amount,
                description: tData.description,
                method: tData.method,
                status: status,
                related_client_id: tData.relatedClientId,
                related_employee_id: tData.relatedEmployeeId,
                date: newTx.date
            }).select().single();

            if (!error && savedTx) {
                setState(prev => ({
                    ...prev,
                    transactions: prev.transactions.map(t => t.id === tempId ? { ...t, id: savedTx.id, isSynced: true } : t)
                }));

                if (tData.items) {
                    const itemsToInsert = tData.items.map(i => ({
                        transaction_id: savedTx.id,
                        product_id: i.productId,
                        product_name: i.productName,
                        quantity: i.quantity,
                        unit_price: i.unitPrice
                    }));
                    await supabase.from('transaction_items').insert(itemsToInsert);

                    // Mise à jour du stock (On décrémente même si non payé, car le produit sort)
                    for (const item of tData.items) {
                        const { data: prod } = await supabase.from('products').select('stock_level').eq('id', item.productId).single();
                        if (prod) {
                            const newStock = prod.stock_level - item.quantity;
                            await supabase.from('products').update({ stock_level: newStock }).eq('id', item.productId);
                            await supabase.from('stock_movements').insert({
                                product_id: item.productId,
                                product_name: item.productName,
                                quantity_change: -item.quantity,
                                reason: `Vente (Facture ${status === 'IMPAYE' ? 'En attente' : ''})`,
                                author_name: state.currentUser?.name
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Transaction saved locally only");
        }
    }
  };

  const validateTransaction = async (id: string, actualMethod?: PaymentMethod) => {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx || tx.status === 'PAYE') return;

      // Use actualMethod if provided (user confirms payment mode now), else fallback to original
      const methodToUse = actualMethod || tx.method;

      let cashChange = 0;
      let mmChange = 0;
      
      // Impact logic based on type
      const isIncome = tx.type === TransactionType.INCOME || tx.type === TransactionType.DEBT_PAYMENT;
      
      if (methodToUse === PaymentMethod.CASH) {
        cashChange = isIncome ? tx.amount : -tx.amount;
      } else if (methodToUse === PaymentMethod.MOBILE_MONEY) {
        mmChange = isIncome ? tx.amount : -tx.amount;
      }

      setState(prev => ({
          ...prev,
          cashBalance: prev.cashBalance + cashChange,
          mobileMoneyBalance: prev.mobileMoneyBalance + mmChange,
          transactions: prev.transactions.map(t => t.id === id ? { ...t, status: 'PAYE', method: methodToUse, isSynced: false } : t)
      }));

      if (isSupabaseConfigured) {
          try {
              // Si la transaction n'est pas encore synchro (locale), elle sera update lors d'une prochaine synchro complète
              // Mais ici on essaie de mettre à jour directement
               await supabase.from('transactions').update({ status: 'PAYE', method: methodToUse }).eq('id', id);
          } catch(e) {}
      }
  };

  const updateStock = async (productId: string, quantityChange: number, reason: string = "Ajustement manuel") => {
    setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === productId ? { ...p, stockLevel: p.stockLevel + quantityChange } : p)
    }));

    if (isSupabaseConfigured) {
        try {
            const { data: prod } = await supabase.from('products').select('name, stock_level').eq('id', productId).single();
            if (prod) {
                await supabase.from('products').update({ stock_level: prod.stock_level + quantityChange }).eq('id', productId);
                await supabase.from('stock_movements').insert({
                    product_id: productId,
                    product_name: prod.name,
                    quantity_change: quantityChange,
                    reason: reason,
                    author_name: state.currentUser?.name
                });
            }
        } catch (e) {}
    }
  };

  const addProduct = async (prodData: Omit<Product, 'id'>) => {
    const tempId = Math.random().toString();
    setState(prev => ({ ...prev, products: [{...prodData, id: tempId}, ...prev.products] }));
    if (isSupabaseConfigured) {
        try {
            await supabase.from('products').insert({
                name: prodData.name,
                category: prodData.category,
                price: prodData.price,
                stock_level: prodData.stockLevel,
                min_stock_level: prodData.minStockLevel,
                image_url: prodData.imageUrl
            });
        } catch(e) {}
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    if (isSupabaseConfigured) {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.price) dbUpdates.price = updates.price;
            if (updates.stockLevel) dbUpdates.stock_level = updates.stockLevel;
            await supabase.from('products').update(dbUpdates).eq('id', id);
        } catch(e) {}
    }
  };

  const deleteProduct = async (id: string) => {
    setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
    if (isSupabaseConfigured) {
        try { await supabase.from('products').delete().eq('id', id); } catch(e) {}
    }
  };

  const addClientDebt = async (clientName: string, totalAmount: number, paidAmount: number) => {
      const debt = totalAmount - paidAmount;
      let clientId: string | undefined;

      const existingClient = state.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      if (existingClient) {
          clientId = existingClient.id;
          setState(prev => ({
              ...prev,
              clients: prev.clients.map(c => c.id === existingClient.id ? {...c, totalDebt: c.totalDebt + debt} : c)
          }));
      } else {
          const newC: Client = { id: Math.random().toString(), name: clientName, phone: '', totalDebt: debt };
          setState(prev => ({...prev, clients: [...prev.clients, newC]}));
      }

      if (isSupabaseConfigured) {
          try {
              const { data: existing } = await supabase.from('clients').select('id, total_debt').ilike('name', clientName).single();
              if (existing) {
                  clientId = existing.id;
                  await supabase.from('clients').update({ total_debt: existing.total_debt + debt }).eq('id', clientId);
              } else {
                  const { data: newClient } = await supabase.from('clients').insert({ name: clientName, total_debt: debt }).select().single();
                  clientId = newClient.id;
              }
          } catch (e) {}
      }

      // Si une partie est payée, on ajoute une recette
      if (paidAmount > 0) {
          await addTransaction({
              type: TransactionType.INCOME,
              amount: paidAmount,
              description: `Acompte Vente Crédit (${clientName})`,
              method: PaymentMethod.MOBILE_MONEY,
              status: 'PAYE'
          });
      }
      
      // OPTIONNEL : On pourrait aussi ajouter une transaction "IMPAYE" pour le reste pour la traçabilité
      // Mais dans le système actuel "Carnet de crédit" gère cela séparément.
  };

  // --- EMPLOYEE MANAGEMENT (ROBUSTE) ---
  const addEmployee = async (empData: Omit<Employee, 'id' | 'advancesTaken' | 'isPresent' | 'isPaid'>) => {
      // 1. Optimistic Update (Ajout local immédiat)
      const tempId = Math.random().toString();
      const newEmp: Employee = {
          ...empData,
          id: tempId,
          advancesTaken: 0,
          isPresent: false,
          isPaid: false
      };
      
      setState(prev => ({...prev, employees: [...prev.employees, newEmp]}));

      if (isSupabaseConfigured) {
        try {
            // 2. Création compte Auth (email/pass)
            
            // NETTOYAGE CRITIQUE ET INTELLIGENT
            let rawUser = empData.username.trim();
            
            // 1. Détection: Est-ce que l'utilisateur a essayé d'écrire un email ?
            // On considère que c'est un email si ça contient "@" ET un "." après le "@"
            const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawUser);
            
            let finalEmail = "";
            
            if (looksLikeEmail) {
                // On garde tel quel, on fait confiance (juste lowercase)
                finalEmail = rawUser.toLowerCase();
            } else {
                // C'est un pseudo -> On construit un email technique @fasso-app.com
                // On nettoie le pseudo pour enlever tout ce qui pourrait casser l'email (genre @ qui traine)
                
                // On garde lettres, chiffres, point, tiret, underscore
                // On enlève les accents
                let safeUser = rawUser.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .split('@')[0] // Garder que la partie gauche si un @ traine (ex: 'sader@')
                    .replace(/[^a-z0-9._-]/g, "");
                
                // Pas de points au début/fin ou multiples
                safeUser = safeUser.replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".");
                
                if (safeUser.length < 2) safeUser = `user${Math.floor(Math.random() * 10000)}`;
                
                finalEmail = `${safeUser}@fasso-app.com`;
            }
            
            // GESTION MOT DE PASSE : Supabase exige 6 caractères min.
            let safePassword = empData.password || '123456';
            if (safePassword.length < 6) {
                safePassword = safePassword.padEnd(6, '0');
            }

            const { data, error: authError } = await supabase.auth.signUp({
                email: finalEmail, 
                password: safePassword,
                options: {
                    data: { display_name: empData.name }
                }
            });
            
            if (authError) throw authError;

            // 3. Insertion Profil dans la table employees
            if (data.user) {
                const { error: dbError } = await supabase.from('employees').insert({
                    auth_user_id: data.user.id,
                    name: empData.name,
                    role: empData.role,
                    username: empData.username, // On garde l'affichage original tel que saisi
                    salary: empData.salary,
                    access_rights: empData.accessRights,
                    photo_url: empData.photoUrl
                });

                if (dbError) throw dbError;
                
                alert(`✅ Employé ${empData.name} créé avec succès !`);
            } else {
                throw new Error("Utilisateur Auth créé mais incomplet.");
            }
        } catch(e: any) {
            // 4. ROLLBACK (Annulation) si erreur
            console.error("Erreur création employé:", e);
            setState(prev => ({...prev, employees: prev.employees.filter(e => e.id !== tempId)}));
            
            // Extraction sécurisée du message d'erreur
            let errorMsg = "Erreur inconnue";
            
            if (e) {
                if (typeof e === 'string') {
                    errorMsg = e;
                } else if (typeof e === 'object') {
                    // Supabase errors often look like { message: "...", status: 400 } or { error_description: "..." }
                    // Sometimes nested { error: { message: "..." } } depending on library version/context
                    if (e.message) errorMsg = e.message;
                    else if (e.error_description) errorMsg = e.error_description;
                    else if (e.msg) errorMsg = e.msg;
                    else if (e.error && typeof e.error === 'object' && e.error.message) errorMsg = e.error.message; 
                    else {
                        try {
                            const json = JSON.stringify(e);
                            if (json !== "{}") errorMsg = json;
                        } catch { /* ignore */ }
                    }
                }
            }

            // Messages conviviaux et nettoyage de l'erreur technique (@fasso-app.com)
            if (errorMsg.includes("@fasso-app.com")) {
                 // On masque le domaine technique pour ne pas embrouiller l'utilisateur
                 errorMsg = errorMsg.replace("@fasso-app.com", "");
            }

            if (errorMsg.includes("already registered") || errorMsg.includes("unique constraint")) {
                 errorMsg = `L'identifiant "${empData.username}" est déjà pris. Essayez un autre nom.`;
            } else if (errorMsg.toLowerCase().includes("invalid") && errorMsg.toLowerCase().includes("email")) {
                 errorMsg = `Le format de l'identifiant est invalide. Utilisez des lettres simples sans caractères spéciaux.`;
            } else if (errorMsg.includes("Password should be at least")) {
                 errorMsg = "Le mot de passe doit faire 6 caractères minimum.";
            }

            alert(`⚠️ Impossible de créer l'employé.\n\nRaison: ${errorMsg}`);
        }
      }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
      setState(prev => ({...prev, employees: prev.employees.map(e => e.id === id ? {...e, ...updates} : e)}));
      if (isSupabaseConfigured) {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.salary) dbUpdates.salary = updates.salary;
            if (updates.accessRights) dbUpdates.access_rights = updates.accessRights;
            await supabase.from('employees').update(dbUpdates).eq('id', id);
        } catch(e) {}
      }
  };

  const deleteEmployee = async (id: string) => {
      setState(prev => ({...prev, employees: prev.employees.filter(e => e.id !== id)}));
      if (isSupabaseConfigured) {
        try { await supabase.from('employees').delete().eq('id', id); } catch(e) {}
      }
  };
  
  // SEED DATA (ROBUSTE)
  const seedDatabase = async () => {
      if (!isSupabaseConfigured) return;
      try {
          console.log("🚀 Injection des données de démo...");
          
          // On ne vérifie pas si vide, on tente d'insérer.
          const prods = INITIAL_STATE.products.map(p => ({
                 name: p.name, category: p.category, price: p.price,
                 stock_level: p.stockLevel, min_stock_level: p.minStockLevel, image_url: p.imageUrl
          }));
          const { error: pError } = await supabase.from('products').insert(prods);
          if (pError) throw pError;

          const cls = INITIAL_STATE.clients.map(c => ({
                 name: c.name, phone: c.phone, total_debt: c.totalDebt
          }));
          const { error: cError } = await supabase.from('clients').insert(cls);
          if (cError) throw cError;

          alert("✅ SUCCÈS : Données injectées ! L'application va redémarrer.");
          window.location.reload(); 
      } catch (e: any) {
          console.error("Erreur Seed:", e);
          let msg = e.message || JSON.stringify(e);
          
          if (msg.includes("row-level security") || e.code === "42501") {
              alert(
                `⛔️ BLOCAGE DE SÉCURITÉ (RLS)\n\n` +
                `Supabase refuse l'écriture. Vous devez désactiver la sécurité RLS pour ce prototype.\n\n` +
                `1. Allez dans Supabase > SQL Editor\n` +
                `2. Copiez et exécutez :\n` +
                `ALTER TABLE products DISABLE ROW LEVEL SECURITY;\n` +
                `ALTER TABLE clients DISABLE ROW LEVEL SECURITY;\n` +
                `(Faites pareil pour employees, transactions...)`
              );
          } else {
              alert(`⚠️ Erreur d'initialisation : ${msg}`);
          }
      }
  };

  // RH Specifics
  const toggleAttendance = async (employeeId: string) => {
      const emp = state.employees.find(e => e.id === employeeId);
      if (emp) {
          const newVal = !emp.isPresent;
          setState(prev => ({...prev, employees: prev.employees.map(e => e.id === employeeId ? {...e, isPresent: newVal} : e)}));
          if (isSupabaseConfigured) {
            try { await supabase.from('employees').update({ is_present: newVal }).eq('id', employeeId); } catch(e){}
          }
      }
  };

  const requestAdvance = async (employeeId: string, amount: number, method: PaymentMethod) => {
      const emp = state.employees.find(e => e.id === employeeId);
      if (emp) {
          const newAdvanceTotal = emp.advancesTaken + amount;
          setState(prev => ({...prev, employees: prev.employees.map(e => e.id === employeeId ? {...e, advancesTaken: newAdvanceTotal} : e)}));
          if (isSupabaseConfigured) {
            try { await supabase.from('employees').update({ advances_taken: newAdvanceTotal }).eq('id', employeeId); } catch(e){}
          }
          await addTransaction({
              type: TransactionType.EXPENSE,
              amount,
              description: `Avance: ${emp.name}`,
              method,
              relatedEmployeeId: employeeId
          });
      }
  };

  const payEmployee = async (employeeId: string, method: PaymentMethod) => {
      const emp = state.employees.find(e => e.id === employeeId);
      if (emp) {
        const net = emp.salary - emp.advancesTaken;
        setState(prev => ({...prev, employees: prev.employees.map(e => e.id === employeeId ? {...e, isPaid: true} : e)}));
        if (isSupabaseConfigured) {
            try { await supabase.from('employees').update({ is_paid: true }).eq('id', employeeId); } catch(e){}
        }
        await addTransaction({
            type: TransactionType.EXPENSE,
            amount: net,
            description: `Solde Salaire: ${emp.name}`,
            method,
            relatedEmployeeId: employeeId
        });
      }
  };

  // AI
  const refreshAdvice = useCallback(async () => {
    setIsLoadingAI(true);
    try {
        const advice = await getBusinessAdvice(state);
        setAiAdvice(advice);
    } catch (e) {
        setAiAdvice("Le coach est indisponible pour le moment.");
    }
    setIsLoadingAI(false);
  }, [state]);

  return (
    <AppContext.Provider value={{ 
        ...state, 
        isOnline,
        login,
        logout,
        addTransaction,
        validateTransaction,
        updateStock,
        addProduct,
        updateProduct,
        deleteProduct,
        requestAdvance, 
        payEmployee,
        toggleAttendance,
        addClientDebt, 
        refreshAdvice, 
        aiAdvice, 
        isLoadingAI,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        notifications,
        seedDatabase
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};