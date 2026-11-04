import { isTauri } from '@tauri-apps/api/core';
import { ask, message } from '@tauri-apps/plugin-dialog';

/* Perguntas e avisos: janelas nativas no desktop, as do navegador na web. */

export async function confirmDialog(text: string): Promise<boolean> {
  return isTauri() ? ask(text, { title: 'Macbeth', kind: 'warning' }) : window.confirm(text);
}

export async function alertDialog(text: string): Promise<void> {
  if (isTauri()) await message(text, { title: 'Macbeth', kind: 'error' });
  else window.alert(text);
}
