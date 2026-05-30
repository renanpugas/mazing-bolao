<script setup lang="ts">
import { useJoinPoolMutation, usePoolsListQuery } from "~/composables/usePoolsApi";

const poolsQuery = usePoolsListQuery();
const joinPoolMutation = useJoinPoolMutation();

const successMessage = ref<string | null>(null);
const requestError = ref<string | null>(null);

const availablePools = computed(() => poolsQuery.data.value ?? []);

const joinPool = async (poolId: string, poolName: string) => {
  successMessage.value = null;
  requestError.value = null;

  try {
    await joinPoolMutation.mutateAsync({ poolId });
    successMessage.value = `Você entrou no bolão "${poolName}".`;
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : "Erro ao entrar no bolão.";
  }
};
</script>

<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/60 via-white to-cyan-50/40 dark:from-emerald-950/20 dark:via-neutral-950 dark:to-cyan-950/20"
  >
    <UContainer class="py-8 space-y-6">
      <UPageHeader
        title="Available Pools"
        description="Veja os bolões disponíveis e entre nos que quiser participar."
        class="rounded-2xl border border-default bg-default/70 p-6 backdrop-blur-sm"
      />

      <UAlert
        v-if="successMessage"
        color="success"
        icon="i-lucide-check-circle"
        title="Entrada confirmada"
        :description="successMessage"
      />

      <UAlert
        v-if="requestError"
        color="error"
        icon="i-lucide-alert-circle"
        title="Não foi possível entrar"
        :description="requestError"
      />

      <UAlert
        v-if="poolsQuery.status.value === 'pending'"
        color="info"
        icon="i-lucide-loader-2"
        title="Carregando bolões"
        description="Buscando bolões disponíveis..."
      />

      <UAlert
        v-else-if="poolsQuery.status.value === 'error'"
        color="error"
        icon="i-lucide-alert-circle"
        title="Erro ao carregar bolões"
        :description="poolsQuery.error.value?.message || 'Não foi possível carregar os bolões.'"
      />

      <UCard v-else-if="availablePools.length" class="border-default/80 bg-default/80 backdrop-blur-sm">
        <template #header>
          <h2 class="font-semibold">Bolões disponíveis</h2>
        </template>

        <div class="space-y-3">
          <div
            v-for="pool in availablePools"
            :key="pool.id"
            class="flex flex-col gap-3 rounded-lg border border-default p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p class="font-medium">{{ pool.name }}</p>
              <p class="text-sm text-muted">
                Criado em:
                {{ new Date(pool.createdAt).toLocaleString("pt-BR") }}
              </p>
            </div>

            <UButton
              :loading="joinPoolMutation.isPending.value"
              @click="joinPool(pool.id, pool.name)"
            >
              Entrar no bolão
            </UButton>
          </div>
        </div>
      </UCard>

      <UAlert
        v-else
        color="warning"
        icon="i-lucide-search"
        title="Nenhum bolão encontrado"
        description="Ainda não existem bolões disponíveis para entrada."
      />
    </UContainer>
  </div>
</template>
