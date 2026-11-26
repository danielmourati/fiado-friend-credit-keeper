-- ============================================================================
-- Paula Lanches — SaaS Multi-Tenant de Controle de Fiado (Supabase / Postgres)
-- Migration: 0001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tabela tenants (Lanchonetes / Cantinas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_loja text NOT NULL,
  logo_url text,
  pix_tipo text CHECK (pix_tipo IN ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA')),
  pix_chave text,
  pix_nome_recebedor text,
  pix_cidade text,
  mensagem_padrao_whatsapp text NOT NULL DEFAULT 'Olá! Segue o extrato atualizado de {cliente} na {cantina}.\n\nValor em aberto: {valor}\nExtrato detalhado: {link}\n\nPIX Copia e Cola:\n{pix}',
  atalhos_rapidos jsonb NOT NULL DEFAULT '[
    {"nome": "Salgado", "valor": 6.00},
    {"nome": "Suco", "valor": 5.00},
    {"nome": "Misto", "valor": 8.00},
    {"nome": "Refri", "valor": 5.50}
  ]'::jsonb,
  plano text NOT NULL DEFAULT 'FREE' CHECK (plano IN ('FREE', 'PRO')),
  mp_subscription_id text,
  plano_expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenants_atalhos_rapidos_array_max_6 CHECK (
    jsonb_typeof(atalhos_rapidos) = 'array' AND jsonb_array_length(atalhos_rapidos) <= 6
  )
);

-- ----------------------------------------------------------------------------
-- 2. Tabela guardians (Responsáveis Financeiros — Pais/Mães)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  whatsapp text NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guardians_tenant_id ON public.guardians(tenant_id);

