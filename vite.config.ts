import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement
  const env = loadEnv(mode, '.', '');
  
  // Utilisation de la clé fournie si pas dans l'environnement
  const apiKey = env.API_KEY || 'AIzaSyAKxaNqrCtkUCIsJ3OLhOHuq6SjoWPHZas';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    // Définit process.env pour le navigateur de manière sécurisée
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': {} // Fallback nécessaire pour certaines libs qui checkent process.env
    }
  }
})