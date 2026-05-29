<script setup lang="ts">
import PredictionMatchList from "~/components/predictions/PredictionMatchList.vue";
import PredictionSummary from "~/components/predictions/PredictionSummary.vue";

type Jogo = {
  id: number;
  rodada: string;
  horario: string;
  estadio: string;
  mandante: string;
  visitante: string;
};

type Palpite = {
  golsMandante: number | null;
  golsVisitante: number | null;
};

type PalpiteUpdate = {
  jogoId: number;
  lado: "mandante" | "visitante";
  gols: number | null;
};

type Bolao = {
  id: number;
  nome: string;
};

const jogos: Jogo[] = [
  {
    id: 1,
    rodada: "Round 12",
    horario: "Saturday, 16:00",
    estadio: "Arena Serra Dourada",
    mandante: "Flamengo",
    visitante: "Palmeiras",
  },
  {
    id: 2,
    rodada: "Round 12",
    horario: "Saturday, 18:30",
    estadio: "Neo Quimica Arena",
    mandante: "Corinthians",
    visitante: "Sao Paulo",
  },
  {
    id: 3,
    rodada: "Round 12",
    horario: "Sunday, 11:00",
    estadio: "Vila Belmiro",
    mandante: "Santos",
    visitante: "Bragantino",
  },
  {
    id: 4,
    rodada: "Round 12",
    horario: "Sunday, 16:00",
    estadio: "Mineirao",
    mandante: "Cruzeiro",
    visitante: "Atletico-MG",
  },
  {
    id: 5,
    rodada: "Round 12",
    horario: "Sunday, 18:30",
    estadio: "Beira-Rio",
    mandante: "Internacional",
    visitante: "Gremio",
  },
  {
    id: 6,
    rodada: "Round 12",
    horario: "Sunday, 20:00",
    estadio: "Arena Fonte Nova",
    mandante: "Bahia",
    visitante: "Fortaleza",
  },
  {
    id: 7,
    rodada: "Round 12",
    horario: "Monday, 19:00",
    estadio: "Arena da Baixada",
    mandante: "Athletico-PR",
    visitante: "Fluminense",
  },
  {
    id: 8,
    rodada: "Round 12",
    horario: "Monday, 21:30",
    estadio: "Nilton Santos",
    mandante: "Botafogo",
    visitante: "Vasco",
  },
];

const boloes: Bolao[] = [
  { id: 1, nome: "Bolao da Firma" },
  { id: 2, nome: "Familia" },
  { id: 3, nome: "Amigos do Futebol" },
];

const bolaoSelecionadoId = ref(boloes[0]?.id ?? 1);

const criarPalpitesIniciais = () =>
  jogos.reduce(
    (acc, jogo) => ({
      ...acc,
      [jogo.id]: { golsMandante: null, golsVisitante: null },
    }),
    {} as Record<number, Palpite>,
  );

const palpitesPorBolao = ref<Record<number, Record<number, Palpite>>>({});

const garantirPalpitesDoBolao = (bolaoId: number) => {
  if (!palpitesPorBolao.value[bolaoId]) {
    palpitesPorBolao.value[bolaoId] = criarPalpitesIniciais();
  }
};

const palpiteDoBolaoSelecionado = computed(() => {
  garantirPalpitesDoBolao(bolaoSelecionadoId.value);
  return palpitesPorBolao.value[bolaoSelecionadoId.value];
});

const palpitesPreenchidos = computed(() =>
  jogos.filter((jogo) => {
    const palpite = palpiteDoBolaoSelecionado.value[jogo.id];
    return palpite?.golsMandante !== null && palpite?.golsVisitante !== null;
  }).length,
);

const mensagemEnvio = ref("");

const atualizarPalpite = ({ jogoId, lado, gols }: PalpiteUpdate) => {
  const atual = palpiteDoBolaoSelecionado.value[jogoId];
  if (!atual) return;

  palpiteDoBolaoSelecionado.value[jogoId] = {
    ...atual,
    golsMandante: lado === "mandante" ? gols : atual.golsMandante,
    golsVisitante: lado === "visitante" ? gols : atual.golsVisitante,
  };
};

const selecionarBolao = (bolaoId: number) => {
  bolaoSelecionadoId.value = bolaoId;
  garantirPalpitesDoBolao(bolaoId);
  mensagemEnvio.value = "";
};

const enviarPalpites = () => {
  mensagemEnvio.value =
    `Você enviou ${palpitesPreenchidos.value} palpite(s) localmente para o bolao selecionado. Depois conectamos com a API quando a fonte de dados estiver definida.`;
};
</script>

<template>
  <div
    class="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/70 via-white to-cyan-50/50 dark:from-emerald-950/20 dark:via-neutral-950 dark:to-cyan-950/20"
  >
    <UContainer class="py-8 space-y-6">
      <UPageHeader
        title="Palpites"
        description="Escolha os placares dos jogos abaixo. Nesta etapa, estamos usando apenas dados de exemplo."
        class="rounded-2xl border border-default bg-default/70 p-6 backdrop-blur-sm"
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
              {{ bolao.nome }}
            </UButton>
          </div>
        </div>
      </UCard>

      <PredictionSummary :total-jogos="jogos.length" :palpites-preenchidos="palpitesPreenchidos" />

      <PredictionMatchList
        :jogos="jogos"
        :palpites="palpiteDoBolaoSelecionado"
        @update-palpite="atualizarPalpite"
      />

      <UCard class="border-default/80 bg-default/80 backdrop-blur-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">Você pode enviar quantos palpites quiser.</p>
          <UButton @click="enviarPalpites">Enviar palpites</UButton>
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
