import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeBrazilianPhone } from "@/lib/whatsapp";
import {
  createInitialDemoDatabase,
  type DemoDatabase,
} from "@/services/demoSeed";
import type {
  Customer,
  CustomerWithGuardian,
  Guardian,
  PixKeyType,
  PlanType,
  PublicCustomerStatement,
  PublicGuardianStatement,
  QuickShortcut,
  Reminder,
  ReminderWithCustomer,
  Tenant,
  Transaction,
  TransactionType,
} from "@/types/database";
import type { Database, Json } from "@/integrations/supabase/types";

const DEMO_DB_KEY = "paula_lanches_demo_db_v1";
const DEMO_MODE_KEY = "paula_lanches_demo_active_v1";

export interface AuthUser {
  id: string;
  email: string;
}

function safeGetStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function generateUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadDemoDb(): DemoDatabase {
  const raw = safeGetStorage(DEMO_DB_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DemoDatabase;
    } catch {
      // reset below if corrupted
    }
  }
  const initial = createInitialDemoDatabase();
  safeSetStorage(DEMO_DB_KEY, JSON.stringify(initial));
  return initial;
}

function saveDemoDb(db: DemoDatabase): void {
  safeSetStorage(DEMO_DB_KEY, JSON.stringify(db));
}

function recalculateDemoCustomer(db: DemoDatabase, customerId: string): void {
  const txs = db.transactions.filter((t) => t.customer_id === customerId);
  const saldo = txs.reduce(
    (acc, tx) =>
      tx.tipo === "FIADO" ? acc + Number(tx.valor) : acc - Number(tx.valor),
    0
  );
  const roundedSaldo = Math.round(saldo * 100) / 100;
  const firstTx = txs[0];
  const lastAt = firstTx
    ? txs.reduce(
        (latest, tx) => (tx.created_at > latest ? tx.created_at : latest),
        firstTx.created_at
      )
    : null;

  db.customers = db.customers.map((c) =>
    c.id === customerId
      ? { ...c, saldo_atual: roundedSaldo, ultima_movimentacao_em: lastAt }
      : c
  );
}

function mapTenantRow(row: unknown): Tenant {
  const r = row as Record<string, unknown>;
  const rawShortcuts = Array.isArray(r["atalhos_rapidos"])
    ? (r["atalhos_rapidos"] as QuickShortcut[])
    : [];
  return {
    id: String(r["id"] ?? ""),
    owner_id: String(r["owner_id"] ?? ""),
    nome_loja: String(r["nome_loja"] ?? ""),
    logo_url: (r["logo_url"] as string | null) ?? null,
    pix_tipo: (r["pix_tipo"] as PixKeyType | null) ?? null,
    pix_chave: (r["pix_chave"] as string | null) ?? null,
    pix_nome_recebedor: (r["pix_nome_recebedor"] as string | null) ?? null,
    pix_cidade: (r["pix_cidade"] as string | null) ?? null,
    mensagem_padrao_whatsapp: String(r["mensagem_padrao_whatsapp"] ?? ""),
    atalhos_rapidos: rawShortcuts.map((s) => ({
      nome: String(s.nome ?? ""),
      valor: Number(s.valor ?? 0),
    })),
    plano: (r["plano"] as PlanType) === "PRO" ? "PRO" : "FREE",
    mp_subscription_id: (r["mp_subscription_id"] as string | null) ?? null,
    plano_expira_em: (r["plano_expira_em"] as string | null) ?? null,
    created_at: String(r["created_at"] ?? ""),
  };
}

export function isDemoSessionActive(): boolean {
  if (!isSupabaseConfigured) {
    return safeGetStorage(DEMO_MODE_KEY) !== "false";
  }
  return safeGetStorage(DEMO_MODE_KEY) === "true";
}

export function setDemoSessionActive(active: boolean): void {
  safeSetStorage(DEMO_MODE_KEY, active ? "true" : "false");
}

export function resetDemoDatabase(): DemoDatabase {
  const fresh = createInitialDemoDatabase();
  saveDemoDb(fresh);
  return fresh;
}

