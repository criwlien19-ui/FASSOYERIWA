

export enum TransactionType {
  INCOME = 'RECETTE',
  EXPENSE = 'DEPENSE',
  DEBT_PAYMENT = 'PAIEMENT_DETTE',
  CREDIT_SALE = 'VENTE_CREDIT'
}

export enum PaymentMethod {
  CASH = 'ESPECES',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CREDIT = 'CREDIT'
}

export type ModuleAccess = 'COMPTA' | 'STOCK' | 'RH' | 'ADMIN';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stockLevel: number;
  minStockLevel: number; // For alerts
  imageUrl?: string;
}

// Nouveau : Traçabilité du stock
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  date: string;
  quantityChange: number; // +5 ou -3
  reason: string; // "Vente", "Inventaire", "Approvisionnement"
  authorName: string; // Qui a fait l'action
}

// Nouveau : Items dans une facture
export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  type: TransactionType;
  amount: number;
  description: string;
  method: PaymentMethod;
  status?: 'PAYE' | 'IMPAYE'; // Nouveau : Statut de paiement
  relatedClientId?: string; // If credit sale
  relatedEmployeeId?: string; // If salary advance
  items?: TransactionItem[]; // Nouveau : Liste des produits vendus
  isSynced?: boolean; // Indicateur de synchronisation Cloud
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  totalDebt: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  username: string; // Nouvel identifiant
  password?: string; // Nouveau mot de passe
  salary: number;
  advancesTaken: number; // Current month advances
  isPaid: boolean; // Has received full salary balance for the month
  isPresent: boolean; // Daily attendance
  photoUrl?: string;
  accessRights: ModuleAccess[];
}

export interface AppNotification {
  id: string;
  type: 'STOCK' | 'DEBT';
  title: string;
  message: string;
  severity: 'high' | 'medium';
  route: string;
}

// Global App State Interface
export interface AppState {
  cashBalance: number;
  mobileMoneyBalance: number;
  products: Product[];
  transactions: Transaction[];
  stockMovements: StockMovement[]; // Nouveau
  clients: Client[];
  employees: Employee[];
  currentUser: Employee | null; // L'utilisateur connecté
}

export interface AppContextType extends AppState {
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isOnline: boolean; // Status réseau

  addTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  validateTransaction: (id: string, method?: PaymentMethod) => void; // Mise à jour signature
  updateStock: (productId: string, quantityChange: number, reason?: string) => void;
  
  // RH Specific
  requestAdvance: (employeeId: string, amount: number, method: PaymentMethod) => void;
  payEmployee: (employeeId: string, method: PaymentMethod) => void; // Final salary payment
  toggleAttendance: (employeeId: string) => void;
  
  addClientDebt: (clientName: string, amount: number, paidAmount: number) => void;
  refreshAdvice: () => Promise<void>;
  
  // Employee Management
  addEmployee: (emp: Omit<Employee, 'id' | 'advancesTaken' | 'isPresent' | 'isPaid'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  // Product Management
  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  aiAdvice: string;
  isLoadingAI: boolean;
  
  // Notifications derived from state
  notifications: AppNotification[];
  
  // Database Helper
  seedDatabase?: () => Promise<void>;
}
