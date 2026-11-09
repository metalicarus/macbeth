import { isTauri } from '@tauri-apps/api/core';

/**
 * Abre um endereço da internet no navegador do sistema. No desktop, a
 * janela do app não navega para fora: quem abre é o próprio sistema.
 */
export async function openLink(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
