<script setup lang="ts">
const { signInWithGoogle: signInWithGoogleApi } = useAuthApi();
const toast = useToast();
const loading = ref(false);

async function signInWithGoogle() {
  loading.value = true;
  try {
    await signInWithGoogleApi("/dashboard", (error) => {
      toast.add({
        title: "Falha ao entrar com Google",
        description: error.error.message,
      });
    });
  } catch (error: any) {
    toast.add({
      title: "Erro inesperado",
      description: error.message || "Tente novamente.",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main
    class="min-h-screen bg-[radial-gradient(circle_at_15%_20%,#2f8f5b_0%,transparent_40%),radial-gradient(circle_at_85%_80%,#f7b731_0%,transparent_35%),linear-gradient(145deg,#0c1f1a_0%,#101820_52%,#173126_100%)] p-5"
  >
    <section class="mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center">
      <div class="w-full max-w-lg rounded-3xl border border-emerald-300/20 bg-emerald-900/90 p-6 shadow-2xl md:p-8">
        <n-card class="rounded-2xl border border-emerald-200/10 bg-emerald-950/55" :bordered="false">
          <p class="inline-block rounded-full bg-amber-300/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-100">
            Acesse seu bolão
          </p>
          <h2 class="mt-3 text-3xl font-extrabold text-emerald-50">
            Entrar na conta
          </h2>
          <p class="mt-2 text-sm text-emerald-100/80">
            Continue de onde parou e acompanhe seus palpites em tempo real.
          </p>

          <div class="mt-6">
            <UButton
              block
              size="xl"
              color="neutral"
              variant="soft"
              icon="i-simple-icons-google"
              :loading="loading"
              @click="signInWithGoogle"
            >
              Entrar com Google
            </UButton>
          </div>
        </n-card>
      </div>
    </section>
  </main>
</template>
