import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import { cloudflare } from "@cloudflare/vite-plugin";
import viteCompression from 'vite-plugin-compression';

export default defineConfig(() => {
  return {
    base: '/quiz-space/',
    plugins: [
      react(), 
      tailwindcss(), 
      cloudflare(),
      // Generate Gzip files
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      // Generate Brotli files (better compression)
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react/jsx-runtime'],
            motion: ['gsap', '@gsap/react'],
            icons: ['lucide-react'],
            charts: ['recharts'],
            pdf: ['jspdf', 'html2canvas'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
    server: {
      // HMR is disabled via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during live edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: ['.monkeycode-ai.live', '.manus.computer'],
      headers: {
        // Cache public video files aggressively so the splash intro is never
        // re-downloaded after the first visit. The loading overlay reuses the
        // same file, so it benefits from the same cache entry.
        'Cache-Control': 'public, max-age=604800, immutable',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  };
});
