import { ref } from 'vue';

/*
 * Os últimos arquivos abertos ou salvos, para o menu ao lado do Abrir.
 * Só no desktop, onde o arquivo tem um caminho que dá para guardar.
 */

export interface RecentFile {
  path: string;
  name: string;
}

const KEY = 'macbeth.recent';
const LIMIT = 10;

function read(): RecentFile[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((f): f is RecentFile => typeof f?.path === 'string' && typeof f?.name === 'string') : [];
  } catch {
    return [];
  }
}

export const recentFiles = ref<RecentFile[]>(read());

function persist(list: RecentFile[]) {
  recentFiles.value = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Sem armazenamento, a lista vale só até fechar o app.
  }
}

/** Põe o arquivo no topo da lista. */
export function rememberRecent(path: string, name: string): void {
  persist([{ path, name }, ...recentFiles.value.filter((f) => f.path !== path)].slice(0, LIMIT));
}

/** Tira da lista (o arquivo foi movido ou apagado). */
export function forgetRecent(path: string): void {
  persist(recentFiles.value.filter((f) => f.path !== path));
}

export function clearRecent(): void {
  persist([]);
}
