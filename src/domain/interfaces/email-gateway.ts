/**
 * Interface para Gateway de E-mails transacionais (Spec 008 / D04).
 * Artigo I: desacoplado de bibliotecas e provedores concretos (ex: Resend).
 */

export interface SendEmailInput {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
}

export interface EmailGateway {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
