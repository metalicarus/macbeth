import { isTauri } from '@tauri-apps/api/core';
import { browserFiles } from './browser';
import type { FileProvider } from './provider';
import { tauriFiles } from './tauri';

export * from './provider';

let provider: FileProvider | null = null;

/** O provedor do ambiente atual: desktop ou navegador. */
export function fileProvider(): FileProvider {
  provider ??= isTauri() ? tauriFiles() : browserFiles();
  return provider;
}

/** Troca o provedor; usado pelos testes e, no futuro, por provedores de nuvem. */
export function setFileProvider(next: FileProvider | null): void {
  provider = next;
}
