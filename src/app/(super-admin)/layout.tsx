/**
 * Área do Super Admin — gestão de Estacas.
 * Sem [estaca_slug] na rota — cross-tenant por natureza (Artigo II.f).
 * O middleware garante role=super_admin antes de renderizar.
 */
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">
          SGCT — Painel Super Admin
        </h1>
        <p className="text-sm text-gray-500">
          Gestão de Estacas e Administradores
        </p>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
