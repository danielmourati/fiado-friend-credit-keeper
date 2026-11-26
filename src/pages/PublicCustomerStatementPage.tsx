import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCurrencyBRL, formatShortDate } from "@/lib/formatters";
import { generatePixBrCode } from "@/lib/pix";
import * as dataService from "@/services/dataService";
import type { PublicCustomerStatement } from "@/types/database";

export function PublicCustomerStatementPage() {
  const { public_token } = useParams<{ public_token: string }>();
  const [statement, setStatement] = useState<PublicCustomerStatement | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!public_token) {
      setLoading(false);
      setError("Link inválido.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    dataService
      .getPublicCustomerStatement(public_token)
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setError("Extrato não encontrado ou link expirado.");
        } else {
          setStatement(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar extrato."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [public_token]);

  const pixBrCode = useMemo(() => {
    if (!statement) return null;
    const { tenant, customer } = statement;
    if (!tenant.pix_tipo || !tenant.pix_chave || customer.saldo_atual <= 0) {
      return null;
    }
    try {
      return generatePixBrCode({
        pixTipo: tenant.pix_tipo,
        pixChave: tenant.pix_chave,
        nomeRecebedor: tenant.pix_nome_recebedor || tenant.nome_loja,
        cidade: tenant.pix_cidade || "BRASIL",
        valor: Number(customer.saldo_atual),
        txid: customer.id.slice(0, 8),
      });
    } catch {
      return null;
    }
  }, [statement]);

  const handleCopyPix = async () => {
    if (!pixBrCode) return;
    try {
      await navigator.clipboard.writeText(pixBrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F8FC] p-4">
        <p className="text-sm font-semibold text-slate-500">
          Carregando extrato...
        </p>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F8FC] p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-md">
          <p className="text-base font-extrabold text-slate-900">
            {error || "Extrato não encontrado."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Solicite um novo link diretamente na cantina.
          </p>
        </div>
      </div>
    );
  }

  const { tenant, customer, transactions } = statement;
  const hasDebt = Number(customer.saldo_atual) > 0;

  return (
    <div className="min-h-screen bg-[#F4F8FC] pb-10">
      {/* Cabeçalho da Cantina */}
      <header className="bg-gradient-to-br from-[#22328B] to-[#0099F0] px-4 pb-16 pt-6 text-white">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <img
            src={tenant.logo_url || "/logo-paula-lanches.jpg"}
            alt={tenant.nome_loja}
            className="h-14 w-14 rounded-full border-2 border-white bg-white object-cover shadow-md"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-100">
              Extrato de Fiado
            </p>
            <h1 className="text-xl font-extrabold">{tenant.nome_loja}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-lg space-y-4 px-4">
        {/* Card do Saldo */}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {customer.nome}
              </h2>
              {customer.turma_ou_apelido && (
                <p className="text-xs font-medium text-slate-500">
                  {customer.turma_ou_apelido}
                </p>
              )}
              {customer.guardian_nome && (
                <p className="mt-1 text-xs text-slate-500">
                  Responsável: <strong>{customer.guardian_nome}</strong>
                </p>
              )}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                hasDebt
                  ? "bg-rose-50 text-[#E11D48]"
                  : "bg-emerald-50 text-[#10B981]"
              }`}
            >
              {hasDebt ? "Em aberto" : "Quitado"}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-[#F4F8FC] p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Saldo Total Atualizado
            </p>
            <p
              className={`tabular-nums mt-1 text-4xl font-extrabold ${
                hasDebt ? "text-[#E11D48]" : "text-[#10B981]"
              }`}
            >
              {formatCurrencyBRL(Number(customer.saldo_atual))}
            </p>
          </div>

          {/* QR Code PIX */}
          {hasDebt && pixBrCode ? (
            <div className="mt-4 rounded-2xl border border-[#0099F0]/30 bg-[#E8F5FE]/60 p-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#22328B]">
                <QrCode className="h-4 w-4 text-[#0099F0]" />
                Pague agora via PIX
              </p>

              <div className="mx-auto mt-3 inline-flex rounded-2xl bg-white p-3 shadow-xs">
                <QRCodeSVG value={pixBrCode} size={190} level="M" />
              </div>

              <p className="mt-2 text-xs text-slate-600">
                Favorecido:{" "}
                <strong>{tenant.pix_nome_recebedor || tenant.nome_loja}</strong>
              </p>

              <button
                type="button"
                onClick={() => void handleCopyPix()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22328B] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#18256B]"
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
            </div>
          ) : !hasDebt ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="h-4.5 w-4.5" />
              Tudo certo! Nenhum valor pendente no momento.
            </div>
          ) : null}
        </section>

        {/* Últimos Lançamentos */}
        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
            Detalhamento dos Lançamentos
          </h3>

          <div className="mt-3 space-y-2.5">
            {transactions.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                Nenhum lançamento registrado.
              </p>
            ) : (
              transactions.map((tx) => {
                const isFiado = tx.tipo === "FIADO";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#F4F8FC] px-3.5 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isFiado
                            ? "bg-rose-100 text-[#E11D48]"
                            : "bg-emerald-100 text-[#10B981]"
                        }`}
                      >
                        {isFiado ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">
                          {tx.descricao || (isFiado ? "Consumo fiado" : "Pagamento")}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatShortDate(tx.data_lancamento)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`tabular-nums shrink-0 text-xs font-extrabold ${
                        isFiado ? "text-[#E11D48]" : "text-[#10B981]"
                      }`}
                    >
                      {isFiado ? "-" : "+"} {formatCurrencyBRL(Number(tx.valor))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Pagamento direto para a cantina via PIX do Banco Central
        </p>
      </main>
    </div>
  );
}
