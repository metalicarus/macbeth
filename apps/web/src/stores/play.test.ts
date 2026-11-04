import { addCharacter, CHARACTER_COLORS, createPlay } from '@macbeth/core';
import type { JSONContent } from '@tiptap/core';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayStore } from './play';

beforeEach(() => setActivePinia(createPinia()));

function docWithCues(...names: string[]): JSONContent {
  return {
    type: 'doc',
    content: names.map((name) => ({
      type: 'speech',
      content: [
        { type: 'speechCue', content: name ? [{ type: 'text', text: name }] : [] },
        { type: 'speechLine', content: [{ type: 'text', text: '…' }] },
      ],
    })),
  };
}

/** Simula a digitação do nome letra por letra. */
function typeName(store: ReturnType<typeof usePlayStore>, name: string, before: string[] = []): void {
  for (let i = 1; i <= name.length; i++) store.applyDoc(docWithCues(...before, name.slice(0, i)));
}

describe('applyDoc', () => {
  it('não deixa no cadastro os nomes digitados pela metade', () => {
    const store = usePlayStore();
    typeName(store, 'Macbeth');

    expect(store.play.characters.map((c) => c.name)).toEqual(['Macbeth']);
  });

  it('o primeiro personagem fica com a primeira cor', () => {
    const store = usePlayStore();
    typeName(store, 'Macbeth');
    typeName(store, 'Banquo', ['Macbeth']);

    expect(store.play.characters.map((c) => [c.name, c.color])).toEqual([
      ['Macbeth', CHARACTER_COLORS[0]],
      ['Banquo', CHARACTER_COLORS[1]],
    ]);
  });

  it('não remove quem já estava no cadastro, mesmo sem falas', () => {
    const store = usePlayStore();
    store.replace(addCharacter(createPlay(), 'Porteiro').play);
    typeName(store, 'Macbeth');

    expect(store.play.characters.map((c) => c.name)).toEqual(['Porteiro', 'Macbeth']);
  });

  it('apagar a fala de um personagem criado agora o tira do cadastro', () => {
    const store = usePlayStore();
    typeName(store, 'Macbeth');
    store.applyDoc({ type: 'doc', content: [] });

    expect(store.play.characters).toEqual([]);
  });
});
