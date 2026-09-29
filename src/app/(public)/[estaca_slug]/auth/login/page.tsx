"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Brand } from "@/components/ui/brand";
import { ArrowLeftIcon, InfoIcon } from "@/components/ui/icons";

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.estaca_slug ?? "");

  async function handleLogin(_prevState: { error?: string } | null, formData: FormData) {
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
    if (role === "super_admin") {
      router.push("/estacas");
    } else if (role === "admin_estaca") {
      router.push(`/${slug}/estaca/calendario`);
    } else if (role === "admin_ala") {
      router.push(`/${slug}/ala/reservas`);
    } else {
      router.push(`/${slug}`);
    }
    router.refresh();

    return null;
  }

  const [state, formAction, isPending] = useActionState(handleLogin, null);

  return (
    <main id="conteudo-principal" className="sgct-page grid min-h-screen lg:grid-cols-[.8fr_1.2fr]">
      <section className="hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand href={`/${slug}`} context="Caravanas ao Templo" />
        <div className="max-w-md">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-200">Área segura</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.03em]">
            Acompanhe sua jornada com clareza.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-brand-100">
            Entre para completar seu cadastro, escolher um assento e consultar o andamento da reserva.
          </p>
        </div>
        <p className="text-sm text-brand-200">SGCT · acesso individual</p>
      </section>

      <section className="flex min-h-screen items-center px-4 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand href={`/${slug}`} />
          </div>
          <Link href={`/${slug}`} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
            <ArrowLeftIcon className="h-5 w-5" />
            Voltar para o início
          </Link>
          <h2 className="sgct-title">Entre na sua conta</h2>
          <p className="sgct-subtitle">Use o e-mail e a senha cadastrados no SGCT.</p>

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
              {isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-1 border-t border-[#e0e2e2] pt-5 text-center text-base">
            <span className="text-[#53575b]">Ainda não tem conta?</span>
            <Link
              href={`/${slug}/cadastro`}
              className="sgct-link inline-flex min-h-11 items-center"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
      </section>
    </main>
  );
}
