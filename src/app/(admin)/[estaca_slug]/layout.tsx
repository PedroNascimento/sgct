import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { WorkspaceChrome } from "@/components/ui/workspace-chrome";

export default async function AdminLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ estaca_slug: string }>;
}) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: stake } = await supabase.from("stakes").select("name").eq("slug", estaca_slug).maybeSingle();
  const { data: profile } = user ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : { data: null };
  return (
    <div className="sgct-page workspace-page">
      <WorkspaceChrome stakeSlug={estaca_slug} context={stake?.name} name={profile?.full_name || user?.user_metadata?.full_name || "Administrador"} role={user?.app_metadata?.role || ""} mode="admin" />
      <main id="conteudo-principal" className="workspace-content">{children}</main>
    </div>
  );
}
