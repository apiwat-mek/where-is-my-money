import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/@firebase/') || id.includes('/firebase/')) return 'firebase';
            if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts';
            if (id.includes('/framer-motion/') || id.includes('/motion/')) return 'motion';
            if (id.includes('/@base-ui/') || id.includes('/@floating-ui/')) return 'ui-base';
            if (id.includes('/next-themes/')) return 'theme';
            if (id.includes('/react-dropzone/')) return 'dropzone';
            if (id.includes('/lucide-react/')) return 'icons';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
            const modulePath = id.split('node_modules/')[1];
            if (!modulePath) return 'vendor';
            const segments = modulePath.split('/');
            const packageName = segments[0]?.startsWith('@')
              ? `${segments[0]}-${segments[1] ?? ''}`
              : segments[0];
            return `pkg-${packageName.replace('@', '').replace(/[^a-zA-Z0-9-_]/g, '-')}`;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
