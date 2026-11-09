import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { baseName, FILTER_NAME, MBTH_FILE, type FileProvider } from './provider';

/** Desktop: janelas nativas do sistema; o handle é o caminho do arquivo. */
export function tauriFiles(): FileProvider {
  return {
    async open(types = [MBTH_FILE]) {
      const filters = [{ name: FILTER_NAME, extensions: types.map((t) => t.extension) }];
      const path = await open({ multiple: false, directory: false, filters });
      if (typeof path !== 'string') return null;
      return { name: baseName(path), bytes: await readFile(path), handle: path };
    },

    async openPath(path) {
      return { name: baseName(path), bytes: await readFile(path), handle: path };
    },

    async save(bytes, handle, suggestedName, type = MBTH_FILE) {
      const filters = [{ name: FILTER_NAME, extensions: [type.extension] }];
      let path = typeof handle === 'string' ? handle : null;
      path ??= await save({ defaultPath: suggestedName, filters });
      if (!path) return null;
      if (!path.toLowerCase().endsWith(`.${type.extension}`)) path += `.${type.extension}`;
      await writeFile(path, bytes);
      return { name: baseName(path), handle: path };
    },
  };
}
