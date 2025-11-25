import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Récupération de la clé API depuis la variable d'environnement spécifique demandée ou fallback utilisateur
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAKxaNqrCtkUCIsJ3OLhOHuq6SjoWPHZas';

  if (!apiKey) {
    return res.status(500).json({ 
      error: "Configuration manquante : GEMINI_API_KEY est introuvable." 
    });
  }

  try {
    // Initialisation du client avec la dernière version du SDK
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Envoi du prompt simple au modèle Flash (rapide et efficace)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Dis bonjour',
    });

    // Renvoi de la réponse textuelle
    return res.status(200).json({
      message: "Succès",
      aiResponse: response.text
    });

  } catch (error) {
    console.error("Erreur API Gemini:", error);
    return res.status(500).json({ 
      error: "Erreur lors de la communication avec l'IA.",
      details: error.message 
    });
  }
}