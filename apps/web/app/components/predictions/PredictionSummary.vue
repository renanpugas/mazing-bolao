<script setup lang="ts">
defineProps<{
  totalJogos: number;
  palpitesPreenchidos: number;
}>();
</script>

<template>
  <UCard>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm text-muted">Progresso dos palpites</p>
        <p class="text-xl font-semibold">{{ palpitesPreenchidos }} / {{ totalJogos }}</p>
      </div>
      <UBadge color="primary" variant="subtle">
        {{ Math.round((palpitesPreenchidos / totalJogos) * 100) || 0 }}%
      </UBadge>
    </div>
  </UCard>
</template>
