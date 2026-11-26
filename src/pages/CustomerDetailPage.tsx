import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  MessageCircle,
  Plus,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { PixQrModal } from "@/components/PixQrModal";
import { TransactionModal } from "@/components/TransactionModal";
import { useApp } from "@/contexts/AppContext";
import {
  formatCurrencyBRL,
  formatPhoneDisplay,
  formatRelativeDays,
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
import type { Transaction, TransactionType } from "@/types/database";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant, isDemo, customers, refreshAll, showToast } = useApp();

  const customer = useMemo(
    () => customers.find((c) => c.id === id) ?? null,
    [customers, id]
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [txSearch, setTxSearch] = useState("");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>("FIADO");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [zeroConfirmOpen, setZeroConfirmOpen] = useState(false);
  const [zeroing, setZeroing] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!id) return;
    setLoadingTx(true);
    try {
      const list = await dataService.listTransactions(isDemo, id);
      setTransactions(list);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao carregar histórico.",
        "error"
      );
    } finally {
      setLoadingTx(false);
    }
  }, [id, isDemo, showToast]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      const desc = (tx.descricao ?? "").toLowerCase();
      const tipo = tx.tipo.toLowerCase();
      const dateStr = formatShortDate(tx.data_lancamento);
      return desc.includes(q) || tipo.includes(q) || dateStr.includes(q);
    });
  }, [transactions, txSearch]);

  if (!customer || !tenant) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-bold text-slate-700">
          Cliente não encontrado.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#22328B] px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Início
        </Link>
      </div>
    );
  }

  const payerName = customer.guardian?.nome || customer.nome;
  const payerPhone = customer.guardian?.whatsapp || customer.whatsapp;
  const publicUrl = `${getPublicOrigin()}/c/${customer.public_token}`;
  const overLimit =
    customer.limite_credito !== null &&
    customer.saldo_atual > customer.limite_credito;

  const handleChargeWhatsApp = () => {
    if (!payerPhone) {
      showToast(
        "Cadastre um WhatsApp para o cliente ou responsável antes de cobrar.",
        "error"
      );
      return;
    }

    let pixCode: string | null = null;
    if (tenant.pix_tipo && tenant.pix_chave && customer.saldo_atual > 0) {
      try {
        pixCode = generatePixBrCode({
          pixTipo: tenant.pix_tipo,
          pixChave: tenant.pix_chave,
          nomeRecebedor: tenant.pix_nome_recebedor || tenant.nome_loja,
          cidade: tenant.pix_cidade || "BRASIL",
          valor: customer.saldo_atual,
          txid: customer.id.slice(0, 8),
        });
      } catch {
        pixCode = null;
      }
    }

    const message = buildCustomerBillingMessage({
      template: tenant.mensagem_padrao_whatsapp,
      cantinaNome: tenant.nome_loja,
      clienteNome: customer.nome,
      responsavelNome: customer.guardian?.nome,
      valorDevido: customer.saldo_atual,
      publicLink: publicUrl,
      pixCopiaECola: pixCode,
    });

    window.open(buildWhatsAppUrl(payerPhone, message), "_blank", "noopener,noreferrer");
  };

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast("Link público do extrato copiado!");
    } catch {
      showToast("Não foi possível copiar o link.", "error");
    }
  };

  const handleZeroAccount = async () => {
    if (customer.saldo_atual <= 0) return;
    setZeroing(true);
    try {
      await dataService.createTransaction(isDemo, tenant.id, {
        customer_id: customer.id,
        tipo: "RECEBIMENTO",
        valor: customer.saldo_atual,
        descricao: "Quitação total da conta",
        data_lancamento: todayIsoDate(),
      });
      await Promise.all([refreshAll(), loadTransactions()]);
      setZeroConfirmOpen(false);
      showToast("Conta zerada com sucesso!");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao zerar conta.",
        "error"
      );
    } finally {
      setZeroing(false);
    }
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    if (
      !window.confirm(
        `Excluir ${tx.tipo === "FIADO" ? "fiado" : "recebimento"} de ${formatCurrencyBRL(tx.valor)}?`
      )
    ) {
      return;
    }
    try {
      await dataService.deleteTransaction(isDemo, tx);
      await Promise.all([refreshAll(), loadTransactions()]);
      showToast("Lançamento removido e saldo recalculado.");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir lançamento.",
        "error"
      );
    }
  };

  const handleDeleteCustomer = async () => {
    if (
      !window.confirm(
        `Deseja excluir ${customer.nome} e todo o histórico de lançamentos?`
      )
    ) {
      return;
    }
    try {
      await dataService.deleteCustomer(isDemo, customer.id);
      await refreshAll();
      showToast("Cliente removido.");
      navigate("/", { replace: true });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao excluir cliente.",
        "error"
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Navegação superior */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <Edit3 className="h-3.5 w-3.5 text-[#22328B]" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteCustomer()}
            className="inline-flex items-center justify-center rounded-xl bg-white p-2 text-slate-400 shadow-xs ring-1 ring-slate-200 transition hover:text-[#E11D48]"
            aria-label="Excluir cliente"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Card Superior */}
      <section className="rounded-3xl bg-gradient-to-br from-[#22328B] to-[#1A2872] p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">{customer.nome}</h1>
            {customer.turma_ou_apelido && (
              <p className="text-xs font-medium text-sky-200">
                {customer.turma_ou_apelido}
              </p>
            )}
            <p className="mt-2 text-xs text-white/80">
              Pagador: <strong className="text-white">{payerName}</strong>
              {payerPhone && ` • ${formatPhoneDisplay(payerPhone)}`}
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
            {formatRelativeDays(customer.ultima_movimentacao_em)}
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">
            Saldo Atual
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p
              className={`tabular-nums text-3xl font-extrabold ${
                customer.saldo_atual > 0 ? "text-white" : "text-emerald-300"
              }`}
            >
              {formatCurrencyBRL(customer.saldo_atual)}
            </p>
            {customer.limite_credito !== null && (
              <span className="text-xs text-sky-100">
                Limite: {formatCurrencyBRL(customer.limite_credito)}
              </span>
            )}
          </div>

          {overLimit && (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Saldo acima do limite configurado!
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleChargeWhatsApp}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#10B981] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
          >
            <MessageCircle className="h-4.5 w-4.5" />
            Cobrar no WhatsApp
          </button>

          <button
            type="button"
            disabled={customer.saldo_atual <= 0}
            onClick={() => setQrModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0099F0] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
          >
            <QrCode className="h-4.5 w-4.5" />
            QR Code PIX
          </button>
        </div>

        {/* Link público do extrato */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2 text-xs">
          <span className="truncate text-sky-100">
            Extrato público: /c/{customer.public_token.slice(0, 8)}...
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleCopyPublicLink()}
              className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-bold hover:bg-white/25"
            >
              <Copy className="h-3 w-3" />
              Copiar
            </button>
            <Link
              to={`/c/${customer.public_token}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-bold hover:bg-white/25"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir
            </Link>
          </div>
        </div>
      </section>

      {/* Botões de Ação: + Adicionar e Zerar */}
      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setTxInitialType("FIADO");
            setTxModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#22328B] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#18256B]"
        >
          <Plus className="h-4.5 w-4.5 text-[#7AD0FF]" />
          Adicionar
        </button>

        <button
          type="button"
          disabled={customer.saldo_atual <= 0}
          onClick={() => setZeroConfirmOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#10B981] bg-white py-3.5 text-sm font-bold text-[#10B981] shadow-xs transition hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
          Zerar
        </button>
      </section>

      {/* Histórico de Lançamentos */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            Histórico de Lançamentos
          </h2>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Buscar no histórico..."
              className="w-full rounded-xl border border-slate-200 bg-[#F4F8FC] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#0099F0] focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {loadingTx ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Carregando lançamentos...
            </p>
          ) : filteredTransactions.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Nenhum lançamento encontrado.
            </p>
          ) : (
            filteredTransactions.map((tx) => {
              const isFiado = tx.tipo === "FIADO";
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-[#F4F8FC]/70 px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isFiado
                          ? "bg-rose-100 text-[#E11D48]"
                          : "bg-emerald-100 text-[#10B981]"
                      }`}
                    >
                      {isFiado ? (
                        <ArrowDownLeft className="h-4.5 w-4.5" />
                      ) : (
                        <ArrowUpRight className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {tx.descricao || (isFiado ? "Fiado" : "Pagamento")}
                        </p>
                        {!isFiado && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#10B981]">
                            Recebido
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500">
                        {formatShortDate(tx.data_lancamento)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`tabular-nums text-sm font-extrabold ${
                        isFiado ? "text-[#E11D48]" : "text-[#10B981]"
                      }`}
                    >
                      {isFiado ? "-" : "+"}{" "}
                      {formatCurrencyBRL(tx.valor)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTransaction(tx)}
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white hover:text-[#E11D48]"
                      aria-label="Excluir lançamento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Modal de Confirmação de Zerar Conta */}
      {zeroConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-[#10B981]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-slate-900">
              Zerar conta de {customer.nome}?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Será registrado um recebimento de{" "}
              <strong className="text-[#10B981]">
                {formatCurrencyBRL(customer.saldo_atual)}
              </strong>{" "}
              quitando toda a dívida atual.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setZeroConfirmOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={zeroing}
                onClick={() => void handleZeroAccount()}
                className="flex-1 rounded-2xl bg-[#10B981] py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {zeroing ? "Quitando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        customer={customer}
        initialType={txInitialType}
        onSaved={({ openQr }) => {
          void loadTransactions();
          if (openQr) setQrModalOpen(true);
        }}
      />

      <CustomerFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editingCustomer={customer}
      />

      <PixQrModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={`PIX — ${customer.nome}`}
        subtitle={`Pagador: ${payerName}`}
        amount={customer.saldo_atual}
        pixTipo={tenant.pix_tipo}
        pixChave={tenant.pix_chave}
        pixNomeRecebedor={tenant.pix_nome_recebedor || tenant.nome_loja}
        pixCidade={tenant.pix_cidade || "BRASIL"}
        txid={customer.id.slice(0, 8)}
        onSendWhatsApp={payerPhone ? handleChargeWhatsApp : undefined}
      />
    </div>
  );
}
