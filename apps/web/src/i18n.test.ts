import { describe, expect, it } from 'vitest';
import { detectLocale } from './i18n';
import en from './locales/en.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

describe('detectLocale', () => {
  it('reconhece as variantes de cada língua', () => {
    expect(detectLocale(['pt-PT'])).toBe('pt-BR');
    expect(detectLocale(['en-GB'])).toBe('en');
    expect(detectLocale(['es-AR'])).toBe('es');
  });

  it('usa a primeira língua suportada da lista', () => {
    expect(detectLocale(['fr-FR', 'es-ES', 'en-US'])).toBe('es');
  });

  it('cai no português quando nenhuma é suportada', () => {
    expect(detectLocale(['ja-JP'])).toBe('pt-BR');
    expect(detectLocale([])).toBe('pt-BR');
  });
});

describe('traduções', () => {
  it('inglês e espanhol têm as mesmas chaves do português', () => {
    expect(keys(en).sort()).toEqual(keys(ptBR).sort());
    expect(keys(es).sort()).toEqual(keys(ptBR).sort());
  });
});
