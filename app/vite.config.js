import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
// base relativa: os ficheiros vão dentro do APK (Capacitor), sem domínio
export default defineConfig({
  base: './',
  define: { __VERSAO__: JSON.stringify(pkg.version) },
  build: { outDir: 'dist', target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
