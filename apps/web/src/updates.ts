import { isTauri } from '@tauri-apps/api/core';

/*
 * Atualização automática do desktop. Ao abrir, o app consulta o
 * latest.json do último release no GitHub; se houver versão nova, pergunta
 * (`ask`) antes de baixar. Sem internet, ou com o servidor fora do ar,
 * nada acontece. No navegador, a página já é sempre a mais nova.
 */
export async function checkForUpdates(options: {
  ask: (version: string) => Promise<boolean>;
  /** Roda antes de instalar: no Windows o instalador fecha o app na hora. */
  beforeInstall: () => Promise<void>;
  failed: (error: unknown) => Promise<void>;
}): Promise<void> {
  if (!isTauri()) return;
  const { check } = await import('@tauri-apps/plugin-updater');
  let update;
  try {
    update = await check();
  } catch (error) {
    console.warn('Atualização:', error);
    return;
  }
  if (!update || !(await options.ask(update.version))) return;
  try {
    await options.beforeInstall();
    await update.downloadAndInstall();
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (error) {
    await options.failed(error);
  }
}
