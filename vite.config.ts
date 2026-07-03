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
    // Permite que o renderer use módulos Node.js (resolve require() de dependências)
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
      // Transforma módulos CJS mistos (como @react-pdf/renderer) para ESM
      transformMixedEsModules: true,
    },
  },
  test: {
    globals: false,
    environment: 'node',
  },
});
