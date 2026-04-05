// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Use '/' locally for dev server, and '/monkey-game/' for production (GitHub Pages)
  base: mode === 'production' ? '/monkey-game/' : '/',

  server: {
    historyApiFallback: true,
  },
}));
