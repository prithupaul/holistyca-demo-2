import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Keep built asset URLs portable across domain roots and hosted subfolders.
  base: './',
});
