import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { detectLocale, i18n, LOCALES, type Locale } from '../i18n';

export type Look = 'papel' | 'coxia';

const LOOK_KEY = 'macbeth.look';
const PANEL_KEY = 'macbeth.panel';
const OUTLINE_KEY = 'macbeth.outline';
const CUTS_KEY = 'macbeth.cuts';
const LANGUAGE_KEY = 'macbeth.language';
const REHEARSAL_KEY = 'macbeth.rehearsal';

/** Como quem ensaia prefere ver: as próprias falas, a deixa e o trecho. */
export interface RehearsalSettings {
  mask: 'initials' | 'hidden' | 'visible';
  cue: 'words' | 'speech';
  scope: 'scene' | 'play';
}

const DEFAULT_REHEARSAL: RehearsalSettings = { mask: 'initials', cue: 'words', scope: 'scene' };

function initialRehearsal(): RehearsalSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(REHEARSAL_KEY) ?? '{}') as Partial<RehearsalSettings>;
    return { ...DEFAULT_REHEARSAL, ...saved };
  } catch {
    return { ...DEFAULT_REHEARSAL };
  }
}

/** Língua da interface: uma das suportadas, ou "auto" para seguir o sistema. */
export type InterfaceLanguage = Locale | 'auto';

function initialLanguage(): InterfaceLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch {
    // Sem acesso ao armazenamento: segue o sistema.
  }
  return 'auto';
}

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
  /** Trechos cortados aparecem riscados no texto; desligado, somem da tela. */
  const showCuts = ref(initiallyOpen(CUTS_KEY));
  const language = ref<InterfaceLanguage>(initialLanguage());
  const rehearsal = ref<RehearsalSettings>(initialRehearsal());

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
  watch(showCuts, (show) => remember(CUTS_KEY, show));

  watch(
    language,
    (choice) => {
      const locale = choice === 'auto' ? detectLocale() : choice;
      i18n.global.locale.value = locale;
      document.documentElement.lang = locale;
      try {
        if (choice === 'auto') localStorage.removeItem(LANGUAGE_KEY);
        else localStorage.setItem(LANGUAGE_KEY, choice);
      } catch {
        // A escolha vale só para esta sessão.
      }
    },
    { immediate: true },
  );

  watch(
    rehearsal,
    (settings) => {
      try {
        localStorage.setItem(REHEARSAL_KEY, JSON.stringify(settings));
      } catch {
        // A escolha vale só para esta sessão.
      }
    },
    { deep: true },
  );

  return { look, panelOpen, outlineOpen, showCuts, language, rehearsal };
});
