<script setup lang="ts">
import PredictionMatchCard from "~/components/predictions/PredictionMatchCard.vue";

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
  golsMandante: number | null;
  golsVisitante: number | null;
};

type PalpiteUpdate = {
  jogoId: string;
  lado: "mandante" | "visitante";
  gols: number | null;
};

defineProps<{
  jogos: Jogo[];
  palpites: Record<string, Palpite>;
}>();

const emit = defineEmits<{
  "update-palpite": [payload: PalpiteUpdate];
}>();
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <PredictionMatchCard
      v-for="jogo in jogos"
      :key="jogo.id"
      :jogo="jogo"
      :palpite="palpites[jogo.id] ?? { golsMandante: null, golsVisitante: null }"
      @update-palpite="emit('update-palpite', $event)"
    />
  </div>
</template>
