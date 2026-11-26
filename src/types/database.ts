export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";
export type PlanType = "FREE" | "PRO";
export type TransactionType = "FIADO" | "RECEBIMENTO";

export interface QuickShortcut {
  nome: string;
  valor: number;
}

export interface Tenant {
  id: string;
  owner_id: string;
  nome_loja: string;
  logo_url: string | null;
  pix_tipo: PixKeyType | null;
  pix_chave: string | null;
  pix_nome_recebedor: string | null;
  pix_cidade: string | null;
  mensagem_padrao_whatsapp: string;
  atalhos_rapidos: QuickShortcut[];
  plano: PlanType;
  mp_subscription_id: string | null;
  plano_expira_em: string | null;
  created_at: string;
}

export interface Guardian {
  id: string;
  tenant_id: string;
  nome: string;
  whatsapp: string;
  observacao: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  guardian_id: string | null;
  nome: string;
  turma_ou_apelido: string | null;
  whatsapp: string | null;
  limite_credito: number | null;
  saldo_atual: number;
  public_token: string;
  ultima_movimentacao_em: string | null;
  created_at: string;
}

export interface CustomerWithGuardian extends Customer {
  guardian?: Guardian | null;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  tipo: TransactionType;
  valor: number;
  descricao: string | null;
  data_lancamento: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  tenant_id: string;
  customer_id: string;
  data_lembrete: string;
  concluido: boolean;
  created_at?: string;
}

export interface ReminderWithCustomer extends Reminder {
  customer?: CustomerWithGuardian | null;
}

export interface PublicStatementTenant {
  nome_loja: string;
  logo_url: string | null;
  pix_tipo: PixKeyType | null;
  pix_chave: string | null;
  pix_nome_recebedor: string | null;
  pix_cidade: string | null;
}

export interface PublicStatementTransaction {
  id: string;
  tipo: TransactionType;
  valor: number;
  descricao: string | null;
  data_lancamento: string;
  created_at: string;
}

export interface PublicCustomerStatement {
  tenant: PublicStatementTenant;
  customer: {
    id: string;
    nome: string;
    turma_ou_apelido: string | null;
    saldo_atual: number;
    ultima_movimentacao_em: string | null;
    guardian_nome: string | null;
  };
  transactions: PublicStatementTransaction[];
}

export interface PublicGuardianStudent {
  id: string;
  nome: string;
  turma_ou_apelido: string | null;
  saldo_atual: number;
  public_token: string;
  ultima_movimentacao_em: string | null;
  transactions: PublicStatementTransaction[];
}

export interface PublicGuardianStatement {
  restricted: boolean;
  tenant: Partial<PublicStatementTenant> & {
    nome_loja: string;
    logo_url: string | null;
  };
  guardian?: {
    id: string;
    nome: string;
  };
  saldo_total?: number;
  students?: PublicGuardianStudent[];
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}
