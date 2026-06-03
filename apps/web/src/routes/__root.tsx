import { createRootRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { useSessionQuery } from "@/hooks/use-session-api";

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  const location = useLocation();
  const session = useSessionQuery();
  const isLogin = location.pathname === "/login";

  if (!isLogin && session.status !== "pending" && !session.data) {
    return <Navigate to="/login" replace />;
  }

  if (isLogin) return <Outlet />;

  return (
    <div className="app-shell min-h-screen bg-background">
      <Header />
      <Outlet />
    </div>
  );
}
