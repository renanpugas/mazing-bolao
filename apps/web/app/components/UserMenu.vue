<script setup lang="ts">
const { signOut } = useAuthApi();
const session = useSessionQuery();
const toast = useToast();

const userName = computed(() => {
  const user = session.data.value?.user;
  return user?.name || user?.email || "Usuario";
});

const handleSignOut = async (close?: () => void) => {
  try {
    await signOut(
      async () => {
        close?.();
        toast.add({ title: "Sessao encerrada" });
        await navigateTo("/", { replace: true, external: true });
      },
      (error) => {
        toast.add({
          title: "Nao foi possivel sair",
          description: error?.error?.message || "Erro desconhecido",
        });
      },
    );
  } catch (error: any) {
    toast.add({
      title: "Nao foi possivel sair",
      description: error.message || "Tente novamente.",
    });
  }
};
</script>

<template>
  <div>
    <USkeleton v-if="session.status.value === 'pending'" class="h-9 w-24" />

    <UButton v-else-if="!session.data.value" variant="outline" to="/login"> Entrar </UButton>

    <UPopover
      v-else
      :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
      :ui="{ content: 'w-72 p-0 rounded-lg shadow-xl ring ring-default bg-default' }"
    >
      <UButton
        color="neutral"
        variant="soft"
        :label="userName"
        trailing-icon="i-lucide-chevron-down"
        class="max-w-52 justify-between"
        :ui="{ label: 'truncate' }"
      />

      <template #content="{ close }">
        <div class="space-y-4 p-4">
          <div>
            <p class="text-sm text-muted">Conectado como</p>
            <p class="mt-1 truncate font-semibold text-highlighted">{{ userName }}</p>
          </div>

          <UButton
            color="error"
            block
            size="lg"
            label="Sair"
            :loading="session.isFetching.value"
            @click="handleSignOut(close)"
          />
        </div>
      </template>
    </UPopover>
  </div>
</template>
