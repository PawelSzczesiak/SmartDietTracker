import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";
import type { Database } from "@/lib/database.types";

interface CookieToSet {
  name: Parameters<AstroCookies["set"]>[0];
  value: Parameters<AstroCookies["set"]>[1];
  options?: Parameters<AstroCookies["set"]>[2];
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function createClient(requestHeaders: Headers, cookies: AstroCookies): SupabaseClient<Database> | null {
  if (SUPABASE_URL == null || SUPABASE_KEY == null) {
    return null;
  }

  const supabaseUrl: string = SUPABASE_URL;
  const supabaseKey: string = SUPABASE_KEY;

  // Supabase SSR still uses createServerClient for cookie-based auth on the server.
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(requestHeaders.get("Cookie") ?? "").map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