// ----------------------------------------------------------------------------
// Auth
// ----------------------------------------------------------------------------
export async function getCurrentUser(): Promise<{
  user: AuthUser | null;
  isDemo: boolean;
}> {
  if (typeof window === "undefined") {
    return { user: null, isDemo: false };
  }

  if (isSupabaseConfigured && supabase && !isDemoSessionActive()) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      return {
        user: { id: data.user.id, email: data.user.email ?? "" },
        isDemo: false,
      };
    }
    return { user: null, isDemo: false };
  }

  if (isDemoSessionActive()) {
    return {
      user: { id: "demo-owner", email: "paula@paulalanches.com.br" },
      isDemo: true,
    };
  }

  return { user: null, isDemo: false };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    setDemoSessionActive(true);
    return;
  }
  setDemoSessionActive(false);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{
  needsEmailConfirmation: boolean;
}> {
  if (!isSupabaseConfigured || !supabase) {
    setDemoSessionActive(true);
    return { needsEmailConfirmation: false };
  }
  setDemoSessionActive(false);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return { needsEmailConfirmation: !data.session };
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  setDemoSessionActive(false);
}

// ----------------------------------------------------------------------------
// Tenant
// ----------------------------------------------------------------------------
export async function fetchTenant(isDemo: boolean): Promise<Tenant | null> {
  if (isDemo || !supabase) {
    return loadDemoDb().tenant;
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapTenantRow(data) : null;
}

export async function createTenantOnboarding(
  isDemo: boolean,
  input: {
    nome_loja: string;
    pix_tipo?: PixKeyType | null;
    pix_chave?: string | null;
    pix_nome_recebedor?: string | null;
    pix_cidade?: string | null;
  }
): Promise<Tenant> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    db.tenant = {
      ...db.tenant,
      nome_loja: input.nome_loja.trim(),
      pix_tipo: input.pix_tipo ?? db.tenant.pix_tipo,
      pix_chave: input.pix_chave ?? db.tenant.pix_chave,
      pix_nome_recebedor:
        input.pix_nome_recebedor ?? db.tenant.pix_nome_recebedor,
      pix_cidade: input.pix_cidade ?? db.tenant.pix_cidade,
    };
    saveDemoDb(db);
    return db.tenant;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sessão expirada.");

  const { data, error } = await supabase
    .from("tenants")
    .insert({
      owner_id: userData.user.id,
      nome_loja: input.nome_loja.trim(),
      logo_url: "/logo-paula-lanches.jpg",
      pix_tipo: input.pix_tipo ?? null,
      pix_chave: input.pix_chave?.trim() || null,
      pix_nome_recebedor: input.pix_nome_recebedor?.trim() || null,
      pix_cidade: input.pix_cidade?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapTenantRow(data);
}

export async function updateTenantSettings(
  isDemo: boolean,
  tenantId: string,
  patch: Partial<{
    nome_loja: string;
    pix_tipo: PixKeyType | null;
    pix_chave: string | null;
    pix_nome_recebedor: string | null;
    pix_cidade: string | null;
    mensagem_padrao_whatsapp: string;
    atalhos_rapidos: QuickShortcut[];
    plano: PlanType;
  }>
): Promise<Tenant> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    db.tenant = { ...db.tenant, ...patch };
    saveDemoDb(db);
    return db.tenant;
  }

  const dbPatch: Database["public"]["Tables"]["tenants"]["Update"] = {};
  if (patch.nome_loja !== undefined) dbPatch.nome_loja = patch.nome_loja;
  if (patch.pix_tipo !== undefined) dbPatch.pix_tipo = patch.pix_tipo;
  if (patch.pix_chave !== undefined) dbPatch.pix_chave = patch.pix_chave;
  if (patch.pix_nome_recebedor !== undefined) {
    dbPatch.pix_nome_recebedor = patch.pix_nome_recebedor;
  }
  if (patch.pix_cidade !== undefined) dbPatch.pix_cidade = patch.pix_cidade;
  if (patch.mensagem_padrao_whatsapp !== undefined) {
    dbPatch.mensagem_padrao_whatsapp = patch.mensagem_padrao_whatsapp;
  }
  if (patch.atalhos_rapidos !== undefined) {
    dbPatch.atalhos_rapidos = patch.atalhos_rapidos as unknown as Json;
  }

  const { data, error } = await supabase
    .from("tenants")
    .update(dbPatch)
    .eq("id", tenantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapTenantRow(data);
}

// ----------------------------------------------------------------------------
// Guardians
// ----------------------------------------------------------------------------
export async function listGuardians(
  isDemo: boolean,
  tenantId: string
): Promise<Guardian[]> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    return [...db.guardians].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }

  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Guardian[];
}

