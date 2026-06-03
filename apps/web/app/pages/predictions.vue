<script setup lang="ts">
import PredictionMatchList from "~/components/predictions/PredictionMatchList.vue";
import PredictionSummary from "~/components/predictions/PredictionSummary.vue";
import { usePoolsListQuery } from "~/composables/usePoolsApi";
import {
  useCreatePredictionMutation,
  usePredictionsListQuery,
  useUpdatePredictionMutation,
} from "~/composables/usePredictionsApi";

type Jogo = {
  id: string;
  rodada: string;
  horario: string;
  estadio: string | null;
  cidade: string | null;
  mandante: string;
  visitante: string;
  mandanteEmoji: string | null;
  visitanteEmoji: string | null;
  encerrado: boolean;
  bloqueado: boolean;
};

type Palpite = {
  id: string | null;
  golsMandante: number | null;
  golsVisitante: number | null;
};

type PalpiteUpdate = {
  jogoId: string;
  lado: "mandante" | "visitante";
  gols: number | null;
};

const poolsQuery = usePoolsListQuery();
const boloes = computed(() => poolsQuery.data.value ?? []);
const bolaoSelecionadoId = ref<string | null>(null);
const predictionsQuery = usePredictionsListQuery(bolaoSelecionadoId);
const createPredictionMutation = useCreatePredictionMutation();
const updatePredictionMutation = useUpdatePredictionMutation();
const salvandoPalpites = computed(() => createPredictionMutation.isPending.value || updatePredictionMutation.isPending.value);
const palpitesLocais = ref<Record<string, Palpite>>({});
const palpitesAlterados = ref(new Set<string>());
const mensagemEnvio = ref("");
const requestError = ref<string | null>(null);

watch(
  boloes,
  (items) => {
    if (!bolaoSelecionadoId.value && items[0]) {
      bolaoSelecionadoId.value = items[0].id;
    }
  },
  { immediate: true },
);

watch(
  () => predictionsQuery.data.value,
  (items) => {
    palpitesLocais.value = (items ?? []).reduce(
      (acc, item) => ({
        ...acc,
        [item.match.id]: {
          id: item.id,
          golsMandante: item.homeGoals,
          golsVisitante: item.awayGoals,
        },
      }),
      {} as Record<string, Palpite>,
    );
    palpitesAlterados.value = new Set();
  },
  { immediate: true },
);

const formatarRodada = (item: NonNullable<typeof predictionsQuery.data.value>[number]) => {
  if (item.match.stage === "group") return `Grupo ${item.match.groupName ?? ""} · Rodada ${item.match.matchday ?? ""}`;
  return `${(item.match.groupName ?? item.match.stage ?? "Fase").toUpperCase()} · Jogo ${item.match.matchday ?? ""}`;
};

const jogos = computed<Jogo[]>(() =>
  (predictionsQuery.data.value ?? []).map((item) => {
    const startsAt = new Date(item.match.startsAt);
    return {
      id: item.match.id,
      rodada: formatarRodada(item),
      horario: startsAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }),
      estadio: item.match.stadiumName,
      cidade: item.match.stadiumCity,
      mandante: item.match.homeTeamLabel ?? item.match.homeTeam,
      visitante: item.match.awayTeamLabel ?? item.match.awayTeam,
      mandanteEmoji: item.match.homeTeamEmoji,
      visitanteEmoji: item.match.awayTeamEmoji,
      encerrado: !!item.match.finished,
      bloqueado: startsAt <= new Date(),
    };
  }),
);

const palpiteDoBolaoSelecionado = computed(() => palpitesLocais.value);
const temPalpitesAlterados = computed(() => palpitesAlterados.value.size > 0);

const palpitesPreenchidos = computed(() =>
  jogos.value.filter((jogo) => {
    const palpite = palpiteDoBolaoSelecionado.value[jogo.id];
    return palpite?.golsMandante !== null && palpite?.golsVisitante !== null;
  }).length,
);

const atualizarPalpite = ({ jogoId, lado, gols }: PalpiteUpdate) => {
  const atual = palpiteDoBolaoSelecionado.value[jogoId] ?? {
    id: null,
    golsMandante: null,
    golsVisitante: null,
  };

  palpitesLocais.value[jogoId] = {
    ...atual,
    golsMandante: lado === "mandante" ? gols : atual.golsMandante,
    golsVisitante: lado === "visitante" ? gols : atual.golsVisitante,
  };
  palpitesAlterados.value.add(jogoId);
};

