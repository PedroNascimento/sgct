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
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Caravanas ao Templo
      </h1>
      <p className="mt-2 text-gray-500">
        Estaca: <code className="font-mono bg-gray-100 px-2 py-1 rounded">{estaca_slug}</code>
      </p>
      <p className="mt-4 text-sm text-gray-400">
        Sistema em construção — spec 001 implementará autenticação completa.
      </p>
    </main>
  );
}
