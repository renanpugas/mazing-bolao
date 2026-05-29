<script setup lang="ts">
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

const props = defineProps<{
  jogo: Jogo;
  palpite: Palpite;
}>();

const emit = defineEmits<{
  "update-palpite": [payload: PalpiteUpdate];
}>();

const parseGols = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-sm font-medium">{{ jogo.rodada }}</div>
        <div class="text-xs text-muted">{{ jogo.horario }}</div>
      </div>
    </template>

    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0 flex-1 text-right font-medium truncate">{{ jogo.mandante }}</div>
      <UInput
        :model-value="palpite.golsMandante ?? ''"
        type="number"
        min="0"
        inputmode="numeric"
        class="w-16"
        @update:model-value="
          emit('update-palpite', {
            jogoId: jogo.id,
            lado: 'mandante',
            gols: parseGols($event),
          })
        "
      />
      <span class="text-sm text-muted">x</span>
      <UInput
        :model-value="palpite.golsVisitante ?? ''"
        type="number"
        min="0"
        inputmode="numeric"
        class="w-16"
        @update:model-value="
          emit('update-palpite', {
            jogoId: jogo.id,
            lado: 'visitante',
            gols: parseGols($event),
          })
        "
      />
      <div class="min-w-0 flex-1 font-medium truncate">{{ jogo.visitante }}</div>
    </div>

    <template #footer>
      <div class="text-xs text-muted">{{ jogo.estadio }}</div>
    </template>
  </UCard>
</template>
