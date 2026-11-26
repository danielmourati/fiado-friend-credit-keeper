# Paula Lanches — SaaS PWA de Controle de Fiado

Sistema Mobile-First PWA para lanchonetes e cantinas escolares focado em velocidade no balcão, vínculo entre aluno e responsável financeiro, extrato público com PIX BR Code (EMV/CRC16) e cobrança direta via link `https://wa.me/`.

## Funcionalidades
- **Dashboard do Balcão (`/`)**: Total a receber com botão de ocultar/exibir valores, busca instantânea por aluno/turma/responsável, ordenação e botão `+` de lançamento rápido.
- **Lançamento Rápido (< 5s)**: Seletor `Fiado` / `Recebimento`, atalhos rápidos configuráveis, alerta de limite de crédito e opção **Salvar + QR Code**.
- **Cadastro Aluno & Responsável**: Vínculo de múltiplos alunos ao mesmo pai/mãe ou cadastro rápido de cliente direto.
- **Perfil do Cliente (`/cliente/:id`)**: Saldo, botão **Zerar**, histórico filtrável e botão **Cobrar no WhatsApp** com link público e PIX Copia e Cola.
- **Extrato Público (`/c/:public_token` e `/r/:guardian_id`)**: Acesso sem login com QR Code PIX de valor exato e botão Copiar Código PIX; `/r/:guardian_id` consolida a dívida de todos os filhos (Plano PRO).
- **Assinatura Plano PRO**: Integração com Mercado Pago Checkout Pro + Webhook via Supabase Edge Functions.

## Como rodar localmente
```bash
npm install
npm run dev
```

Sem variáveis no `.env`, o app inicia automaticamente em **Modo Demonstração Local** (persistido em `localStorage`) para testes imediatos de todas as telas, PIX e fluxo FREE/PRO.

## Configuração do Supabase + Mercado Pago
1. Crie um `.env` baseado em [`.env.example`](.env.example):
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   VITE_APP_URL=https://seu-dominio.com
   ```
2. Aplique a migration [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) no SQL Editor do Supabase (ou via `supabase db push`).
3. Configure os secrets e faça deploy das Edge Functions:
   ```bash
   supabase secrets set MP_ACCESS_TOKEN=APP_USR-... MP_WEBHOOK_SECRET=... MP_PRO_PRICE=29.90
   supabase functions deploy create-mp-checkout
   supabase functions deploy mp-webhook --no-verify-jwt
   ```

## Scripts de verificação
```bash
npm run test
npm run build
```
