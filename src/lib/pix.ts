import type { PixKeyType } from "@/types/database";

export interface PixBrCodeInput {
  pixTipo: PixKeyType;
  pixChave: string;
  nomeRecebedor: string;
  cidade: string;
  valor?: number | undefined;
  txid?: string | undefined;
  descricao?: string | undefined;
}

function formatEmvField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

export function normalizeAscii(value: string, maxLength: number): string {
  const withoutAccents = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const cleaned = withoutAccents
    .replace(/[^A-Za-z0-9 .,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLength);
}

export function formatPixKeyForPayload(
  type: PixKeyType,
  rawKey: string
): string {
  const trimmed = rawKey.trim();
  switch (type) {
    case "CPF":
    case "CNPJ":
      return trimmed.replace(/\D/g, "");
    case "TELEFONE": {
      const digits = trimmed.replace(/\D/g, "");
      if (
        digits.startsWith("55") &&
        (digits.length === 12 || digits.length === 13)
      ) {
        return `+${digits}`;
      }
      return `+55${digits}`;
    }
    case "EMAIL":
      return trimmed.toLowerCase();
    case "ALEATORIA":
      return trimmed.toLowerCase();
  }
}

export function validatePixKey(
  type: PixKeyType,
  rawKey: string
): string | null {
  const key = rawKey.trim();
  if (!key) return "Informe a chave PIX.";

  const digits = key.replace(/\D/g, "");
  switch (type) {
    case "CPF":
      return digits.length === 11 ? null : "CPF deve ter 11 dígitos.";
    case "CNPJ":
      return digits.length === 14 ? null : "CNPJ deve ter 14 dígitos.";
    case "TELEFONE":
      return digits.length >= 10 && digits.length <= 13
        ? null
        : "Telefone deve ter DDD + número (10 ou 11 dígitos).";
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
        ? null
        : "E-mail da chave PIX inválido.";
    case "ALEATORIA":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        key
      )
        ? null
        : "Chave aleatória deve ser um UUID válido.";
  }
}

/**
 * CRC-16/CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF, sem reflexão, xorout 0x0000)
 * Padrão exigido pelo Manual de Padrões para Iniciação do PIX (Banco Central do Brasil).
 */
export function crc16CcittFalse(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitizeTxid(txid?: string): string {
  if (!txid) return "***";
  const cleaned = txid
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);
  return cleaned.length > 0 ? cleaned : "***";
}

/**
 * Gera string EMV BR Code para PIX estático com valor exato (ou aberto se omitido).
 */
export function generatePixBrCode(input: PixBrCodeInput): string {
  const formattedKey = formatPixKeyForPayload(input.pixTipo, input.pixChave);
  if (!formattedKey) {
    throw new Error("Chave PIX inválida para geração do BR Code.");
  }

  const merchantName =
    normalizeAscii(input.nomeRecebedor || "RECEBEDOR", 25) || "RECEBEDOR";
  const merchantCity = normalizeAscii(input.cidade || "BRASIL", 15) || "BRASIL";
  const txid = sanitizeTxid(input.txid);

  let maiContent =
    formatEmvField("00", "br.gov.bcb.pix") + formatEmvField("01", formattedKey);

  if (input.descricao) {
    const maxDescLen = Math.max(0, 99 - maiContent.length - 4);
    const desc = normalizeAscii(input.descricao, Math.min(40, maxDescLen));
    if (desc) {
      maiContent += formatEmvField("02", desc);
    }
  }

  let payload = "";
  payload += formatEmvField("00", "01");
  payload += formatEmvField("26", maiContent);
  payload += formatEmvField("52", "0000");
  payload += formatEmvField("53", "986");

  if (typeof input.valor === "number" && input.valor > 0) {
    payload += formatEmvField("54", input.valor.toFixed(2));
  }

  payload += formatEmvField("58", "BR");
  payload += formatEmvField("59", merchantName);
  payload += formatEmvField("60", merchantCity);
  payload += formatEmvField("62", formatEmvField("05", txid));

  const payloadWithCrcPrefix = `${payload}6304`;
  const crc = crc16CcittFalse(payloadWithCrcPrefix);
  return `${payloadWithCrcPrefix}${crc}`;
}
