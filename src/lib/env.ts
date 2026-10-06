/** Öffentliche Browser-Konfiguration. Ausschließlich Projekt-URL und Publishable Key (siehe docs/api-contract.md). */
export type PublicConfig = { supabaseUrl: string; publishableKey: string };

export type ConfigResult = { ok: true; config: PublicConfig } | { ok: false; missing: string[] };

// Nur diese zwei Namen gelangen in das Bundle (keine Weitergabe des ganzen import.meta.env).
const BUILD_ENV = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as unknown,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as unknown,
};

export function readPublicConfig(env: Record<string, unknown> = BUILD_ENV): ConfigResult {
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const key = typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string' ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim() : '';
  const missing: string[] = [];
  if (!/^https?:\/\/[^\s/]+/.test(url)) missing.push('VITE_SUPABASE_URL');
  if (!key) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (missing.length) return { ok: false, missing };
  return { ok: true, config: { supabaseUrl: url.replace(/\/+$/, ''), publishableKey: key } };
}
