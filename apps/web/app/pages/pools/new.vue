<script setup lang="ts">
type Privacidade = "publico" | "privado";

type CreatedPool = {
  nome: string;
  campeonato: string;
  descricao: string;
  limitePalpite: string;
  taxaEntrada: number;
  maxParticipantes: number;
  privacidade: Privacidade;
};

const formulario = reactive({
  nome: "",
  campeonato: "",
  descricao: "",
  limitePalpite: "",
  taxaEntrada: 0,
  maxParticipantes: 20,
  privacidade: "publico" as Privacidade,
});

const erros = reactive<Record<string, string>>({});
const createdSuccessfully = ref(false);
const createdPools = ref<CreatedPool[]>([]);

const opcoesPrivacidade = [
  { label: "Público", value: "publico" as const },
  { label: "Privado", value: "privado" as const },
];

const validar = () => {
  Object.keys(erros).forEach((key) => {
    delete erros[key];
  });

  if (!formulario.nome.trim()) erros.nome = "Informe o nome do bolão.";
  if (!formulario.campeonato.trim()) erros.campeonato = "Informe o campeonato.";
  if (!formulario.limitePalpite) erros.limitePalpite = "Informe a data limite dos palpites.";
  if (formulario.taxaEntrada < 0) erros.taxaEntrada = "A taxa não pode ser negativa.";
  if (formulario.maxParticipantes < 2) erros.maxParticipantes = "O mínimo é 2 participantes.";

  return Object.keys(erros).length === 0;
};

const limparFormulario = () => {
  formulario.nome = "";
  formulario.campeonato = "";
  formulario.descricao = "";
  formulario.limitePalpite = "";
  formulario.taxaEntrada = 0;
  formulario.maxParticipantes = 20;
  formulario.privacidade = "publico";
};

const createPool = () => {
  createdSuccessfully.value = false;
  if (!validar()) return;

  createdPools.value.unshift({
    nome: formulario.nome.trim(),
    campeonato: formulario.campeonato.trim(),
    descricao: formulario.descricao.trim(),
    limitePalpite: formulario.limitePalpite,
    taxaEntrada: formulario.taxaEntrada,
    maxParticipantes: formulario.maxParticipantes,
    privacidade: formulario.privacidade,
  });

  createdSuccessfully.value = true;
  limparFormulario();
};
</script>

<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-amber-50/60 via-white to-lime-50/40 dark:from-amber-950/20 dark:via-neutral-950 dark:to-lime-950/20"
  >
    <UContainer class="py-8 space-y-6">
      <UPageHeader
        title="Create Pool"
        description="Configure seu bolão e defina as regras iniciais para os participantes."
        class="rounded-2xl border border-default bg-default/70 p-6 backdrop-blur-sm"
      />

      <UCard class="mx-auto w-full max-w-4xl border-default/80 bg-default/80 backdrop-blur-sm">
        <form class="space-y-5" @submit.prevent="createPool">
          <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <UFormField label="Nome do bolão" :error="erros.nome">
              <UInput v-model="formulario.nome" class="w-full" placeholder="Ex.: Bolão da Firma" />
            </UFormField>

            <UFormField label="Campeonato" :error="erros.campeonato">
              <UInput v-model="formulario.campeonato" class="w-full" placeholder="Ex.: Brasileirão Série A" />
            </UFormField>
          </div>

          <UFormField label="Descrição (opcional)">
            <UTextarea
              v-model="formulario.descricao"
              class="w-full"
              :rows="3"
              placeholder="Escreva um resumo com regras, prêmios e critérios de desempate."
            />
          </UFormField>

          <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            <UFormField label="Data limite do palpite" :error="erros.limitePalpite">
              <UInput v-model="formulario.limitePalpite" class="w-full" type="datetime-local" />
            </UFormField>

            <UFormField label="Taxa de entrada (R$)" :error="erros.taxaEntrada">
              <UInput v-model.number="formulario.taxaEntrada" class="w-full" type="number" min="0" step="1" />
            </UFormField>

            <UFormField label="Máximo de participantes" :error="erros.maxParticipantes">
              <UInput
                v-model.number="formulario.maxParticipantes"
                class="w-full"
                type="number"
                min="2"
                step="1"
              />
            </UFormField>
          </div>

          <UFormField label="Privacidade">
            <URadioGroup
              v-model="formulario.privacidade"
              class="w-full"
              orientation="horizontal"
              :items="opcoesPrivacidade"
            />
          </UFormField>

          <div class="flex items-center justify-end pt-1">
            <UButton type="submit">Criar bolão</UButton>
          </div>
        </form>

        <UAlert
          v-if="createdSuccessfully"
          class="mt-4"
          color="success"
          icon="i-lucide-check-circle"
          title="Bolão criado com sucesso"
          description="A criação foi salva localmente nesta sessão. Próximo passo: conectar com a API."
        />
      </UCard>

      <UCard v-if="createdPools.length" class="border-default/80 bg-default/80 backdrop-blur-sm">
        <template #header>
          <h2 class="font-semibold">Bolões criados agora</h2>
        </template>

        <div class="space-y-3">
          <div
            v-for="pool in createdPools"
            :key="`${pool.nome}-${pool.limitePalpite}`"
            class="rounded-lg border border-default p-3"
          >
            <p class="font-medium">{{ pool.nome }}</p>
            <p class="text-sm text-muted">{{ pool.campeonato }}</p>
            <p class="text-sm text-muted">
              Limite: {{ pool.limitePalpite }} | Participantes: até {{ pool.maxParticipantes }} | {{
                pool.privacidade === "publico" ? "Público" : "Privado"
              }}
            </p>
          </div>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
