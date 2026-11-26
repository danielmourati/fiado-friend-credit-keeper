# Estrutura mínima — Micro SaaS de Controle de Fiados

Criar apenas os diretórios iniciais (com um `.gitkeep` em cada, para que fiquem salvos). Nenhuma tela, banco de dados ou lógica será criada agora.

## Diretórios

```text
src/
  components/
    layout/        -> cabeçalho, menu lateral, rodapé
    clientes/      -> peças visuais de clientes
    fiados/        -> peças visuais de fiados (vendas a prazo)
    pagamentos/    -> peças visuais de pagamentos/abatimentos
  features/
    clientes/      -> regras e consultas de clientes
    fiados/        -> regras de lançamento e saldo devedor
    pagamentos/    -> regras de quitação/abatimento
  lib/
    validators/    -> validações de formulários (ex.: valores, telefone)
    formatters/    -> formatação de moeda (R$) e datas
  types/           -> tipos compartilhados (Cliente, Fiado, Pagamento)
  test/rules/      -> testes das regras de negócio (saldo, limites)
```

Já existentes e mantidos: `src/routes`, `src/components/ui`, `src/hooks`, `src/lib`, `src/test`.

## Detalhes técnicos
- Pastas de rotas (`clientes`, `fiados`) não serão criadas vazias, pois o gerador de rotas exige arquivos válidos; serão criadas quando as telas forem construídas.
- Registrar no `AGENTS.md` a regra: código por domínio em `src/features/<domínio>`, componentes em `src/components/<domínio>`.
- Banco de dados (Lovable Cloud) fica para uma etapa seguinte.
