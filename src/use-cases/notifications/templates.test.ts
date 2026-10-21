import { renderEmailTemplate } from "./templates";

describe("Templates de E-mail (T008.4)", () => {
  it("renderiza template de confirmação de reserva + QR", () => {
    const rendered = renderEmailTemplate(
      "RESERVATION_CONFIRMED_QR",
      {
        recipientName: "Pedro Silva",
        caravanDepartureDate: "2026-11-15",
        seatNumber: 12,
        qrToken: "tok-abc-123",
      },
      "Pedro Silva"
    );

    expect(rendered.subject).toContain("Confirmada");
    expect(rendered.html).toContain("Pedro Silva");
    expect(rendered.html).toContain("12");
    expect(rendered.html).toContain("tok-abc-123");
    expect(rendered.text).toContain("12");
  });

  it("renderiza template de alerta de pagamento pendente", () => {
    const rendered = renderEmailTemplate(
      "PAYMENT_PENDING_ALERT",
      {
        recipientName: "Maria Souza",
        caravanDepartureDate: "2026-11-15",
        deadline: "2026-11-08",
      },
      "Maria Souza"
    );

    expect(rendered.subject).toContain("Pagamento Pendente");
    expect(rendered.html).toContain("Maria Souza");
    expect(rendered.html).toContain("2026-11-08");
  });

  it("renderiza template de promoção da lista de espera", () => {
    const rendered = renderEmailTemplate(
      "WAITLIST_PROMOTED",
      {
        recipientName: "Lucas Santos",
        caravanDepartureDate: "2026-11-15",
        assignedSeat: 15,
      },
      "Lucas Santos"
    );

    expect(rendered.subject).toContain("Lista de Espera");
    expect(rendered.html).toContain("Lucas Santos");
    expect(rendered.html).toContain("15");
  });

  it("renderiza template de pagamento confirmado pela Ala (PAGO_ALA)", () => {
    const rendered = renderEmailTemplate(
      "PAYMENT_CONFIRMED_WARD",
      {
        recipientName: "Ana Clara",
        wardName: "Ala Sul",
      },
      "Ana Clara"
    );

    expect(rendered.subject).toContain("Pagamento Registrado");
    expect(rendered.html).toContain("Ana Clara");
    expect(rendered.html).toContain("Ala Sul");
  });

  it("renderiza template de cancelamento ou expiração de reserva", () => {
    const rendered = renderEmailTemplate(
      "RESERVATION_CANCELLED_OR_EXPIRED",
      {
        recipientName: "Carlos Eduardo",
        reason: "expirada_falta_pagamento",
      },
      "Carlos Eduardo"
    );

    expect(rendered.subject).toContain("Cancelamento");
    expect(rendered.html).toContain("Carlos Eduardo");
  });

  it("renderiza template de caravana cancelada por quórum", () => {
    const rendered = renderEmailTemplate(
      "CARAVAN_CANCELLED_QUORUM",
      {
        recipientName: "Marcos Lima",
        caravanDepartureDate: "2026-11-15",
      },
      "Marcos Lima"
    );

    expect(rendered.subject).toContain("Quórum");
    expect(rendered.html).toContain("Marcos Lima");
    expect(rendered.html).toContain("crédito");
  });

  it("renderiza template de expiração de crédito", () => {
    const rendered = renderEmailTemplate(
      "CREDIT_EXPIRATION_ALERT",
      {
        recipientName: "Juliana Rocha",
        creditAmount: 130,
        expiresAt: "2026-12-01",
      },
      "Juliana Rocha"
    );

    expect(rendered.subject).toContain("Crédito");
    expect(rendered.html).toContain("Juliana Rocha");
    expect(rendered.html).toContain("130");
  });

  it("renderiza template de aprovação ou reprovação de formulário de menor", () => {
    const aprovado = renderEmailTemplate(
      "MINOR_APPROVAL_DECISION",
      {
        recipientName: "Gabriel Menor",
        status: "approved",
      },
      "Gabriel Menor"
    );

    expect(aprovado.subject).toContain("Aprovado");
    expect(aprovado.html).toContain("aprovada");

    const rejeitado = renderEmailTemplate(
      "MINOR_APPROVAL_DECISION",
      {
        recipientName: "Gabriel Menor",
        status: "rejected",
        rejectionReason: "Assinatura ilegível",
      },
      "Gabriel Menor"
    );

    expect(rejeitado.subject).toContain("Não Aprovado");
    expect(rejeitado.html).toContain("Assinatura ilegível");
  });
});
