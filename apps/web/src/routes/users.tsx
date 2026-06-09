import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSessionQuery } from "@/hooks/use-session-api";
import { useMakeUserAdminMutation, useRemoveUserAdminMutation, useUsersListQuery } from "@/hooks/use-users-api";

export const Route = createFileRoute("/users")({ component: UsersPage });

function UsersPage() {
  const sessionQuery = useSessionQuery();
  const currentUser = sessionQuery.data?.user;
  const isAdmin = !!currentUser?.isAdmin;
  const usersQuery = useUsersListQuery({ enabled: isAdmin });
  const makeAdminMutation = useMakeUserAdminMutation();
  const removeAdminMutation = useRemoveUserAdminMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const users = usersQuery.data ?? [];
  const actionPending = makeAdminMutation.isPending || removeAdminMutation.isPending;

  const makeAdmin = async (userId: string, name: string) => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await makeAdminMutation.mutateAsync({ userId });
      setSuccessMessage(`${name} agora é admin.`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao tornar usuário admin.");
    }
  };

  const removeAdmin = async (userId: string, name: string) => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await removeAdminMutation.mutateAsync({ userId });
      setSuccessMessage(`${name} não é mais admin.`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao remover admin.");
    }
  };

  if (sessionQuery.status === "pending") {
    return (
      <PageShell>
        <Alert variant="info"><AlertTitle>Carregando sessão</AlertTitle><AlertDescription>Verificando suas permissões.</AlertDescription></Alert>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <Alert variant="warning"><AlertTitle>Acesso restrito</AlertTitle><AlertDescription>Somente administradores podem acessar a listagem de usuários.</AlertDescription></Alert>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <PageHeader title="Usuários" description="Gerencie quais usuários têm acesso de administrador." />

      {successMessage ? <Alert variant="success"><AlertTitle>Ação concluída</AlertTitle><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
      {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
      {usersQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando usuários</AlertTitle><AlertDescription>Buscando usuários cadastrados.</AlertDescription></Alert> : null}
      {usersQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar usuários</AlertTitle><AlertDescription>{usersQuery.error?.message || "Não foi possível carregar os usuários."}</AlertDescription></Alert> : null}

      {usersQuery.status === "success" ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const userName = user.name || user.email;
                  const isCurrentUser = user.id === currentUser?.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isAdmin ? "default" : "secondary"}>{user.isAdmin ? "Admin" : "Usuário"}</Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        {!user.isAdmin ? (
                          <Button size="sm" onClick={() => void makeAdmin(user.id, userName)} disabled={actionPending}>Tornar admin</Button>
                        ) : isCurrentUser ? (
                          <span className="text-sm text-muted-foreground">Você</span>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={() => void removeAdmin(user.id, userName)} disabled={actionPending}>Remover admin</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
