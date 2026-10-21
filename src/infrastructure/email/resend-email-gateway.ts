/**
 * Implementação do EmailGateway utilizando o serviço Resend (Spec 008 / D04).
 * Artigo I: infraestrutura que implementa a interface de domínio EmailGateway.
 * Artigo V: chaves de API manipuladas exclusivamente no server-side.
 */

import type {
  EmailGateway,
  SendEmailInput,
  SendEmailResult,
} from "@/domain/interfaces/email-gateway";

export interface ResendGatewayConfig {
  apiKey?: string;
  defaultFrom?: string;
}

export class ResendEmailGateway implements EmailGateway {
  private readonly apiKey: string;
  private readonly defaultFrom: string;

  constructor(config?: ResendGatewayConfig) {
    this.apiKey =
      config?.apiKey ?? process.env.RESEND_API_KEY ?? "";
    this.defaultFrom =
      config?.defaultFrom ??
      process.env.RESEND_FROM_EMAIL ??
      "no-reply@exemplo.org";
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const from = input.from || this.defaultFrom;

    // Se nenhuma API key estiver configurada (ex: ambiente dev local sem chave real),
    // simula o envio para não quebrar fluxos locais ou testes.
    if (!this.apiKey) {
      const simulatedId = `simulated-resend-id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.warn(
        `[ResendEmailGateway] RESEND_API_KEY não definida. Simulando envio para ${input.to}: "${input.subject}" (ID: ${simulatedId})`
      );
      return { messageId: simulatedId };
    }

    const payload = {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Resend error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as { id: string };
    return {
      messageId: data.id,
    };
  }
}
