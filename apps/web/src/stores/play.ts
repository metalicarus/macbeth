import { countSpeeches, createPlay, readMbth, writeMbth, type Id, type Play } from '@macbeth/core';
import type { JSONContent } from '@tiptap/core';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { docToPlay } from '../editor/convert';
import { fileProvider, suggestedFileName, type FileHandle } from '../files';

/** A peça aberta e o arquivo de onde ela veio. O editor escreve aqui a cada alteração. */
export const usePlayStore = defineStore('play', () => {
  const play = shallowRef<Play>(createPlay());
  const fileName = ref<string | null>(null);
  /** Há alterações desde a última vez que a peça foi aberta ou salva. */
  const dirty = ref(false);
  /** Sobe quando outra peça é carregada; o editor usa para recarregar o conteúdo. */
  const revision = ref(0);

  let handle: FileHandle | null = null;
  // Entradas do .mbth que esta versão não conhece; voltam intactas ao salvar.
  let extras: Record<string, Uint8Array> = {};

  /*
   * Personagens que o editor cadastrou sozinho a partir do nome digitado na
   * fala. Enquanto se digita "Macbeth", passam por aqui "M", "Ma", "Mac"...;
   * os que ficam sem nenhuma fala são descartados. Quem já estava no cadastro
   * nunca é removido por este caminho.
   */
  const autoCreated = new Set<Id>();

  function load(next: Play, file: { name: string | null; handle: FileHandle | null; extras: Record<string, Uint8Array> }) {
    autoCreated.clear();
    play.value = next;
    fileName.value = file.name;
    handle = file.handle;
    extras = file.extras;
    dirty.value = false;
    revision.value++;
  }

  function newPlay() {
    load(createPlay(), { name: null, handle: null, extras: {} });
  }

  /** Abre um .mbth. Devolve `false` se a pessoa cancelar; erros de formato são lançados (MbthError). */
  async function open(): Promise<boolean> {
    const file = await fileProvider().open();
    if (!file) return false;
    const { play: opened, extras: openedExtras } = readMbth(file.bytes);
    load(opened, { name: file.name, handle: file.handle, extras: openedExtras });
    return true;
  }

  /**
   * Salva no arquivo aberto ou, se não houver (ou `as` for true), pergunta onde.
   * `untitled` é o nome usado quando a peça ainda não tem título.
   */
  async function save(untitled: string, as = false): Promise<boolean> {
    const bytes = writeMbth({ play: play.value, extras });
    const name = fileName.value ?? suggestedFileName(play.value.titlePage.title || untitled);
    const saved = await fileProvider().save(bytes, as ? null : handle, name);
    if (!saved) return false;
    fileName.value = saved.name;
    handle = saved.handle;
    dirty.value = false;
    return true;
  }

  function applyDoc(doc: JSONContent) {
    let next = docToPlay(doc, play.value);

    // Descarta quem ficou sem fala ("M" quando já se lê "Ma") e converte de novo,
    // para que os nomes novos reaproveitem a cor liberada.
    const counts = countSpeeches(next);
    const discard = [...autoCreated].filter((id) => !counts.get(id));
    let base = play.value;
    if (discard.length > 0) {
      for (const id of discard) autoCreated.delete(id);
      base = { ...base, characters: base.characters.filter((c) => !discard.includes(c.id)) };
      next = docToPlay(doc, base);
    }

    const known = new Set(base.characters.map((c) => c.id));
    for (const c of next.characters) if (!known.has(c.id)) autoCreated.add(c.id);

    play.value = next;
    dirty.value = true;
  }

  return { play, fileName, dirty, revision, newPlay, open, save, applyDoc };
});
