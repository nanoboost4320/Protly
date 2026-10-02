/**
 * Supabase クライアント
 *
 * クラウド保存には Supabase（無料で使えるデータベース＋ログイン機能）を使います。
 * .env.local に URL とキーを設定すると有効になります。
 *
 * キーは Publishable key（新名称）または anon key（旧名称）のどちらでも可。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isCloudConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseKey());
}

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured()) return null;

  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getSupabaseKey()!
    );
  }

  return client;
}
