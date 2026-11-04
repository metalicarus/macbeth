import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  // Porta fixa: a casca do desktop (Tauri) abre este endereço em desenvolvimento.
  server: { port: 1420, strictPort: true },
  clearScreen: false,
});
