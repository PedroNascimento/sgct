import Link from "next/link";
import { Brand } from "./brand";
import { CalendarIcon, UserIcon } from "./icons";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { signOutAction } from "@/app/auth-actions";

interface PublicHeaderProps {
  stakeSlug: string;
  stakeName?: string;
}

export async function PublicHeader({ stakeSlug, stakeName }: PublicHeaderProps) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(data.user);

  return (
    <header className="border-b border-[#e0e2e2] bg-white/95 backdrop-blur">
      <div className="sgct-container flex min-h-[4.5rem] items-center justify-between gap-3">
        <Brand href={`/${stakeSlug}`} context={stakeName} compact />
        <nav aria-label="Navegação principal" className="flex items-center gap-1 sm:gap-2">
          <Link
            href={`/${stakeSlug}/calendario`}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-[#3a3d40] hover:bg-brand-50 hover:text-brand-700 sm:px-4"
          >
            <CalendarIcon className="hidden h-5 w-5 min-[360px]:block sm:hidden" />
            <span className="sm:hidden">Viagens</span>
            <span className="hidden sm:inline">Caravanas</span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href={`/${stakeSlug}/conta`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#d0d3d3] bg-white px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:px-4"
              >
                <UserIcon className="h-5 w-5" />
                <span className="sm:hidden">Conta</span>
                <span className="hidden sm:inline">Minha conta</span>
              </Link>
              <form action={signOutAction.bind(null, stakeSlug)}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-[#53575b] hover:bg-[#eff0f0] hover:text-[#212225] sm:px-3"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link
              href={`/${stakeSlug}/auth/login`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#d0d3d3] bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:px-4"
            >
              <UserIcon className="h-5 w-5" />
              <span>Entrar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
