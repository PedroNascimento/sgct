/**
 * Área autenticada — placeholder para spec 001 (autenticação RBAC).
 * O middleware já garantiu que o usuário está autenticado e pertence a esta Estaca.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ estaca_slug: string }>;
}) {
  return <>{children}</>;
}
