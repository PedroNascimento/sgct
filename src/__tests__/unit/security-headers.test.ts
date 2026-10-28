import nextConfig from "../../../next.config";

describe("Segurança HTTP: Cabeçalhos e Hardening de Plataforma (M04 / SECURITY.md)", () => {
  it("deve exportar headers() configurando proteção em todas as rotas (/:path*)", async () => {
    expect(nextConfig.headers).toBeDefined();
    const headersRules = await nextConfig.headers!();
    expect(Array.isArray(headersRules)).toBe(true);

    const globalRule = headersRules.find((rule: any) => rule.source === "/:path*");
    expect(globalRule).toBeDefined();

    const headersMap = new Map<string, string>();
    for (const h of globalRule!.headers) {
      headersMap.set(h.key, h.value);
    }

    // 1. Content-Security-Policy
    expect(headersMap.has("Content-Security-Policy")).toBe(true);
    const csp = headersMap.get("Content-Security-Policy")!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self' https://*.supabase.co");

    // 2. X-Frame-Options
    expect(headersMap.get("X-Frame-Options")).toBe("DENY");

    // 3. X-Content-Type-Options
    expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");

    // 4. Referrer-Policy
    expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

    // 5. Permissions-Policy (câmera permitida para scanner de QR code, geo negada)
    const permissionsPolicy = headersMap.get("Permissions-Policy");
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy).toContain("camera=(self)");
    expect(permissionsPolicy).toContain("geolocation=()");
  });
});
