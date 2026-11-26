import { Crown, GraduationCap, User, UserPlus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import {
  formatPhoneDisplay,
  maskCurrencyInput,
  maskPhoneInput,
  numberToMaskedCurrency,
  parseCurrencyInput,
} from "@/lib/formatters";
import * as dataService from "@/services/dataService";
import type { CustomerWithGuardian } from "@/types/database";

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  editingCustomer?: CustomerWithGuardian | null | undefined;
  onSaved?: ((customerId: string) => void) | undefined;
}

export function CustomerFormModal({
  open,
  onClose,
  editingCustomer,
  onSaved,
}: CustomerFormModalProps) {
  const { tenant, isDemo, customers, guardians, refreshAll, showToast } =
    useApp();

  const [mode, setMode] = useState<"ALUNO" | "COMUM">("ALUNO");
  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [limiteStr, setLimiteStr] = useState("");

  const [guardianId, setGuardianId] = useState<string>("");
  const [createNewGuardian, setCreateNewGuardian] = useState(false);
  const [newGuardianNome, setNewGuardianNome] = useState("");
  const [newGuardianWhatsapp, setNewGuardianWhatsapp] = useState("");
  const [newGuardianObs, setNewGuardianObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(editingCustomer);
  const freeLimitReached =
    !isEditing && tenant?.plano === "FREE" && customers.length >= 15;

  useEffect(() => {
    if (!open) return;
    if (editingCustomer) {
      const isStudent =
        Boolean(editingCustomer.guardian_id) ||
        Boolean(editingCustomer.turma_ou_apelido);
      setMode(isStudent ? "ALUNO" : "COMUM");
      setNome(editingCustomer.nome);
      setTurma(editingCustomer.turma_ou_apelido || "");
      setWhatsapp(formatPhoneDisplay(editingCustomer.whatsapp));
      setLimiteStr(
        editingCustomer.limite_credito !== null
          ? numberToMaskedCurrency(editingCustomer.limite_credito)
          : ""
      );
      setGuardianId(editingCustomer.guardian_id || "");
      setCreateNewGuardian(false);
    } else {
      setMode("ALUNO");
      setNome("");
      setTurma("");
      setWhatsapp("");
      setLimiteStr("");
      setGuardianId(guardians[0]?.id ?? "");
      setCreateNewGuardian(guardians.length === 0);
      setNewGuardianNome("");
      setNewGuardianWhatsapp("");
      setNewGuardianObs("");
    }
  }, [open, editingCustomer, guardians]);

  if (!open || !tenant) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (freeLimitReached) return;

    if (!nome.trim()) {
      showToast("Informe o nome do cliente ou aluno.", "error");
      return;
    }

    if (mode === "COMUM" && !whatsapp.trim()) {
      showToast("Informe o WhatsApp do cliente.", "error");
      return;
    }

    if (mode === "ALUNO" && createNewGuardian) {
      if (!newGuardianNome.trim() || !newGuardianWhatsapp.trim()) {
        showToast("Preencha nome e WhatsApp do responsável.", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      let resolvedGuardianId: string | null = null;
      if (mode === "ALUNO") {
        if (createNewGuardian) {
          const createdGuardian = await dataService.createGuardian(
            isDemo,
            tenant.id,
            {
              nome: newGuardianNome,
              whatsapp: newGuardianWhatsapp,
              observacao: newGuardianObs,
            }
          );
          resolvedGuardianId = createdGuardian.id;
        } else {
          resolvedGuardianId = guardianId || null;
        }
      }

      const limiteNum = limiteStr ? parseCurrencyInput(limiteStr) : null;
      const payload = {
        nome,
        turma_ou_apelido: mode === "ALUNO" ? turma : turma || null,
        whatsapp: mode === "COMUM" ? whatsapp : null,
        guardian_id: resolvedGuardianId,
        limite_credito: limiteNum && limiteNum > 0 ? limiteNum : null,
      };

      let savedId: string;
      if (editingCustomer) {
        const updated = await dataService.updateCustomer(
          isDemo,
          editingCustomer.id,
          payload
        );
        savedId = updated.id;
        showToast("Cadastro atualizado com sucesso!");
      } else {
        const created = await dataService.createCustomer(
          isDemo,
          tenant,
          payload
        );
        savedId = created.id;
        showToast("Cliente cadastrado com sucesso!");
      }

      await refreshAll();
      onClose();
      onSaved?.(savedId);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar cadastro.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? "Editar Cadastro" : "Novo Cliente / Aluno"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {freeLimitReached ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Crown className="h-6 w-6" />
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-900">
              Limite de 15 clientes do Plano FREE atingido
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Faça upgrade para o Plano PRO para cadastrar alunos e clientes
              ilimitados, usar atalhos rápidos e consolidar cobranças por
              responsável.
            </p>
            <Link
              to="/configuracoes"
              onClick={onClose}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#22328B] px-5 py-2.5 text-sm font-bold text-white"
            >
              <Crown className="h-4 w-4 text-[#0099F0]" />
              Conhecer Plano PRO
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F4F8FC] p-1">
              <button
                type="button"
                onClick={() => setMode("ALUNO")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                  mode === "ALUNO"
                    ? "bg-[#22328B] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Aluno (Cantina)
              </button>
              <button
                type="button"
                onClick={() => setMode("COMUM")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                  mode === "COMUM"
                    ? "bg-[#22328B] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="h-4 w-4" />
                Cliente Comum
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                {mode === "ALUNO" ? "Nome do Aluno *" : "Nome do Cliente *"}
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={
                  mode === "ALUNO"
                    ? "Ex: Lucas Oliveira"
                    : "Ex: Prof. Ana Cláudia"
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0099F0] focus:ring-2 focus:ring-[#0099F0]/20"
              />
            </div>

            {mode === "ALUNO" ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Turma / Turno
                    </label>
                    <input
                      type="text"
                      value={turma}
                      onChange={(e) => setTurma(e.target.value)}
                      placeholder="Ex: 7º Ano B - Manhã"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0099F0] focus:ring-2 focus:ring-[#0099F0]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Limite de Fiado (Opcional)
                    </label>
                    <div className="relative mt-1.5">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={limiteStr}
                        onChange={(e) =>
                          setLimiteStr(maskCurrencyInput(e.target.value))
                        }
                        placeholder="0,00"
                        className="tabular-nums w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-[#0099F0] focus:ring-2 focus:ring-[#0099F0]/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#F4F8FC]/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#22328B]">
                      Responsável Financeiro (Pai/Mãe)
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreateNewGuardian((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#E8F5FE] px-2.5 py-1 text-xs font-bold text-[#22328B] transition hover:bg-[#d6edfd]"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {createNewGuardian
                        ? "Selecionar existente"
                        : "+ Novo Responsável"}
                    </button>
                  </div>

                  {!createNewGuardian ? (
                    <select
                      value={guardianId}
                      onChange={(e) => setGuardianId(e.target.value)}
                      className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                    >
                      <option value="">Sem responsável vinculado</option>
                      {guardians.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nome} ({formatPhoneDisplay(g.whatsapp)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      <input
                        type="text"
                        value={newGuardianNome}
                        onChange={(e) => setNewGuardianNome(e.target.value)}
                        placeholder="Nome do responsável (Ex: Mariana Oliveira)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0099F0]"
                      />
                      <input
                        type="tel"
                        inputMode="tel"
                        value={newGuardianWhatsapp}
                        onChange={(e) =>
                          setNewGuardianWhatsapp(maskPhoneInput(e.target.value))
                        }
                        placeholder="WhatsApp (DDD + número)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0099F0]"
                      />
                      <input
                        type="text"
                        value={newGuardianObs}
                        onChange={(e) => setNewGuardianObs(e.target.value)}
                        placeholder="Observação (Ex: Paga toda sexta)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0099F0]"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                    WhatsApp *
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(maskPhoneInput(e.target.value))}
                    placeholder="(86) 99999-0000"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0099F0] focus:ring-2 focus:ring-[#0099F0]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Limite de Fiado (Opcional)
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={limiteStr}
                      onChange={(e) =>
                        setLimiteStr(maskCurrencyInput(e.target.value))
                      }
                      placeholder="0,00"
                      className="tabular-nums w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-[#0099F0] focus:ring-2 focus:ring-[#0099F0]/20"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Setor / Apelido (Opcional)
                  </label>
                  <input
                    type="text"
                    value={turma}
                    onChange={(e) => setTurma(e.target.value)}
                    placeholder="Ex: Coordenação, Portaria, Vizinho"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0099F0] focus:ring-2 focus:ring-[#0099F0]/20"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-2xl bg-[#22328B] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#18256B] disabled:opacity-60"
              >
                {submitting
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar Alterações"
                    : "Cadastrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
