import Link from "next/link";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { Brand } from "@/components/ui/brand";
import { AdminSidebar } from "./admin-sidebar";
import { signOutAction } from "@/app/auth-actions";

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
  const user = data.user;
  const role = user?.app_metadata?.role;
  const isStakeAdmin = role === "admin_estaca";

  // Buscar perfil para exibir nome e ala
  let adminName = user?.user_metadata?.full_name;
  let wardName: string | undefined;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, ward_id, wards(name)")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      adminName = profile.full_name || adminName;
      const wardData = Array.isArray(profile.wards) ? profile.wards[0] : profile.wards;
      wardName = wardData?.name;
    }
  }

  return (
    <div className="sgct-page min-h-screen bg-[#f7f8f8]">
      <header className="border-b border-[#d0d3d3] bg-white sticky top-0 z-20 shadow-xs">
        <div className="sgct-container flex min-h-[4.75rem] flex-wrap items-center justify-between gap-3 py-2">
          <Brand
            href={`/${estaca_slug}`}
            context={isStakeAdmin ? "Administração da Estaca" : "Administração da Ala"}
            compact
          />
          <div className="flex items-center gap-3">
            <Link
              href={`/${estaca_slug}/calendario`}
              className="inline-flex min-h-9 items-center rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-800 hover:bg-brand-100 transition-colors"
            >
              🔄 Visão de Membro
            </Link>
            <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700 font-semibold">
              {isStakeAdmin ? "Admin Estaca" : wardName ? `Ala ${wardName}` : "Admin Ala"}
            </span>
            <form action={async () => { "use server"; await signOutAction(estaca_slug); }}>
              <button
                type="submit"
                className="inline-flex min-h-9 items-center rounded-lg border border-[#d0d3d3] bg-white px-3 text-xs font-semibold text-[#3a3d40] hover:bg-[#f7f8f8] transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="sgct-container py-8 sm:py-10">
        <div className="flex flex-col gap-8 lg:flex-row items-start">
          <AdminSidebar
            estacaSlug={estaca_slug}
            isStakeAdmin={isStakeAdmin}
            adminName={adminName}
            wardName={wardName}
          />
          <main id="conteudo-principal" className="flex-1 w-full min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
