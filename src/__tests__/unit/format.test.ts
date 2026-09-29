import { formatDate, formatCurrency, formatBoardingTime } from "@/components/ui/format";

describe("format utils", () => {
  describe("formatDate", () => {
    it("formata datas no padrão DD/MM/AAAA a partir de string ISO YYYY-MM-DD", () => {
      expect(formatDate("2026-11-20")).toBe("20/11/2026");
      expect(formatDate("2026-10-09")).toBe("09/10/2026");
      expect(formatDate("2026-01-05")).toBe("05/01/2026");
    });

    it("formata datas no padrão DD/MM/AAAA a partir de string ISO completa com timestamp", () => {
      expect(formatDate("2026-11-20T06:00:00Z")).toBe("20/11/2026");
      expect(formatDate("2026-10-09T23:59:59Z")).toBe("09/10/2026");
    });

    it("formata datas no padrão DD/MM/AAAA a partir de objeto Date", () => {
      const date = new Date("2026-11-20T12:00:00Z");
      expect(formatDate(date)).toBe("20/11/2026");
    });
  });

  describe("formatCurrency", () => {
    it("formata valores monetários em BRL", () => {
      const formatted = formatCurrency(135);
      expect(formatted).toContain("135,00");
    });
  });

  describe("formatBoardingTime", () => {
    it("formata horários de embarque", () => {
      expect(formatBoardingTime("2026-11-20T06:00:00")).toBe("06h");
      expect(formatBoardingTime("2026-11-20T06:30:00")).toBe("06h30");
      expect(formatBoardingTime("07:45")).toBe("07h45");
    });
  });
});
