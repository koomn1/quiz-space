import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

import { cloudflare } from '@cloudflare/vite-plugin';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
    base: '/quiz-space/',
    plugins: [
      react(),
      tailwindcss(),
      cloudflare(),
      viteCompression({ algorithm: 'gzip', ext: '.gz' }),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react/jsx-runtime'],
            motion: ['gsap', '@gsap/react'],
            icons: ['lucide-react'],
            charts: ['recharts'],
            pdf: ['jspdf'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: ['.monkeycode-ai.live', '.manus.computer'],
      headers: {
        'Cache-Control': 'public, max-age=604800, immutable',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
});
