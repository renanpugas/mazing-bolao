import { Link, useLocation } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useSessionQuery } from "@/hooks/use-session-api";
import { cn } from "@/lib/utils";

const items = [
  { label: "Meu bolão", to: "/" },
  { label: "Bolões", to: "/pools" },
] as const;

export function Header() {
  const location = useLocation();
  const sessionQuery = useSessionQuery();
  const navItems = sessionQuery.data?.user.isAdmin ? [...items, { label: "Usuários", to: "/users" }] : items;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-primary/10 text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://www.youtube.com/watch?v=KD8Vtj0RoXw"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Hino oficial
          </a>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
