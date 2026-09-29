/**
 * Área do Super Admin — gestão de Estacas.
 * Sem [estaca_slug] na rota — cross-tenant por natureza (Artigo II.f).
 * O middleware garante role=super_admin antes de renderizar.
 */
import { Brand } from "@/components/ui/brand";
import { superAdminSignOutAction } from "@/app/auth-actions";
import { SuperAdminNav } from "./super-admin-nav";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sgct-page min-h-screen bg-[#f7f8f8]">
      <header className="border-b border-[#d0d3d3] bg-brand-900 text-white">
        <div className="sgct-container flex min-h-[4.75rem] flex-wrap items-center justify-between gap-3 py-2">
          <div className="rounded-xl bg-white px-3 py-1.5 shadow-sm">
            <Brand href="/estacas" context="Administração da plataforma" compact />
          </div>
          <div className="flex items-center gap-3">
            <span className="sgct-chip border-white/20 bg-white/10 text-white font-medium">
              👑 Super Admin
            </span>
            <form action={superAdminSignOutAction}>
              <button
                type="submit"
                className="inline-flex min-h-9 items-center rounded-lg border border-white/20 bg-white/10 px-3.5 text-sm font-semibold text-brand-50 hover:bg-white/20 transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="sgct-container py-8 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row items-start">
          <SuperAdminNav />
          <main id="conteudo-principal" className="flex-1 w-full min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
