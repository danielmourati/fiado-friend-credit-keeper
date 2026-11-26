import { ArrowRight, CheckCircle2, QrCode, Store } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { validatePixKey } from "@/lib/pix";
import * as dataService from "@/services/dataService";
import type { PixKeyType } from "@/types/database";

export function OnboardingPage() {
  const { user, tenant, loading, isDemo, refreshAll, showToast } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [nomeLoja, setNomeLoja] = useState("Paula Lanches");
  const [pixTipo, setPixTipo] = useState<PixKeyType>("TELEFONE");
  const [pixChave, setPixChave] = useState("");
  const [pixNomeRecebedor, setPixNomeRecebedor] = useState("");
  const [pixCidade, setPixCidade] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/login", replace: true });
    } else if (tenant) {
      void navigate({ to: "/", replace: true });
    }
  }, [loading, user, tenant, navigate]);

  const handleStep1 = (e: FormEvent) => {
    e.preventDefault();
    if (!nomeLoja.trim()) {
      showToast("Informe o nome da sua cantina ou lanchonete.", "error");
      return;
    }
    if (!pixNomeRecebedor.trim()) {
      setPixNomeRecebedor(nomeLoja.trim().toUpperCase().slice(0, 25));
    }
    setStep(2);
  };

  const handleFinish = async (skipPix = false) => {
    if (!skipPix && pixChave.trim()) {
      const err = validatePixKey(pixTipo, pixChave);
      if (err) {
        showToast(err, "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      await dataService.createTenantOnboarding(isDemo, {
        nome_loja: nomeLoja,
        pix_tipo: !skipPix && pixChave.trim() ? pixTipo : null,
        pix_chave: !skipPix && pixChave.trim() ? pixChave : null,
        pix_nome_recebedor:
          !skipPix && pixChave.trim() ? pixNomeRecebedor || nomeLoja : null,
        pix_cidade: !skipPix && pixChave.trim() ? pixCidade || "BRASIL" : null,
      });
      await refreshAll();
      showToast("Cantina configurada! Bom trabalho no balcão.");
      void navigate({ to: "/", replace: true });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao criar cantina.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F8FC] px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <img
            src="/logo-paula-lanches.jpg"
            alt="Paula Lanches"
            className="h-12 w-12 rounded-full border-2 border-[#0099F0] object-cover"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#0099F0]">
              Passo {step} de 2
            </p>
            <h1 className="text-xl font-extrabold text-[#22328B]">
              Configuração Rápida
            </h1>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[#22328B]" />
          <div
            className={`h-1.5 flex-1 rounded-full transition ${
              step === 2 ? "bg-[#22328B]" : "bg-slate-200"
            }`}
          />
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1} className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Store className="h-4.5 w-4.5 text-[#0099F0]" />
              Qual o nome da sua lanchonete ou cantina?
            </div>
            <input
              type="text"
              required
              value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              placeholder="Ex: Paula Lanches"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium outline-none focus:border-[#0099F0]"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22328B] py-3.5 text-sm font-bold text-white transition hover:bg-[#18256B]"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <QrCode className="h-4.5 w-4.5 text-[#0099F0]" />
              Configure sua Chave PIX (para cobranças)
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-600">
                  Tipo
                </label>
                <select
                  value={pixTipo}
                  onChange={(e) => setPixTipo(e.target.value as PixKeyType)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                >
                  <option value="TELEFONE">Telefone</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="ALEATORIA">Aleatória</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={pixChave}
                  onChange={(e) => setPixChave(e.target.value)}
                  placeholder="Digite sua chave PIX"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-600">
                  Nome do Recebedor
                </label>
                <input
                  type="text"
                  value={pixNomeRecebedor}
                  onChange={(e) => setPixNomeRecebedor(e.target.value)}
                  placeholder="PAULA LANCHES"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600">
                  Cidade
                </label>
                <input
                  type="text"
                  value={pixCidade}
                  onChange={(e) => setPixCidade(e.target.value)}
                  placeholder="Parnaíba"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinish(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22328B] py-3.5 text-sm font-bold text-white transition hover:bg-[#18256B] disabled:opacity-60"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                {submitting ? "Salvando..." : "Concluir e Abrir Balcão"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinish(true)}
                className="w-full rounded-2xl py-2.5 text-xs font-bold text-slate-500 transition hover:text-slate-700"
              >
                Configurar PIX depois
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