export async function createGuardian(
  isDemo: boolean,
  tenantId: string,
  input: { nome: string; whatsapp: string; observacao?: string | null }
): Promise<Guardian> {
  const normalizedPhone = normalizeBrazilianPhone(input.whatsapp);
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    const guardian: Guardian = {
      id: generateUuid(),
      tenant_id: tenantId,
      nome: input.nome.trim(),
      whatsapp: normalizedPhone,
      observacao: input.observacao?.trim() || null,
      created_at: new Date().toISOString(),
    };
    db.guardians.push(guardian);
    saveDemoDb(db);
    return guardian;
  }

  const { data, error } = await supabase
    .from("guardians")
    .insert({
      tenant_id: tenantId,
      nome: input.nome.trim(),
      whatsapp: normalizedPhone,
      observacao: input.observacao?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Guardian;
}

export async function updateGuardian(
  isDemo: boolean,
  guardianId: string,
  input: { nome: string; whatsapp: string; observacao?: string | null }
): Promise<Guardian> {
  const normalizedPhone = normalizeBrazilianPhone(input.whatsapp);
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    let updated: Guardian | null = null;
    db.guardians = db.guardians.map((g) => {
      if (g.id === guardianId) {
        updated = {
          ...g,
          nome: input.nome.trim(),
          whatsapp: normalizedPhone,
          observacao: input.observacao?.trim() || null,
        };
        return updated;
      }
      return g;
    });
    if (!updated) throw new Error("Responsável não encontrado.");
    saveDemoDb(db);
    return updated;
  }

  const { data, error } = await supabase
    .from("guardians")
    .update({
      nome: input.nome.trim(),
      whatsapp: normalizedPhone,
      observacao: input.observacao?.trim() || null,
    })
    .eq("id", guardianId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Guardian;
}

export async function deleteGuardian(
  isDemo: boolean,
  guardianId: string
): Promise<void> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    db.guardians = db.guardians.filter((g) => g.id !== guardianId);
    db.customers = db.customers.map((c) =>
      c.guardian_id === guardianId ? { ...c, guardian_id: null } : c
    );
    saveDemoDb(db);
    return;
  }

  const { error } = await supabase
    .from("guardians")
    .delete()
    .eq("id", guardianId);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// Customers
// ----------------------------------------------------------------------------
export async function listCustomers(
  isDemo: boolean,
  tenantId: string
): Promise<CustomerWithGuardian[]> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    const gMap = new Map(db.guardians.map((g) => [g.id, g]));
    return db.customers.map((c) => ({
      ...c,
      saldo_atual: Number(c.saldo_atual),
      limite_credito:
        c.limite_credito !== null ? Number(c.limite_credito) : null,
      guardian: c.guardian_id ? (gMap.get(c.guardian_id) ?? null) : null,
    }));
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*, guardian:guardians(*)")
    .eq("tenant_id", tenantId)
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CustomerWithGuardian[]).map((c) => ({
    ...c,
    saldo_atual: Number(c.saldo_atual),
    limite_credito: c.limite_credito !== null ? Number(c.limite_credito) : null,
  }));
}

