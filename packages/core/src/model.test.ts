import { describe, expect, it } from 'vitest';
import { createPlay, SCHEMA_VERSION } from './model';

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
