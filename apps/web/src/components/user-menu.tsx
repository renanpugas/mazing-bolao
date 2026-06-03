import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthApi } from "@/hooks/use-auth-api";
import { useSessionQuery } from "@/hooks/use-session-api";

export function UserMenu() {
  const navigate = useNavigate();
  const { signOut } = useAuthApi();
  const session = useSessionQuery();
  const user = session.data?.user;
  const userName = user?.name || user?.email || "Usuario";

  const handleSignOut = async () => {
    await signOut(async () => {
      await session.refetch();
      await navigate({ to: "/login", replace: true });
    });
  };

  if (session.status === "pending") return <Skeleton className="h-9 w-24" />;

  if (!session.data) {
    return <Link to="/login" className={buttonVariants({ variant: "outline" })}>Entrar</Link>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="soft" className="max-w-52 justify-between">
          <span className="truncate">{userName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Conectado como</p>
            <p className="mt-1 truncate font-semibold">{userName}</p>
          </div>
          <Button className="w-full" variant="destructive" onClick={handleSignOut} disabled={session.isFetching}>
            Sair
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
