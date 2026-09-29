import Link from "next/link";
import { Brand } from "./brand";
import { WorkspaceChrome } from "./workspace-chrome";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

interface PublicHeaderProps { stakeSlug: string; stakeName?: string; }

export async function PublicHeader({ stakeSlug, stakeName }: PublicHeaderProps) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    return <WorkspaceChrome stakeSlug={stakeSlug} context={stakeName} name={profile?.full_name || user.user_metadata?.full_name || "Minha conta"} role={user.app_metadata?.role || "member"} mode="member" />;
  }
  return (
    <header className="border-b border-[#e0e2e2] bg-white/95 backdrop-blur">
      <div className="sgct-container flex min-h-20 items-center justify-between gap-3">
        <Brand href={`/${stakeSlug}`} context={stakeName} compact />
        <nav aria-label="Navegação principal" className="flex items-center gap-2">
          <Link href={`/${stakeSlug}/calendario`} className="sgct-button text-brand-700">Caravanas</Link>
          <Link href={`/${stakeSlug}/auth/login`} className="sgct-button-secondary">Entrar</Link>
        </nav>
      </div>
    </header>
  );
}
