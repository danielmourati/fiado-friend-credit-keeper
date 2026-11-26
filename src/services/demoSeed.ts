import type {
  Customer,
  Guardian,
  Reminder,
  Tenant,
  Transaction,
} from "@/types/database";

export interface DemoDatabase {
  tenant: Tenant;
  guardians: Guardian[];
  customers: Customer[];
  transactions: Transaction[];
  reminders: Reminder[];
}

function daysAgoIso(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialDemoDatabase(): DemoDatabase {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const g1Id = "22222222-2222-4222-8222-222222222201";
  const g2Id = "22222222-2222-4222-8222-222222222202";
  const g3Id = "22222222-2222-4222-8222-222222222203";

  const c1Id = "33333333-3333-4333-8333-333333333301";
  const c2Id = "33333333-3333-4333-8333-333333333302";
  const c3Id = "33333333-3333-4333-8333-333333333303";
  const c4Id = "33333333-3333-4333-8333-333333333304";
  const c5Id = "33333333-3333-4333-8333-333333333305";
  const c6Id = "33333333-3333-4333-8333-333333333306";

  const tenant: Tenant = {
    id: tenantId,
    owner_id: "demo-owner",
    nome_loja: "Paula Lanches",
    logo_url: "/logo-paula-lanches.jpg",
    pix_tipo: "TELEFONE",
    pix_chave: "86999123456",
    pix_nome_recebedor: "PAULA LANCHES CANTINA",
    pix_cidade: "PARNAIBA",
    mensagem_padrao_whatsapp:
      "Olá! Segue o extrato atualizado de {cliente} na *{cantina}*.\n\nValor em aberto: *{valor}*\nExtrato detalhado: {link}\n\nPIX Copia e Cola:\n{pix}",
    atalhos_rapidos: [
      { nome: "Salgado", valor: 6.0 },
      { nome: "Suco Natural", valor: 5.0 },
      { nome: "Misto Quente", valor: 8.0 },
      { nome: "Refrigerante", valor: 5.5 },
      { nome: "Combo Lanche", valor: 12.0 },
      { nome: "Água", valor: 3.0 },
    ],
    plano: "PRO",
    mp_subscription_id: "demo-pro-active",
    plano_expira_em: null,
    created_at: daysAgoIso(45),
  };

  const guardians: Guardian[] = [
    {
      id: g1Id,
      tenant_id: tenantId,
      nome: "Mariana Oliveira (Mãe)",
      whatsapp: "5586999441122",
      observacao: "Paga sempre toda sexta-feira via PIX",
      created_at: daysAgoIso(30),
    },
    {
      id: g2Id,
      tenant_id: tenantId,
      nome: "Carlos Eduardo Souza (Pai)",
      whatsapp: "5586998773344",
      observacao: "Autorizou limite de R$ 40,00 por semana",
      created_at: daysAgoIso(25),
    },
    {
      id: g3Id,
      tenant_id: tenantId,
      nome: "Fernanda Costa (Mãe)",
      whatsapp: "5586999118899",
      observacao: null,
      created_at: daysAgoIso(20),
    },
  ];

  const customers: Customer[] = [
    {
      id: c1Id,
      tenant_id: tenantId,
      guardian_id: g1Id,
      nome: "Lucas Oliveira",
      turma_ou_apelido: "7º Ano B - Manhã",
      whatsapp: null,
      limite_credito: 50.0,
      saldo_atual: 28.5,
      public_token: "aaaa1111-1111-4111-8111-111111111101",
      ultima_movimentacao_em: daysAgoIso(1, 10),
      created_at: daysAgoIso(30),
    },
    {
      id: c2Id,
      tenant_id: tenantId,
      guardian_id: g1Id,
      nome: "Sofia Oliveira",
      turma_ou_apelido: "4º Ano A - Manhã",
      whatsapp: null,
      limite_credito: 30.0,
      saldo_atual: 14.0,
      public_token: "aaaa1111-1111-4111-8111-111111111102",
      ultima_movimentacao_em: daysAgoIso(2, 9),
      created_at: daysAgoIso(30),
    },
    {
      id: c3Id,
      tenant_id: tenantId,
      guardian_id: g2Id,
      nome: "Pedro Henrique Souza",
      turma_ou_apelido: "9º Ano A - Tarde",
      whatsapp: null,
      limite_credito: 40.0,
      saldo_atual: 46.0,
      public_token: "aaaa1111-1111-4111-8111-111111111103",
      ultima_movimentacao_em: daysAgoIso(6, 15),
      created_at: daysAgoIso(25),
    },
    {
      id: c4Id,
      tenant_id: tenantId,
      guardian_id: null,
      nome: "Prof. Ana Cláudia",
      turma_ou_apelido: "Coordenação",
      whatsapp: "5586999556677",
      limite_credito: null,
      saldo_atual: 19.5,
      public_token: "aaaa1111-1111-4111-8111-111111111104",
      ultima_movimentacao_em: daysAgoIso(3, 11),
      created_at: daysAgoIso(22),
    },
    {
      id: c5Id,
      tenant_id: tenantId,
      guardian_id: g3Id,
      nome: "Beatriz Costa",
      turma_ou_apelido: "6º Ano C - Tarde",
      whatsapp: null,
      limite_credito: 35.0,
      saldo_atual: 0.0,
      public_token: "aaaa1111-1111-4111-8111-111111111105",
      ultima_movimentacao_em: daysAgoIso(4, 16),
      created_at: daysAgoIso(20),
    },
    {
      id: c6Id,
      tenant_id: tenantId,
      guardian_id: null,
      nome: "Marcos Vinicius (Portaria)",
      turma_ou_apelido: "Funcionário",
      whatsapp: "5586998220011",
      limite_credito: 60.0,
      saldo_atual: 11.0,
      public_token: "aaaa1111-1111-4111-8111-111111111106",
      ultima_movimentacao_em: daysAgoIso(0, 8),
      created_at: daysAgoIso(18),
    },
  ];

  const transactions: Transaction[] = [
    {
      id: "44444444-4444-4444-8444-444444444401",
      tenant_id: tenantId,
      customer_id: c1Id,
      tipo: "FIADO",
      valor: 11.0,
      descricao: "Salgado + Suco Natural",
      data_lancamento: daysAgoDate(5),
      created_at: daysAgoIso(5, 10),
    },
    {
      id: "44444444-4444-4444-8444-444444444402",
      tenant_id: tenantId,
      customer_id: c1Id,
      tipo: "FIADO",
      valor: 12.0,
      descricao: "Combo Lanche",
      data_lancamento: daysAgoDate(3),
      created_at: daysAgoIso(3, 10),
    },
    {
      id: "44444444-4444-4444-8444-444444444403",
      tenant_id: tenantId,
      customer_id: c1Id,
      tipo: "RECEBIMENTO",
      valor: 8.0,
      descricao: "Pagamento parcial no balcão",
      data_lancamento: daysAgoDate(2),
      created_at: daysAgoIso(2, 11),
    },
    {
      id: "44444444-4444-4444-8444-444444444404",
      tenant_id: tenantId,
      customer_id: c1Id,
      tipo: "FIADO",
      valor: 13.5,
      descricao: "Misto Quente + Refrigerante",
      data_lancamento: daysAgoDate(1),
      created_at: daysAgoIso(1, 10),
    },
    {
      id: "44444444-4444-4444-8444-444444444405",
      tenant_id: tenantId,
      customer_id: c2Id,
      tipo: "FIADO",
      valor: 6.0,
      descricao: "Salgado",
      data_lancamento: daysAgoDate(4),
      created_at: daysAgoIso(4, 9),
    },
    {
      id: "44444444-4444-4444-8444-444444444406",
      tenant_id: tenantId,
      customer_id: c2Id,
      tipo: "FIADO",
      valor: 8.0,
      descricao: "Suco Natural + Água",
      data_lancamento: daysAgoDate(2),
      created_at: daysAgoIso(2, 9),
    },
    {
      id: "44444444-4444-4444-8444-444444444407",
      tenant_id: tenantId,
      customer_id: c3Id,
      tipo: "FIADO",
      valor: 24.0,
      descricao: "2x Combo Lanche",
      data_lancamento: daysAgoDate(8),
      created_at: daysAgoIso(8, 15),
    },
    {
      id: "44444444-4444-4444-8444-444444444408",
      tenant_id: tenantId,
      customer_id: c3Id,
      tipo: "FIADO",
      valor: 22.0,
      descricao: "Misto Quente + Salgado + Suco Natural + Água",
      data_lancamento: daysAgoDate(6),
      created_at: daysAgoIso(6, 15),
    },
    {
      id: "44444444-4444-4444-8444-444444444409",
      tenant_id: tenantId,
      customer_id: c4Id,
      tipo: "FIADO",
      valor: 11.5,
      descricao: "Salgado + Refrigerante",
      data_lancamento: daysAgoDate(5),
      created_at: daysAgoIso(5, 11),
    },
    {
      id: "44444444-4444-4444-8444-444444444410",
      tenant_id: tenantId,
      customer_id: c4Id,
      tipo: "FIADO",
      valor: 8.0,
      descricao: "Misto Quente",
      data_lancamento: daysAgoDate(3),
      created_at: daysAgoIso(3, 11),
    },
    {
      id: "44444444-4444-4444-8444-444444444411",
      tenant_id: tenantId,
      customer_id: c5Id,
      tipo: "FIADO",
      valor: 12.0,
      descricao: "Combo Lanche",
      data_lancamento: daysAgoDate(7),
      created_at: daysAgoIso(7, 15),
    },
    {
      id: "44444444-4444-4444-8444-444444444412",
      tenant_id: tenantId,
      customer_id: c5Id,
      tipo: "RECEBIMENTO",
      valor: 12.0,
      descricao: "Quitação PIX",
      data_lancamento: daysAgoDate(4),
      created_at: daysAgoIso(4, 16),
    },
    {
      id: "44444444-4444-4444-8444-444444444413",
      tenant_id: tenantId,
      customer_id: c6Id,
      tipo: "FIADO",
      valor: 11.0,
      descricao: "Salgado + Suco Natural",
      data_lancamento: daysAgoDate(0),
      created_at: daysAgoIso(0, 8),
    },
  ];

  const reminders: Reminder[] = [
    {
      id: "55555555-5555-4555-8555-555555555501",
      tenant_id: tenantId,
      customer_id: c3Id,
      data_lembrete: daysAgoDate(0),
      concluido: false,
      created_at: daysAgoIso(2),
    },
    {
      id: "55555555-5555-4555-8555-555555555502",
      tenant_id: tenantId,
      customer_id: c1Id,
      data_lembrete: daysAgoDate(-1),
      concluido: false,
      created_at: daysAgoIso(1),
    },
  ];

  return { tenant, guardians, customers, transactions, reminders };
}
