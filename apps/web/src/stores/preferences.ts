import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type Look = 'papel' | 'coxia';

const LOOK_KEY = 'macbeth.look';

function initialLook(): Look {
  try {
    const saved = localStorage.getItem(LOOK_KEY);
    if (saved === 'papel' || saved === 'coxia') return saved;
  } catch {
    // Sem acesso ao armazenamento: segue a preferência do sistema.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'coxia' : 'papel';
}

export const usePreferences = defineStore('preferences', () => {
  const look = ref<Look>(initialLook());

  watch(
    look,
    (value) => {
      document.documentElement.dataset.look = value;
      try {
        localStorage.setItem(LOOK_KEY, value);
      } catch {
        // A escolha vale só para esta sessão.
      }
    },
    { immediate: true },
  );

  return { look };
});
