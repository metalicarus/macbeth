import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { confirmDialog } from './dialogs';

/**
 * Pergunta antes de fechar o app quando há alterações não salvas.
 *
 * No desktop, o pedido de fechar a janela é interceptado e a pergunta usa
 * a janela nativa. No navegador só existe o aviso padrão de "sair da
 * página", cujo texto o navegador não deixa trocar.
 */
export function guardUnsavedClose(isDirty: () => boolean, message: () => string): void {
  if (isTauri()) {
    const appWindow = getCurrentWindow();
    void appWindow.onCloseRequested(async (event) => {
      if (!isDirty()) return;
      // Precisa vir antes de qualquer await, senão a janela já fechou.
      event.preventDefault();
      if (await confirmDialog(message())) await appWindow.destroy();
    });
    return;
  }

  window.addEventListener('beforeunload', (event) => {
    if (isDirty()) event.preventDefault();
  });
}
