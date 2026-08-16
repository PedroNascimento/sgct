/**
 * Rota raiz "/".
 *
 * Implementa o rewrite silencioso para a Estaca padrão (D24):
 * renderiza o conteúdo de (public)/[estaca_slug] sem alterar a URL visível.
 * A lógica real de rewrite fica no middleware (src/middleware.ts).
 * Este componente serve apenas como fallback e para SSR da raiz.
 */
export default function RootPage() {
  // O middleware redireciona para (public)/[NEXT_PUBLIC_DEFAULT_STAKE] antes de chegar aqui.
  // Este componente não deve ser renderizado diretamente em produção.
  return null;
}