-- ----------------------------------------------------------------------------
-- 3. Tabela customers (Alunos ou Clientes Diretos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guardian_id uuid REFERENCES public.guardians(id) ON DELETE SET NULL,
  nome text NOT NULL,
  turma_ou_apelido text,
  whatsapp text,
  limite_credito numeric(10, 2) CHECK (limite_credito IS NULL OR limite_credito >= 0),
  saldo_atual numeric(10, 2) NOT NULL DEFAULT 0.00,
  public_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  ultima_movimentacao_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_guardian_id ON public.customers(guardian_id);
CREATE INDEX IF NOT EXISTS idx_customers_public_token ON public.customers(public_token);

-- ----------------------------------------------------------------------------
-- 4. Tabela transactions (Fiados e Recebimentos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('FIADO', 'RECEBIMENTO')),
  valor numeric(10, 2) NOT NULL CHECK (valor > 0),
  descricao text,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_data_lancamento ON public.transactions(data_lancamento DESC, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Tabela reminders (Lembretes internos de cobrança)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  data_lembrete date NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_tenant_id ON public.reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminders_customer_id ON public.reminders(customer_id);

-- ----------------------------------------------------------------------------
-- 6. Trigger obrigatória: recalcula saldo_atual e ultima_movimentacao_em
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_balance_for_id(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo numeric(10, 2);
  v_last_at timestamptz;
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'FIADO' THEN valor ELSE -valor END), 0.00),
    MAX(created_at)
  INTO v_saldo, v_last_at
  FROM public.transactions
  WHERE customer_id = p_customer_id;

  UPDATE public.customers
  SET
    saldo_atual = COALESCE(v_saldo, 0.00),
    ultima_movimentacao_em = v_last_at
  WHERE id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_customer_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_customer_balance_for_id(OLD.customer_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_customer_balance_for_id(NEW.customer_id);

  IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    PERFORM public.recalculate_customer_balance_for_id(OLD.customer_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_recalculate_balance ON public.transactions;
CREATE TRIGGER trg_transactions_recalculate_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_customer_balance();

-- ----------------------------------------------------------------------------
-- 7. Limite de clientes do plano FREE (15 clientes ativos)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_free_plan_customer_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano text;
  v_count integer;
BEGIN
  SELECT plano INTO v_plano FROM public.tenants WHERE id = NEW.tenant_id;
  IF v_plano = 'FREE' THEN
    SELECT COUNT(*) INTO v_count FROM public.customers WHERE tenant_id = NEW.tenant_id;
    IF v_count >= 15 THEN
      RAISE EXCEPTION 'Limite de 15 clientes do plano FREE atingido. Faça upgrade para o Plano PRO.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_free_plan_limit ON public.customers;
CREATE TRIGGER trg_customers_free_plan_limit
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_plan_customer_limit();

-- ----------------------------------------------------------------------------
-- 8. Row Level Security (RLS) estrito por tenant_id baseado em auth.uid()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_owner(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = p_tenant_id
      AND t.owner_id = auth.uid()
  );
$$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policies: tenants
DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_insert_own" ON public.tenants;
CREATE POLICY "tenants_insert_own" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_update_own" ON public.tenants;
CREATE POLICY "tenants_update_own" ON public.tenants
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "tenants_delete_own" ON public.tenants;
CREATE POLICY "tenants_delete_own" ON public.tenants
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Policies: guardians
DROP POLICY IF EXISTS "guardians_tenant_isolation" ON public.guardians;
CREATE POLICY "guardians_tenant_isolation" ON public.guardians
  FOR ALL TO authenticated
  USING (public.is_tenant_owner(tenant_id))
  WITH CHECK (public.is_tenant_owner(tenant_id));

-- Policies: customers
DROP POLICY IF EXISTS "customers_tenant_isolation" ON public.customers;
CREATE POLICY "customers_tenant_isolation" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_tenant_owner(tenant_id))
  WITH CHECK (public.is_tenant_owner(tenant_id));

-- Policies: transactions
DROP POLICY IF EXISTS "transactions_tenant_isolation" ON public.transactions;
CREATE POLICY "transactions_tenant_isolation" ON public.transactions
  FOR ALL TO authenticated
  USING (public.is_tenant_owner(tenant_id))
  WITH CHECK (public.is_tenant_owner(tenant_id));

-- Policies: reminders
DROP POLICY IF EXISTS "reminders_tenant_isolation" ON public.reminders;
CREATE POLICY "reminders_tenant_isolation" ON public.reminders
  FOR ALL TO authenticated
  USING (public.is_tenant_owner(tenant_id))
  WITH CHECK (public.is_tenant_owner(tenant_id));

-- ----------------------------------------------------------------------------
-- 9. RPCs Públicas para Extrato e Pagamento PIX (/c/:token e /r/:guardian_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_customer_statement(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer record;
  v_tenant record;
  v_guardian_nome text;
  v_transactions jsonb;
BEGIN
  SELECT c.*
  INTO v_customer
  FROM public.customers c
  WHERE c.public_token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    t.nome_loja,
    t.logo_url,
    t.pix_tipo,
    t.pix_chave,
    t.pix_nome_recebedor,
    t.pix_cidade
  INTO v_tenant
  FROM public.tenants t
  WHERE t.id = v_customer.tenant_id;

  IF v_customer.guardian_id IS NOT NULL THEN
    SELECT g.nome INTO v_guardian_nome
    FROM public.guardians g
    WHERE g.id = v_customer.guardian_id;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', tx.id,
        'tipo', tx.tipo,
        'valor', tx.valor,
        'descricao', tx.descricao,
        'data_lancamento', tx.data_lancamento,
        'created_at', tx.created_at
      )
      ORDER BY tx.data_lancamento DESC, tx.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_transactions
  FROM (
    SELECT id, tipo, valor, descricao, data_lancamento, created_at
    FROM public.transactions
    WHERE customer_id = v_customer.id
    ORDER BY data_lancamento DESC, created_at DESC
    LIMIT 50
  ) tx;

  RETURN jsonb_build_object(
    'tenant', jsonb_build_object(
      'nome_loja', v_tenant.nome_loja,
      'logo_url', v_tenant.logo_url,
      'pix_tipo', v_tenant.pix_tipo,
      'pix_chave', v_tenant.pix_chave,
      'pix_nome_recebedor', v_tenant.pix_nome_recebedor,
      'pix_cidade', v_tenant.pix_cidade
    ),
    'customer', jsonb_build_object(
      'id', v_customer.id,
      'nome', v_customer.nome,
      'turma_ou_apelido', v_customer.turma_ou_apelido,
      'saldo_atual', v_customer.saldo_atual,
      'ultima_movimentacao_em', v_customer.ultima_movimentacao_em,
      'guardian_nome', v_guardian_nome
    ),
    'transactions', v_transactions
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_guardian_statement(p_guardian_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guardian record;
  v_tenant record;
  v_students jsonb;
  v_saldo_total numeric(10, 2);
BEGIN
  SELECT g.*
  INTO v_guardian
  FROM public.guardians g
  WHERE g.id = p_guardian_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    t.nome_loja,
    t.logo_url,
    t.pix_tipo,
    t.pix_chave,
    t.pix_nome_recebedor,
    t.pix_cidade,
    t.plano
  INTO v_tenant
  FROM public.tenants t
  WHERE t.id = v_guardian.tenant_id;

  IF v_tenant.plano <> 'PRO' THEN
    RETURN jsonb_build_object(
      'restricted', true,
      'tenant', jsonb_build_object(
        'nome_loja', v_tenant.nome_loja,
        'logo_url', v_tenant.logo_url
      )
    );
  END IF;

  SELECT
    COALESCE(SUM(GREATEST(c.saldo_atual, 0)), 0.00),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'nome', c.nome,
          'turma_ou_apelido', c.turma_ou_apelido,
          'saldo_atual', c.saldo_atual,
          'public_token', c.public_token,
          'ultima_movimentacao_em', c.ultima_movimentacao_em,
          'transactions', (
            SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', tx.id,
                  'tipo', tx.tipo,
                  'valor', tx.valor,
                  'descricao', tx.descricao,
                  'data_lancamento', tx.data_lancamento,
                  'created_at', tx.created_at
                )
                ORDER BY tx.data_lancamento DESC, tx.created_at DESC
              ),
              '[]'::jsonb
            )
            FROM (
              SELECT id, tipo, valor, descricao, data_lancamento, created_at
              FROM public.transactions
              WHERE customer_id = c.id
              ORDER BY data_lancamento DESC, created_at DESC
              LIMIT 20
            ) tx
          )
        )
        ORDER BY c.nome ASC
      ),
      '[]'::jsonb
    )
  INTO v_saldo_total, v_students
  FROM public.customers c
  WHERE c.guardian_id = v_guardian.id;

  RETURN jsonb_build_object(
    'restricted', false,
    'tenant', jsonb_build_object(
      'nome_loja', v_tenant.nome_loja,
      'logo_url', v_tenant.logo_url,
      'pix_tipo', v_tenant.pix_tipo,
      'pix_chave', v_tenant.pix_chave,
      'pix_nome_recebedor', v_tenant.pix_nome_recebedor,
      'pix_cidade', v_tenant.pix_cidade
    ),
    'guardian', jsonb_build_object(
      'id', v_guardian.id,
      'nome', v_guardian.nome
    ),
    'saldo_total', v_saldo_total,
    'students', v_students
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_customer_statement(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_guardian_statement(uuid) TO anon, authenticated;
