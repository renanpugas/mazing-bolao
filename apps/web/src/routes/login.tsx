import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthApi } from "@/hooks/use-auth-api";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signInWithGoogle } = useAuthApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle("/", (apiError) => {
        setError(apiError.error.message);
      });
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,#2f8f5b_0%,transparent_40%),radial-gradient(circle_at_85%_80%,#f7b731_0%,transparent_35%),linear-gradient(145deg,#0c1f1a_0%,#101820_52%,#173126_100%)] p-5">
      <section className="mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-300/20 bg-emerald-900/90 p-6 shadow-2xl md:p-8">
          <Card className="rounded-2xl border-emerald-200/10 bg-emerald-950/55 text-emerald-50">
            <CardContent className="pt-6">
              <p className="inline-block rounded-full bg-amber-300/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-100">Acesse seu bolão</p>
              <h2 className="mt-3 text-3xl font-extrabold">Entrar na conta</h2>
              <p className="mt-2 text-sm text-emerald-100/80">Continue de onde parou e acompanhe seus palpites em tempo real.</p>
              {error ? <p className="mt-4 rounded-md bg-red-500/15 p-3 text-sm text-red-100">{error}</p> : null}
              <Button className="mt-6 w-full" size="lg" variant="secondary" onClick={handleSignIn} disabled={loading}>
                {loading ? "Entrando..." : "Entrar com Google"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
