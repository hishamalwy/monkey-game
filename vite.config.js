// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // اسم المستودع على GitHub Pages
  base: '/monkey-game/',

  // لا تحتاج لتحديد PostCSS هنا؛ Vite سيقرأ تلقائيًا postcss.config.cjs
});
