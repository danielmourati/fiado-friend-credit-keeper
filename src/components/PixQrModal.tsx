import { Check, Copy, MessageCircle, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { formatCurrencyBRL } from "@/lib/formatters";
import { generatePixBrCode } from "@/lib/pix";
import type { PixKeyType } from "@/types/database";

interface PixQrModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | undefined;
  amount: number;
  pixTipo: PixKeyType | null;
  pixChave: string | null;
  pixNomeRecebedor: string | null;
  pixCidade: string | null;
  txid?: string | undefined;
  onSendWhatsApp?: (() => void) | undefined;
}

export function PixQrModal({
  open,
  onClose,
  title,
  subtitle,
  amount,
  pixTipo,
  pixChave,
  pixNomeRecebedor,
  pixCidade,
  txid,
  onSendWhatsApp,
}: PixQrModalProps) {
  const [copied, setCopied] = useState(false);

  const pixData = useMemo(() => {
    if (!pixTipo || !pixChave || amount <= 0) {
      return { code: null as string | null, error: null as string | null };
    }
    try {
      const code = generatePixBrCode({
        pixTipo,
        pixChave,
        nomeRecebedor: pixNomeRecebedor || "PAULA LANCHES",
        cidade: pixCidade || "BRASIL",
        valor: amount,
        txid,
      });
      return { code, error: null };
    } catch (err) {
      return {
        code: null,
        error:
          err instanceof Error ? err.message : "Erro ao gerar código PIX.",
      };
    }
  }, [pixTipo, pixChave, pixNomeRecebedor, pixCidade, amount, txid]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!pixData.code) return;
    try {
      await navigator.clipboard.writeText(pixData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback silencioso
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5FE] text-[#22328B]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar modal PIX"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-[#F4F8FC] p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Valor exato para pagamento
          </p>
          <p className="tabular-nums mt-1 text-3xl font-extrabold text-[#22328B]">
            {formatCurrencyBRL(amount)}
          </p>

          {pixData.code ? (
            <>
              <div className="mx-auto mt-4 inline-flex rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <QRCodeSVG value={pixData.code} size={200} level="M" />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Recebedor:{" "}
                <strong className="text-slate-700">
                  {pixNomeRecebedor || "Cantina"}
                </strong>
              </p>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {pixData.error ||
                "Configure sua chave PIX em Ajustes para gerar o QR Code automaticamente."}
            </div>
          )}
        </div>

        {pixData.code && (
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22328B] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#18256B] active:scale-[0.99]"
            >
              {copied ? (
                <>
                  <Check className="h-4.5 w-4.5 text-[#10B981]" />
                  Código PIX Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4.5 w-4.5" />
                  Copiar Código PIX (Copia e Cola)
                </>
              )}
            </button>

            {onSendWhatsApp && (
              <button
                type="button"
                onClick={onSendWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#10B981] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
              >
                <MessageCircle className="h-4.5 w-4.5" />
                Enviar Cobrança no WhatsApp
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
