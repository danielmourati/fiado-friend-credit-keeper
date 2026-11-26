import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedShell } from "@/components/Layout";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";

export const Route = createFileRoute("/cliente/$id")({
  head: () => ({
    meta: [{ title: "Perfil do Cliente — Paula Lanches" }],
  }),
  component: CustomerDetailRoute,
});

function CustomerDetailRoute() {
  const { id } = Route.useParams();
  return (
    <AuthenticatedShell>
      <CustomerDetailPage customerId={id} />
    </AuthenticatedShell>
  );
}
