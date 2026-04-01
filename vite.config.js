import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages base path (repo name)
  base: '/monkey-game/',
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});
