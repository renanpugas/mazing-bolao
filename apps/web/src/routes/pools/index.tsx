import { createFileRoute, Link } from "@tanstack/react-router";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePoolMutation, useJoinPoolMutation, usePoolsListQuery } from "@/hooks/use-pools-api";
import { useSessionQuery } from "@/hooks/use-session-api";
import { useTournamentsListQuery } from "@/hooks/use-tournaments-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pools/")({ component: PoolsPage });

type CreatePoolFormState = { name: string; tournamentId: string; description: string };

const initialCreatePoolForm: CreatePoolFormState = { name: "", tournamentId: "", description: "" };

function PoolsPage() {
  const poolsQuery = usePoolsListQuery();
  const sessionQuery = useSessionQuery();
  const joinPoolMutation = useJoinPoolMutation();
  const pools = poolsQuery.data ?? [];
  const isAdmin = !!sessionQuery.data?.user.isAdmin;
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const joinPool = async (poolId: string, poolName: string) => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await joinPoolMutation.mutateAsync({ poolId });
      setSuccessMessage(`Você entrou no bolão "${poolName}".`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao entrar no bolão.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent">
      <PageShell className="space-y-6">
        <PageHeader title="Bolões" description="Escolha um bolão para participar, administrar ou criar um novo." />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">{pools.length ? `${pools.length} bolão(ões) cadastrado(s)` : "Nenhum bolão carregado"}</div>
          {isAdmin ? <Button onClick={() => setCreateModalOpen(true)}>Criar bolão</Button> : null}
        </div>

        {successMessage ? <Alert variant="success"><AlertTitle>Ação concluída</AlertTitle><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
        {poolsQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando bolões</AlertTitle><AlertDescription>Buscando bolões disponíveis.</AlertDescription></Alert> : null}
        {poolsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar bolões</AlertTitle><AlertDescription>{poolsQuery.error?.message || "Não foi possível carregar os bolões."}</AlertDescription></Alert> : null}

        {poolsQuery.status === "success" && pools.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pools.map((pool) => (
              <Card key={pool.id} className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>{pool.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{pool.tournamentName ?? "Sem torneio"} · Criado em {new Date(pool.createdAt).toLocaleString("pt-BR")}</p>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button onClick={() => void joinPool(pool.id, pool.name)} disabled={joinPoolMutation.isPending}>Entrar</Button>
                  <Link to="/pool-results/$poolId" params={{ poolId: pool.id }} className={cn(buttonVariants({ variant: "secondary" }))}>Resultados</Link>
                  <Link to="/pools/$poolId" params={{ poolId: pool.id }} className={cn(buttonVariants({ variant: "outline" }))}>Configurar</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {poolsQuery.status === "success" && !pools.length ? <Alert variant="warning"><AlertTitle>Nenhum bolão encontrado</AlertTitle><AlertDescription>Ainda não existem bolões disponíveis.</AlertDescription></Alert> : null}
      </PageShell>
      {createModalOpen ? <CreatePoolModal onClose={() => setCreateModalOpen(false)} onCreated={(message) => setSuccessMessage(message)} /> : null}
    </div>
  );
}

function CreatePoolModal({ onClose, onCreated }: { onClose: () => void; onCreated: (message: string) => void }) {
  const tournamentsQuery = useTournamentsListQuery();
  const createPoolMutation = useCreatePoolMutation();
  const [form, setForm] = useState<CreatePoolFormState>(initialCreatePoolForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const tournaments = tournamentsQuery.data ?? [];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestError(null);
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Informe o nome do bolão.";
    if (!form.tournamentId) nextErrors.tournamentId = "Selecione o torneio.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await createPoolMutation.mutateAsync({ name: form.name.trim(), tournamentId: form.tournamentId });
      onCreated("Bolão criado com sucesso.");
      onClose();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao criar bolão.");
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Criar bolão</CardTitle><p className="mt-1 text-sm text-muted-foreground">Defina os dados iniciais do bolão.</p></div>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          {requestError ? <Alert variant="destructive"><AlertTitle>Erro ao criar bolão</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
          {tournamentsQuery.status === "pending" ? <Alert variant="info"><AlertDescription>Carregando torneios.</AlertDescription></Alert> : null}
          <Field label="Nome do bolão" error={errors.name}><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Bolão da Firma" /></Field>
          <Field label="Torneio" error={errors.tournamentId}>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.tournamentId} onChange={(event) => setForm({ ...form, tournamentId: event.target.value })}>
              <option value="">Selecione um torneio</option>
              {tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Descrição (opcional)"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Resumo com regras, prêmios e critérios." /></Field>
          <div className="flex justify-end"><Button type="submit" disabled={createPoolMutation.isPending}>{createPoolMutation.isPending ? "Criando" : "Criar bolão"}</Button></div>
        </form>
      </CardContent>
    </ModalShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{error ? <p className="text-sm text-destructive">{error}</p> : null}</div>;
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar modal" className="fixed inset-0 cursor-default" onClick={onClose} />
      <Card className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border-primary/30 bg-card shadow-2xl">{children}</Card>
    </div>
  );
}
