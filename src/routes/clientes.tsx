import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Paula Lanches" },
      { name: "description", content: "Alunos, clientes e responsáveis da sua cantina." },
      { property: "og:title", content: "Clientes — Paula Lanches" },
      { property: "og:description", content: "Alunos, clientes e responsáveis da sua cantina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Clientes" subtitle="Alunos, clientes e responsáveis da sua cantina." />
      <EmptyState title="Nenhum cliente ainda" text="Os clientes cadastrados vão aparecer aqui com o saldo em aberto." />
    </>
  );
}
