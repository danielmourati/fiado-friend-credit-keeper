import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppProvider } from "@/contexts/AppContext";
import { ToastContainer } from "@/components/ToastContainer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F8FC] px-4">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-md">
        <h1 className="text-5xl font-extrabold text-[#22328B]">404</h1>
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          Página não encontrada
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          O endereço acessado não existe ou foi movido.
        </p>
        <div className="mt-5">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-[#22328B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#18256B]"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F8FC] px-4">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-md">
        <h1 className="text-lg font-extrabold text-slate-900">
          Não foi possível carregar esta tela
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          Tente recarregar a página ou voltar ao início.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-[#22328B] px-4 py-2.5 text-xs font-bold text-white"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#22328B" },
      { title: "Paula Lanches — Controle de Fiado" },
      {
        name: "description",
        content:
          "Controle de fiado rápido no balcão para lanchonetes e cantinas escolares com PIX e WhatsApp.",
      },
      { property: "og:title", content: "Paula Lanches — Controle de Fiado" },
      {
        property: "og:description",
        content:
          "Controle de fiado rápido no balcão para lanchonetes e cantinas escolares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/logo-paula-lanches.jpg", type: "image/jpeg" },
      { rel: "apple-touch-icon", href: "/logo-paula-lanches.jpg" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      import.meta.env.PROD
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso se o ambiente bloquear SW
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ToastContainer />
        <Outlet />
      </AppProvider>
    </QueryClientProvider>
  );
}
