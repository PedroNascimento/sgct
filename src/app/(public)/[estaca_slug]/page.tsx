import type { Metadata } from "next";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { estaca_slug } = await params;
  return {
    title: `SGCT — Caravanas ao Templo`,
    description: `Plataforma de gestão de caravanas ao Templo de Recife.`,
  };
}

/**
 * Landing page pública de uma Estaca.
 * O middleware garante que o slug é válido antes de chegar aqui.
 */
export default async function EstacaPublicPage({ params }: Props) {
  const { estaca_slug } = await params;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Caravanas ao Templo
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Estaca: <code className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">{estaca_slug}</code>
        </p>

        <div className="mt-8 flex flex-col space-y-3">
          <a
            href={`/${estaca_slug}/calendario`}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition"
          >
            Ver Calendário de Caravanas
          </a>
          <a
            href={`/${estaca_slug}/cadastro`}
            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-blue-600 text-blue-600 font-medium text-sm rounded-md shadow-sm transition"
          >
            Cadastrar-se na Caravana
          </a>
          <a
            href={`/${estaca_slug}/auth/login`}
            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium text-sm rounded-md shadow-sm transition"
          >
            Já tenho conta (Entrar)
          </a>
        </div>
      </div>
    </main>
  );
}
