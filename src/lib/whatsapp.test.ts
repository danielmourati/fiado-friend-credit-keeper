import { describe, expect, it } from "vitest";
import {
  buildCustomerBillingMessage,
  buildWhatsAppUrl,
  normalizeBrazilianPhone,
} from "./whatsapp";

describe("WhatsApp helpers", () => {
  it("normaliza telefone brasileiro garantindo DDI 55", () => {
    expect(normalizeBrazilianPhone("(86) 99988-7766")).toBe("5586999887766");
    expect(normalizeBrazilianPhone("5586999887766")).toBe("5586999887766");
  });

  it("monta mensagem de cobrança com link público e PIX Copia e Cola", () => {
    const msg = buildCustomerBillingMessage({
      cantinaNome: "Paula Lanches",
      clienteNome: "Lucas Silva",
      valorDevido: 24.5,
      publicLink: "https://app.paulalanches.com/c/token-123",
      pixCopiaECola: "000201...",
    });

    expect(msg).toContain("Paula Lanches");
    expect(msg).toContain("Lucas Silva");
    expect(msg).toContain("24,50");
    expect(msg).toContain("https://app.paulalanches.com/c/token-123");
    expect(msg).toContain("000201...");
  });

  it("gera URL wa.me codificada", () => {
    const url = buildWhatsAppUrl("(86) 99988-7766", "Olá Paula!");
    expect(url).toBe("https://wa.me/5586999887766?text=Ol%C3%A1%20Paula!");
  });
});
