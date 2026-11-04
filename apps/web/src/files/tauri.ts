import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { baseName, FILTER_NAME, MBTH_EXTENSION, type FileProvider } from './provider';

/** Desktop: janelas nativas do sistema; o handle é o caminho do arquivo. */
export function tauriFiles(): FileProvider {
  const filters = [{ name: FILTER_NAME, extensions: [MBTH_EXTENSION] }];

  return {
    async open() {
      const path = await open({ multiple: false, directory: false, filters });
      if (typeof path !== 'string') return null;
      return { name: baseName(path), bytes: await readFile(path), handle: path };
    },

    async save(bytes, handle, suggestedName) {
      let path = typeof handle === 'string' ? handle : null;
      path ??= await save({ defaultPath: suggestedName, filters });
      if (!path) return null;
      if (!path.endsWith(`.${MBTH_EXTENSION}`)) path += `.${MBTH_EXTENSION}`;
      await writeFile(path, bytes);
      return { name: baseName(path), handle: path };
    },
  };
}
