/**
 * Use-case: Processar fila de notificações com retry exponencial (Spec 008 / T008.5).
 * Artigo I: orquestração em use-cases/, desacoplada de frameworks.
 * Artigo V: proteção de quota e tratamento resiliente de erros.
 */

import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";
import type { EmailGateway } from "@/domain/interfaces/email-gateway";
import { renderEmailTemplate } from "./templates";

export interface ProcessNotificationQueueInput {
  batchSize?: number;
}

export interface ProcessNotificationQueueResult {
  processed: number;
  sent: number;
  failed: number;
}

export interface ProcessNotificationQueueDependencies {
  repository: NotificationQueueRepository;
  emailGateway: EmailGateway;
}

export async function processNotificationQueue(
  input: ProcessNotificationQueueInput,
  deps: ProcessNotificationQueueDependencies
): Promise<ProcessNotificationQueueResult> {
  const batchSize = input.batchSize ?? 20;
  const items = await deps.repository.fetchPending(batchSize);

  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      // 1. Marca como 'processing'
      await deps.repository.updateStatus(item.id, "processing");

      // 2. Renderiza o template correspondente ao evento
      const template = renderEmailTemplate(
        item.eventType,
        item.payload,
        item.recipientName
      );

      // 3. Dispara via EmailGateway
      await deps.emailGateway.send({
        to: item.recipientEmail,
        subject: item.subject || template.subject,
        html: template.html,
        text: template.text,
      });

      // 4. Sucesso: atualiza status para 'sent'
      await deps.repository.updateStatus(item.id, "sent", {
        attempts: item.attempts + 1,
        sentAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        errorMessage: null,
      });

      sent++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const newAttempts = item.attempts + 1;
      const isExhausted = newAttempts >= item.maxAttempts;

      // Se atingiu o limite de tentativas, falha permanente ('failed');
      // senão retorna para 'pending' para retry exponencial no próximo ciclo
      const nextStatus = isExhausted ? "failed" : "pending";

      await deps.repository.updateStatus(item.id, nextStatus, {
        attempts: newAttempts,
        lastAttemptAt: new Date().toISOString(),
        errorMessage,
      });

      failed++;
    }
  }

  return {
    processed: items.length,
    sent,
    failed,
  };
}
