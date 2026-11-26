import { formatCurrencyBRL } from "@/lib/formatters";

export function normalizeBrazilianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  return `55${digits}`;
}

export function getPublicOrigin(): string {
  const envUrl = import.meta.env["VITE_APP_URL"] as string | undefined;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://fiado-friend-credit-keeper.lovable.app";
}

export interface CustomerBillingMessageParams {
  template?: string | null | undefined;
  cantinaNome: string;
  clienteNome: string;
  responsavelNome?: string | null | undefined;
  valorDevido: number;
  publicLink: string;
  pixCopiaECola?: string | null | undefined;
}

const DEFAULT_TEMPLATE =
  "Olá! Segue o extrato atualizado de {cliente} na *{cantina}*.\n\nValor em aberto: *{valor}*\nExtrato detalhado: {link}\n\nPIX Copia e Cola:\n{pix}";

export function buildCustomerBillingMessage(
  params: CustomerBillingMessageParams
): string {
  const baseTemplate =
    params.template && params.template.trim().length > 0
      ? params.template
      : DEFAULT_TEMPLATE;

  const valorFormatado = formatCurrencyBRL(Math.max(0, params.valorDevido));
  const pixBlock = params.pixCopiaECola
    ? params.pixCopiaECola
    : "(Chave PIX não configurada — consulte na cantina)";

  let message = baseTemplate
    .replace(/\{cantina\}/g, params.cantinaNome)
    .replace(/\{cliente\}/g, params.clienteNome)
    .replace(/\{responsavel\}/g, params.responsavelNome || params.clienteNome)
    .replace(/\{valor\}/g, valorFormatado)
    .replace(/\{link\}/g, params.publicLink)
    .replace(/\{pix\}/g, pixBlock);

  if (!baseTemplate.includes("{link}")) {
    message += `\n\nExtrato detalhado: ${params.publicLink}`;
  }
  if (params.pixCopiaECola && !baseTemplate.includes("{pix}")) {
    message += `\n\nPIX Copia e Cola:\n${params.pixCopiaECola}`;
  }

  return message;
}

export function buildGuardianBillingMessage(params: {
  cantinaNome: string;
  responsavelNome: string;
  alunosResumo: { nome: string; saldo: number }[];
  valorTotal: number;
  publicLink: string;
  pixCopiaECola?: string | null | undefined;
}): string {
  const linhasAlunos = params.alunosResumo
    .filter((a) => a.saldo > 0)
    .map((a) => `• ${a.nome}: ${formatCurrencyBRL(a.saldo)}`)
    .join("\n");

  const partes = [
    `Olá, *${params.responsavelNome}*!`,
    `Segue o extrato consolidado da *${params.cantinaNome}*:`,
    linhasAlunos ? `\n${linhasAlunos}` : "",
    `\n*Total a pagar: ${formatCurrencyBRL(Math.max(0, params.valorTotal))}*`,
    `Extrato completo e QR Code: ${params.publicLink}`,
    params.pixCopiaECola ? `\nPIX Copia e Cola:\n${params.pixCopiaECola}` : "",
  ].filter(Boolean);

  return partes.join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizeBrazilianPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
