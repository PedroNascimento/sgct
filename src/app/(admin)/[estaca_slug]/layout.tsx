import Link from "next/link";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { Brand } from "@/components/ui/brand";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ estaca_slug: string }>;
}) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const role = data.user?.app_metadata?.role;
  const isStakeAdmin = role === "admin_estaca";

  return (
    <div className="sgct-page">
      <header className="border-b border-[#d0d3d3] bg-white">
        <div className="sgct-container flex min-h-[4.75rem] flex-wrap items-center justify-between gap-3 py-2">
          <Brand href={`/${estaca_slug}`} context={isStakeAdmin ? "Administração da Estaca" : "Administração da Ala"} compact />
          <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700">
            {isStakeAdmin ? "Admin Estaca" : "Admin Ala"}
          </span>
        </div>
        <nav aria-label="Navegação administrativa" className="border-t border-[#e0e2e2]">
          <div className="sgct-container flex gap-1 overflow-x-auto py-2">
            {isStakeAdmin ? (
              <>
                <Link href={`/${estaca_slug}/estaca/calendario`} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-semibold text-[#3a3d40] hover:bg-brand-50 hover:text-brand-700">Caravanas</Link>
                <Link href={`/${estaca_slug}/estaca/validacao-semanal`} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-semibold text-[#3a3d40] hover:bg-brand-50 hover:text-brand-700">Validação semanal</Link>
                <Link href={`/${estaca_slug}/estaca/equipe`} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-semibold text-[#3a3d40] hover:bg-brand-50 hover:text-brand-700">Equipe</Link>
              </>
            ) : (
              <Link href={`/${estaca_slug}/ala/reservas`} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-semibold text-[#3a3d40] hover:bg-brand-50 hover:text-brand-700">Pagamentos da Ala</Link>
            )}
            <Link href={`/${estaca_slug}`} className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-md px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50">Área pública</Link>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
