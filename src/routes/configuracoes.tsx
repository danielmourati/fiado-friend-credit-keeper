import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedShell } from "@/components/Layout";
import { SettingsPage } from "@/pages/SettingsPage";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [{ title: "Configurações — Paula Lanches" }],
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <AuthenticatedShell>
      <SettingsPage />
    </AuthenticatedShell>
  );
}
