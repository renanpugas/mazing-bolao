<script setup lang="ts">
const { signOut } = useAuthApi();
const session = useSessionQuery();
const toast = useToast();

const handleSignOut = async () => {
  try {
    await signOut(
      async () => {
        toast.add({ title: "Signed out successfully" });
        await navigateTo("/", { replace: true, external: true });
      },
      (error) => {
        toast.add({
          title: "Sign out failed",
          description: error?.error?.message || "Unknown error",
        });
      },
    );
  } catch (error: any) {
    toast.add({
      title: "An unexpected error occurred during sign out",
      description: error.message || "Please try again.",
    });
  }
};
</script>

<template>
  <div>
    <USkeleton v-if="session.status.value === 'pending'" class="h-9 w-24" />

    <UButton v-else-if="!session.data.value" variant="outline" to="/login"> Sign In </UButton>

    <UButton
      v-else
      variant="solid"
      icon="i-lucide-log-out"
      label="Sign out"
      @click="handleSignOut()"
    />
  </div>
</template>
