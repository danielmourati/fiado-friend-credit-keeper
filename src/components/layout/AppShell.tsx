import { Link } from "@tanstack/react-router";
import { Bell, Home, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/lembretes", label: "Lembretes", icon: Bell },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
              P
            </span>
            <span className="font-display text-xl font-bold">Paula Lanches</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted data-[status=active]:bg-secondary data-[status=active]:text-secondary-foreground"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground data-[status=active]:text-primary"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
