import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import * as dataService from "@/services/dataService";
import type {
  CustomerWithGuardian,
  Guardian,
  ReminderWithCustomer,
  Tenant,
  ToastMessage,
} from "@/types/database";

const HIDE_VALUES_KEY = "paula_lanches_hide_values";

interface AppContextValue {
  user: dataService.AuthUser | null;
  isDemo: boolean;
  loading: boolean;
  tenant: Tenant | null;
  customers: CustomerWithGuardian[];
  guardians: Guardian[];
  reminders: ReminderWithCustomer[];
  hideValues: boolean;
  toasts: ToastMessage[];
  toggleHideValues: () => void;
  showToast: (text: string, type?: ToastMessage["type"]) => void;
  dismissToast: (id: string) => void;
  refreshAll: () => Promise<void>;
  enterDemoMode: () => Promise<void>;
  signOut: () => Promise<void>;
  setTenantDirect: (tenant: Tenant) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<dataService.AuthUser | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [customers, setCustomers] = useState<CustomerWithGuardian[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [reminders, setReminders] = useState<ReminderWithCustomer[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hideValues, setHideValues] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHideValues(window.localStorage.getItem(HIDE_VALUES_KEY) === "true");
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, type: ToastMessage["type"] = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const toggleHideValues = useCallback(() => {
    setHideValues((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(HIDE_VALUES_KEY, String(next));
      }
      return next;
    });
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    try {
      const sessionInfo = await dataService.getCurrentUser();
      setUser(sessionInfo.user);
      setIsDemo(sessionInfo.isDemo);

      if (!sessionInfo.user) {
        setTenant(null);
        setCustomers([]);
        setGuardians([]);
        setReminders([]);
        return;
      }

      const loadedTenant = await dataService.fetchTenant(sessionInfo.isDemo);
      setTenant(loadedTenant);

      if (!loadedTenant) {
        setCustomers([]);
        setGuardians([]);
        setReminders([]);
        return;
      }

      const [loadedCustomers, loadedGuardians, loadedReminders] =
        await Promise.all([
          dataService.listCustomers(sessionInfo.isDemo, loadedTenant.id),
          dataService.listGuardians(sessionInfo.isDemo, loadedTenant.id),
          dataService.listReminders(sessionInfo.isDemo, loadedTenant.id),
        ]);

      setCustomers(loadedCustomers);
      setGuardians(loadedGuardians);
      setReminders(loadedReminders);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar dados.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadWorkspace();

    if (typeof window !== "undefined" && isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        if (!dataService.isDemoSessionActive()) {
          void loadWorkspace();
        }
      });
      return () => subscription.unsubscribe();
    }
    return undefined;
  }, [loadWorkspace]);

  const enterDemoMode = useCallback(async () => {
    dataService.setDemoSessionActive(true);
    await loadWorkspace();
  }, [loadWorkspace]);

  const signOut = useCallback(async () => {
    await dataService.signOutUser();
    setUser(null);
    setIsDemo(false);
    setTenant(null);
    setCustomers([]);
    setGuardians([]);
    setReminders([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        isDemo,
        loading,
        tenant,
        customers,
        guardians,
        reminders,
        hideValues,
        toasts,
        toggleHideValues,
        showToast,
        dismissToast,
        refreshAll: loadWorkspace,
        enterDemoMode,
        signOut,
        setTenantDirect: setTenant,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp deve ser usado dentro de AppProvider.");
  }
  return ctx;
}
