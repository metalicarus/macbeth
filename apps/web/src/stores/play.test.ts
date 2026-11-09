import { addCharacter, CHARACTER_COLORS, createPlay, MbthError, readMbth, writeMbth, type Play } from '@macbeth/core';
import type { JSONContent } from '@tiptap/core';
import { strToU8 } from 'fflate';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setFileProvider, type FileHandle, type FileProvider } from '../files';
import { clearRecent, recentFiles } from '../files/recent';
import { setRecoveryStore, type RecoveryCopy, type RecoveryStore } from '../files/recovery';
import { i18n } from '../i18n';
import { usePlayStore } from './play';

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => {
  setFileProvider(null);
  setRecoveryStore(null);
  vi.useRealTimers();
});

/** Provedor falso: guarda o que foi salvo e devolve o arquivo que o teste mandar abrir. */
function fakeFiles(toOpen?: { name: string; bytes: Uint8Array }) {
  const saves: { bytes: Uint8Array; handle: FileHandle | null; suggestedName: string }[] = [];
  let cancel = false;
  const provider: FileProvider = {
    open: async () => (toOpen && !cancel ? { ...toOpen, handle: `/peças/${toOpen.name}` } : null),
    openPath: async (path) => {
      if (!toOpen) throw new Error('arquivo não encontrado');
      return { name: path.split('/').pop()!, bytes: toOpen.bytes, handle: path };
    },
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
    expect(store.play.titlePage).toMatchObject({ title: 'Macbeth', author: 'William Shakespeare', subtitle: 'Tragédia' });
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

describe('idioma da peça', () => {
  it('peça nova começa no idioma da interface', () => {
    i18n.global.locale.value = 'es';
    const store = usePlayStore();
    store.newPlay();
    expect(store.play.titlePage.language).toBe('es');
    i18n.global.locale.value = 'pt-BR';
  });

  it('peça importada sem idioma recebe o da interface', async () => {
    i18n.global.locale.value = 'en';
    fakeFiles({ name: 'cena.fountain', bytes: strToU8('MACBETH\nOlá.') });
    const store = usePlayStore();
    await store.importFrom();
    expect(store.play.titlePage.language).toBe('en');
    i18n.global.locale.value = 'pt-BR';
  });
});

describe('importar', () => {
  it('abre a peça importada como nova, não salva, com o nome do arquivo como título', async () => {
    fakeFiles({ name: 'A noite escocesa.fountain', bytes: strToU8('MACBETH\nOlá.\n\nBANQUO\nOi.') });
    const store = usePlayStore();
    const revision = store.revision;

    const summary = await store.importFrom();

    expect(summary).toEqual({ acts: 0, scenes: 0, characters: 2, speeches: 2 });
    expect(store.play.titlePage.title).toBe('A noite escocesa');
    expect(store.fileName).toBeNull();
    expect(store.dirty).toBe(true);
    expect(store.revision).toBe(revision + 1);
  });

  it('mantém o título que veio no documento', async () => {
    fakeFiles({ name: 'rascunho.fountain', bytes: strToU8('Title: Macbeth\n\nMACBETH\nOlá.') });
    const store = usePlayStore();
    await store.importFrom();
    expect(store.play.titlePage.title).toBe('Macbeth');
  });

  it('cancelar a janela não muda a peça aberta', async () => {
    fakeFiles();
    const store = usePlayStore();
    const before = store.play;
    expect(await store.importFrom()).toBeNull();
    expect(store.play).toBe(before);
  });
});

describe('dicionário da peça', () => {
  it('acrescentar uma palavra marca a peça como não salva; repetir não muda nada', async () => {
    fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play: createPlay(), extras: {} }) });
    const store = usePlayStore();
    await store.open();

    store.addDictionaryWord('Glamis');
    expect(store.play.dictionary).toEqual(['Glamis']);
    expect(store.dirty).toBe(true);

    const before = store.play;
    store.addDictionaryWord('Glamis');
    expect(store.play).toBe(before);
  });

  it('tirar uma palavra a devolve ao corretor; tirar a última apaga a lista', async () => {
    fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play: { ...createPlay(), dictionary: ['Cawdor', 'Glamis'] }, extras: {} }) });
    const store = usePlayStore();
    await store.open();

    store.removeDictionaryWord('Glamis');
    expect(store.play.dictionary).toEqual(['Cawdor']);
    expect(store.dirty).toBe(true);

    store.removeDictionaryWord('Cawdor');
    expect(store.play.dictionary).toBeUndefined();
  });
});

describe('formatação da peça', () => {
  it('Centralizado fica no arquivo; voltar para Em linha apaga o campo', async () => {
    fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play: createPlay(), extras: {} }) });
    const store = usePlayStore();
    await store.open();

    store.setFormat('inline');
    expect(store.dirty).toBe(false);

    store.setFormat('centered');
    expect(store.play.format).toBe('centered');
    expect(store.dirty).toBe(true);

    store.setFormat('inline');
    expect(store.play).not.toHaveProperty('format');
  });
});

