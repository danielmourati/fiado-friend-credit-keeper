import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ToastContainer } from "@/components/ToastContainer";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { AuthPage } from "@/pages/AuthPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GuardiansPage } from "@/pages/GuardiansPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { PublicCustomerStatementPage } from "@/pages/PublicCustomerStatementPage";
import { PublicGuardianStatementPage } from "@/pages/PublicGuardianStatementPage";
import { RemindersPage } from "@/pages/RemindersPage";
import { SettingsPage } from "@/pages/SettingsPage";

function ProtectedShell({ children }: { children: ReactNode }) {
  const { user, tenant, loading } = useApp();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F8FC] gap-3">
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!tenant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function OnboardingGate() {
  const { user, tenant, loading } = useApp();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (tenant) return <Navigate to="/" replace />;
  return <OnboardingPage />;
}

function LoginGate() {
  const { user, tenant, loading } = useApp();
  if (loading) return null;
  if (user && tenant) return <Navigate to="/" replace />;
  if (user && !tenant) return <Navigate to="/onboarding" replace />;
  return <AuthPage />;
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          {/* Rotas públicas (não exigem login) */}
          <Route
            path="/c/:public_token"
            element={<PublicCustomerStatementPage />}
          />
          <Route
            path="/r/:guardian_id"
            element={<PublicGuardianStatementPage />}
          />

          {/* Autenticação e Onboarding */}
          <Route path="/login" element={<LoginGate />} />
          <Route path="/onboarding" element={<OnboardingGate />} />

          {/* Rotas autenticadas (Mobile-first Layout) */}
          <Route
            element={
              <ProtectedShell>
                <Layout />
              </ProtectedShell>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cliente/:id" element={<CustomerDetailPage />} />
            <Route path="/responsaveis" element={<GuardiansPage />} />
            <Route path="/lembretes" element={<RemindersPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