export async function createCustomer(
  isDemo: boolean,
  tenant: Tenant,
  input: {
    nome: string;
    turma_ou_apelido?: string | null;
    whatsapp?: string | null;
    guardian_id?: string | null;
    limite_credito?: number | null;
  }
): Promise<Customer> {
  const normalizedPhone = input.whatsapp?.trim()
    ? normalizeBrazilianPhone(input.whatsapp)
    : null;

  if (isDemo || !supabase) {
    const db = loadDemoDb();
    if (db.tenant.plano === "FREE" && db.customers.length >= 15) {
      throw new Error(
        "Limite de 15 clientes do plano FREE atingido. Faça upgrade para o Plano PRO."
      );
    }
    const customer: Customer = {
      id: generateUuid(),
      tenant_id: tenant.id,
      guardian_id: input.guardian_id ?? null,
      nome: input.nome.trim(),
      turma_ou_apelido: input.turma_ou_apelido?.trim() || null,
      whatsapp: normalizedPhone,
      limite_credito:
        input.limite_credito !== undefined && input.limite_credito !== null
          ? input.limite_credito
          : null,
      saldo_atual: 0,
      public_token: generateUuid(),
      ultima_movimentacao_em: null,
      created_at: new Date().toISOString(),
    };
    db.customers.push(customer);
    saveDemoDb(db);
    return customer;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenant.id,
      guardian_id: input.guardian_id ?? null,
      nome: input.nome.trim(),
      turma_ou_apelido: input.turma_ou_apelido?.trim() || null,
      whatsapp: normalizedPhone,
      limite_credito:
        input.limite_credito !== undefined && input.limite_credito !== null
          ? input.limite_credito
          : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const row = data as Customer;
  return {
    ...row,
    saldo_atual: Number(row.saldo_atual),
    limite_credito:
      row.limite_credito !== null ? Number(row.limite_credito) : null,
  };
}

export async function updateCustomer(
  isDemo: boolean,
  customerId: string,
  input: {
    nome: string;
    turma_ou_apelido?: string | null;
    whatsapp?: string | null;
    guardian_id?: string | null;
    limite_credito?: number | null;
  }
): Promise<Customer> {
  const normalizedPhone = input.whatsapp?.trim()
    ? normalizeBrazilianPhone(input.whatsapp)
    : null;

  if (isDemo || !supabase) {
    const db = loadDemoDb();
    let updated: Customer | null = null;
    db.customers = db.customers.map((c) => {
      if (c.id === customerId) {
        updated = {
          ...c,
          nome: input.nome.trim(),
          turma_ou_apelido: input.turma_ou_apelido?.trim() || null,
          whatsapp: normalizedPhone,
          guardian_id: input.guardian_id ?? null,
          limite_credito:
            input.limite_credito !== undefined && input.limite_credito !== null
              ? input.limite_credito
              : null,
        };
        return updated;
      }
      return c;
    });
    if (!updated) throw new Error("Cliente não encontrado.");
    saveDemoDb(db);
    return updated;
  }

  const { data, error } = await supabase
    .from("customers")
    .update({
      nome: input.nome.trim(),
      turma_ou_apelido: input.turma_ou_apelido?.trim() || null,
      whatsapp: normalizedPhone,
      guardian_id: input.guardian_id ?? null,
      limite_credito:
        input.limite_credito !== undefined && input.limite_credito !== null
          ? input.limite_credito
          : null,
    })
    .eq("id", customerId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function deleteCustomer(
  isDemo: boolean,
  customerId: string
): Promise<void> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    db.customers = db.customers.filter((c) => c.id !== customerId);
    db.transactions = db.transactions.filter(
      (t) => t.customer_id !== customerId
    );
    db.reminders = db.reminders.filter((r) => r.customer_id !== customerId);
    saveDemoDb(db);
    return;
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// Transactions
// ----------------------------------------------------------------------------
export async function listTransactions(
  isDemo: boolean,
  customerId: string
): Promise<Transaction[]> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    return db.transactions
      .filter((t) => t.customer_id === customerId)
      .sort((a, b) => {
        if (a.data_lancamento !== b.data_lancamento) {
          return b.data_lancamento.localeCompare(a.data_lancamento);
        }
        return b.created_at.localeCompare(a.created_at);
      });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("data_lancamento", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Transaction[]).map((tx) => ({
    ...tx,
    valor: Number(tx.valor),
  }));
}

export async function createTransaction(
  isDemo: boolean,
  tenantId: string,
  input: {
    customer_id: string;
    tipo: TransactionType;
    valor: number;
    descricao?: string | null;
    data_lancamento: string;
    reminderDate?: string | null;
  }
): Promise<Transaction> {
  if (input.valor <= 0) {
    throw new Error("O valor do lançamento deve ser maior que zero.");
  }

  if (isDemo || !supabase) {
    const db = loadDemoDb();
    const tx: Transaction = {
      id: generateUuid(),
      tenant_id: tenantId,
      customer_id: input.customer_id,
      tipo: input.tipo,
      valor: Math.round(input.valor * 100) / 100,
      descricao: input.descricao?.trim() || null,
      data_lancamento: input.data_lancamento,
      created_at: new Date().toISOString(),
    };
    db.transactions.push(tx);
    recalculateDemoCustomer(db, input.customer_id);

    if (input.reminderDate && db.tenant.plano === "PRO") {
      db.reminders.push({
        id: generateUuid(),
        tenant_id: tenantId,
        customer_id: input.customer_id,
        data_lembrete: input.reminderDate,
        concluido: false,
        created_at: new Date().toISOString(),
      });
    }

    saveDemoDb(db);
    return tx;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      tenant_id: tenantId,
      customer_id: input.customer_id,
      tipo: input.tipo,
      valor: Math.round(input.valor * 100) / 100,
      descricao: input.descricao?.trim() || null,
      data_lancamento: input.data_lancamento,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  if (input.reminderDate) {
    await supabase.from("reminders").insert({
      tenant_id: tenantId,
      customer_id: input.customer_id,
      data_lembrete: input.reminderDate,
      concluido: false,
    });
  }

  const row = data as Transaction;
  return { ...row, valor: Number(row.valor) };
}

export async function deleteTransaction(
  isDemo: boolean,
  tx: Transaction
): Promise<void> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    db.transactions = db.transactions.filter((item) => item.id !== tx.id);
    recalculateDemoCustomer(db, tx.customer_id);
    saveDemoDb(db);
    return;
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", tx.id);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// Reminders
// ----------------------------------------------------------------------------
export async function listReminders(
  isDemo: boolean,
  tenantId: string
): Promise<ReminderWithCustomer[]> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    const gMap = new Map(db.guardians.map((g) => [g.id, g]));
    const cMap = new Map(
      db.customers.map((c) => [
        c.id,
        {
          ...c,
          guardian: c.guardian_id ? (gMap.get(c.guardian_id) ?? null) : null,
        },
      ])
    );

    return db.reminders
      .map((r) => ({ ...r, customer: cMap.get(r.customer_id) ?? null }))
      .sort((a, b) => {
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
        return a.data_lembrete.localeCompare(b.data_lembrete);
      });
  }

  const { data, error } = await supabase
    .from("reminders")
    .select("*, customer:customers(*, guardian:guardians(*))")
    .eq("tenant_id", tenantId)
    .order("concluido", { ascending: true })
    .order("data_lembrete", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReminderWithCustomer[];
}

export async function createReminder(
  isDemo: boolean,
  tenantId: string,
  input: { customer_id: string; data_lembrete: string }
): Promise<Reminder> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    const reminder: Reminder = {
      id: generateUuid(),
      tenant_id: tenantId,
      customer_id: input.customer_id,
      data_lembrete: input.data_lembrete,
      concluido: false,
      created_at: new Date().toISOString(),
    };
    db.reminders.push(reminder);
    saveDemoDb(db);
    return reminder;
  }

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      tenant_id: tenantId,
      customer_id: input.customer_id,
      data_lembrete: input.data_lembrete,
      concluido: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Reminder;
}