const selecionarBolao = (bolaoId: string) => {
  bolaoSelecionadoId.value = bolaoId;
  mensagemEnvio.value = "";
  requestError.value = null;
};

const enviarPalpites = async () => {
  if (!bolaoSelecionadoId.value) return;

  mensagemEnvio.value = "";
  requestError.value = null;

  try {
    const mutations = jogos.value.flatMap((jogo) => {
      const palpite = palpiteDoBolaoSelecionado.value[jogo.id];
      if (!palpitesAlterados.value.has(jogo.id)) return [];
      if (!palpite || palpite.golsMandante === null || palpite.golsVisitante === null || jogo.bloqueado) return [];

      if (palpite.id) {
        return updatePredictionMutation.mutateAsync({
          id: palpite.id,
          homeGoals: palpite.golsMandante,
          awayGoals: palpite.golsVisitante,
        });
      }

      return createPredictionMutation.mutateAsync({
        poolId: bolaoSelecionadoId.value!,
        matchId: jogo.id,
        homeGoals: palpite.golsMandante,
        awayGoals: palpite.golsVisitante,
      });
    });

    await Promise.all(mutations);
    await predictionsQuery.refetch();

    mensagemEnvio.value = `Você salvou ${mutations.length} palpite(s) alterado(s) para o bolão selecionado.`;
  } catch (error) {
    requestError.value = error instanceof Error ? error.message : "Erro ao salvar palpites.";
  }
};
</script>

<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/70 via-white to-cyan-50/50 dark:from-emerald-950/20 dark:via-neutral-950 dark:to-cyan-950/20"
  >
    <UContainer class="py-8 space-y-6">
        <UPageHeader
          title="Palpites"
          description="Escolha os placares dos jogos da Copa do Mundo 2026 no bolão selecionado."
          class="rounded-2xl border border-default bg-default/70 p-6 backdrop-blur-sm"
        />

        <UAlert
          v-if="requestError"
          color="error"
          icon="i-lucide-alert-circle"
          title="Não foi possível salvar"
          :description="requestError"
        />

      <UCard class="border-default/80 bg-default/80 backdrop-blur-sm">
        <div class="space-y-3">
          <p class="text-sm font-medium">Selecione o bolao</p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="bolao in boloes"
              :key="bolao.id"
              :variant="bolao.id === bolaoSelecionadoId ? 'solid' : 'soft'"
              color="primary"
              @click="selecionarBolao(bolao.id)"
            >
              {{ bolao.name }}
            </UButton>
          </div>
        </div>
      </UCard>

      <UAlert
        v-if="poolsQuery.status.value === 'pending' || predictionsQuery.status.value === 'pending'"
        color="info"
        icon="i-lucide-loader-2"
        title="Carregando palpites"
        description="Buscando bolões, partidas e palpites salvos."
      />

      <UAlert
        v-else-if="predictionsQuery.status.value === 'error'"
        color="error"
        icon="i-lucide-alert-circle"
        title="Erro ao carregar partidas"
        :description="predictionsQuery.error.value?.message || 'Não foi possível carregar os dados.'"
      />

      <UAlert
        v-else-if="!jogos.length"
        color="warning"
        icon="i-lucide-calendar-x"
        title="Nenhuma partida importada"
        description="Sincronize a Copa do Mundo 2026 para este bolão antes de registrar palpites."
      />

      <PredictionSummary v-else :total-jogos="jogos.length" :palpites-preenchidos="palpitesPreenchidos" />

      <PredictionMatchList
        v-if="jogos.length"
        :jogos="jogos"
        :palpites="palpiteDoBolaoSelecionado"
        @update-palpite="atualizarPalpite"
      />

      <UCard class="border-default/80 bg-default/80 backdrop-blur-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">Você pode enviar quantos palpites quiser.</p>
          <UButton
            :disabled="!jogos.length || !temPalpitesAlterados"
            :loading="salvandoPalpites"
            @click="enviarPalpites"
          >
            Salvar palpites
          </UButton>
        </div>

        <UAlert
          v-if="mensagemEnvio"
          class="mt-4"
          color="success"
          icon="i-lucide-check-circle"
          :description="mensagemEnvio"
        />
      </UCard>
    </UContainer>
  </div>
</template>
