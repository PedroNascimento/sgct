/**
 * Área do Super Admin — gestão de Estacas.
 * Sem [estaca_slug] na rota — cross-tenant por natureza (Artigo II.f).
 * O middleware garante role=super_admin antes de renderizar.
 */
import Link from "next/link";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              SGCT — Painel Super Admin
            </h1>
            <p className="text-sm text-gray-500">
              Gestão de Estacas e Administradores Iniciais
            </p>
          </div>
          <nav className="flex space-x-4">
            <Link
              href="/super-admin/estacas"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
            >
              Estacas
            </Link>
            <Link
              href="/super-admin/admins"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
            >
              Administradores de Estaca
            </Link>
          </nav>
        </div>
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}

