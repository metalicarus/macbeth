import { isTauri } from '@tauri-apps/api/core';
import { BaseDirectory, exists, mkdir, readFile, readTextFile, remove, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';

/*
 * Cópia de segurança do trabalho não salvo. Enquanto há alterações
 * pendentes, o app grava aqui a peça inteira; se ele (ou o computador) cair,
 * a cópia é oferecida na próxima abertura. O arquivo da pessoa nunca é tocado.
 *
 * Há uma cópia só: o app abre uma peça por vez.
 */

export interface RecoveryCopy {
  /** A peça, já no formato .mbth. */
  bytes: Uint8Array;
  /** Nome do arquivo de onde a peça veio; `null` se ainda não foi salva. */
  fileName: string | null;
  /** Caminho do arquivo no desktop, para continuar salvando nele. */
  path: string | null;
  /** Quando a cópia foi feita, em ISO 8601. */
  savedAt: string;
}

export interface RecoveryStore {
  write(copy: RecoveryCopy): Promise<void>;
  read(): Promise<RecoveryCopy | null>;
  clear(): Promise<void>;
}

type Meta = Omit<RecoveryCopy, 'bytes'>;

/** Desktop: dois arquivos na pasta de dados do app (a peça e os dados sobre ela). */
function tauriRecovery(): RecoveryStore {
  const dir = { baseDir: BaseDirectory.AppLocalData };
  const PLAY = 'recovery.mbth';
  const META = 'recovery.json';
  return {
    async write({ bytes, ...meta }) {
      if (!(await exists('', dir))) await mkdir('', { ...dir, recursive: true });
      await writeFile(PLAY, bytes, dir);
      // Os dados vêm depois: sem eles, uma cópia pela metade é ignorada.
      await writeTextFile(META, JSON.stringify(meta), dir);
    },
    async read() {
      if (!(await exists(META, dir)) || !(await exists(PLAY, dir))) return null;
      const meta = JSON.parse(await readTextFile(META, dir)) as Meta;
      return { ...meta, bytes: await readFile(PLAY, dir) };
    },
    async clear() {
      for (const name of [META, PLAY]) if (await exists(name, dir)) await remove(name, dir);
    },
  };
}

/** Navegador: o armazenamento local da página (a peça em base64). */
function browserRecovery(): RecoveryStore {
  const KEY = 'macbeth.recovery';
  return {
    async write({ bytes, ...meta }) {
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      localStorage.setItem(KEY, JSON.stringify({ ...meta, bytes: btoa(binary) }));
    },
    async read() {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const { bytes, ...meta } = JSON.parse(raw) as Meta & { bytes: string };
      return { ...meta, bytes: Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0)) };
    },
    async clear() {
      localStorage.removeItem(KEY);
    },
  };
}

let store: RecoveryStore | null = null;

export function recoveryStore(): RecoveryStore {
  store ??= isTauri() ? tauriRecovery() : browserRecovery();
  return store;
}

/** Troca o armazenamento; usado pelos testes. */
export function setRecoveryStore(next: RecoveryStore | null): void {
  store = next;
}
