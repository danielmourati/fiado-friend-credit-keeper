import {
  Bell,
  Crown,
  Home,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/contexts/AppContext";

const NAV_ITEMS = [
  { to: "/" as const, label: "Início", icon: Home },
  { to: "/responsaveis" as const, label: "Pais / Resp.", icon: Users },
  { to: "/lembretes" as const, label: "Lembretes", icon: Bell },
  { to: "/configuracoes" as const, label: "Ajustes", icon: Settings },
];

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { user, tenant, loading } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/login", replace: true });
    } else if (!tenant) {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, user, tenant, navigate]);

  if (loading || !user || !tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F4F8FC]">
        <img
          src="/logo-paula-lanches.jpg"
          alt="Paula Lanches"
          className="h-16 w-16 animate-pulse rounded-full border-2 border-[#0099F0] object-cover"
        />
        <p className="text-xs font-bold text-[#22328B]">
          Carregando Paula Lanches...
        </p>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}

export function Layout({ children }: { children: ReactNode }) {
  const { tenant, isDemo, reminders, signOut } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const pendingRemindersCount = reminders.filter((r) => !r.concluido).length;

  const isNavActive = (path: string) => {
    if (path === "/") {
      return (
        location.pathname === "/" || location.pathname.startsWith("/cliente/")
      );
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F4F8FC] md:flex">
      {/* Sidebar Compacta Desktop */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:bg-[#22328B] md:text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img
            src={tenant?.logo_url || "/logo-paula-lanches.jpg"}
            alt={tenant?.nome_loja || "Paula Lanches"}
            className="h-11 w-11 rounded-xl border-2 border-[#0099F0] bg-white object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {tenant?.nome_loja || "Paula Lanches"}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  tenant?.plano === "PRO"
                    ? "bg-[#0099F0] text-white"
                    : "bg-white/15 text-white/90"
                }`}
              >
                {tenant?.plano === "PRO" && <Crown className="h-2.5 w-2.5" />}
                {tenant?.plano || "FREE"}
              </span>
              {isDemo && (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  DEMO
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[#0099F0] text-white shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </span>
                {item.to === "/lembretes" && pendingRemindersCount > 0 && (
                  <span className="rounded-full bg-[#E11D48] px-2 py-0.5 text-[11px] font-bold text-white">
                    {pendingRemindersCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {tenant?.plano === "FREE" && (
            <Link
              to="/configuracoes"
              className="mb-3 block rounded-xl bg-white/10 p-3 text-xs transition hover:bg-white/15"
            >
              <p className="flex items-center gap-1.5 font-bold text-[#67C6FF]">
                <Crown className="h-3.5 w-3.5" />
                Assinar Plano PRO
              </p>
              <p className="mt-1 text-white/80">
                Clientes ilimitados, atalhos rápidos e extrato por responsável.
              </p>
            </Link>
          )}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Coluna Principal */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header Mobile */}
        <header className="pt-safe sticky top-0 z-30 flex items-center justify-between bg-[#22328B] px-4 py-3 text-white shadow-sm md:hidden">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src={tenant?.logo_url || "/logo-paula-lanches.jpg"}
              alt={tenant?.nome_loja || "Paula Lanches"}
              className="h-9 w-9 shrink-0 rounded-full border-2 border-[#0099F0] bg-white object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">
                {tenant?.nome_loja || "Paula Lanches"}
              </p>
              <p className="text-[11px] text-[#8CD5FF]">Controle de Fiado</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                DEMO
              </span>
            )}
            <Link
              to="/configuracoes"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                tenant?.plano === "PRO"
                  ? "bg-[#0099F0] text-white"
                  : "bg-white/15 text-white"
              }`}
            >
              {tenant?.plano === "PRO" && <Crown className="h-3 w-3" />}
              {tenant?.plano || "FREE"}
            </Link>
          </div>
        </header>

        {/* Conteúdo das páginas */}
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">
          {children}
        </main>

        {/* Barra Inferior Mobile */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition ${
                  active ? "text-[#22328B]" : "text-slate-500"
                }`}
              >
                <div
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition ${
                    active ? "bg-[#E8F5FE] text-[#22328B]" : ""
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span>{item.label}</span>
                {item.to === "/lembretes" && pendingRemindersCount > 0 && (
                  <span className="absolute right-4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold text-white">
                    {pendingRemindersCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
