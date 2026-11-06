import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const nodeModules = fileURLToPath(new URL('./node_modules', import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      // Os pacotes dictionary-* só exportam um módulo para Node; o corretor
      // precisa dos arquivos .aff e .dic, que este atalho entrega direto.
      { find: /^(dictionary-[a-z-]+)\/(index\.(?:aff|dic))/, replacement: `${nodeModules}/$1/$2` },
    ],
  },
  worker: { format: 'es' },
  // Porta fixa: a casca do desktop (Tauri) abre este endereço em desenvolvimento.
  server: { port: 1420, strictPort: true },
  clearScreen: false,
});
