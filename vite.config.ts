import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement basées sur le mode (development, production)
  // Vercel injecte automatiquement les variables définies dans son interface
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false, // Désactivé en prod pour alléger
      chunkSizeWarningLimit: 1000, // Augmentation légère de la limite d'avertissement
    },
    // Définit process.env pour compatibilité avec le SDK Google GenAI
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // On évite d'écraser tout process.env pour ne pas casser d'autres libs
    }
  }
})