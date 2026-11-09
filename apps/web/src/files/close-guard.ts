import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { confirmDialog } from './dialogs';

/**
 * Pergunta antes de fechar o app quando há alterações não salvas. Se a
 * pessoa confirmar que quer descartá-las, `discard` roda antes de fechar.
 *
 * No desktop, o pedido de fechar a janela é interceptado e a pergunta usa
 * a janela nativa. No navegador só existe o aviso padrão de "sair da
 * página", cujo texto o navegador não deixa trocar.
 */
export function guardUnsavedClose(isDirty: () => boolean, message: () => string, discard: () => Promise<void>): void {
  if (isTauri()) {
    const appWindow = getCurrentWindow();
    void appWindow.onCloseRequested(async (event) => {
      if (!isDirty()) return;
      // Precisa vir antes de qualquer await, senão a janela já fechou.
      event.preventDefault();
      if (await confirmDialog(message())) {
        await discard();
        await appWindow.destroy();
      }
    });
    return;
  }

  // No navegador não dá para saber a resposta; a cópia fica e é oferecida na volta.
  window.addEventListener('beforeunload', (event) => {
    if (isDirty()) event.preventDefault();
  });
}
