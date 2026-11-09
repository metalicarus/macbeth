/*
 * De onde a peça é aberta e para onde é salva. O app só conversa com esta
 * interface; hoje existem o desktop (Tauri) e o navegador, e outros
 * provedores (nuvem, Google Drive) podem ser registrados sem mexer no editor.
 */

import { MBTH_MIME_TYPE } from '@macbeth/core';

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
  /** Pede um arquivo dos tipos indicados (por padrão, .mbth); `null` se a pessoa cancelar. */
  open(types?: FileType[]): Promise<OpenedFile | null>;
  /**
   * Grava no arquivo `handle`; sem handle, pergunta onde salvar.
   * Devolve `null` se a pessoa cancelar.
   */
  save(bytes: Uint8Array, handle: FileHandle | null, suggestedName: string, type?: FileType): Promise<SavedFile | null>;
  /**
   * Abre direto um arquivo já conhecido (recentes, duplo clique), sem
   * perguntar. Só existe onde o handle é um caminho guardável (desktop).
   */
  openPath?(path: string): Promise<OpenedFile>;
}

export interface FileType {
  extension: string;
  mime: string;
}

export const MBTH_EXTENSION = 'mbth';
export const MBTH_FILE: FileType = { extension: MBTH_EXTENSION, mime: MBTH_MIME_TYPE };
export const PDF_FILE: FileType = { extension: 'pdf', mime: 'application/pdf' };

/** O que o Importar aceita: Word, LibreOffice e Fountain. */
export const IMPORT_FILES: FileType[] = [
  { extension: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { extension: 'odt', mime: 'application/vnd.oasis.opendocument.text' },
  { extension: 'fountain', mime: 'text/plain' },
  { extension: 'spmd', mime: 'text/plain' },
  { extension: 'txt', mime: 'text/plain' },
];

/** Rótulo do filtro nas janelas de arquivo; o nome do app vale em qualquer língua. */
export const FILTER_NAME = 'Macbeth';

/** "Macbeth.mbth" a partir do título da peça, sem caracteres que os sistemas recusam. */
export function suggestedFileName(title: string, extension = MBTH_EXTENSION): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return `${base || 'peca'}.${extension}`;
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
