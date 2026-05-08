import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer/',
      events: 'events/',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      process: 'process/browser',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'buffer/',
      'events/',
      'process',
      '@solana/web3.js',
      '@solana/spl-token',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-wallets',
    ],
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/recharts') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/@solana') || id.includes('node_modules/@reown') || id.includes('node_modules/@walletconnect') || id.includes('node_modules/viem')) {
            return 'vendor-web3';
          }
        },
      },
    },
  },
});