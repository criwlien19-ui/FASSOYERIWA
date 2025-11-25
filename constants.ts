
import { AppState, PaymentMethod, TransactionType } from './types';

export const INITIAL_STATE: AppState = {
  cashBalance: 150000,
  mobileMoneyBalance: 325000,
  currentUser: null,
  transactions: [
    {
      id: 'tx1',
      date: new Date(Date.now() - 86400000).toISOString(),
      type: TransactionType.INCOME,
      amount: 50000,
      description: 'Vente journalière',
      method: PaymentMethod.CASH
    },
    {
      id: 'tx2',
      date: new Date(Date.now() - 120000000).toISOString(),
      type: TransactionType.EXPENSE,
      amount: 15000,
      description: 'Facture Électricité',
      method: PaymentMethod.MOBILE_MONEY
    }
  ],
  products: [
    {
      id: 'p1',
      name: 'Sac de Riz (50kg)',
      category: 'Alimentaire',
      price: 22000,
      stockLevel: 45,
      minStockLevel: 10,
      imageUrl: 'https://picsum.photos/200/200?random=1'
    },
    {
      id: 'p2',
      name: 'Bidon Huile (20L)',
      category: 'Alimentaire',
      price: 18000,
      stockLevel: 8,
      minStockLevel: 15, // Low stock alert
      imageUrl: 'https://picsum.photos/200/200?random=2'
    },
    {
      id: 'p3',
      name: 'Carton Savon',
      category: 'Hygiène',
      price: 8500,
      stockLevel: 120,
      minStockLevel: 20,
      imageUrl: 'https://picsum.photos/200/200?random=3'
    }
  ],
  stockMovements: [], // Initialisation vide
  clients: [
    {
      id: 'c1',
      name: 'Moussa Traoré',
      phone: '+225 07070701',
      totalDebt: 15000
    },
    {
      id: 'c2',
      name: 'Fatou Diop',
      phone: '+221 77000000',
      totalDebt: 0
    }
  ],
  employees: [
    {
      id: 'e1',
      name: 'Ibrahim S.',
      role: 'Gérant',
      username: 'admin',
      password: '123',
      salary: 100000,
      advancesTaken: 10000,
      isPaid: false,
      isPresent: true,
      photoUrl: 'https://picsum.photos/100/100?random=4',
      accessRights: ['COMPTA', 'STOCK', 'RH', 'ADMIN']
    },
    {
      id: 'e2',
      name: 'Amina K.',
      role: 'Caissière',
      username: 'amina',
      password: '000',
      salary: 80000,
      advancesTaken: 0,
      isPaid: true,
      isPresent: true,
      photoUrl: 'https://picsum.photos/100/100?random=5',
      accessRights: ['COMPTA']
    }
  ]
};

export const COLORS = {
  primary: 'emerald',
  danger: 'rose',
  warning: 'amber',
  neutral: 'slate'
};
