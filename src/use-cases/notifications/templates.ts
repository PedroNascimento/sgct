/**
 * Templates de e-mail do SGCT (Spec 008 / T008.4).
 * Artigo I: formatação de e-mail pura sem framework acoplado.
 * "Personalização visual avançada de template: HTML simples é suficiente no MVP" (Spec 008).
 */

import type { NotificationEventType } from "@/domain/types/notification";

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export function renderEmailTemplate(
  eventType: NotificationEventType,
  payload: Record<string, unknown>,
  recipientName?: string | null
): RenderedTemplate {
  const name =
    recipientName ||
    (typeof payload.recipientName === "string"
      ? payload.recipientName
      : "Membro da Estaca");

  switch (eventType) {
    case "RESERVATION_CONFIRMED_QR": {
      const departureDate = payload.caravanDepartureDate ?? "Data informada";
      const seatNumber = payload.seatNumber ?? "Não definido";
      const qrToken = payload.qrToken ?? "";

      const subject = "Sua Reserva para a Caravana ao Templo foi Confirmada!";
      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Reserva Confirmada!</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>Sua vaga na caravana com saída em <strong>${departureDate}</strong> está confirmada com sucesso.</p>
          <p><strong>Assento reservado:</strong> ${seatNumber}</p>
          ${
            qrToken
              ? `<div style="background: #f4f4f4; padding: 12px; border-radius: 6px; margin: 16px 0;">
                  <p><strong>Seu código para Check-in de Embarque:</strong></p>
                  <code>${qrToken}</code>
                  <p><small>Apresente o QR Code no seu aplicativo ou este código ao líder da caravana no embarque.</small></p>
                </div>`
              : ""
          }
          <p>Tenha uma excelente viagem ao Templo!</p>
        </div>
      `;
      const text = `Olá, ${name}. Sua vaga na caravana de ${departureDate} está confirmada! Assento: ${seatNumber}. Token: ${qrToken}`;
      return { subject, html, text };
    }

    case "PAYMENT_PENDING_ALERT": {
      const departureDate = payload.caravanDepartureDate ?? "próxima caravana";
      const deadline = payload.deadline ?? "o prazo limite";

      const subject = "Aviso de Pagamento Pendente - Caravana ao Templo";
      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Lembrete de Pagamento de Reserva</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>Identificamos que a sua reserva para a caravana com saída em <strong>${departureDate}</strong> ainda está com o pagamento pendente.</p>
          <p>Por favor, realize o acerto com o responsável pela caravana na sua Ala até <strong>${deadline}</strong> para garantir sua vaga.</p>
          <p>Caso o pagamento não seja confirmado dentro do prazo, o assento poderá ser liberado automaticamente.</p>
        </div>
      `;
      const text = `Olá, ${name}. Sua reserva para a caravana de ${departureDate} está com pagamento pendente. Prazo: ${deadline}.`;
      return { subject, html, text };
    }

    case "WAITLIST_PROMOTED": {
      const departureDate = payload.caravanDepartureDate ?? "próxima caravana";
      const assignedSeat = payload.assignedSeat ?? "atribuído";

      const subject = "Você foi promovido da Lista de Espera! - Caravana ao Templo";
      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Boa notícia! Vaga liberada na Caravana</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>Sua inscrição que estava na lista de espera para a caravana de <strong>${departureDate}</strong> foi promovida para uma vaga titular (Assento: <strong>${assignedSeat}</strong>).</p>
          <p>Confira os detalhes na sua área de reservas.</p>
        </div>
      `;
      const text = `Olá, ${name}. Você saiu da lista de espera e obteve vaga na caravana de ${departureDate}! Assento: ${assignedSeat}.`;
      return { subject, html, text };
    }

    case "PAYMENT_CONFIRMED_WARD": {
      const wardName = payload.wardName ?? "sua Ala";

      const subject = "Pagamento Registrado pela Ala - Caravana ao Templo";
      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Pagamento Registrado</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>O pagamento da sua reserva foi registrado com sucesso pela liderança da <strong>${wardName}</strong>.</p>
          <p>Sua reserva agora aguarda o ciclo de validação semanal com a Estaca para emissão do QR Code de embarque definitivo.</p>
        </div>
      `;
      const text = `Olá, ${name}. O pagamento da sua reserva foi registrado pela ${wardName} e aguarda validação da Estaca.`;
      return { subject, html, text };
    }

    case "RESERVATION_CANCELLED_OR_EXPIRED": {
      const reason = payload.reason ? `Motivo: ${payload.reason}` : "";

      const subject = "Atualização de Reserva: Cancelamento/Expiração";
      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Cancelamento de Reserva</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>Informamos que a sua reserva na caravana foi cancelada ou expirada.</p>
          ${reason ? `<p>${reason}</p>` : ""}
          <p>Se você acredita que isso foi um engano ou realizou o pagamento a tempo, entre em contato com a liderança da sua Ala.</p>
        </div>
      `;
      const text = `Olá, ${name}. Sua reserva na caravana foi cancelada ou expirada. ${reason}`;
      return { subject, html, text };
    }

    case "CARAVAN_CANCELLED_QUORUM": {
      const departureDate = payload.caravanDepartureDate ?? "informada";

      const subject = "Caravana ao Templo Cancelada por Quórum Mínimo";
      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Aviso de Cancelamento da Caravana</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>Informamos que a caravana com saída prevista para <strong>${departureDate}</strong> foi cancelada pela Estaca por não ter atingido o quórum mínimo necessário para a viagem.</p>
          <p>Caso você já tenha efetuado o pagamento, um crédito integral foi gerado em sua conta para uso nas próximas caravanas.</p>
        </div>
      `;
      const text = `Olá, ${name}. A caravana de ${departureDate} foi cancelada por não atingir o quórum mínimo. Foi gerado crédito para sua conta se aplicável.`;
      return { subject, html, text };
    }

    case "CREDIT_EXPIRATION_ALERT": {
      const creditAmount = payload.creditAmount ?? "0,00";
      const expiresAt = payload.expiresAt ?? "em breve";

      const subject = "Aviso de Expiração de Crédito - Caravana ao Templo";
      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Atenção: Crédito a Expirar</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>Você possui um saldo de crédito no valor de <strong>R$ ${creditAmount}</strong> com data limite de validade até <strong>${expiresAt}</strong>.</p>
          <p>Aproveite para utilizar seu crédito reservando vaga nas próximas caravanas abertas da Estaca antes da data de expiração.</p>
        </div>
      `;
      const text = `Olá, ${name}. Seu crédito de R$ ${creditAmount} expira em ${expiresAt}. Utilize em uma próxima caravana!`;
      return { subject, html, text };
    }

    case "MINOR_APPROVAL_DECISION": {
      const status = payload.status === "approved" ? "aprovada" : "não aprovada";
      const rejectionReason = payload.rejectionReason
        ? `Motivo: ${payload.rejectionReason}`
        : "";

      const subject =
        payload.status === "approved"
          ? "Formulário de Menor Aprovado - Caravana ao Templo"
          : "Formulário de Menor Não Aprovado - Caravana ao Templo";

      const html = `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Decisão sobre o Formulário de Menor</h2>
          <p>Olá, <strong>${name}</strong>,</p>
          <p>A autorização de viagem do jovem foi <strong>${status}</strong> pela liderança da Ala.</p>
          ${rejectionReason ? `<p style="color: #b91c1c;">${rejectionReason}</p>` : ""}
          <p>Consulte sua área no sistema para mais detalhes.</p>
        </div>
      `;
      const text = `Olá, ${name}. O formulário de menor foi ${status}. ${rejectionReason}`;
      return { subject, html, text };
    }

    default: {
      return {
        subject: "Notificação do Sistema de Caravanas",
        html: `<p>Olá, ${name}. Há uma nova atualização na sua conta.</p>`,
        text: `Olá, ${name}. Há uma nova atualização na sua conta.`,
      };
    }
  }
}
