import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedShell } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Balcão — Paula Lanches" }],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <AuthenticatedShell>
      <DashboardPage />
    </AuthenticatedShell>
  );
}
