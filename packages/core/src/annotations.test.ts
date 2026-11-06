import { describe, expect, it } from 'vitest';
import { createNote, isFullyCut, normalizeCuts, splitByCuts, textWithoutCuts } from './annotations';
import type { SceneElement } from './model';

describe('normalizeCuts', () => {
  it('ordena, junta sobreposições e limita ao texto', () => {
    expect(normalizeCuts([{ from: 8, to: 12 }, { from: 0, to: 3 }, { from: 2, to: 5 }, { from: 10, to: 99 }], 20)).toEqual([
      { from: 0, to: 5 },
      { from: 8, to: 20 },
    ]);
  });

  it('descarta cortes vazios ou invertidos', () => {
    expect(normalizeCuts([{ from: 4, to: 4 }, { from: 6, to: 2 }], 10)).toEqual([]);
  });
});

describe('splitByCuts e textWithoutCuts', () => {
  const text = 'Dia tão feio e tão belo eu nunca vi.';

  it('divide o texto em trechos mantidos e cortados', () => {
    expect(splitByCuts(text, [{ from: 13, to: 24 }])).toEqual([
      { text: 'Dia tão feio ', cut: false },
      { text: 'e tão belo ', cut: true },
      { text: 'eu nunca vi.', cut: false },
    ]);
  });

  it('sem cortes, devolve o texto inteiro', () => {
    expect(splitByCuts(text)).toEqual([{ text, cut: false }]);
    expect(textWithoutCuts(text)).toBe(text);
  });

  it('tira os trechos cortados', () => {
    expect(textWithoutCuts(text, [{ from: 13, to: 24 }])).toBe('Dia tão feio eu nunca vi.');
  });
});

describe('isFullyCut', () => {
  const direction = (cuts?: SceneElement['cuts']): SceneElement => ({ id: 'd', type: 'direction', text: 'Trovão.', ...(cuts ? { cuts } : {}) });

  it('só quando todo o texto foi cortado', () => {
    expect(isFullyCut(direction([{ from: 0, to: 7 }]))).toBe(true);
    expect(isFullyCut(direction([{ from: 0, to: 6 }]))).toBe(false);
    expect(isFullyCut(direction())).toBe(false);
  });
});

describe('createNote', () => {
  it('cria a nota com id e data', () => {
    const note = createNote('Pausa longa antes da fala.');
    expect(note.text).toBe('Pausa longa antes da fala.');
    expect(note.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(note.createdAt))).toBe(false);
  });
});
