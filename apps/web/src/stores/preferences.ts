import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type Look = 'papel' | 'coxia';

const LOOK_KEY = 'macbeth.look';
const PANEL_KEY = 'macbeth.panel';
const OUTLINE_KEY = 'macbeth.outline';

function initialLook(): Look {
  try {
    const saved = localStorage.getItem(LOOK_KEY);
    if (saved === 'papel' || saved === 'coxia') return saved;
  } catch {
    // Sem acesso ao armazenamento: segue a preferência do sistema.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'coxia' : 'papel';
}

/** Painéis laterais começam abertos; a escolha de fechar fica salva. */
function initiallyOpen(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'closed';
  } catch {
    return true;
  }
}

function remember(key: string, open: boolean): void {
  try {
    localStorage.setItem(key, open ? 'open' : 'closed');
  } catch {
    // A escolha vale só para esta sessão.
  }
}

export const usePreferences = defineStore('preferences', () => {
  const look = ref<Look>(initialLook());
  /** O painel lateral "Peça" está aberto. */
  const panelOpen = ref(initiallyOpen(PANEL_KEY));
  /** A lateral "Sumário", com atos e cenas. */
  const outlineOpen = ref(initiallyOpen(OUTLINE_KEY));

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

  watch(panelOpen, (open) => remember(PANEL_KEY, open));
  watch(outlineOpen, (open) => remember(OUTLINE_KEY, open));

  return { look, panelOpen, outlineOpen };
});
