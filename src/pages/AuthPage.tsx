import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as dataService from "@/services/dataService";

export function AuthPage() {
  const { user, tenant, loading, enterDemoMode, refreshAll, showToast } =
    useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && tenant) {
      void navigate({ to: "/", replace: true });
    } else if (user && !tenant) {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, user, tenant, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      await enterDemoMode();
      void navigate({ to: "/", replace: true });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "LOGIN") {
        await dataService.signInWithEmail(email, password);
        await refreshAll();
        void navigate({ to: "/", replace: true });
      } else {
        const res = await dataService.signUpWithEmail(email, password);
        if (res.needsEmailConfirmation) {
          showToast(
            "Conta criada! Verifique seu e-mail para confirmar o acesso.",
            "info"
          );
        } else {
          await refreshAll();
          void navigate({ to: "/onboarding", replace: true });
        }
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao autenticar.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoClick = async () => {
    await enterDemoMode();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#22328B] via-[#1B2B7A] to-[#0099F0] px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo-paula-lanches.jpg"
            alt="Paula Lanches"
            className="h-24 w-24 rounded-full border-4 border-[#0099F0] object-cover shadow-md"
          />
          <h1 className="mt-4 text-2xl font-extrabold text-[#22328B]">
            Paula Lanches
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Controle de fiado rápido no balcão para cantinas e lanchonetes
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mt-5 rounded-2xl border border-[#0099F0]/30 bg-[#E8F5FE] p-3.5 text-center">
            <p className="text-xs font-bold text-[#22328B]">
              Ambiente sem variáveis Supabase configuradas
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Você pode testar todas as telas, PIX BR Code e fluxo completo no
              Modo Demonstração local.
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#F4F8FC] p-1">
          <button
            type="button"
            onClick={() => setMode("LOGIN")}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              mode === "LOGIN"
                ? "bg-[#22328B] text-white shadow-sm"
                : "text-slate-600"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("SIGNUP")}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              mode === "SIGNUP"
                ? "bg-[#22328B] text-white shadow-sm"
                : "text-slate-600"
            }`}
          >
            Criar Conta
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-4 space-y-3.5"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
              E-mail
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required={isSupabaseConfigured}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cantina@exemplo.com.br"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
              Senha
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required={isSupabaseConfigured}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-[#0099F0]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22328B] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#18256B] disabled:opacity-60"
          >
            {submitting
              ? "Carregando..."
              : mode === "LOGIN"
                ? "Acessar Cantina"
                : "Criar Minha Cantina"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => void handleDemoClick()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#0099F0] bg-[#E8F5FE] py-3 text-sm font-bold text-[#22328B] transition hover:bg-[#d7eefc]"
          >
            <Sparkles className="h-4 w-4 text-[#0099F0]" />
            Testar Agora (Modo Demonstração)
          </button>
        </div>
      </div>
    </div>
  );
}
