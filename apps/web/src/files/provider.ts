/*
 * De onde a peça é aberta e para onde é salva. O app só conversa com esta
 * interface; hoje existem o desktop (Tauri) e o navegador, e outros
 * provedores (nuvem, Google Drive) podem ser registrados sem mexer no editor.
 */

/** Referência ao arquivo aberto, no formato que cada provedor entende. */
export type FileHandle = unknown;

export interface OpenedFile {
  name: string;
  bytes: Uint8Array;
  handle: FileHandle;
}

export interface SavedFile {
  name: string;
  /** `null` quando o provedor não consegue gravar de novo no mesmo arquivo (download). */
  handle: FileHandle | null;
}

export interface FileProvider {
  /** Pede um arquivo .mbth; `null` se a pessoa cancelar. */
  open(): Promise<OpenedFile | null>;
  /**
   * Grava no arquivo `handle`; sem handle, pergunta onde salvar.
   * Devolve `null` se a pessoa cancelar.
   */
  save(bytes: Uint8Array, handle: FileHandle | null, suggestedName: string): Promise<SavedFile | null>;
}

export const MBTH_EXTENSION = 'mbth';

/** Rótulo do filtro nas janelas de arquivo; o nome do app vale em qualquer língua. */
export const FILTER_NAME = 'Macbeth';

/** "Macbeth.mbth" a partir do título da peça, sem caracteres que os sistemas recusam. */
export function suggestedFileName(title: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return `${base || 'peca'}.${MBTH_EXTENSION}`;
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
