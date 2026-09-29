import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { WorkspaceChrome } from "@/components/ui/workspace-chrome";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="sgct-page workspace-page">
      <WorkspaceChrome name={user?.user_metadata?.full_name || "Administrador"} role="super_admin" mode="platform" />
      <main id="conteudo-principal" className="workspace-content">{children}</main>
    </div>
  );
}
