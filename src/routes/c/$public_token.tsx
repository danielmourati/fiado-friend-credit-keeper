import { createFileRoute } from "@tanstack/react-router";
import { PublicCustomerStatementPage } from "@/pages/PublicCustomerStatementPage";

export const Route = createFileRoute("/c/$public_token")({
  head: () => ({
    meta: [{ title: "Extrato de Fiado — Paula Lanches" }],
  }),
  component: PublicCustomerRoute,
});

function PublicCustomerRoute() {
  const { public_token } = Route.useParams();
  return <PublicCustomerStatementPage publicToken={public_token} />;
}
