import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/src/**/*.{test,spec}.ts', 'backend/test/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'backend/node_modules', 'dist', 'backend/dist'],
  },
});
