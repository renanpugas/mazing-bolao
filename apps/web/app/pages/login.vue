<script setup lang="ts">
const form = reactive({
  email: "",
  password: "",
});
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
          <h2 class="mt-3 text-3xl font-extrabold text-emerald-50">Entrar na conta</h2>
          <p class="mt-2 text-sm text-emerald-100/80">Continue de onde parou e acompanhe seus palpites em tempo real.</p>

          <form class="mt-6 space-y-4" @submit.prevent>
            <label class="block">
              <span class="mb-1 block text-sm font-semibold text-emerald-50">E-mail</span>
              <input
                v-model="form.email"
                type="email"
                placeholder="voce@email.com"
                class="w-full rounded-lg border border-emerald-200/25 bg-emerald-900/55 px-3 py-2 text-emerald-50 placeholder:text-emerald-200/60 outline-none ring-0 focus:border-amber-300/70"
              />
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-semibold text-emerald-50">Senha</span>
              <input
                v-model="form.password"
                type="password"
                placeholder="Digite sua senha"
                class="w-full rounded-lg border border-emerald-200/25 bg-emerald-900/55 px-3 py-2 text-emerald-50 placeholder:text-emerald-200/60 outline-none ring-0 focus:border-amber-300/70"
              />
            </label>

            <n-button class="!mt-2" type="primary" attr-type="submit" block>
              Entrar
            </n-button>
          </form>

          <p class="mt-4 text-sm text-emerald-100/80">
            Ainda não participa? <a href="#" class="font-semibold text-amber-200">Criar conta</a>
          </p>
        </n-card>
      </div>
    </section>
  </main>
</template>
