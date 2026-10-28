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
  
  // 1. Claim atômico com SKIP LOCKED (evita duplicatas entre workers concorrentes)
  const items = deps.repository.claimPending
    ? await deps.repository.claimPending(batchSize)
    : await deps.repository.fetchPending(batchSize);

  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      // 2. Se não veio de claimPending (fallback), marca como 'processing'
      if (!deps.repository.claimPending) {
        await deps.repository.updateStatus(item.id, "processing");
      }

      // 3. Controle de cota diária por Estaca
      if (deps.repository.checkDailyQuota) {
        const hasQuota = await deps.repository.checkDailyQuota(
          item.stakeId,
          input.dailyQuotaPerStake
        );
        if (!hasQuota) {
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await deps.repository.updateStatus(item.id, "pending", {
            scheduledFor: tomorrow,
            errorMessage: "Cota diária de envio de e-mails atingida para a Estaca.",
          });
          failed++;
          continue;
        }
      }

      // 4. Renderiza o template correspondente ao evento
      const template = renderEmailTemplate(
        item.eventType,
        item.payload,
        item.recipientName
      );

      // 5. Dispara via EmailGateway
      await deps.emailGateway.send({
        to: item.recipientEmail,
        subject: item.subject || template.subject,
        html: template.html,
        text: template.text,
      });

      // 6. Sucesso: atualiza status para 'sent'
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

      if (isExhausted) {
        await deps.repository.updateStatus(item.id, "failed", {
          attempts: newAttempts,
          lastAttemptAt: new Date().toISOString(),
          errorMessage,
        });
      } else {
        // Retry exponencial: delay baseado em 2^tentativa minutos
        const delayMinutes = Math.pow(2, newAttempts);
        const scheduledFor = new Date(
          Date.now() + delayMinutes * 60 * 1000
        ).toISOString();

        await deps.repository.updateStatus(item.id, "pending", {
          attempts: newAttempts,
          lastAttemptAt: new Date().toISOString(),
          scheduledFor,
          errorMessage,
        });
      }

      failed++;
    }
  }

  return {
    processed: items.length,
    sent,
    failed,
  };
}
