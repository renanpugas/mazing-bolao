import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePoolMutation, usePoolsListQuery } from "@/hooks/use-pools-api";
import { useSyncWorldCupMutation, useTournamentsListQuery } from "@/hooks/use-tournaments-api";

type Privacidade = "publico" | "privado";
type FormState = { nome: string; tournamentId: string; descricao: string; limitePalpite: string; taxaEntrada: number; maxParticipantes: number; privacidade: Privacidade };

const initialForm: FormState = { nome: "", tournamentId: "", descricao: "", limitePalpite: "", taxaEntrada: 0, maxParticipantes: 20, privacidade: "publico" };

export const Route = createFileRoute("/pools/new")({ component: NewPoolPage });

function NewPoolPage() {
  const [formulario, setFormulario] = useState<FormState>(initialForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [createdSuccessfully, setCreatedSuccessfully] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const poolsQuery = usePoolsListQuery();
  const tournamentsQuery = useTournamentsListQuery();
  const createPoolMutation = useCreatePoolMutation();
  const syncWorldCupMutation = useSyncWorldCupMutation();
  const createdPools = poolsQuery.data ?? [];
  const tournaments = tournamentsQuery.data ?? [];

  const validar = () => {
    const nextErrors: Record<string, string> = {};
    if (!formulario.nome.trim()) nextErrors.nome = "Informe o nome do bolão.";
    if (!formulario.tournamentId) nextErrors.tournamentId = "Selecione o torneio.";
    if (!formulario.limitePalpite) nextErrors.limitePalpite = "Informe a data limite dos palpites.";
    if (formulario.taxaEntrada < 0) nextErrors.taxaEntrada = "A taxa não pode ser negativa.";
    if (formulario.maxParticipantes < 2) nextErrors.maxParticipantes = "O mínimo é 2 participantes.";
    setErros(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createPool = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatedSuccessfully(false);
    setRequestError(null);
    if (!validar()) return;
    try {
      await createPoolMutation.mutateAsync({ name: formulario.nome.trim(), tournamentId: formulario.tournamentId });
      setCreatedSuccessfully(true);
      setFormulario(initialForm);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao criar bolão.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-amber-50/60 via-white to-lime-50/40">
      <PageShell className="space-y-6">
        <PageHeader title="Create Pool" description="Configure seu bolão e defina as regras iniciais para os participantes." />
        <Card className="mx-auto w-full max-w-4xl bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={createPool}>
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                <Field label="Nome do bolão" error={erros.nome}><Input value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} placeholder="Ex.: Bolão da Firma" /></Field>
                <Field label="Torneio" error={erros.tournamentId}>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formulario.tournamentId} onChange={(event) => setFormulario({ ...formulario, tournamentId: event.target.value })}>
                    <option value="">Selecione um torneio</option>
                    {tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {!tournaments.length ? <Button className="mt-2" type="button" variant="soft" disabled={syncWorldCupMutation.isPending} onClick={() => void syncWorldCupMutation.mutateAsync({})}>{syncWorldCupMutation.isPending ? "Sincronizando..." : "Importar Copa do Mundo 2026"}</Button> : null}
                </Field>
              </div>
              <Field label="Descrição (opcional)"><Textarea value={formulario.descricao} onChange={(event) => setFormulario({ ...formulario, descricao: event.target.value })} rows={3} placeholder="Escreva um resumo com regras, prêmios e critérios de desempate." /></Field>
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
                <Field label="Data limite do palpite" error={erros.limitePalpite}><Input value={formulario.limitePalpite} onChange={(event) => setFormulario({ ...formulario, limitePalpite: event.target.value })} type="datetime-local" /></Field>
                <Field label="Taxa de entrada (R$)" error={erros.taxaEntrada}><Input value={formulario.taxaEntrada} onChange={(event) => setFormulario({ ...formulario, taxaEntrada: Number(event.target.value) })} type="number" min="0" step="1" /></Field>
                <Field label="Máximo de participantes" error={erros.maxParticipantes}><Input value={formulario.maxParticipantes} onChange={(event) => setFormulario({ ...formulario, maxParticipantes: Number(event.target.value) })} type="number" min="2" step="1" /></Field>
              </div>
              <Field label="Privacidade">
                <RadioGroup value={formulario.privacidade} onValueChange={(value) => setFormulario({ ...formulario, privacidade: value as Privacidade })} className="flex gap-6">
                  <RadioOption value="publico" label="Público" />
                  <RadioOption value="privado" label="Privado" />
                </RadioGroup>
              </Field>
              <div className="flex justify-end"><Button type="submit" disabled={createPoolMutation.isPending}>Criar bolão</Button></div>
            </form>
            {createdSuccessfully ? <Alert className="mt-4" variant="success"><AlertTitle>Bolão criado com sucesso</AlertTitle><AlertDescription>Bolão criado e salvo na API.</AlertDescription></Alert> : null}
            {requestError ? <Alert className="mt-4" variant="destructive"><AlertTitle>Erro ao criar bolão</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
          </CardContent>
        </Card>
        {createdPools.length ? <Card><CardHeader><CardTitle>Bolões cadastrados</CardTitle></CardHeader><CardContent className="space-y-3">{createdPools.map((pool) => <div key={pool.id} className="rounded-lg border p-3"><p className="font-medium">{pool.name}</p><p className="text-sm text-muted-foreground">{pool.tournamentName ?? "Sem torneio"} · Criado em: {new Date(pool.createdAt).toLocaleString("pt-BR")}</p></div>)}</CardContent></Card> : null}
        {!createdPools.length && poolsQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando bolões</AlertTitle><AlertDescription>Buscando bolões cadastrados...</AlertDescription></Alert> : null}
        {!createdPools.length && poolsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar bolões</AlertTitle><AlertDescription>{poolsQuery.error?.message || "Não foi possível carregar os bolões."}</AlertDescription></Alert> : null}
      </PageShell>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}{error ? <p className="text-sm text-destructive">{error}</p> : null}</div>;
}

function RadioOption({ value, label }: { value: string; label: string }) {
  return <div className="flex items-center gap-2"><RadioGroupItem value={value} id={value} /><Label htmlFor={value}>{label}</Label></div>;
}
