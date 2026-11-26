import { describe, expect, it } from "vitest";
import {
  crc16CcittFalse,
  formatPixKeyForPayload,
  generatePixBrCode,
  normalizeAscii,
  validatePixKey,
} from "./pix";

describe("PIX BR Code (EMV / Banco Central)", () => {
  it("calcula CRC-16/CCITT-FALSE corretamente no vetor padrão 123456789", () => {
    expect(crc16CcittFalse("123456789")).toBe("29B1");
  });

  it("gera BR Code estático completo com valor exato e CRC válido", () => {
    const code = generatePixBrCode({
      pixTipo: "TELEFONE",
      pixChave: "(86) 99999-1234",
      nomeRecebedor: "Paula Lanches Cantina",
      cidade: "Parnaíba",
      valor: 18.5,
      txid: "FIADO001",
    });

    expect(code.startsWith("000201")).toBe(true);
    expect(code).toContain("br.gov.bcb.pix");
    expect(code).toContain("+5586999991234");
    expect(code).toContain("520400005303986");
    expect(code).toContain("540518.50");
    expect(code).toContain("5802BR");
    expect(code).toContain("5921Paula Lanches Cantina");
    expect(code).toContain("6008Parnaiba");

    const payloadWithoutCrc = code.slice(0, -4);
    const actualCrc = code.slice(-4);
    expect(crc16CcittFalse(payloadWithoutCrc)).toBe(actualCrc);
  });

  it("remove acentos e respeita limites máximos de nome e cidade", () => {
    expect(normalizeAscii("Açaiteria São João da Cantina Escolar", 25)).toBe(
      "Acaiteria Sao Joao da Can"
    );
    expect(normalizeAscii("São Luís do Maranhão", 15)).toBe("Sao Luis do Mar");
  });

  it("normaliza e valida chaves PIX por tipo", () => {
    expect(formatPixKeyForPayload("CPF", "123.456.789-01")).toBe("12345678901");
    expect(formatPixKeyForPayload("EMAIL", "Paula@Lanches.COM")).toBe(
      "paula@lanches.com"
    );
    expect(validatePixKey("CPF", "123.456.789-01")).toBeNull();
    expect(validatePixKey("CPF", "123")).not.toBeNull();
    expect(validatePixKey("CNPJ", "12.345.678/0001-99")).toBeNull();
    expect(validatePixKey("EMAIL", "contato@paulalanches.com.br")).toBeNull();
  });
});
