import {
  Check,
  Crown,
  LogOut,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Sparkles,
  Store,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import {
  formatCurrencyBRL,
  maskCurrencyInput,
  parseCurrencyInput,
} from "@/lib/formatters";
import { validatePixKey } from "@/lib/pix";
import * as dataService from "@/services/dataService";
import type { PixKeyType, QuickShortcut } from "@/types/database";

export function SettingsPage() {
  const { tenant, isDemo, refreshAll, showToast, signOut } = useApp();
  const navigate = useNavigate();

  const [nomeLoja, setNomeLoja] = useState("");
  const [mensagemWhatsapp, setMensagemWhatsapp] = useState("");

  const [pixTipo, setPixTipo] = useState<PixKeyType>("TELEFONE");
  const [pixChave, setPixChave] = useState("");
  const [pixNomeRecebedor, setPixNomeRecebedor] = useState("");
  const [pixCidade, setPixCidade] = useState("");

  const [shortcuts, setShortcuts] = useState<QuickShortcut[]>([]);
  const [newChipName, setNewChipName] = useState("");
  const [newChipValueStr, setNewChipValueStr] = useState("");

  const [savingStore, setSavingStore] = useState(false);
  const [savingPix, setSavingPix] = useState(false);
  const [savingShortcuts, setSavingShortcuts] = useState(false);
  const [subscribingMp, setSubscribingMp] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setNomeLoja(tenant.nome_loja);
    setMensagemWhatsapp(tenant.mensagem_padrao_whatsapp);
    setPixTipo(tenant.pix_tipo ?? "TELEFONE");
    setPixChave(tenant.pix_chave ?? "");
    setPixNomeRecebedor(tenant.pix_nome_recebedor ?? tenant.nome_loja);
    setPixCidade(tenant.pix_cidade ?? "");
    setShortcuts(tenant.atalhos_rapidos ?? []);
  }, [tenant]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("assinatura");
    if (status === "sucesso") {
      showToast(
        "Pagamento recebido! Seu Plano PRO será ativado em instantes.",
        "success"
      );
      void refreshAll();
    } else if (status === "pendente") {
      showToast("Pagamento pendente de confirmação no Mercado Pago.", "info");
    } else if (status === "erro") {
      showToast("Não foi possível concluir a assinatura.", "error");
    }
  }, [refreshAll, showToast]);

  if (!tenant) return null;

  const isPro = tenant.plano === "PRO";

  const handleSaveStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!nomeLoja.trim()) {
      showToast("Informe o nome da loja.", "error");
      return;
    }
    setSavingStore(true);
    try {
      await dataService.updateTenantSettings(isDemo, tenant.id, {
        nome_loja: nomeLoja.trim(),
        mensagem_padrao_whatsapp: mensagemWhatsapp.trim(),
      });
      await refreshAll();
      showToast("Dados da cantina salvos!");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar cantina.",
        "error"
      );
    } finally {
      setSavingStore(false);
    }
  };

  const handleSavePix = async (e: FormEvent) => {
    e.preventDefault();
    if (pixChave.trim()) {
      const err = validatePixKey(pixTipo, pixChave);
      if (err) {
        showToast(err, "error");
        return;
      }
      if (!pixNomeRecebedor.trim() || !pixCidade.trim()) {
        showToast(
          "Informe Nome do Recebedor e Cidade para o padrão PIX do Banco Central.",
          "error"
        );
        return;
      }
    }

    setSavingPix(true);
    try {
      await dataService.updateTenantSettings(isDemo, tenant.id, {
        pix_tipo: pixChave.trim() ? pixTipo : null,
        pix_chave: pixChave.trim() || null,
        pix_nome_recebedor: pixNomeRecebedor.trim() || null,
        pix_cidade: pixCidade.trim() || null,
      });
      await refreshAll();
      showToast("Configuração PIX salva com sucesso!");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar chave PIX.",
        "error"
      );
    } finally {
      setSavingPix(false);
    }
  };

  const handleAddChip = () => {
    if (!isPro) {
      showToast("Atalhos rápidos fazem parte do Plano PRO.", "info");
      return;
    }
    if (shortcuts.length >= 6) {
      showToast("Limite máximo de 6 atalhos rápidos atingido.", "error");
      return;
    }
    const valor = parseCurrencyInput(newChipValueStr);
    if (!newChipName.trim() || valor <= 0) {
      showToast("Informe o nome e um valor válido para o atalho.", "error");
      return;
    }
    setShortcuts((prev) => [...prev, { nome: newChipName.trim(), valor }]);
    setNewChipName("");
    setNewChipValueStr("");
  };

  const handleRemoveChip = (index: number) => {
    setShortcuts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveShortcuts = async () => {
    setSavingShortcuts(true);
    try {
      await dataService.updateTenantSettings(isDemo, tenant.id, {
        atalhos_rapidos: shortcuts.slice(0, 6),
      });
      await refreshAll();
      showToast("Atalhos rápidos atualizados!");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao salvar atalhos.",
        "error"
      );
    } finally {
      setSavingShortcuts(false);
    }
  };

  const handleSubscribePro = async () => {
    if (isDemo) {
      const nextPlan = isPro ? "FREE" : "PRO";
      await dataService.updateTenantSettings(true, tenant.id, {
        plano: nextPlan,
      });
      await refreshAll();
      showToast(`Modo Demo alternado para Plano ${nextPlan}!`);
      return;
    }

    setSubscribingMp(true);
    try {
      const { checkout_url } = await dataService.createMpCheckoutSession();
      window.location.href = checkout_url;
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao abrir checkout.",
        "error"
      );
      setSubscribingMp(false);
    }
  };

  const handleResetDemo = async () => {
    dataService.resetDemoDatabase();
    await refreshAll();
    showToast("Dados de demonstração restaurados!");
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-[#22328B]">
          Configurações da Cantina
        </h1>
        <p className="text-xs text-slate-500">
          Chave PIX, atalhos de lançamento no balcão e assinatura
        </p>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-[#22328B] to-[#0099F0] p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              Plano Atual: {tenant.plano}
            </span>
            <h2 className="mt-2 text-lg font-extrabold">
              {isPro
                ? "Sua cantina está no Plano PRO!"
                : "Evolua para o Plano PRO"}
            </h2>
            <p className="text-xs text-sky-100">
              {isPro
                ? "Clientes ilimitados, atalhos rápidos, lembretes e extrato consolidado por responsável ativos."
                : "Desbloqueie clientes ilimitados, atalhos rápidos no balcão, lembretes e extrato consolidado."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/10 p-3.5 text-xs">
            <p className="font-extrabold text-white">Plano FREE</p>
            <ul className="mt-2 space-y-1 text-sky-100">
              <li>• Até 15 clientes ativos</li>
              <li>• PIX BR Code + WhatsApp</li>
              <li>• Sem atalhos rápidos</li>
              <li>• Sem extrato consolidado de pais</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-3.5 text-xs text-slate-800 shadow-sm">
            <p className="flex items-center gap-1 font-extrabold text-[#22328B]">
              <Crown className="h-3.5 w-3.5 text-[#0099F0]" />
              Plano PRO — R$ 29,90/mês
            </p>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                Clientes e alunos ilimitados
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                Atalhos rápidos no balcão
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                Lembretes de cobrança
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#10B981]" />
                Extrato consolidado por responsável
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {(!isPro || isDemo) && (
            <button
              type="button"
              disabled={subscribingMp}
              onClick={() => void handleSubscribePro()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-[#22328B] shadow-sm transition hover:bg-sky-50 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4 text-[#0099F0]" />
              {isDemo
                ? `Simular troca para ${isPro ? "FREE" : "PRO"} (Demo)`
                : subscribingMp
                  ? "Abrindo Mercado Pago..."
                  : "Assinar Plano PRO"}
            </button>
          )}
          {isDemo && (
            <button
              type="button"
              onClick={() => void handleResetDemo()}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white/15 px-4 py-3 text-xs font-bold text-white hover:bg-white/25"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar Dados Demo
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-[#0099F0]" />
          <h2 className="text-base font-extrabold text-slate-900">
            Chave PIX (Padrão Banco Central BR Code)
          </h2>
        </div>

        <form
          onSubmit={(e) => void handleSavePix(e)}
          className="mt-4 space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600">
                Tipo da Chave
              </label>
              <select
                value={pixTipo}
                onChange={(e) => setPixTipo(e.target.value as PixKeyType)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-[#F4F8FC] px-3 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              >
                <option value="TELEFONE">Telefone</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="ALEATORIA">Aleatória (EVP)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Chave PIX
              </label>
              <input
                type="text"
                value={pixChave}
                onChange={(e) => setPixChave(e.target.value)}
                placeholder="Ex: (86) 99912-3456"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600">
                Nome do Recebedor (máx. 25)
              </label>
              <input
                type="text"
                maxLength={25}
                value={pixNomeRecebedor}
                onChange={(e) => setPixNomeRecebedor(e.target.value)}
                placeholder="PAULA LANCHES CANTINA"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600">
                Cidade (máx. 15)
              </label>
              <input
                type="text"
                maxLength={15}
                value={pixCidade}
                onChange={(e) => setPixCidade(e.target.value)}
                placeholder="PARNAIBA"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPix}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#22328B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#18256B]"
          >
            <Save className="h-4 w-4" />
            {savingPix ? "Salvando..." : "Salvar Chave PIX"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#0099F0]" />
            <h2 className="text-base font-extrabold text-slate-900">
              Atalhos Rápidos no Balcão (até 6)
            </h2>
          </div>
          {!isPro && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              <Crown className="h-3 w-3" />
              PRO
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {shortcuts.map((chip, idx) => (
            <div
              key={`${chip.nome}-${idx}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#0099F0]/30 bg-[#E8F5FE] py-1.5 pl-3.5 pr-2 text-xs font-bold text-[#22328B]"
            >
              <span>
                {chip.nome} • {formatCurrencyBRL(Number(chip.valor))}
              </span>
              <button
                type="button"
                disabled={!isPro}
                onClick={() => handleRemoveChip(idx)}
                className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-[#E11D48] disabled:opacity-40"
                aria-label={`Remover atalho ${chip.nome}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
          <input
            type="text"
            disabled={!isPro}
            value={newChipName}
            onChange={(e) => setNewChipName(e.target.value)}
            placeholder="Nome (Ex: Coxinha)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0099F0] disabled:bg-slate-100 sm:col-span-6"
          />
          <input
            type="text"
            inputMode="numeric"
            disabled={!isPro}
            value={newChipValueStr}
            onChange={(e) =>
              setNewChipValueStr(maskCurrencyInput(e.target.value))
            }
            placeholder="Valor (Ex: 6,00)"
            className="tabular-nums rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0099F0] disabled:bg-slate-100 sm:col-span-3"
          />
          <button
            type="button"
            disabled={!isPro || shortcuts.length >= 6}
            onClick={handleAddChip}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0099F0] px-3 py-2 text-xs font-bold text-white disabled:opacity-40 sm:col-span-3"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        <button
          type="button"
          disabled={!isPro || savingShortcuts}
          onClick={() => void handleSaveShortcuts()}
          className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#22328B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#18256B] disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {savingShortcuts ? "Salvando..." : "Salvar Atalhos"}
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-[#0099F0]" />
          <h2 className="text-base font-extrabold text-slate-900">
            Dados da Cantina & Mensagem Padrão
          </h2>
        </div>

        <form
          onSubmit={(e) => void handleSaveStore(e)}
          className="mt-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600">
              Nome da Lanchonete / Cantina
            </label>
            <input
              type="text"
              required
              value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0099F0]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600">
              Mensagem Padrão do WhatsApp
            </label>
            <textarea
              rows={4}
              value={mensagemWhatsapp}
              onChange={(e) => setMensagemWhatsapp(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#0099F0]"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Variáveis disponíveis: {"{cantina}"}, {"{cliente}"},{" "}
              {"{responsavel}"}, {"{valor}"}, {"{link}"}, {"{pix}"}
            </p>
          </div>

          <button
            type="submit"
            disabled={savingStore}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#22328B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#18256B]"
          >
            <Save className="h-4 w-4" />
            {savingStore ? "Salvando..." : "Salvar Cantina"}
          </button>
        </form>
      </section>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3 text-sm font-bold text-[#E11D48]"
        >
          <LogOut className="h-4 w-4" />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
