"use client";

/**
 * Página de login exclusiva para o Super Admin da plataforma.
 *
 * Não requer [estaca_slug] — Super Admin é cross-tenant por natureza (Artigo II.f).
 * Artigo V: nenhum dado sensível hardcoded.
 */

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Brand } from "@/components/ui/brand";
import { InfoIcon } from "@/components/ui/icons";

export default function SuperAdminLoginPage() {
  const router = useRouter();

  async function handleLogin(
    _prevState: { error?: string } | null,
    formData: FormData
  ) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: "E-mail ou senha inválidos." };
    }

    const role = data.user?.app_metadata?.role;
    if (role !== "super_admin") {
      await supabase.auth.signOut();
      return {
        error:
          "Acesso negado. Esta área é exclusiva para Super Administradores da plataforma.",
      };
    }

    router.push("/estacas");
    router.refresh();
    return null;
  }

  const [state, formAction, isPending] = useActionState(handleLogin, null);

  return (
    <main
      id="conteudo-principal"
      className="sgct-page grid min-h-screen lg:grid-cols-[.8fr_1.2fr]"
    >
      {/* Painel lateral — visível apenas em telas grandes */}
      <section className="hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand href="/super-admin/login" context="Administração da plataforma" />
        <div className="max-w-md">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-200">
            Acesso restrito
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.03em]">
            Painel de controle da plataforma SGCT.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-100">
            Gerencie Estacas e seus primeiros Administradores. Acesso exclusivo
            para Super Admins credenciados.
          </p>
        </div>
        <p className="text-sm text-brand-200">SGCT · controle da plataforma</p>
      </section>

      {/* Formulário */}
      <section className="flex min-h-screen items-center px-4 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand href="/super-admin/login" context="Administração da plataforma" />
          </div>

          <h2 className="sgct-title">Acesso de Super Admin</h2>
          <p className="sgct-subtitle">
            Use as credenciais de Super Administrador da plataforma.
          </p>

          <div className="sgct-card mt-8 p-5 sm:p-8">
            {state?.error && (
              <div role="alert" className="sgct-alert-danger mb-5 flex gap-3">
                <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-5">
              <div>
                <label htmlFor="email" className="sgct-label">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  className="sgct-input"
                />
              </div>

              <div>
                <label htmlFor="password" className="sgct-label">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className="sgct-input"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="sgct-button-primary w-full"
              >
                {isPending ? "Verificando..." : "Entrar como Super Admin"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-[#676b6e]">
            Acesso a esta área é monitorado e auditado.
          </p>
        </div>
      </section>
    </main>
  );
}
