"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.estaca_slug as string) ?? "natal";

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

    return null;
  }

  const [state, formAction, isPending] = useActionState(handleLogin, null);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Entrar na Conta
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Acesse para gerenciar suas caravanas ao templo.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {state?.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition disabled:opacity-50"
            >
              {isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Ainda não tem conta? </span>
            <Link
              href={`/${slug}/cadastro`}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
