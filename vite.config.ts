import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5187, strictPort: true },
  build: {
    rollupOptions: { input: { game: 'index.html', modelReview: 'model-review.html' }, output: { manualChunks: { three: ['three'] } } },
  },
});
