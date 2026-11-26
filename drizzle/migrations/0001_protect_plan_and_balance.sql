CREATE OR REPLACE FUNCTION public.protect_tenant_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.plano := 'FREE';
      NEW.mp_subscription_id := NULL;
      NEW.plano_expira_em := NULL;
    ELSE
      NEW.plano := OLD.plano;
      NEW.mp_subscription_id := OLD.mp_subscription_id;
      NEW.plano_expira_em := OLD.plano_expira_em;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_protect_billing ON public.tenants;
CREATE TRIGGER trg_tenants_protect_billing
BEFORE INSERT OR UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.protect_tenant_billing_fields();

CREATE OR REPLACE FUNCTION public.protect_customer_balance_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.saldo_atual := 0.00;
      NEW.ultima_movimentacao_em := NULL;
    ELSE
      NEW.saldo_atual := OLD.saldo_atual;
      NEW.ultima_movimentacao_em := OLD.ultima_movimentacao_em;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_protect_balance ON public.customers;
CREATE TRIGGER trg_customers_protect_balance
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.protect_customer_balance_fields();

REVOKE EXECUTE ON FUNCTION public.recalculate_customer_balance_for_id(uuid) FROM PUBLIC, anon, authenticated;