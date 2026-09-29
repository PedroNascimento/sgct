/**
 * Área do Super Admin — gestão de Estacas.
 * Sem [estaca_slug] na rota — cross-tenant por natureza (Artigo II.f).
 * O middleware garante role=super_admin antes de renderizar.
 */
import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { superAdminSignOutAction } from "@/app/auth-actions";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sgct-page">
      <header className="border-b border-[#d0d3d3] bg-brand-900 text-white">
        <div className="sgct-container flex min-h-[4.75rem] flex-wrap items-center justify-between gap-3 py-2">
          <div className="rounded-xl bg-white px-3 py-1.5">
            <Brand href="/estacas" context="Administração da plataforma" compact />
          </div>
          <div className="flex items-center gap-3">
            <span className="sgct-chip border-white/20 bg-white/10 text-white">Super Admin</span>
            <form action={superAdminSignOutAction}>
              <button
                type="submit"
                className="inline-flex min-h-9 items-center rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-brand-50 hover:bg-white/20"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-white/10 bg-brand-900">
          <nav aria-label="Navegação do Super Admin" className="sgct-container flex gap-1 overflow-x-auto py-2">
            <Link
              href="/estacas"
              className="inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-semibold text-brand-50 hover:bg-white/10"
            >
              Estacas
            </Link>
            <Link
              href="/admins"
              className="inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-semibold text-brand-50 hover:bg-white/10"
            >
              Administradores de Estaca
            </Link>
          </nav>
        </div>
      </header>
      <main id="conteudo-principal" className="sgct-container py-8 sm:py-10">{children}</main>
    </div>
  );
}
