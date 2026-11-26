import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/lembretes")({
  head: () => ({
    meta: [
      { title: "Lembretes — Paula Lanches" },
      { name: "description", content: "Cobranças que você marcou para não esquecer." },
      { property: "og:title", content: "Lembretes — Paula Lanches" },
      { property: "og:description", content: "Cobranças que você marcou para não esquecer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Lembretes" subtitle="Cobranças que você marcou para não esquecer." />
      <EmptyState title="Nenhum lembrete" text="Quando marcar uma cobrança, ela aparece aqui no dia certo." />
    </>
  );
}
