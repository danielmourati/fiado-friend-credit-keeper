import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/pages/OnboardingPage";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Configurar Cantina — Paula Lanches" }],
  }),
  component: OnboardingPage,
});
