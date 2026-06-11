import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthApi } from "@/hooks/use-auth-api";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuthApi();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordActionDisabled = passwordLoading || !email.trim() || !password || (authMode === "sign-up" && !name.trim());

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle("/", (apiError) => {
        setError(apiError.error.message);
      });
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Tente novamente.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordLoading(true);
    setError(null);

    try {
      if (authMode === "sign-up") {
        await signUpWithEmail({ name: name.trim(), email: email.trim(), password, callbackURL: "/" });
      } else {
        await signInWithEmail({ email: email.trim(), password, callbackURL: "/" });
      }

      window.location.assign("/");
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Tente novamente.");
    } finally {
      setPasswordLoading(false);
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
              <Button className="mt-6 w-full" size="lg" variant="secondary" onClick={handleGoogleSignIn} disabled={googleLoading || passwordLoading}>
                {googleLoading ? "Entrando..." : "Entrar com Google"}
              </Button>
              <div className="my-6 h-px bg-emerald-200/15" />
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-emerald-950/80 p-1">
                <Button type="button" size="sm" variant={authMode === "sign-in" ? "secondary" : "ghost"} onClick={() => setAuthMode("sign-in")}>
                  Entrar
                </Button>
                <Button type="button" size="sm" variant={authMode === "sign-up" ? "secondary" : "ghost"} onClick={() => setAuthMode("sign-up")}>
                  Criar senha
                </Button>
              </div>
              <form className="mt-5 space-y-4" onSubmit={handlePasswordSubmit}>
                {authMode === "sign-up" ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="border-emerald-200/20 bg-emerald-950/70 text-emerald-50"
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="border-emerald-200/20 bg-emerald-950/70 text-emerald-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    minLength={8}
                    autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="border-emerald-200/20 bg-emerald-950/70 text-emerald-50"
                  />
                </div>
                <Button className="w-full" size="lg" type="submit" disabled={passwordActionDisabled}>
                  {passwordLoading ? "Carregando..." : authMode === "sign-up" ? "Criar conta com senha" : "Entrar com e-mail"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
