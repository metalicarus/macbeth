import { isTauri } from '@tauri-apps/api/core';
import { ask, message } from '@tauri-apps/plugin-dialog';

/* Perguntas e avisos: janelas nativas no desktop, as do navegador na web. */

/** `labels` troca os botões no desktop; o navegador só tem OK e Cancelar. */
export async function confirmDialog(text: string, labels?: { ok: string; cancel: string }): Promise<boolean> {
  if (!isTauri()) return window.confirm(text);
  return ask(text, { title: 'Macbeth', kind: 'warning', okLabel: labels?.ok, cancelLabel: labels?.cancel });
}

export async function alertDialog(text: string): Promise<void> {
  if (isTauri()) await message(text, { title: 'Macbeth', kind: 'error' });
  else window.alert(text);
}
