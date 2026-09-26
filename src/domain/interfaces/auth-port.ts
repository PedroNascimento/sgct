/**
 * Porta de autenticação (criação de credenciais de login).
 * Artigo I: desacopla use-cases do Supabase Auth.
 */

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  metadata?: Record<string, unknown>;
}

export interface AuthPort {
  signUp(params: SignUpParams): Promise<{ userId: string }>;
}
