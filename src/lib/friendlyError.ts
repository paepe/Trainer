// Supabase Auth/Postgres errors expose raw, often English-only, technical
// strings (e.g. "Invalid login credentials", `duplicate key value violates
// unique constraint "trainer_clients_pkey"`). Showing those to end users leaks
// internals and breaks i18n. This maps known patterns to translated, friendly
// copy and falls back to a safe generic message — logging the raw error for
// developer debugging either way.

type TFunction = (key: string) => string;

const PATTERNS: Array<{ test: RegExp; key: string }> = [
  { test: /invalid login credentials/i, key: 'common.errors.invalidCredentials' },
  { test: /user already registered|already been registered|email.*already.*(in use|exists|registered)/i, key: 'common.errors.userExists' },
  { test: /email not confirmed/i, key: 'common.errors.emailNotConfirmed' },
  { test: /password.*(should be|at least|too short|weak)/i, key: 'common.errors.weakPassword' },
  { test: /rate limit|too many requests/i, key: 'common.errors.rateLimited' },
  { test: /failed to fetch|network|fetch error/i, key: 'common.errors.networkError' },
  { test: /duplicate key value violates unique constraint/i, key: 'common.errors.duplicateEntry' },
];

export function friendlyError(error: unknown, tr: TFunction): string {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[friendlyError] raw:', message);

  const match = PATTERNS.find((p) => p.test.test(message));
  return tr(match ? match.key : 'common.errors.generic');
}
