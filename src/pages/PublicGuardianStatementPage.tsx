import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatCurrencyBRL, formatShortDate } from "@/lib/formatters";
import { generatePixBrCode } from "@/lib/pix";
import * as dataService from "@/services/dataService";
import type { PublicGuardianStatement } from "@/types/database";

export function PublicGuardianStatementPage() {
  const { guardian_id } = useParams<{ guardian_id: string }>();
  const [statement, setStatement] = useState<PublicGuardianStatement | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!guardian_id) {
      setLoading(false);
      setError("Link inválido.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    dataService
      .getPublicGuardianStatement(guardian_id)
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setError("Extrato do responsável não encontrado.");
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
  }, [guardian_id]);

  const pixBrCode = useMemo(() => {
    if (!statement || statement.restricted) return null;
    const { tenant, guardian } = statement;
    const total = Number(statement.saldo_total ?? 0);
    if (!tenant.pix_tipo || !tenant.pix_chave || total <= 0) return null;
    try {
      return generatePixBrCode({
        pixTipo: tenant.pix_tipo,
        pixChave: tenant.pix_chave,
        nomeRecebedor: tenant.pix_nome_recebedor || tenant.nome_loja,
        cidade: tenant.pix_cidade || "BRASIL",
        valor: total,
        txid: guardian?.id.slice(0, 8),
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
          Carregando extrato consolidado...
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
        </div>
      </div>
    );
  }

  if (statement.restricted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F8FC] p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-md">
          <Crown className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-lg font-extrabold text-slate-900">
            Extrato Consolidado Indisponível
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            A cantina <strong>{statement.tenant.nome_loja}</strong> ainda não
            ativou o extrato consolidado por responsável (Plano PRO). Solicite
            o link individual de cada aluno.
          </p>
        </div>
      </div>
    );
  }

  const total = Number(statement.saldo_total ?? 0);
  const students = statement.students ?? [];

  return (
    <div className="min-h-screen bg-[#F4F8FC] pb-10">
      <header className="bg-gradient-to-br from-[#22328B] to-[#0099F0] px-4 pb-16 pt-6 text-white">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <img
            src={statement.tenant.logo_url || "/logo-paula-lanches.jpg"}
            alt={statement.tenant.nome_loja}
            className="h-14 w-14 rounded-full border-2 border-white bg-white object-cover shadow-md"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-100">
              Extrato Consolidado da Família
            </p>
            <h1 className="text-xl font-extrabold">
              {statement.tenant.nome_loja}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-lg space-y-4 px-4">
        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-md">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Responsável Financeiro
          </p>
          <h2 className="text-lg font-extrabold text-slate-900">
            {statement.guardian?.nome}
          </h2>

          <div className="mt-4 rounded-2xl bg-[#F4F8FC] p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Consolidado ({students.length}{" "}
              {students.length === 1 ? "aluno" : "alunos"})
            </p>
            <p
              className={`tabular-nums mt-1 text-4xl font-extrabold ${
                total > 0 ? "text-[#E11D48]" : "text-[#10B981]"
              }`}
            >
              {formatCurrencyBRL(total)}
            </p>
          </div>

          {total > 0 && pixBrCode ? (
            <div className="mt-4 rounded-2xl border border-[#0099F0]/30 bg-[#E8F5FE]/60 p-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#22328B]">
                <QrCode className="h-4 w-4 text-[#0099F0]" />
                PIX Único para Quitação Total
              </p>
              <div className="mx-auto mt-3 inline-flex rounded-2xl bg-white p-3 shadow-xs">
                <QRCodeSVG value={pixBrCode} size={190} level="M" />
              </div>
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
          ) : total <= 0 ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="h-4.5 w-4.5" />
              Nenhuma pendência para os alunos vinculados.
            </div>
          ) : null}
        </section>

        {/* Detalhamento por aluno */}
        {students.map((student) => (
          <section
            key={student.id}
            className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {student.nome}
                </h3>
                {student.turma_ou_apelido && (
                  <p className="text-xs text-slate-500">
                    {student.turma_ou_apelido}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p
                  className={`tabular-nums text-base font-extrabold ${
                    student.saldo_atual > 0
                      ? "text-[#E11D48]"
                      : "text-[#10B981]"
                  }`}
                >
                  {formatCurrencyBRL(Number(student.saldo_atual))}
                </p>
                <Link
                  to={`/c/${student.public_token}`}
                  className="text-[11px] font-bold text-[#0099F0] hover:underline"
                >
                  Ver extrato individual
                </Link>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {student.transactions.length === 0 ? (
                <p className="text-xs text-slate-400">Sem lançamentos.</p>
              ) : (
                student.transactions.slice(0, 10).map((tx) => {
                  const isFiado = tx.tipo === "FIADO";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[#F4F8FC] px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isFiado ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                        )}
                        <span className="truncate font-semibold text-slate-700">
                          {tx.descricao || (isFiado ? "Fiado" : "Recebimento")}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {formatShortDate(tx.data_lancamento)}
                        </span>
                      </div>
                      <span
                        className={`tabular-nums shrink-0 font-bold ${
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
        ))}
      </main>
    </div>
  );
}