export async function toggleReminderDone(
  isDemo: boolean,
  reminderId: string,
  concluido: boolean
): Promise<void> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    db.reminders = db.reminders.map((r) =>
      r.id === reminderId ? { ...r, concluido } : r
    );
    saveDemoDb(db);
    return;
  }

  const { error } = await supabase
    .from("reminders")
    .update({ concluido })
    .eq("id", reminderId);

  if (error) throw new Error(error.message);
}

export async function deleteReminder(
  isDemo: boolean,
  reminderId: string
): Promise<void> {
  if (isDemo || !supabase) {
    const db = loadDemoDb();
    db.reminders = db.reminders.filter((r) => r.id !== reminderId);
    saveDemoDb(db);
    return;
  }

  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", reminderId);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// Public Statements (/c/:public_token e /r/:guardian_id)
// ----------------------------------------------------------------------------
export async function getPublicCustomerStatement(
  publicToken: string
): Promise<PublicCustomerStatement | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc(
      "get_public_customer_statement",
      {
        p_token: publicToken,
      }
    );
    if (!error && data) {
      return data as unknown as PublicCustomerStatement;
    }
    if (!isDemoSessionActive() && error) {
      throw new Error(error.message);
    }
  }

  if (typeof window === "undefined") return null;

  const db = loadDemoDb();
  const customer = db.customers.find((c) => c.public_token === publicToken);
  if (!customer) return null;

  const guardian = customer.guardian_id
    ? db.guardians.find((g) => g.id === customer.guardian_id)
    : null;

  const txs = db.transactions
    .filter((t) => t.customer_id === customer.id)
    .sort((a, b) => {
      if (a.data_lancamento !== b.data_lancamento) {
        return b.data_lancamento.localeCompare(a.data_lancamento);
      }
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, 50)
    .map((t) => ({
      id: t.id,
      tipo: t.tipo,
      valor: Number(t.valor),
      descricao: t.descricao,
      data_lancamento: t.data_lancamento,
      created_at: t.created_at,
    }));

  return {
    tenant: {
      nome_loja: db.tenant.nome_loja,
      logo_url: db.tenant.logo_url,
      pix_tipo: db.tenant.pix_tipo,
      pix_chave: db.tenant.pix_chave,
      pix_nome_recebedor: db.tenant.pix_nome_recebedor,
      pix_cidade: db.tenant.pix_cidade,
    },
    customer: {
      id: customer.id,
      nome: customer.nome,
      turma_ou_apelido: customer.turma_ou_apelido,
      saldo_atual: Number(customer.saldo_atual),
      ultima_movimentacao_em: customer.ultima_movimentacao_em,
      guardian_nome: guardian?.nome ?? null,
    },
    transactions: txs,
  };
}

