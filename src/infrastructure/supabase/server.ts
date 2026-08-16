/**
 * Utilitários para criar o cliente Supabase no lado do servidor.
 * Usado em Server Components, Server Actions e middleware.
 *
 * Artigo V: SUPABASE_SERVICE_ROLE_KEY nunca exposta no client —
 * este módulo só é importado em contextos server-side.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components e Server Actions.
 * Usa cookies do request para manter a sessão do usuário.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // setAll pode falhar em Server Components (read-only)
            // É seguro ignorar — cookies são gerenciados pelo middleware
          }
        },
      },
    }
  );
}

/**
 * Cliente Supabase com service_role.
 * ⚠️ NUNCA use este cliente em código que roda no client-side.
 * Use APENAS em: Server Actions de bootstrap, scripts de seed, Edge Functions.
 *
 * Artigo V: service_role key só em contextos server-side confiáveis.
 */
export function createSupabaseServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
