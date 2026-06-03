import { Link, useLocation } from "@tanstack/react-router";

import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", to: "/" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Predictions", to: "/predictions" },
  { label: "Pools", to: "/pools" },
  { label: "Create Pool", to: "/pools/new" },
  { label: "Pool Results", to: "/pool-results" },
] as const;

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap items-center gap-2">
          {items.map((item) => {
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
        <UserMenu />
      </div>
    </header>
  );
}
