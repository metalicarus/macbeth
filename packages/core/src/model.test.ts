import { describe, expect, it } from 'vitest';
import { createPlay, playFormat, playLanguage, SCHEMA_VERSION, type Play } from './model';

describe('createPlay', () => {
  it('começa com um ato e uma cena vazia', () => {
    const play = createPlay({ title: 'Macbeth', author: 'William Shakespeare' });

    expect(play.schemaVersion).toBe(SCHEMA_VERSION);
    expect(play.titlePage).toEqual({ title: 'Macbeth', author: 'William Shakespeare' });
    expect(play.characters).toEqual([]);
    expect(play.acts).toHaveLength(1);
    expect(play.acts[0]?.scenes).toHaveLength(1);
    expect(play.acts[0]?.scenes[0]?.elements).toEqual([]);
  });

  it('gera ids diferentes para cada ato e cena', () => {
    const a = createPlay();
    const b = createPlay();

    expect(a.acts[0]?.id).not.toBe(b.acts[0]?.id);
    expect(a.acts[0]?.scenes[0]?.id).not.toBe(b.acts[0]?.scenes[0]?.id);
  });
});

describe('playLanguage', () => {
  it('usa o idioma da folha de rosto, ou português do Brasil se não houver', () => {
    expect(playLanguage(createPlay())).toBe('pt-BR');
    expect(playLanguage(createPlay({ language: 'fr' }))).toBe('fr');
  });
});

describe('playFormat', () => {
  it('Em linha quando não há formatação ou ela é desconhecida', () => {
    expect(playFormat(createPlay())).toBe('inline');
    expect(playFormat({ ...createPlay(), format: 'centered' })).toBe('centered');
    expect(playFormat({ ...createPlay(), format: 'screenplay' } as unknown as Play)).toBe('inline');
  });
});
