import {
  addCharacter as addToCast,
  addToDictionary,
  countSpeeches,
  playFormat,
  createPlay,
  readMbth,
  removeCharacter as removeFromCast,
  removeFromDictionary,
  renameCharacter as renameInCast,
  setCharacterColor as recolorInCast,
  setCharacterDescription as describeInCast,
  summarizePlay,
  writeMbth,
  type Character,
  type Id,
  type Play,
  type PlayFormat,
  type PlaySummary,
  type TitlePage,
} from '@macbeth/core';
import type { JSONContent } from '@tiptap/core';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { docToPlay } from '../editor/convert';
import { i18n } from '../i18n';
import { fileProvider, IMPORT_FILES, suggestedFileName, type FileHandle } from '../files';
import { importPlay } from '../import';

/** Peça nova, escrita na língua da interface. */
function newBlankPlay(): Play {
  return createPlay({ language: i18n.global.locale.value });
}

/** A peça aberta e o arquivo de onde ela veio. O editor escreve aqui a cada alteração. */
export const usePlayStore = defineStore('play', () => {
  const play = shallowRef<Play>(newBlankPlay());
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
    load(newBlankPlay(), { name: null, handle: null, extras: {} });
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
   * Importa uma peça de .docx, .odt ou Fountain. Ela abre como peça nova,
   * ainda sem arquivo .mbth e marcada como não salva. Sem título no
   * documento, o nome do arquivo vira o título. Devolve o resumo do que foi
   * reconhecido, ou `null` se a pessoa cancelar; erros chegam como ImportError.
   */
  async function importFrom(): Promise<PlaySummary | null> {
    const file = await fileProvider().open(IMPORT_FILES);
    if (!file) return null;
    const imported = await importPlay(file.name, file.bytes);
    imported.titlePage = {
      ...imported.titlePage,
      title: imported.titlePage.title || file.name.replace(/\.[^.]+$/, ''),
      language: imported.titlePage.language || i18n.global.locale.value,
    };
    load(imported, { name: null, handle: null, extras: {} });
    dirty.value = true;
    return summarizePlay(imported);
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

  function change(next: Play) {
    play.value = next;
    dirty.value = true;
  }

  /** Campos vazios do subtítulo saem do arquivo, em vez de ficarem como texto vazio. */
  function setFormat(format: PlayFormat) {
    if (format === playFormat(play.value)) return;
    // Em linha é o padrão: o arquivo só guarda o campo quando é outra formatação.
    const { format: _, ...rest } = play.value;
    change(format === 'inline' ? rest : { ...rest, format });
  }

  function updateTitlePage(patch: Partial<TitlePage>) {
    const titlePage = { ...play.value.titlePage, ...patch };
    if (!titlePage.subtitle) delete titlePage.subtitle;
    change({ ...play.value, titlePage });
  }

  /*
   * Ações do painel de personagens. Quem passa por aqui é intencional: deixa
   * de ser candidato a descarte mesmo que fique sem falas. Erros de nome
   * (vazio, repetido) chegam como CharacterError.
   */
  function addCharacter(name: string): Character {
    const added = addToCast(play.value, name);
    change(added.play);
    return added.character;
  }

  function renameCharacter(id: Id, name: string) {
    change(renameInCast(play.value, id, name));
    autoCreated.delete(id);
  }

  function setCharacterColor(id: Id, color: string) {
    change(recolorInCast(play.value, id, color));
    autoCreated.delete(id);
  }

  function setCharacterDescription(id: Id, description: string) {
    change(describeInCast(play.value, id, description));
    autoCreated.delete(id);
  }

  function removeCharacter(id: Id) {
    change(removeFromCast(play.value, id));
    autoCreated.delete(id);
  }

  /** Palavra que o corretor passa a aceitar nesta peça (vai junto com o arquivo). */
  function addDictionaryWord(word: string) {
    const next = addToDictionary(play.value, word);
    if (next !== play.value) change(next);
  }

  /** Tira a palavra do dicionário da peça: o corretor volta a sublinhá-la. */
  function removeDictionaryWord(word: string) {
    const next = removeFromDictionary(play.value, word);
    if (next !== play.value) change(next);
  }

  return {
    play,
    fileName,
    dirty,
    revision,
    newPlay,
    open,
    importFrom,
    save,
    applyDoc,
    updateTitlePage,
    setFormat,
    addCharacter,
    renameCharacter,
    setCharacterColor,
    setCharacterDescription,
    removeCharacter,
    addDictionaryWord,
    removeDictionaryWord,
  };
});
