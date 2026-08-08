/**
 * Local API server for development.
 * Runs the Vercel serverless functions on port 3000 so that
 * the Vite dev server (port 5173) can proxy /api/* to them.
 *
 * Usage:  node api-server.mjs
 */
import http from 'http';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// Load env vars from .env.local
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      // Explicit CI or pre-release E2E variables must override local defaults.
      if (key && rest.length && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
    console.log('[api-server] Loaded .env.local');
  } catch {
    console.warn('[api-server] No .env.local found — using process env');
  }
}

loadEnv();

// Minimal mock of Vercel's req/res for local use
function createMockRes(res) {
  const mock = {
    _status: 200,
    _headers: {},
    status(code) { mock._status = code; return mock; },
    setHeader(name, value) { mock._headers[name] = value; },
    json(body) {
      res.writeHead(mock._status, {
        'Content-Type': 'application/json',
        ...mock._headers,
      });
      res.end(JSON.stringify(body));
      return mock;
    },
    end() {
      res.writeHead(mock._status, mock._headers);
      res.end();
    },
  };
  return mock;
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname; // e.g. /api/generate-workout

  // Only handle /api/* routes
  if (!pathname.startsWith('/api/')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Map /api/generate-workout  → ./api/generate-workout.ts (via tsx import)
  const slug = pathname.replace('/api/', '');
  const handlerPath = resolve(__dirname, `api/${slug}.ts`);

  // Read body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  await new Promise(r => req.on('end', r));

  let parsedBody = {};
  try { parsedBody = body ? JSON.parse(body) : {}; } catch { /* ignore */ }

  const mockReq = {
    method: req.method,
    body: parsedBody,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams),
  };
  const mockRes = createMockRes(res);

  try {
    // Dynamic import works because we run with tsx/node + ts support
    const mod = await import(`${handlerPath}?t=${Date.now()}`);
    const handler = mod.default;
    if (typeof handler !== 'function') throw new Error('No default export handler');
    await handler(mockReq, mockRes);
  } catch (err) {
    console.error(`[api-server] Error in ${slug}:`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message) }));
  }
});

server.listen(PORT, () => {
  console.log(`\n[api-server] ✅ API functions running at http://localhost:${PORT}`);
  console.log('[api-server] Available routes:');
  console.log('  POST /api/generate-workout');
  console.log('  POST /api/generate-amplified');
  console.log('  POST /api/parse-voice');
  console.log('  POST /api/send-notification');
  console.log('\n[api-server] Now run "npm run dev" in another terminal.\n');
});
