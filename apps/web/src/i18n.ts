import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';

// O pt-BR é a referência: as outras línguas precisam ter as mesmas chaves.
type Messages = typeof ptBR;

export const LOCALES = ['pt-BR', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

/** Escolhe a língua do sistema quando ela é suportada; senão, português. */
export function detectLocale(languages: readonly string[] = navigator.languages): Locale {
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0];
    if (base === 'pt') return 'pt-BR';
    if (base === 'en') return 'en';
    if (base === 'es') return 'es';
  }
  return 'pt-BR';
}

export const i18n = createI18n<[Messages], Locale, false>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'pt-BR',
  messages: { 'pt-BR': ptBR, en, es },
});
