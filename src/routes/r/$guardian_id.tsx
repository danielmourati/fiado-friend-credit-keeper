import { createFileRoute } from "@tanstack/react-router";
import { PublicGuardianStatementPage } from "@/pages/PublicGuardianStatementPage";

export const Route = createFileRoute("/r/$guardian_id")({
  head: () => ({
    meta: [{ title: "Extrato Consolidado — Paula Lanches" }],
  }),
  component: PublicGuardianRoute,
});

function PublicGuardianRoute() {
  const { guardian_id } = Route.useParams();
  return <PublicGuardianStatementPage guardianId={guardian_id} />;
}