export async function getPublicGuardianStatement(
  guardianId: string
): Promise<PublicGuardianStatement | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc(
      "get_public_guardian_statement",
      {
        p_guardian_id: guardianId,
      }
    );
    if (!error && data) {
      return data as unknown as PublicGuardianStatement;
    }
    if (!isDemoSessionActive() && error) {
      throw new Error(error.message);
    }
  }

  if (typeof window === "undefined") return null;

  const db = loadDemoDb();
  const guardian = db.guardians.find((g) => g.id === guardianId);
  if (!guardian) return null;

  if (db.tenant.plano !== "PRO") {
    return {
      restricted: true,
      tenant: {
        nome_loja: db.tenant.nome_loja,
        logo_url: db.tenant.logo_url,
      },
    };
  }

  const students = db.customers
    .filter((c) => c.guardian_id === guardian.id)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      turma_ou_apelido: c.turma_ou_apelido,
      saldo_atual: Number(c.saldo_atual),
      public_token: c.public_token,
      ultima_movimentacao_em: c.ultima_movimentacao_em,
      transactions: db.transactions
        .filter((t) => t.customer_id === c.id)
        .sort((a, b) => {
          if (a.data_lancamento !== b.data_lancamento) {
            return b.data_lancamento.localeCompare(a.data_lancamento);
          }
          return b.created_at.localeCompare(a.created_at);
        })
        .slice(0, 20),
    }));

  const saldoTotal =
    Math.round(
      students.reduce((sum, s) => sum + Math.max(0, s.saldo_atual), 0) * 100
    ) / 100;

  return {
    restricted: false,
    tenant: {
      nome_loja: db.tenant.nome_loja,
      logo_url: db.tenant.logo_url,
      pix_tipo: db.tenant.pix_tipo,
      pix_chave: db.tenant.pix_chave,
      pix_nome_recebedor: db.tenant.pix_nome_recebedor,
      pix_cidade: db.tenant.pix_cidade,
    },
    guardian: {
      id: guardian.id,
      nome: guardian.nome,
    },
    saldo_total: saldoTotal,
    students,
  };
}

// ----------------------------------------------------------------------------
// Mercado Pago Checkout PRO
// ----------------------------------------------------------------------------
export async function createMpCheckoutSession(): Promise<{
  checkout_url: string;
}> {
  if (!supabase || isDemoSessionActive()) {
    throw new Error(
      "No Modo Demonstração você pode alternar entre FREE e PRO diretamente abaixo."
    );
  }

  const { data, error } = await supabase.functions.invoke(
    "create-mp-checkout",
    {
      body: {
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
    }
  );

  if (error) {
    throw new Error(
      error.message || "Erro ao iniciar checkout do Mercado Pago."
    );
  }

  const checkoutUrl = (data as { checkout_url?: string } | null)?.checkout_url;
  if (!checkoutUrl) {
    throw new Error("Checkout do Mercado Pago não retornou URL de pagamento.");
  }

  return { checkout_url: checkoutUrl };
}
