/**
 * fix-test-auth.mjs
 * Forces GoTrue to rehash passwords and rebuild auth state for all seeded test accounts.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/fix-test-auth.mjs
 *
 * Get both values from: Supabase Dashboard → Settings → API
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL       = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD           = 'TrAIner2026!';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  // Collect all users across pages
  const allUsers = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) { console.error('listUsers error:', error.message); process.exit(1); }
    allUsers.push(...data.users);
    if (data.users.length < 100) break;
    page++;
  }

  const testUsers = allUsers.filter(u =>
    u.email?.endsWith('@trainer.test') || u.email?.endsWith('@client.test')
  );

  console.log(`Found ${testUsers.length} test accounts. Fixing via GoTrue admin API…\n`);

  let ok = 0, fail = 0;
  for (const user of testUsers) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password:      PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error(`✗ ${user.email} — ${error.message}`);
      fail++;
    } else {
      console.log(`✓ ${user.email}`);
      ok++;
    }
  }

  console.log(`\nDone. ${ok} fixed, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

run();
