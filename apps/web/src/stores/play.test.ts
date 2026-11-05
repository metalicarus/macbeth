import { addCharacter, CHARACTER_COLORS, createPlay, MbthError, readMbth, writeMbth, type Play } from '@macbeth/core';
import type { JSONContent } from '@tiptap/core';
import { strToU8 } from 'fflate';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setFileProvider, type FileHandle, type FileProvider } from '../files';
import { usePlayStore } from './play';

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => setFileProvider(null));

/** Provedor falso: guarda o que foi salvo e devolve o arquivo que o teste mandar abrir. */
function fakeFiles(toOpen?: { name: string; bytes: Uint8Array }) {
  const saves: { bytes: Uint8Array; handle: FileHandle | null; suggestedName: string }[] = [];
  let cancel = false;
  const provider: FileProvider = {
    open: async () => (toOpen && !cancel ? { ...toOpen, handle: `/peças/${toOpen.name}` } : null),
    save: async (bytes, handle, suggestedName) => {
      if (cancel) return null;
      saves.push({ bytes, handle, suggestedName });
      const name = typeof handle === 'string' ? handle.split('/').pop()! : suggestedName;
      return { name, handle: handle ?? `/peças/${name}` };
    },
  };
  setFileProvider(provider);
  return { saves, cancelNext: () => (cancel = true) };
}

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

  it('não remove quem já estava no cadastro, mesmo sem falas', async () => {
    fakeFiles({ name: 'porteiro.mbth', bytes: writeMbth({ play: addCharacter(createPlay(), 'Porteiro').play, extras: {} }) });
    const store = usePlayStore();
    await store.open();
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

describe('abrir e salvar', () => {
  function sample(): Play {
    return addCharacter(createPlay({ title: 'Macbeth' }), 'Banquo').play;
  }

  it('abrir carrega a peça, o nome do arquivo e recarrega o editor', async () => {
    const play = sample();
    fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play, extras: {} }) });
    const store = usePlayStore();
    const revision = store.revision;

    expect(await store.open()).toBe(true);
    expect(store.play).toEqual(play);
    expect(store.fileName).toBe('macbeth.mbth');
    expect(store.dirty).toBe(false);
    expect(store.revision).toBe(revision + 1);
  });

  it('cancelar a janela de abrir não muda nada', async () => {
    fakeFiles();
    const store = usePlayStore();
    const before = store.play;

    expect(await store.open()).toBe(false);
    expect(store.play).toBe(before);
  });

  it('arquivo inválido gera MbthError e mantém a peça aberta', async () => {
    fakeFiles({ name: 'ruim.mbth', bytes: strToU8('não é zip') });
    const store = usePlayStore();
    const before = store.play;

    await expect(store.open()).rejects.toBeInstanceOf(MbthError);
    expect(store.play).toBe(before);
  });

  it('salvar uma peça nova pergunta onde, com o título como nome sugerido', async () => {
    const files = fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play: sample(), extras: {} }) });
    const store = usePlayStore();
    store.newPlay();
    store.applyDoc({ type: 'doc', content: [] });

    expect(store.dirty).toBe(true);
    expect(await store.save('Peça sem título')).toBe(true);
    expect(files.saves[0]).toMatchObject({ handle: null, suggestedName: 'Peça sem título.mbth' });
    expect(store.dirty).toBe(false);
    expect(store.fileName).toBe('Peça sem título.mbth');
  });

  it('salvar de novo grava no mesmo arquivo, e "salvar como" pergunta outra vez', async () => {
    const files = fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play: sample(), extras: {} }) });
    const store = usePlayStore();
    await store.open();

    await store.save('x');
    await store.save('x', true);
    expect(files.saves.map((s) => s.handle)).toEqual(['/peças/macbeth.mbth', null]);
  });

  it('preserva as entradas desconhecidas do arquivo ao salvar', async () => {
    const stage = strToU8('{"marks":[]}');
    const files = fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play: sample(), extras: { 'pro/stage.json': stage } }) });
    const store = usePlayStore();
    await store.open();
    await store.save('x');

    expect(readMbth(files.saves[0]!.bytes).extras['pro/stage.json']).toEqual(stage);
  });

  it('cancelar a janela de salvar mantém as alterações pendentes', async () => {
    const files = fakeFiles();
    const store = usePlayStore();
    store.applyDoc({ type: 'doc', content: [] });
    files.cancelNext();

    expect(await store.save('x')).toBe(false);
    expect(store.dirty).toBe(true);
  });
});

describe('folha de rosto e personagens', () => {
  it('editar a folha de rosto marca a peça como não salva', () => {
    const store = usePlayStore();
    store.updateTitlePage({ title: 'Macbeth', author: 'William Shakespeare', subtitle: 'Tragédia' });
    expect(store.play.titlePage).toEqual({ title: 'Macbeth', author: 'William Shakespeare', subtitle: 'Tragédia' });
    expect(store.dirty).toBe(true);
  });

  it('subtítulo vazio sai da folha de rosto', () => {
    const store = usePlayStore();
    store.updateTitlePage({ subtitle: 'Tragédia' });
    store.updateTitlePage({ subtitle: '' });
    expect(store.play.titlePage).not.toHaveProperty('subtitle');
  });

  it('personagem cadastrado no painel não é descartado sem falas', () => {
    const store = usePlayStore();
    store.addCharacter('Porteiro');
    typeName(store, 'Macbeth');
    expect(store.play.characters.map((c) => c.name)).toEqual(['Porteiro', 'Macbeth']);
  });

  it('renomear um personagem criado pelo editor o torna permanente', () => {
    const store = usePlayStore();
    typeName(store, 'Macbet');
    const id = store.play.characters[0]!.id;
    store.renameCharacter(id, 'Macbeth');
    store.applyDoc({ type: 'doc', content: [] });

    expect(store.play.characters).toMatchObject([{ id, name: 'Macbeth' }]);
  });

  it('troca a cor e remove personagens sem falas', () => {
    const store = usePlayStore();
    const porteiro = store.addCharacter('Porteiro');
    store.setCharacterColor(porteiro.id, '#1AA6B7');
    expect(store.play.characters[0]?.color).toBe('#1AA6B7');

    store.removeCharacter(porteiro.id);
    expect(store.play.characters).toEqual([]);
  });

  it('nome repetido chega como erro e não muda a peça', () => {
    const store = usePlayStore();
    store.addCharacter('Banquo');
    const before = store.play;
    expect(() => store.addCharacter('banquo')).toThrow(/Já existe/);
    expect(store.play).toBe(before);
  });
});
