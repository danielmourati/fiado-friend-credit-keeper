import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedShell } from "@/components/Layout";
import { GuardiansPage } from "@/pages/GuardiansPage";

export const Route = createFileRoute("/responsaveis")({
  head: () => ({
    meta: [{ title: "Responsáveis — Paula Lanches" }],
  }),
  component: GuardiansRoute,
});

function GuardiansRoute() {
  return (
    <AuthenticatedShell>
      <GuardiansPage />
    </AuthenticatedShell>
  );
}
