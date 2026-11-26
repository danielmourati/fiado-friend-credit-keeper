import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedShell } from "@/components/Layout";
import { RemindersPage } from "@/pages/RemindersPage";

export const Route = createFileRoute("/lembretes")({
  head: () => ({
    meta: [{ title: "Lembretes — Paula Lanches" }],
  }),
  component: RemindersRoute,
});

function RemindersRoute() {
  return (
    <AuthenticatedShell>
      <RemindersPage />
    </AuthenticatedShell>
  );
}
