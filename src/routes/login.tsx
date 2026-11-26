import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/AuthPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — Paula Lanches" }],
  }),
  component: AuthPage,
});
