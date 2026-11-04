import { MBTH_MIME_TYPE } from '@macbeth/core';
import { FILTER_NAME, MBTH_EXTENSION, type FileProvider } from './provider';

/*
 * Navegador. Chrome e Edge têm a API de arquivos (File System Access), que
 * permite salvar de novo no mesmo arquivo. Nos outros, abrir usa o seletor
 * comum e salvar baixa o arquivo.
 */

interface PickerOptions {
  suggestedName?: string;
  types: { description: string; accept: Record<string, string[]> }[];
}

interface FsAccessWindow {
  showOpenFilePicker(options: PickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options: PickerOptions): Promise<FileSystemFileHandle>;
}

function hasFsAccess(w: Window): w is Window & FsAccessWindow {
  return 'showOpenFilePicker' in w && 'showSaveFilePicker' in w;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function toBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function browserFiles(): FileProvider {
  const types = [{ description: FILTER_NAME, accept: { [MBTH_MIME_TYPE]: [`.${MBTH_EXTENSION}`] } }];

  if (hasFsAccess(window)) {
    const w = window;
    return {
      async open() {
        try {
          const [handle] = await w.showOpenFilePicker({ types });
          const file = await handle!.getFile();
          return { name: file.name, bytes: await toBytes(file), handle };
        } catch (error) {
          if (isAbort(error)) return null;
          throw error;
        }
      },

      async save(bytes, handle, suggestedName) {
        try {
          const target =
            handle instanceof FileSystemFileHandle ? handle : await w.showSaveFilePicker({ suggestedName, types });
          const writable = await target.createWritable();
          await writable.write(bytes as Uint8Array<ArrayBuffer>);
          await writable.close();
          return { name: target.name, handle: target };
        } catch (error) {
          if (isAbort(error)) return null;
          throw error;
        }
      },
    };
  }

  return {
    open: () =>
      new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = `.${MBTH_EXTENSION}`;
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          resolve(file ? { name: file.name, bytes: await toBytes(file), handle: null } : null);
        });
        input.addEventListener('cancel', () => resolve(null));
        input.click();
      }),

    async save(bytes, _handle, suggestedName) {
      const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: MBTH_MIME_TYPE }));
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      link.click();
      URL.revokeObjectURL(url);
      return { name: suggestedName, handle: null };
    },
  };
}
