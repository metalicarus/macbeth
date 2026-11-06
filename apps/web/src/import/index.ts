import { fountainToPlay, paragraphsToPlay, type Play } from '@macbeth/core';
import { strFromU8 } from 'fflate';
import { docxParagraphs } from './docx';
import { odtParagraphs } from './odt';

/** Extensões que o Importar aceita. */
export const IMPORT_EXTENSIONS = ['docx', 'odt', 'fountain', 'spmd', 'txt'] as const;

export class ImportError extends Error {
  constructor(readonly code: 'unsupported' | 'unreadable') {
    super(code);
    this.name = 'ImportError';
  }
}

export function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

/** Lê o arquivo importado e reconhece a peça. O formato vem da extensão. */
export async function importPlay(name: string, bytes: Uint8Array): Promise<Play> {
  const extension = extensionOf(name);
  try {
    if (extension === 'docx') return paragraphsToPlay(await docxParagraphs(bytes));
    if (extension === 'odt') return paragraphsToPlay(odtParagraphs(bytes));
    if (extension === 'fountain' || extension === 'spmd' || extension === 'txt') return fountainToPlay(strFromU8(bytes));
  } catch {
    throw new ImportError('unreadable');
  }
  throw new ImportError('unsupported');
}
