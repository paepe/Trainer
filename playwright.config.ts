import { defineConfig } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local the same way api-server.mjs does (no dotenv dependency in
// this project) so tests and the spawned api-server share VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / etc.
try {
  const raw = readFileSync(resolve(__dirname, '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
} catch {
  // no .env.local — CI is expected to provide these via real env vars
}

// E2E/API-level tests against the local api-server.mjs (see api-server.mjs,
// npm run dev:api). These tests hit real Supabase auth with the documented
// test accounts (TEST-ACCOUNTS.md) — no mocking of the auth layer, so they
// catch regressions in api/_lib/auth.ts the same way a live smoke pass would.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node --import tsx/esm api-server.mjs',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    stdout: 'pipe',
  },
});
