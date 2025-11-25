import { GoogleGenAI } from "@google/genai";
import { AppState, TransactionType } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
    try {
        ai = new GoogleGenAI({ apiKey });
    } catch (error) {
        console.warn("Gemini API Key missing or invalid");
    }
}

// --- INTELLIGENCE ARTIFICIELLE SIMULÉE (HORS-LIGNE) ---
const generateOfflineAdvice = (state: AppState): string => {
    const lowStock = state.products.filter(p => p.stockLevel <= p.minStockLevel);
    const totalDebt = state.clients.reduce((acc, c) => acc + c.totalDebt, 0);
    const totalCash = state.cashBalance + state.mobileMoneyBalance;

    const messages = [
        "🤖 **Mode Coach Hors-Ligne** (Analyse interne)"
    ];

    if (lowStock.length > 0) {
        const names = lowStock.slice(0, 3).map(p => p.name).join(', ');
        messages.push(`📦 **RUPTURE IMMINENTE** : Attention, vous manquez de : ${names}.${lowStock.length > 3 ? '..' : ''} Recommandez vite pour ne pas perdre de ventes !`);
    }

    if (totalDebt > (totalCash * 0.4)) {
        messages.push(`💸 **ALERTE CRÉDIT** : Vos clients vous doivent ${totalDebt.toLocaleString()} FCFA. C'est dangereux pour votre trésorerie. Lancez des relances WhatsApp aujourd'hui !`);
    } else if (totalDebt > 50000) {
        messages.push(`💰 Pensez à récupérer les ${totalDebt.toLocaleString()} FCFA que vos clients vous doivent.`);
    }

    if (totalCash < 25000) {
        messages.push("⚠️ **Trésorerie critique** : Vous avez peu de liquidités. Évitez toute dépense non-indispensable cette semaine.");
    } else if (totalCash > 300000 && lowStock.length === 0) {
        messages.push("✅ **Belle santé financière !** Vous avez du cash et du stock. Pourquoi ne pas lancer une petite promo pour attirer de nouveaux clients ?");
    }

    if (messages.length === 1) {
        messages.push("👍 Tout est sous contrôle ! Vos chiffres sont bons aujourd'hui. Continuez à bien noter chaque dépense.");
    }

    return messages.join("\n\n");
};

export const getBusinessAdvice = async (state: AppState): Promise<string> => {
  if (!ai) {
      return generateOfflineAdvice(state);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const currentTx = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d >= thirtyDaysAgo && d <= now;
  });

  const previousTx = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  const calculateTotals = (txList: typeof currentTx) => {
      let income = 0;
      let expense = 0;
      const breakdown: {[key: string]: number} = {};

      txList.forEach(t => {
          if (t.type === TransactionType.INCOME || t.type === TransactionType.DEBT_PAYMENT) {
              income += t.amount;
          } else if (t.type === TransactionType.EXPENSE) {
              expense += t.amount;
              const category = t.description ? t.description.split(/[:\-]/)[0].trim() : 'Divers';
              breakdown[category] = (breakdown[category] || 0) + t.amount;
          }
      });
      return { income, expense, breakdown };
  };

  const currentStats = calculateTotals(currentTx);
  const prevStats = calculateTotals(previousTx);

  const calcVariation = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? "+100%" : "0%";
      const percent = ((curr - prev) / prev) * 100;
      return `${percent > 0 ? '+' : ''}${percent.toFixed(0)}%`;
  };

  const incomeVar = calcVariation(currentStats.income, prevStats.income);
  const expenseVar = calcVariation(currentStats.expense, prevStats.expense);

  const topExpenses = Object.entries(currentStats.breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k, v]) => {
          const percent = currentStats.expense > 0 ? Math.round((v / currentStats.expense) * 100) : 0;
          return `${k} (${v.toLocaleString()} F, ${percent}%)`;
      })
      .join(', ');

  const totalDebt = state.clients.reduce((acc, c) => acc + c.totalDebt, 0);
  const cashFlow = currentStats.income - currentStats.expense;

  const prompt = `
    Tu es "Coach Yeriwa", l'expert business personnel du commerçant.
    
    📊 ANALYSE COMPARATIVE (Ce mois vs Mois dernier) :
    - Recettes : ${currentStats.income.toLocaleString()} FCFA (Tendance: ${incomeVar})
    - Dépenses : ${currentStats.expense.toLocaleString()} FCFA (Tendance: ${expenseVar})
    - Cash Flow Net : ${cashFlow.toLocaleString()} FCFA
    
    💸 DÉPENSES CLÉS : ${topExpenses || "Rien de significatif."}
    🚨 CRÉDITS CLIENTS : ${totalDebt.toLocaleString()} FCFA
    
    TA MISSION :
    Agis comme un coach proactif.
    1. Si Recettes baissent (${incomeVar}), propose une idée commerciale.
    2. Si Dépenses explosent (${expenseVar}), alerte sur la catégorie.
    3. Si Dettes élevées, suggère recouvrement.

    TON STYLE : Tutoiement, émojis, max 3 conseils courts.
  `;

  try {
    // Timeout pour éviter que l'app freeze si Gemini est lent
    const response = await Promise.race([
        ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
    ]) as any;

    return response.text || "Analyse terminée.";
  } catch (error) {
    console.warn("Erreur API Gemini (ou Timeout), bascule vers le mode hors-ligne.");
    return generateOfflineAdvice(state);
  }
};
