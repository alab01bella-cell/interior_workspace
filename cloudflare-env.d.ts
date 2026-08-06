/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
}
