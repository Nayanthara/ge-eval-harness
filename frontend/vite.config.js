import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      formats: ['es'],
      fileName: 'eval-harness-bundle'
    },
    outDir: resolve(__dirname, '../backend/static/dist'),
    emptyOutDir: true,
    sourcemap: true
  }
});
