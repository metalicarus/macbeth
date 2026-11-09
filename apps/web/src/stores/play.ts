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
import { ref, shallowRef, watch } from 'vue';
import { docToPlay } from '../editor/convert';
import { i18n } from '../i18n';
import { fileProvider, IMPORT_FILES, suggestedFileName, type FileHandle, type OpenedFile } from '../files';
import { rememberRecent } from '../files/recent';
import { recoveryStore, type RecoveryCopy } from '../files/recovery';
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

  /** No desktop, o arquivo aberto ou salvo entra nos recentes. */
  function remember(file: { name: string; handle: FileHandle | null }) {
    if (typeof file.handle === 'string') rememberRecent(file.handle, file.name);
  }

  function loadOpened(file: OpenedFile) {
    const { play: opened, extras: openedExtras } = readMbth(file.bytes);
    load(opened, { name: file.name, handle: file.handle, extras: openedExtras });
    remember(file);
  }

  /** Abre um .mbth. Devolve `false` se a pessoa cancelar; erros de formato são lançados (MbthError). */
  async function open(): Promise<boolean> {
    const file = await fileProvider().open();
    if (!file) return false;
    loadOpened(file);
    return true;
  }

  /** Abre direto um .mbth pelo caminho (recentes, duplo clique no arquivo). Só no desktop. */
  async function openPath(path: string): Promise<void> {
    const provider = fileProvider();
    if (!provider.openPath) throw new Error('Este ambiente não abre arquivos pelo caminho.');
    loadOpened(await provider.openPath(path));
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
    remember(saved);
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

  /*
   * Cópia de segurança (files/recovery.ts): 5 s depois da última alteração
   * ou, para quem digita sem parar, a cada minuto. Salvar ou descartar apaga
   * a cópia. Gravações e limpezas passam por uma fila, para que uma cópia
   * atrasada não reapareça depois de a peça ser salva.
   */
  const BACKUP_DELAY = 5_000;
  const BACKUP_MAX_WAIT = 60_000;
  let backupsOn = false;
  let backupTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingSince: number | null = null;
  let backupQueue = Promise.resolve();

  function enqueue(task: () => Promise<void>) {
    backupQueue = backupQueue.then(task).catch((error) => console.warn('Cópia de segurança:', error));
    return backupQueue;
  }

  function backup() {
    backupTimer = undefined;
    pendingSince = null;
    return enqueue(async () => {
      if (!dirty.value) return;
      await recoveryStore().write({
        bytes: writeMbth({ play: play.value, extras }),
        fileName: fileName.value,
        path: typeof handle === 'string' ? handle : null,
        savedAt: new Date().toISOString(),
      });
    });
  }

  /** Apaga a cópia (peça salva, ou alterações descartadas de propósito). */
  function clearBackup() {
    clearTimeout(backupTimer);
    backupTimer = undefined;
    pendingSince = null;
    return enqueue(() => recoveryStore().clear());
  }

  watch([play, dirty], () => {
    if (!backupsOn) return;
    if (!dirty.value) {
      void clearBackup();
      return;
    }
    clearTimeout(backupTimer);
    pendingSince ??= Date.now();
    const wait = Math.max(0, Math.min(BACKUP_DELAY, pendingSince + BACKUP_MAX_WAIT - Date.now()));
    backupTimer = setTimeout(() => void backup(), wait);
  });

  /**
   * Na abertura do app: se ficou uma cópia de uma sessão que caiu, pergunta
   * (`ask`) se a pessoa quer recuperá-la. Só depois disso as cópias começam,
   * para a nova sessão não apagar a anterior antes da pergunta.
   */
  async function checkRecovery(ask: (copy: RecoveryCopy, play: Play) => Promise<boolean>): Promise<void> {
    try {
      const copy = await recoveryStore().read();
      if (!copy) return;
      let recovered: ReturnType<typeof readMbth>;
      try {
        recovered = readMbth(copy.bytes);
      } catch {
        await recoveryStore().clear();
        return;
      }
      if (await ask(copy, recovered.play)) {
        load(recovered.play, { name: copy.fileName, handle: copy.path, extras: recovered.extras });
        dirty.value = true;
      } else {
        await recoveryStore().clear();
      }
    } catch (error) {
      console.warn('Cópia de segurança:', error);
    } finally {
      backupsOn = true;
      // Peça recuperada já está não salva: a cópia volta a ser feita.
      if (dirty.value) void backup();
    }
  }

  function setFormat(format: PlayFormat) {
    if (format === playFormat(play.value)) return;
    // Em linha é o padrão: o arquivo só guarda o campo quando é outra formatação.
    const { format: _, ...rest } = play.value;
    change(format === 'inline' ? rest : { ...rest, format });
  }

  /** Campos vazios do subtítulo saem do arquivo, em vez de ficarem como texto vazio. */
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
    openPath,
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
    checkRecovery,
    clearBackup,
  };
});
