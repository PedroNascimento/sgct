import { ResendEmailGateway } from "./resend-email-gateway";

describe("ResendEmailGateway (T008.3)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("envia e-mail com sucesso usando a API do Resend", async () => {
    const mockResponse = { id: "resend-msg-12345" };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const gateway = new ResendEmailGateway({
      apiKey: "re_test_key_123",
      defaultFrom: "no-reply@estacanatal.org",
    });

    const result = await gateway.send({
      to: "membro@exemplo.com",
      subject: "Assunto do teste",
      html: "<p>Olá mundo</p>",
    });

    expect(result.messageId).toBe("resend-msg-12345");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key_123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          from: "no-reply@estacanatal.org",
          to: "membro@exemplo.com",
          subject: "Assunto do teste",
          html: "<p>Olá mundo</p>",
          text: undefined,
        }),
      })
    );
  });

  it("permite sobrescrever o remetente (from) por envio", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: "resend-msg-67890" }),
    });

    const gateway = new ResendEmailGateway({
      apiKey: "re_test_key_123",
      defaultFrom: "padrao@estacanatal.org",
    });

    await gateway.send({
      from: "caravanas@outraestaca.org",
      to: "membro@exemplo.com",
      subject: "Assunto",
      html: "<p>Olá</p>",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        body: expect.stringContaining("caravanas@outraestaca.org"),
      })
    );
  });

  it("lança erro se a resposta do Resend não for ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: jest.fn().mockResolvedValue("API key invalid"),
    });

    const gateway = new ResendEmailGateway({
      apiKey: "re_invalida",
      defaultFrom: "no-reply@estacanatal.org",
    });

    await expect(
      gateway.send({
        to: "membro@exemplo.com",
        subject: "Assunto",
        html: "<p>Olá</p>",
      })
    ).rejects.toThrow("Resend error: 401 Unauthorized - API key invalid");
  });

  it("modo simulação quando nenhuma api key estiver configurada", async () => {
    const gateway = new ResendEmailGateway({
      apiKey: "",
      defaultFrom: "no-reply@exemplo.org",
    });

    const result = await gateway.send({
      to: "membro@exemplo.com",
      subject: "Assunto",
      html: "<p>Olá</p>",
    });

    expect(result.messageId).toContain("simulated-resend-id-");
  });
});
