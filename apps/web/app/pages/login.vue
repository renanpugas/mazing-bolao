<script setup lang="ts">
const mode = ref<"signin" | "signup">("signin");
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
            {{ mode === "signin" ? "Entrar na conta" : "Criar conta" }}
          </h2>
          <p class="mt-2 text-sm text-emerald-100/80">
            {{ mode === "signin" ? "Continue de onde parou e acompanhe seus palpites em tempo real." : "Cadastre-se para começar a participar do bolão." }}
          </p>

          <SignInForm
            v-if="mode === 'signin'"
            class="mt-4"
            @switch-to-sign-up="mode = 'signup'"
          />
          <SignUpForm
            v-else
            class="mt-4"
            @switch-to-sign-in="mode = 'signin'"
          />

          <p class="mt-4 text-sm text-emerald-100/80">
            {{ mode === "signin" ? "Ainda não participa?" : "Já possui conta?" }}
            <button
              type="button"
              class="font-semibold text-amber-200"
              @click="mode = mode === 'signin' ? 'signup' : 'signin'"
            >
              {{ mode === "signin" ? "Criar conta" : "Entrar" }}
            </button>
          </p>
        </n-card>
      </div>
    </section>
  </main>
</template>
