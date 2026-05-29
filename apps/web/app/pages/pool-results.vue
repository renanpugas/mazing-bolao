<script setup lang="ts">
type RankingEntry = {
  id: number;
  name: string;
  points: number;
  exactScores: number;
  correctOutcomes: number;
};

type Pool = {
  id: number;
  name: string;
  ranking: RankingEntry[];
};

const pools = ref<Pool[]>([
  {
    id: 1,
    name: "Office League",
    ranking: [
      { id: 1, name: "Ana", points: 24, exactScores: 6, correctOutcomes: 9 },
      { id: 2, name: "Renan", points: 21, exactScores: 5, correctOutcomes: 8 },
      { id: 3, name: "Carlos", points: 19, exactScores: 4, correctOutcomes: 7 },
    ],
  },
  {
    id: 2,
    name: "Family Cup",
    ranking: [
      { id: 1, name: "Marcos", points: 17, exactScores: 3, correctOutcomes: 8 },
      { id: 2, name: "Julia", points: 16, exactScores: 3, correctOutcomes: 7 },
      { id: 3, name: "Paula", points: 13, exactScores: 2, correctOutcomes: 6 },
    ],
  },
  {
    id: 3,
    name: "Friends Pool",
    ranking: [
      { id: 1, name: "Leo", points: 28, exactScores: 7, correctOutcomes: 10 },
      { id: 2, name: "Bianca", points: 25, exactScores: 6, correctOutcomes: 9 },
      { id: 3, name: "Davi", points: 20, exactScores: 4, correctOutcomes: 8 },
    ],
  },
]);

const selectedPoolId = ref<number>(pools.value[0]?.id ?? 1);

const selectedPool = computed(() => pools.value.find((pool) => pool.id === selectedPoolId.value));

const sortedRanking = computed(() => {
  if (!selectedPool.value) return [];

  return [...selectedPool.value.ranking].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return b.correctOutcomes - a.correctOutcomes;
  });
});
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <UPageHeader
      title="Pool Ranking"
      description="Select a pool to view the live leaderboard and who has the highest score."
    />

    <UCard>
      <template #header>
        <h2 class="font-semibold">Select Pool</h2>
      </template>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="pool in pools"
          :key="pool.id"
          :variant="pool.id === selectedPoolId ? 'solid' : 'soft'"
          @click="selectedPoolId = pool.id"
        >
          {{ pool.name }}
        </UButton>
      </div>
    </UCard>

    <UCard v-if="selectedPool">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold">{{ selectedPool.name }} Ranking</h2>
          <UBadge color="primary" variant="subtle">
            Leader: {{ sortedRanking[0]?.name ?? "-" }}
          </UBadge>
        </div>
      </template>

      <UTable
        :data="sortedRanking"
        :columns="[
          { accessorKey: 'name', header: 'Participant' },
          { accessorKey: 'points', header: 'Points' },
          { accessorKey: 'exactScores', header: 'Exact Scores' },
          { accessorKey: 'correctOutcomes', header: 'Correct Outcomes' },
        ]"
      />
    </UCard>
  </UContainer>
</template>
