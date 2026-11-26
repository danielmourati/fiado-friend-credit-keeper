import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paula Lanches — Controle de fiado" },
      { name: "description", content: "Veja quanto está em aberto e lance fiados e recebimentos em segundos." },
      { property: "og:title", content: "Paula Lanches — Controle de fiado" },
      { property: "og:description", content: "Veja quanto está em aberto e lance fiados e recebimentos em segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const RESUMO = [
  { label: "Total em aberto", value: "R$ 0,00" },
  { label: "Clientes devendo", value: "0" },
  { label: "Recebido hoje", value: "R$ 0,00" },
];

function Index() {
  return (
    <>
      <PageHeader title="Olá!" subtitle="Resumo do caderno de fiado de hoje." />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {RESUMO.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-primary">{item.value}</p>
          </div>
        ))}
      </div>
      <EmptyState title="Nenhum lançamento ainda" text="Os últimos fiados e recebimentos vão aparecer aqui." />
    </>
  );
}
