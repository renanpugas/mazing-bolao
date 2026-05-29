<script setup lang="ts">
import PredictionMatchCard from "~/components/predictions/PredictionMatchCard.vue";

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

defineProps<{
  jogos: Jogo[];
  palpites: Record<number, Palpite>;
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
      :palpite="palpites[jogo.id]"
      @update-palpite="emit('update-palpite', $event)"
    />
  </div>
</template>