/** Cópia de segurança em memória. */
function fakeRecovery(initial: RecoveryCopy | null = null) {
  const state = { copy: initial, writes: 0 };
  const recovery: RecoveryStore = {
    write: async (copy) => {
      state.copy = copy;
      state.writes++;
    },
    read: async () => state.copy,
    clear: async () => {
      state.copy = null;
    },
  };
  setRecoveryStore(recovery);
  return state;
}

describe('cópia de segurança', () => {
  it('grava 5 s depois da última alteração e apaga ao salvar', async () => {
    vi.useFakeTimers();
    fakeFiles({ name: 'macbeth.mbth', bytes: writeMbth({ play: createPlay(), extras: {} }) });
    const recovery = fakeRecovery();
    const store = usePlayStore();
    await store.open();
    await store.checkRecovery(async () => false);

    store.applyDoc(docWithCues('Macbeth'));
    await vi.advanceTimersByTimeAsync(4_000);
    store.applyDoc(docWithCues('Macbeth', 'Banquo'));
    await vi.advanceTimersByTimeAsync(4_000);
    expect(recovery.writes).toBe(0);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(recovery.writes).toBe(1);
    expect(recovery.copy).toMatchObject({ fileName: 'macbeth.mbth', path: '/peças/macbeth.mbth' });
    expect(readMbth(recovery.copy!.bytes).play.characters.map((c) => c.name)).toEqual(['Macbeth', 'Banquo']);

    await store.save('Sem título');
    await vi.runAllTimersAsync();
    expect(recovery.copy).toBeNull();
  });

  it('quem digita sem parar ganha uma cópia a cada minuto', async () => {
    vi.useFakeTimers();
    const recovery = fakeRecovery();
    const store = usePlayStore();
    await store.checkRecovery(async () => false);

    for (let second = 0; second < 61; second += 2) {
      store.applyDoc(docWithCues(`Personagem ${second}`));
      await vi.advanceTimersByTimeAsync(2_000);
    }
    expect(recovery.writes).toBe(1);
  });

  it('na abertura, recupera a cópia como peça não salva, ligada ao mesmo arquivo', async () => {
    const play = addCharacter(createPlay({ title: 'Macbeth' }), 'Banquo').play;
    fakeFiles();
    fakeRecovery({ bytes: writeMbth({ play, extras: {} }), fileName: 'macbeth.mbth', path: '/peças/macbeth.mbth', savedAt: '2026-11-09T10:00:00Z' });
    const store = usePlayStore();

    const asked: string[] = [];
    await store.checkRecovery(async (_copy, recovered) => {
      asked.push(recovered.titlePage.title);
      return true;
    });

    expect(asked).toEqual(['Macbeth']);
    expect(store.play.characters.map((c) => c.name)).toEqual(['Banquo']);
    expect(store.fileName).toBe('macbeth.mbth');
    expect(store.dirty).toBe(true);
  });

  it('descartar na abertura apaga a cópia; cópia ilegível é apagada sem perguntar', async () => {
    const recovery = fakeRecovery({ bytes: writeMbth({ play: createPlay(), extras: {} }), fileName: null, path: null, savedAt: '2026-11-09T10:00:00Z' });
    await usePlayStore().checkRecovery(async () => false);
    expect(recovery.copy).toBeNull();

    const broken = fakeRecovery({ bytes: strToU8('não é um zip'), fileName: null, path: null, savedAt: '2026-11-09T10:00:00Z' });
    let asked = false;
    await usePlayStore().checkRecovery(async () => (asked = true));
    expect(asked).toBe(false);
    expect(broken.copy).toBeNull();
  });

  it('antes da pergunta da abertura, nada é gravado nem apagado', async () => {
    vi.useFakeTimers();
    const old: RecoveryCopy = { bytes: writeMbth({ play: createPlay(), extras: {} }), fileName: null, path: null, savedAt: '2026-11-09T10:00:00Z' };
    const recovery = fakeRecovery(old);
    const store = usePlayStore();

    store.applyDoc(docWithCues('Macbeth'));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(recovery.copy).toBe(old);
  });
});

describe('arquivos recentes', () => {
  beforeEach(() => clearRecent());

  it('abrir e salvar põem o arquivo no topo; abrir pelo caminho não pergunta nada', async () => {
    const bytes = writeMbth({ play: createPlay({ title: 'Macbeth' }), extras: {} });
    fakeFiles({ name: 'macbeth.mbth', bytes });
    const store = usePlayStore();

    await store.open();
    expect(recentFiles.value).toEqual([{ path: '/peças/macbeth.mbth', name: 'macbeth.mbth' }]);

    await store.openPath('/outras/hamlet.mbth');
    expect(store.fileName).toBe('hamlet.mbth');
    expect(store.play.titlePage.title).toBe('Macbeth');
    expect(recentFiles.value.map((f) => f.name)).toEqual(['hamlet.mbth', 'macbeth.mbth']);

    await store.open();
    expect(recentFiles.value.map((f) => f.name)).toEqual(['macbeth.mbth', 'hamlet.mbth']);
  });
});

