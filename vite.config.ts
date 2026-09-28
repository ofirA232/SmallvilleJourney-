import { defineConfig } from 'vite';
import rtl from 'postcss-rtlcss';

export default defineConfig({
  server: { port: 5187, strictPort: true },
  // Every direction-dependent rule gets a mirrored twin under [dir="rtl"] for Hebrew; the page sets dir on <html>.
  css: { postcss: { plugins: [rtl()] } },
  build: {
    rollupOptions: { input: { game: 'index.html', modelReview: 'model-review.html' }, output: { manualChunks: { three: ['three'] } } },
  },
});
