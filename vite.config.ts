import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement (y compris celles sans préfixe VITE_)
  // Cela permet à process.env.API_KEY d'être lu depuis les réglages Vercel
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    // Définit process.env pour le navigateur
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': {} // Fallback pour éviter les crashs si d'autres vars sont accédées
    }
  }
})