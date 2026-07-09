import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: { entry: 'src/main/index.ts' },
      preload: { input: 'src/preload/index.ts' },
      renderer: {},
    }),
    renderer(),
  ],
  base: './',
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@data': path.resolve(__dirname, 'src/data'),
    },
  },
  build: {
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // electron não deve ser bundlado — disponível em runtime via nodeIntegration
      external: ['electron'],
    },
  },
  optimizeDeps: {
    // Não tentar pré-bundlar o módulo electron
    exclude: ['electron'],
  },
  test: {
    globals: false,
    environment: 'node',
  },
});
