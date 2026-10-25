/** Server-side env access. Throws naming the missing variable. Never logs or echoes values. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export interface SupabaseEnv {
  url: string;
  secretKey: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  return { url: requireEnv('VITE_SUPABASE_URL'), secretKey: requireEnv('SUPABASE_SECRET_KEY') };
}

export function getCronSecret(): string {
  return requireEnv('CRON_SECRET');
}

export interface ServerEnv extends SupabaseEnv {
  cronSecret: string;
}

export function getServerEnv(): ServerEnv {
  return { ...getSupabaseEnv(), cronSecret: getCronSecret() };
}
