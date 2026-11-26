import { describe, expect, it } from "vitest";
import {
  formatCurrencyBRL,
  formatRelativeDays,
  maskCurrencyInput,
  parseCurrencyInput,
} from "./formatters";

describe("Formatters", () => {
  it("formata e converte moeda BRL", () => {
    expect(maskCurrencyInput("650")).toBe("6,50");
    expect(parseCurrencyInput("1.234,56")).toBe(1234.56);
    expect(formatCurrencyBRL(18.5)).toContain("18,50");
  });

  it("calcula dias relativos corretamente", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    expect(formatRelativeDays("2026-11-26T09:00:00Z", now)).toBe("hoje");
    expect(formatRelativeDays("2026-11-25T10:00:00Z", now)).toBe("há 1 dia");
    expect(formatRelativeDays("2026-11-21T10:00:00Z", now)).toBe("há 5 dias");
    expect(formatRelativeDays(null, now)).toBe("sem lançamentos");
  });
});
