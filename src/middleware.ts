/**
 * Middleware de resolução de tenant multi-tenant — SGCT
 *
 * Implementa a lógica da ARCHITECTURE.md seção 3.1:
 * 1. Extrair [estaca_slug] da URL (ou usar NEXT_PUBLIC_DEFAULT_STAKE se raiz)
 * 2. Resolver slug → stake_id via Supabase
 * 3. Lógica crítica anti-vazamento: comparar claim.stake_id vs slug resolvido
 * 4. Verificação de role por sub-rota
 *
 * Artigo II: checagem stake cross-tenant é INTENCIONAL e redundante com RLS
 * (defesa em profundidade — o middleware não substitui o RLS, complementa).
 * Artigo V: nenhum segredo hardcoded; tudo via variáveis de ambiente.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const DEFAULT_STAKE = process.env.NEXT_PUBLIC_DEFAULT_STAKE ?? "natal";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Prefixos de rota que exigem autenticação
const AUTH_ROUTES = ["/(auth)", "/(admin)", "/(super-admin)"];

// Cache simples de slug → stake_id (em memória do edge runtime)
// Stakes mudam raramente; invalidação não é crítica para MVP.
const slugCache = new Map<string, { stake_id: string; is_active: boolean } | null>();

async function resolveSlug(
  slug: string,
  supabase: ReturnType<typeof createServerClient>
): Promise<{ stake_id: string; is_active: boolean } | null> {
  if (slugCache.has(slug)) {
    return slugCache.get(slug) ?? null;
  }

  const { data } = await supabase
    .from("stakes")
    .select("id, is_active")
    .eq("slug", slug)
    .single();

  const result = data ? { stake_id: data.id, is_active: data.is_active } : null;
  slugCache.set(slug, result);
  return result;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos e API routes internas do Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Criar cliente Supabase com cookies (para ler sessão)
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
          });
      },
    },
  });

  // ── T000.13: Rewrite silencioso da raiz "/" ───────────────────────────────
  // Renderiza o conteúdo da Estaca padrão sem alterar a URL visível (D24)
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_STAKE}`;
    return NextResponse.rewrite(url);
  }

  // ── Extrair slug da URL ───────────────────────────────────────────────────
  // Padrão: /[estaca_slug]/... ou /(super-admin)/...
  const isSuperAdminRoute = pathname.startsWith("/super-admin");

  // Super-admin não tem slug de Estaca na rota
  if (isSuperAdminRoute) {
    const session = await supabase.auth.getSession();
    const claims = session.data.session?.user?.app_metadata;

    if (!claims || claims.role !== "super_admin") {
      return new NextResponse("Acesso negado.", { status: 403 });
    }
    return response;
  }

  // Extrair o slug (primeiro segmento da URL)
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];

  if (!slug) {
    // Sem slug → redirecionar para DEFAULT_STAKE (fallback)
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_STAKE}`;
    return NextResponse.rewrite(url);
  }

  // ── T000.15: Resolver slug → stake ───────────────────────────────────────
  const stakeInfo = await resolveSlug(slug, supabase);

  if (!stakeInfo || !stakeInfo.is_active) {
    // T000.15: Slug inexistente ou inativo → 404
    return new NextResponse("Estaca não encontrada.", { status: 404 });
  }

  const { stake_id: resolvedStakeId } = stakeInfo;

  // ── Verificar se é rota autenticada ──────────────────────────────────────
  const remainingPath = "/" + segments.slice(1).join("/");
  const isAuthRoute = remainingPath.startsWith("/auth") ||
                      remainingPath.startsWith("/admin");

  if (!isAuthRoute) {
    // Rota pública — sem checagem de sessão necessária
    return response;
  }

  // ── T000.14: Checagem crítica anti-vazamento cross-stake ─────────────────
  // Artigo II: se há sessão E a rota é autenticada, comparar claim.stake_id
  // com o stake_id resolvido do slug. Se forem diferentes → 403.
  const session = await supabase.auth.getSession();
  const claims = session.data.session?.user?.app_metadata;

  if (!claims) {
    // Sem sessão → redirecionar para login
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}/auth/login`;
    return NextResponse.redirect(url);
  }

  // 🔴 CHECAGEM CRÍTICA: stake do JWT deve corresponder ao slug da rota
  if (claims.stake_id && claims.stake_id !== resolvedStakeId) {
    // Usuário autenticado tentando acessar rota de OUTRA Estaca → 403
    return new NextResponse("Acesso negado: você não pertence a esta Estaca.", {
      status: 403,
    });
  }

  // ── Verificação de role por sub-rota ─────────────────────────────────────
  if (remainingPath.startsWith("/admin/estaca") && claims.role !== "admin_estaca") {
    return new NextResponse("Acesso negado: requer perfil Admin Estaca.", { status: 403 });
  }

  if (
    remainingPath.startsWith("/admin/ala") &&
    claims.role !== "admin_ala" &&
    claims.role !== "admin_estaca"
  ) {
    return new NextResponse("Acesso negado: requer perfil Admin Ala ou superior.", {
      status: 403,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware em todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
