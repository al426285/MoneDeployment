import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    define: {
      'import.meta.env': env,
    },
    server: {
      proxy: {
        '/ors': {
          target: env.VITE_ORS_BASE_URL || 'https://api.openrouteservice.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ors/, ''),
          headers: env.VITE_ORS_API_KEY
            ? { Authorization: env.VITE_ORS_API_KEY }
            : undefined,
        },
      },
    },
  }
})
