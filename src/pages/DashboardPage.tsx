import {
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { PixQrModal } from "@/components/PixQrModal";
import { TransactionModal } from "@/components/TransactionModal";
import { useApp } from "@/contexts/AppContext";
import {
  formatCurrencyBRL,
  formatRelativeDays,
  getInitials,
} from "@/lib/formatters";
import { generatePixBrCode } from "@/lib/pix";
import {
  buildCustomerBillingMessage,
  buildWhatsAppUrl,
  getPublicOrigin,
} from "@/lib/whatsapp";
import type { CustomerWithGuardian } from "@/types/database";

type SortMode = "MAIOR_DIVIDA" | "MAIS_ANTIGO" | "ALFABETICA";
type FilterMode = "TODOS" | "DEVENDO" | "QUITADOS";

export function DashboardPage() {
  const { tenant, customers, hideValues, toggleHideValues } = useApp();

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("MAIOR_DIVIDA");
  const [filterMode, setFilterMode] = useState<FilterMode>("TODOS");

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [quickTxCustomer, setQuickTxCustomer] =
    useState<CustomerWithGuardian | null>(null);
  const [qrCustomer, setQrCustomer] = useState<CustomerWithGuardian | null>(
    null
  );

  const stats = useMemo(() => {
    const debtors = customers.filter((c) => c.saldo_atual > 0);
    const totalReceivable = debtors.reduce((acc, c) => acc + c.saldo_atual, 0);
    return {
      totalReceivable: Math.round(totalReceivable * 100) / 100,
      debtorsCount: debtors.length,
      totalCount: customers.length,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = customers.filter((c) => {
      if (filterMode === "DEVENDO" && c.saldo_atual <= 0) return false;
      if (filterMode === "QUITADOS" && c.saldo_atual > 0) return false;

      if (!q) return true;
      const inName = c.nome.toLowerCase().includes(q);
      const inClass = (c.turma_ou_apelido ?? "").toLowerCase().includes(q);
      const inGuardian = (c.guardian?.nome ?? "").toLowerCase().includes(q);
      return inName || inClass || inGuardian;
    });

    return [...list].sort((a, b) => {
      if (sortMode === "MAIOR_DIVIDA") {
        if (b.saldo_atual !== a.saldo_atual) return b.saldo_atual - a.saldo_atual;
        return a.nome.localeCompare(b.nome, "pt-BR");
      }
      if (sortMode === "MAIS_ANTIGO") {
        const aTime = a.ultima_movimentacao_em
          ? new Date(a.ultima_movimentacao_em).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bTime = b.ultima_movimentacao_em
          ? new Date(b.ultima_movimentacao_em).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) return aTime - bTime;
        return b.saldo_atual - a.saldo_atual;
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [customers, search, filterMode, sortMode]);

  const handleOpenWhatsAppFromQr = () => {
    if (!qrCustomer || !tenant) return;
    const phone = qrCustomer.guardian?.whatsapp || qrCustomer.whatsapp;
    if (!phone) return;

    const link = `${getPublicOrigin()}/c/${qrCustomer.public_token}`;
    let pixCode: string | null = null;
    if (tenant.pix_tipo && tenant.pix_chave && qrCustomer.saldo_atual > 0) {
      try {
        pixCode = generatePixBrCode({
          pixTipo: tenant.pix_tipo,
          pixChave: tenant.pix_chave,
          nomeRecebedor: tenant.pix_nome_recebedor || tenant.nome_loja,
          cidade: tenant.pix_cidade || "BRASIL",
          valor: qrCustomer.saldo_atual,
        });
      } catch {
        pixCode = null;
      }
    }

    const msg = buildCustomerBillingMessage({
      template: tenant.mensagem_padrao_whatsapp,
      cantinaNome: tenant.nome_loja,
      clienteNome: qrCustomer.nome,
      responsavelNome: qrCustomer.guardian?.nome,
      valorDevido: qrCustomer.saldo_atual,
      publicLink: link,
      pixCopiaECola: pixCode,
    });
    window.open(buildWhatsAppUrl(phone, msg), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      {/* Card Resumo Geral */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#22328B] via-[#1C2A78] to-[#0099F0] p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-100">
              Total a Receber
            </p>
            <p className="tabular-nums mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {hideValues
                ? "R$ •••••"
                : formatCurrencyBRL(stats.totalReceivable)}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleHideValues}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25"
            aria-label={hideValues ? "Exibir valores" : "Ocultar valores"}
            title={hideValues ? "Exibir valores" : "Ocultar valores no balcão"}
          >
            {hideValues ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-sky-50">
            <Users className="h-4 w-4 text-[#7AD0FF]" />
            <strong>{stats.debtorsCount}</strong>{" "}
            {stats.debtorsCount === 1
              ? "cliente com saldo devedor"
              : "clientes com saldo devedor"}
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold text-white">
            {stats.totalCount} cadastrados
            {tenant?.plano === "FREE" ? " / 15 FREE" : ""}
          </span>
        </div>
      </section>

      {/* Ações Rápidas: Busca + Botão Novo Cliente */}
      <section className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aluno, turma ou responsável..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-xs outline-none transition focus:border-[#0099F0] focus:ring-2 focus:ring-[#0099F0]/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setCustomerModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22328B] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#18256B] active:scale-[0.99]"
        >
          <UserPlus className="h-4.5 w-4.5 text-[#7AD0FF]" />
          + Novo Cliente / Aluno
        </button>
      </section>

      {/* Filtros e Ordenação */}
      <section className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
          {(
            [
              { id: "TODOS", label: "Todos" },
              { id: "DEVENDO", label: "Devendo" },
              { id: "QUITADOS", label: "Quitados" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterMode(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filterMode === f.id
                  ? "bg-[#22328B] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 shadow-xs ring-1 ring-slate-200/80">
          <ArrowUpDown className="h-3.5 w-3.5 text-[#0099F0]" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Ordenar clientes"
            className="bg-transparent text-xs font-bold text-slate-700 outline-none"
          >
            <option value="MAIOR_DIVIDA">Maior dívida</option>
            <option value="MAIS_ANTIGO">Mais tempo sem pagar</option>
            <option value="ALFABETICA">Ordem alfabética</option>
          </select>
        </div>
      </section>

      {/* Lista de Clientes */}
      <section className="space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-bold text-slate-700">
              {customers.length === 0
                ? "Nenhum cliente ou aluno cadastrado ainda."
                : "Nenhum resultado encontrado para esta busca."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cadastre um aluno ou cliente para lançar fiados em menos de 5
              segundos.
            </p>
            {customers.length === 0 && (
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#22328B] px-4 py-2.5 text-xs font-bold text-white"
              >
                <UserPlus className="h-4 w-4" />
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const overLimit =
              customer.limite_credito !== null &&
              customer.saldo_atual > customer.limite_credito;

            return (
              <div
                key={customer.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-[#0099F0]/50"
              >
                <Link
                  to={`/cliente/${customer.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${
                      customer.saldo_atual > 0
                        ? "bg-[#E8F5FE] text-[#22328B]"
                        : "bg-emerald-50 text-[#10B981]"
                    }`}
                  >
                    {getInitials(customer.nome)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {customer.nome}
                      </p>
                      {overLimit && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 shrink-0 text-amber-500"
                          aria-label="Acima do limite"
                        />
                      )}
                    </div>

                    <p className="truncate text-xs text-slate-500">
                      {[customer.turma_ou_apelido, customer.guardian?.nome]
                        .filter(Boolean)
                        .join(" • ") || "Cliente direto"}
                    </p>

                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                      {formatRelativeDays(customer.ultima_movimentacao_em)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`tabular-nums text-sm font-extrabold ${
                        customer.saldo_atual > 0
                          ? "text-[#E11D48]"
                          : "text-[#10B981]"
                      }`}
                    >
                      {hideValues
                        ? "R$ •••"
                        : formatCurrencyBRL(customer.saldo_atual)}
                    </p>
                    <span className="inline-flex items-center text-[11px] font-semibold text-slate-400">
                      Ver ficha
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>

                {/* Botão rápido + para lançar direto do balcão */}
                <button
                  type="button"
                  onClick={() => setQuickTxCustomer(customer)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22328B] text-white shadow-xs transition hover:bg-[#18256B] active:scale-95"
                  aria-label={`Lançar fiado para ${customer.nome}`}
                  title="Lançamento rápido"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            );
          })
        )}
      </section>

      <CustomerFormModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
      />

      <TransactionModal
        open={Boolean(quickTxCustomer)}
        onClose={() => setQuickTxCustomer(null)}
        customer={quickTxCustomer}
        onSaved={({ customer: savedCustomer, openQr }) => {
          if (openQr) {
            const refreshed =
              customers.find((c) => c.id === savedCustomer.id) || savedCustomer;
            setQrCustomer(refreshed);
          }
        }}
      />

      {qrCustomer && tenant && (
        <PixQrModal
          open={Boolean(qrCustomer)}
          onClose={() => setQrCustomer(null)}
          title={`PIX — ${qrCustomer.nome}`}
          subtitle={qrCustomer.guardian?.nome || qrCustomer.turma_ou_apelido || undefined}
          amount={
            customers.find((c) => c.id === qrCustomer.id)?.saldo_atual ??
            qrCustomer.saldo_atual
          }
          pixTipo={tenant.pix_tipo}
          pixChave={tenant.pix_chave}
          pixNomeRecebedor={tenant.pix_nome_recebedor || tenant.nome_loja}
          pixCidade={tenant.pix_cidade || "BRASIL"}
          txid={qrCustomer.id.slice(0, 8)}
          onSendWhatsApp={
            qrCustomer.guardian?.whatsapp || qrCustomer.whatsapp
              ? handleOpenWhatsAppFromQr
              : undefined
          }
        />
      )}
    </div>
  );
}
