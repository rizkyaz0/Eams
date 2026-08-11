// lib/env.ts
/**
 * Read a required environment variable, failing fast when it is unset or empty.
 * Throws at module load so a misconfigured server never boots insecurely.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}
