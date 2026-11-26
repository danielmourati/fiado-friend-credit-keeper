import {
  Crown,
  Edit3,
  ExternalLink,
  MessageCircle,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import {
  formatCurrencyBRL,
  formatPhoneDisplay,
  maskPhoneInput,
} from "@/lib/formatters";
import { generatePixBrCode } from "@/lib/pix";
import {
  buildGuardianBillingMessage,
  buildWhatsAppUrl,
  getPublicOrigin,
} from "@/lib/whatsapp";
import * as dataService from "@/services/dataService";
import type { Guardian } from "@/types/database";

export function GuardiansPage() {
  const { tenant, isDemo, guardians, customers, refreshAll, showToast } =
    useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  const isPro = tenant?.plano === "PRO";

  const guardianSummaries = useMemo(() => {
    return guardians.map((g) => {
      const children = customers.filter((c) => c.guardian_id === g.id);
      const total = children.reduce(
        (acc, c) => acc + Math.max(0, c.saldo_atual),
        0
      );
      return {
        guardian: g,
        children,
        total: Math.round(total * 100) / 100,
      };
    });
  }, [guardians, customers]);

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setWhatsapp("");
    setObservacao("");
    setModalOpen(true);
  };

  const openEdit = (g: Guardian) => {
    setEditing(g);
    setNome(g.nome);
    setWhatsapp(formatPhoneDisplay(g.whatsapp));
    setObservacao(g.observacao || "");
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenant || !nome.trim() || !whatsapp.trim()) {
      showToast("Informe nome e WhatsApp do responsável.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await dataService.updateGuardian(isDemo, editing.id, {
          nome,
          whatsapp,
          observacao,
        });
        showToast("Responsável atualizado!");
      } else {
        await dataService.createGuardian(isDemo, tenant.id, {
          nome,
          whatsapp,
          observacao,
        });
        showToast("Responsável cadastrado!");
      }
      await refreshAll();
      setModalOpen(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar responsável.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: Guardian) => {
    if (
      !window.confirm(
        `Remover o responsável ${g.nome}? Os alunos continuarão cadastrados sem vínculo.`
      )
    ) {
      return;
    }
    try {
      await dataService.deleteGuardian(isDemo, g.id);
      await refreshAll();
      showToast("Responsável removido.");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao remover responsável.",
        "error"
      );
    }
  };

  const handleChargeConsolidated = (
    summary: (typeof guardianSummaries)[number]
  ) => {
    if (!tenant) return;
    if (!isPro) {
      showToast(
        "O extrato consolidado por responsável é exclusivo do Plano PRO.",
        "info"
      );
      return;
    }

    const link = `${getPublicOrigin()}/r/${summary.guardian.id}`;
    let pixCode: string | null = null;
    if (tenant.pix_tipo && tenant.pix_chave && summary.total > 0) {
      try {
        pixCode = generatePixBrCode({
          pixTipo: tenant.pix_tipo,
          pixChave: tenant.pix_chave,
          nomeRecebedor: tenant.pix_nome_recebedor || tenant.nome_loja,
          cidade: tenant.pix_cidade || "BRASIL",
          valor: summary.total,
          txid: summary.guardian.id.slice(0, 8),
        });
      } catch {
        pixCode = null;
      }
    }

    const message = buildGuardianBillingMessage({
      cantinaNome: tenant.nome_loja,
      responsavelNome: summary.guardian.nome,
      alunosResumo: summary.children.map((c) => ({
        nome: c.nome,
        saldo: c.saldo_atual,
      })),
      valorTotal: summary.total,
      publicLink: link,
      pixCopiaECola: pixCode,
    });

    window.open(
      buildWhatsAppUrl(summary.guardian.whatsapp, message),
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#22328B]">
            Responsáveis Financeiros
          </h1>
          <p className="text-xs text-slate-500">
            Pais e mães vinculados aos alunos da cantina
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#22328B] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#18256B]"
        >
          <Plus className="h-4 w-4 text-[#7AD0FF]" />
          Novo Responsável
        </button>
      </div>

      {!isPro && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">
                Extrato Consolidado por Responsável (Recurso PRO)
              </p>
              <p className="mt-0.5">
                No Plano PRO você envia 1 único link e 1 único PIX somando todos
                os filhos do mesmo responsável.
              </p>
            </div>
          </div>
          <Link
            to="/configuracoes"
            className="rounded-xl bg-[#22328B] px-3.5 py-2 text-xs font-bold text-white"
          >
            Fazer Upgrade
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {guardianSummaries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700">
              Nenhum responsável cadastrado ainda.
            </p>
          </div>
        ) : (
          guardianSummaries.map((summary) => (
            <div
              key={summary.guardian.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {summary.guardian.nome}
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    {formatPhoneDisplay(summary.guardian.whatsapp)}
                  </p>
                  {summary.guardian.observacao && (
                    <p className="mt-1 text-xs text-slate-500">
                      {summary.guardian.observacao}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Total dos filhos
                  </p>
                  <p
                    className={`tabular-nums text-lg font-extrabold ${
                      summary.total > 0 ? "text-[#E11D48]" : "text-[#10B981]"
                    }`}
                  >
                    {formatCurrencyBRL(summary.total)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {summary.children.length === 0 ? (
                  <span className="text-xs text-slate-400">
                    Nenhum aluno vinculado
                  </span>
                ) : (
                  summary.children.map((child) => (
                    <Link
                      key={child.id}
                      to="/cliente/$id"
                      params={{ id: child.id }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F8FC] px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-[#E8F5FE]"
                    >
                      <span>{child.nome}</span>
                      <span
                        className={`tabular-nums font-bold ${
                          child.saldo_atual > 0
                            ? "text-[#E11D48]"
                            : "text-[#10B981]"
                        }`}
                      >
                        {formatCurrencyBRL(child.saldo_atual)}
                      </span>
                    </Link>
                  ))
                )}
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(summary.guardian)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(summary.guardian)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-[#E11D48]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {isPro && (
                    <a
                      href={`/r/${summary.guardian.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-[#E8F5FE] px-3 py-1.5 text-xs font-bold text-[#22328B] hover:bg-[#d5edfd]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Extrato /r
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleChargeConsolidated(summary)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#10B981] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-600"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Cobrar Consolidado
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editing ? "Editar Responsável" : "Novo Responsável"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSave(e)}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Mariana Oliveira"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(maskPhoneInput(e.target.value))}
                  placeholder="(86) 99999-0000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600">
                  Observação
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Paga toda sexta-feira"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-[#22328B] py-3 text-sm font-bold text-white"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
