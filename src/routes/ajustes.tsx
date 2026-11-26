import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Paula Lanches" },
      { name: "description", content: "Dados da loja, chave PIX e mensagem do WhatsApp." },
      { property: "og:title", content: "Ajustes — Paula Lanches" },
      { property: "og:description", content: "Dados da loja, chave PIX e mensagem do WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Dados da loja, chave PIX e mensagem do WhatsApp." />
      <EmptyState title="Em breve" text="Aqui você vai configurar a loja, o PIX e os atalhos rápidos." />
    </>
  );
}
