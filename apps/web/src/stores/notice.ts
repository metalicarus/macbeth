import { defineStore } from 'pinia';
import { ref } from 'vue';

const DURATION_MS = 6000;

/** Aviso curto no alto do app, que some sozinho (ex.: o resumo de uma importação). */
export const useNotice = defineStore('notice', () => {
  const message = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function show(text: string) {
    message.value = text;
    clearTimeout(timer);
    timer = setTimeout(dismiss, DURATION_MS);
  }

  function dismiss() {
    clearTimeout(timer);
    message.value = null;
  }

  return { message, show, dismiss };
});
