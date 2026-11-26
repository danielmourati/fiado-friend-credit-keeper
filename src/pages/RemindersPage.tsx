import {
  Bell,
  Calendar,
  Check,
  Crown,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import {
  formatCurrencyBRL,
  formatShortDate,
  todayIsoDate,
} from "@/lib/formatters";
import { generatePixBrCode } from "@/lib/pix";
import {
  buildCustomerBillingMessage,
  buildWhatsAppUrl,
  getPublicOrigin,
} from "@/lib/whatsapp";
import * as dataService from "@/services/dataService";
import type { ReminderWithCustomer } from "@/types/database";

export function RemindersPage() {
  const { tenant, isDemo, customers, reminders, refreshAll, showToast } =
    useApp();

  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [date, setDate] = useState(todayIsoDate());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!customerId && customers[0]?.id) {
      setCustomerId(customers[0].id);
    }
  }, [customerId, customers]);

  const isPro = tenant?.plano === "PRO";

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenant || !isPro || !customerId) return;
    setCreating(true);
    try {
      await dataService.createReminder(isDemo, tenant.id, {
        customer_id: customerId,
        data_lembrete: date,
      });
      await refreshAll();
      showToast("Lembrete criado!");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao criar lembrete.",
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (r: ReminderWithCustomer) => {
    try {
      await dataService.toggleReminderDone(isDemo, r.id, !r.concluido);
      await refreshAll();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao atualizar lembrete.",
        "error"
      );
    }
  };

  const handleDelete = async (r: ReminderWithCustomer) => {
    try {
      await dataService.deleteReminder(isDemo, r.id);
      await refreshAll();
      showToast("Lembrete removido.");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir lembrete.",
        "error"
      );
    }
  };

  const handleChargeWhatsApp = (r: ReminderWithCustomer) => {
    const customer = r.customer;
    if (!customer || !tenant) return;
    const phone = customer.guardian?.whatsapp || customer.whatsapp;
    if (!phone) {
      showToast("Cliente sem WhatsApp cadastrado.", "error");
      return;
    }

    const link = `${getPublicOrigin()}/c/${customer.public_token}`;
    let pixCode: string | null = null;
    if (tenant.pix_tipo && tenant.pix_chave && customer.saldo_atual > 0) {
      try {
        pixCode = generatePixBrCode({
          pixTipo: tenant.pix_tipo,
          pixChave: tenant.pix_chave,
          nomeRecebedor: tenant.pix_nome_recebedor || tenant.nome_loja,
          cidade: tenant.pix_cidade || "BRASIL",
          valor: customer.saldo_atual,
        });
      } catch {
        pixCode = null;
      }
    }

    const msg = buildCustomerBillingMessage({
      template: tenant.mensagem_padrao_whatsapp,
      cantinaNome: tenant.nome_loja,
      clienteNome: customer.nome,
      responsavelNome: customer.guardian?.nome,
      valorDevido: customer.saldo_atual,
      publicLink: link,
      pixCopiaECola: pixCode,
    });
    window.open(
      buildWhatsAppUrl(phone, msg),
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-[#22328B]">
          Lembretes de Cobrança
        </h1>
        <p className="text-xs text-slate-500">
          Organize datas combinadas com pais e clientes para não perder prazos
        </p>
      </div>

      {!isPro ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Crown className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-extrabold text-slate-900">
            Lembretes de cobrança são exclusivos do Plano PRO
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Assine o Plano PRO para agendar lembretes ao lançar fiados e
            acompanhar vencimentos.
          </p>
          <Link
            to="/configuracoes"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#22328B] px-5 py-2.5 text-xs font-bold text-white"
          >
            <Crown className="h-4 w-4 text-[#0099F0]" />
            Ver Plano PRO
          </Link>
        </div>
      ) : (
        <>
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="grid grid-cols-1 gap-2.5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs sm:grid-cols-12"
          >
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold uppercase text-slate-500">
                Cliente / Aluno
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({formatCurrencyBRL(c.saldo_atual)})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold uppercase text-slate-500">
                Data
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
            <div className="flex items-end sm:col-span-3">
              <button
                type="submit"
                disabled={creating || customers.length === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#22328B] py-2.5 text-sm font-bold text-white transition hover:bg-[#18256B] disabled:opacity-50"
              >
                <Plus className="h-4 w-4 text-[#7AD0FF]" />
                Agendar
              </button>
            </div>
          </form>

          <div className="space-y-2.5">
            {reminders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Nenhum lembrete agendado.
                </p>
              </div>
            ) : (
              reminders.map((r) => {
                const isOverdue =
                  !r.concluido && r.data_lembrete <= todayIsoDate();
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-xs ${
                      r.concluido
                        ? "border-slate-100 opacity-60"
                        : isOverdue
                          ? "border-rose-200"
                          : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleToggle(r)}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          r.concluido
                            ? "border-[#10B981] bg-[#10B981] text-white"
                            : "border-slate-300 hover:border-[#22328B]"
                        }`}
                        aria-label="Marcar lembrete como concluído"
                      >
                        {r.concluido && <Check className="h-4 w-4" />}
                      </button>

                      <div className="min-w-0">
                        <Link
                          to="/cliente/$id"
                          params={{ id: r.customer_id }}
                          className={`block truncate text-sm font-bold ${
                            r.concluido
                              ? "text-slate-500 line-through"
                              : "text-slate-900 hover:text-[#22328B]"
                          }`}
                        >
                          {r.customer?.nome || "Cliente"}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isOverdue ? "text-[#E11D48]" : ""
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {formatShortDate(r.data_lembrete)}
                          </span>
                          {r.customer && (
                            <span className="tabular-nums font-bold text-[#E11D48]">
                              {formatCurrencyBRL(r.customer.saldo_atual)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {!r.concluido && r.customer && (
                        <button
                          type="button"
                          onClick={() => handleChargeWhatsApp(r)}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#10B981] px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Cobrar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(r)}
                        className="rounded-xl p-2 text-slate-300 hover:text-[#E11D48]"
                        aria-label="Excluir lembrete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
