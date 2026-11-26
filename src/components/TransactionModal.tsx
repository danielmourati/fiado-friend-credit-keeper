import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Crown,
  QrCode,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  formatCurrencyBRL,
  maskCurrencyInput,
  numberToMaskedCurrency,
  parseCurrencyInput,
  todayIsoDate,
} from "@/lib/formatters";
import * as dataService from "@/services/dataService";
import type {
  CustomerWithGuardian,
  QuickShortcut,
  TransactionType,
} from "@/types/database";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerWithGuardian | null;
  initialType?: TransactionType;
  onSaved?: (result: {
    customer: CustomerWithGuardian;
    tipo: TransactionType;
    valor: number;
    openQr: boolean;
  }) => void;
}

export function TransactionModal({
  open,
  onClose,
  customer,
  initialType = "FIADO",
  onSaved,
}: TransactionModalProps) {
  const { tenant, isDemo, refreshAll, showToast } = useApp();

  const [tipo, setTipo] = useState<TransactionType>(initialType);
  const [valorStr, setValorStr] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataLancamento, setDataLancamento] = useState(todayIsoDate());
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState(todayIsoDate());
  const [limitConfirmed, setLimitConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo(initialType);
    setValorStr("");
    setDescricao(initialType === "RECEBIMENTO" ? "Pagamento no balcão" : "");
    setDataLancamento(todayIsoDate());
    setCreateReminder(false);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setReminderDate(nextWeek.toISOString().slice(0, 10));
    setLimitConfirmed(false);
  }, [open, initialType, customer?.id]);

  if (!open || !customer || !tenant) return null;

  const valorNumerico = parseCurrencyInput(valorStr);
  const novoSaldoProjetado =
    tipo === "FIADO"
      ? customer.saldo_atual + valorNumerico
      : customer.saldo_atual - valorNumerico;

  const exceedsCreditLimit =
    tipo === "FIADO" &&
    customer.limite_credito !== null &&
    customer.limite_credito > 0 &&
    valorNumerico > 0 &&
    novoSaldoProjetado > customer.limite_credito;

  const isPro = tenant.plano === "PRO";
  const shortcuts = tenant.atalhos_rapidos ?? [];

  const handleChipClick = (chip: QuickShortcut) => {
    if (!isPro) {
      showToast("Atalhos rápidos fazem parte do Plano PRO.", "info");
      return;
    }
    const nextValue = Math.round((valorNumerico + Number(chip.valor)) * 100) / 100;
    setValorStr(numberToMaskedCurrency(nextValue));
    setDescricao((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip.nome;
      return `${trimmed} + ${chip.nome}`;
    });
    setLimitConfirmed(false);
  };

  const handleSave = async (openQr: boolean, e?: FormEvent) => {
    e?.preventDefault();
    if (valorNumerico <= 0) {
      showToast("Informe um valor maior que R$ 0,00.", "error");
      return;
    }

    if (exceedsCreditLimit && !limitConfirmed) {
      showToast("Confirme o aviso de limite de crédito acima.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await dataService.createTransaction(isDemo, tenant.id, {
        customer_id: customer.id,
        tipo,
        valor: valorNumerico,
        descricao,
        data_lancamento: dataLancamento,
        reminderDate: isPro && createReminder ? reminderDate : null,
      });

      await refreshAll();
      showToast(
        tipo === "FIADO"
          ? `Fiado de ${formatCurrencyBRL(valorNumerico)} registrado!`
          : `Recebimento de ${formatCurrencyBRL(valorNumerico)} registrado!`
      );

      onClose();
      onSaved?.({
        customer,
        tipo,
        valor: valorNumerico,
        openQr,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar lançamento.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#0099F0]">
              Lançamento Rápido
            </p>
            <h2 className="text-lg font-extrabold text-slate-900">
              {customer.nome}
            </h2>
            <p className="text-xs text-slate-500">
              Saldo atual:{" "}
              <strong
                className={
                  customer.saldo_atual > 0
                    ? "text-[#E11D48]"
                    : "text-[#10B981]"
                }
              >
                {formatCurrencyBRL(customer.saldo_atual)}
              </strong>
              {customer.limite_credito !== null && (
                <span>
                  {" "}
                  • Limite: {formatCurrencyBRL(customer.limite_credito)}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSave(false, e)}
          className="mt-4 space-y-4"
        >
          {/* Seletor Fiado | Recebimento */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F4F8FC] p-1">
            <button
              type="button"
              onClick={() => {
                setTipo("FIADO");
                setDescricao("");
                setLimitConfirmed(false);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                tipo === "FIADO"
                  ? "bg-[#E11D48] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Fiado
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo("RECEBIMENTO");
                setDescricao("Pagamento no balcão");
                setLimitConfirmed(false);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                tipo === "RECEBIMENTO"
                  ? "bg-[#10B981] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Recebimento
            </button>
          </div>

          {/* Atalhos Rápidos (Chips) */}
          {tipo === "FIADO" && shortcuts.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Zap className="h-3.5 w-3.5 text-[#0099F0]" />
                  Atalhos rápidos
                </span>
                {!isPro && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    <Crown className="h-2.5 w-2.5" />
                    PRO
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {shortcuts.map((chip, idx) => (
                  <button
                    key={`${chip.nome}-${idx}`}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                      isPro
                        ? "border-[#0099F0]/40 bg-[#E8F5FE] text-[#22328B] hover:bg-[#d5edfd]"
                        : "border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    + {chip.nome} {formatCurrencyBRL(Number(chip.valor))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Campo Valor em Destaque */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
              Valor (R$) *
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-extrabold text-slate-400">
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={valorStr}
                onChange={(e) => {
                  setValorStr(maskCurrencyInput(e.target.value));
                  setLimitConfirmed(false);
                }}
                placeholder="0,00"
                className={`tabular-nums w-full rounded-2xl border-2 bg-white py-3.5 pl-12 pr-4 text-2xl font-extrabold outline-none transition ${
                  tipo === "FIADO"
                    ? "border-rose-200 text-[#E11D48] focus:border-[#E11D48]"
                    : "border-emerald-200 text-[#10B981] focus:border-[#10B981]"
                }`}
              />
            </div>
          </div>

          {/* Alerta de Limite de Crédito */}
          {exceedsCreditLimit && (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1 text-xs text-amber-900">
                  <p className="font-extrabold">
                    Limite de fiado ultrapassado!
                  </p>
                  <p className="mt-0.5">
                    Com este lançamento, a dívida irá para{" "}
                    <strong>{formatCurrencyBRL(novoSaldoProjetado)}</strong>{" "}
                    (limite configurado:{" "}
                    <strong>
                      {formatCurrencyBRL(customer.limite_credito ?? 0)}
                    </strong>
                    ).
                  </p>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 font-bold text-amber-950">
                    <input
                      type="checkbox"
                      checked={limitConfirmed}
                      onChange={(e) => setLimitConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#22328B]"
                    />
                    Confirmar lançamento mesmo acima do limite
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Descrição e Data */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Descrição
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={
                  tipo === "FIADO"
                    ? "Ex: Salgado + Suco"
                    : "Ex: Pagamento PIX / Dinheiro"
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Data
              </label>
              <input
                type="date"
                value={dataLancamento}
                onChange={(e) => setDataLancamento(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
          </div>

          {/* Checkbox Lembrete */}
          {tipo === "FIADO" && (
            <div className="rounded-xl border border-slate-200 bg-[#F4F8FC] px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    disabled={!isPro}
                    checked={createReminder}
                    onChange={(e) => setCreateReminder(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#22328B]"
                  />
                  <Bell className="h-3.5 w-3.5 text-[#22328B]" />
                  Criar lembrete de cobrança
                </label>
                {!isPro && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    <Crown className="h-2.5 w-2.5" />
                    PRO
                  </span>
                )}
              </div>
              {isPro && createReminder && (
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#0099F0]"
                />
              )}
            </div>
          )}

          {/* Rodapé com 2 botões */}
          <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
            <button
              type="submit"
              disabled={submitting || (exceedsCreditLimit && !limitConfirmed)}
              className="rounded-2xl bg-[#22328B] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#18256B] disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              disabled={submitting || (exceedsCreditLimit && !limitConfirmed)}
              onClick={() => void handleSave(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#0099F0] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-50"
            >
              <QrCode className="h-4.5 w-4.5" />
              Salvar + QR Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
