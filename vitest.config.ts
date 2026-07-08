import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Exclude orphaned git worktrees under .claude/worktrees — vitest's default
    // exclude only covers node_modules/dist/etc, so a stray worktree checkout
    // duplicates every test file it contains (found running the full suite
    // during the 2026-07-07 system audit remediation).
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/worktrees/**'],
  },
});
