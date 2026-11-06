/*
 * Mapa de todos os atalhos do app, mostrado na janela "Atalhos" (Ctrl+/ ou F1).
 *
 * Esta lista é só a referência para quem usa: os atalhos em si estão no
 * editor (keymap, cortes, notas, sugestões) e na barra (FileActions). Ao
 * criar ou mudar um atalho, atualize aqui também. Cada descrição é uma
 * chave de tradução em "shortcuts.items".
 */

/** "Mod" vira Ctrl (ou ⌘ no macOS); "Alt" vira ⌥ no macOS. */
export type Key = string;

export interface Shortcut {
  /** Uma ou mais combinações alternativas; cada uma é uma lista de teclas. */
  keys: Key[][];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

export const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'file',
    items: [
      { keys: [['Mod', 'N']], description: 'new' },
      { keys: [['Mod', 'O']], description: 'open' },
      { keys: [['Mod', 'I']], description: 'import' },
      { keys: [['Mod', 'S']], description: 'save' },
      { keys: [['Mod', 'Shift', 'S']], description: 'saveAs' },
      { keys: [['Mod', 'P']], description: 'pdfShow' },
      { keys: [['Mod', 'Shift', 'P']], description: 'pdfDirector' },
    ],
  },
  {
    title: 'writing',
    items: [
      { keys: [['Enter']], description: 'enterNext' },
      { keys: [['Enter']], description: 'enterCue' },
      { keys: [['Enter']], description: 'enterEmptyCue' },
      { keys: [['Shift', 'Enter']], description: 'verseBreak' },
      { keys: [['Tab']], description: 'tabForward' },
      { keys: [['Tab']], description: 'tabDirection' },
      { keys: [['Shift', 'Tab']], description: 'tabBack' },
      { keys: [['Backspace']], description: 'backspace' },
      { keys: [['(']], description: 'parenthesis' },
      { keys: [['Enter']], description: 'fountain' },
    ],
  },
  {
    title: 'suggestions',
    items: [
      { keys: [['↑'], ['↓']], description: 'suggestMove' },
      { keys: [['Enter']], description: 'suggestAccept' },
      { keys: [['Tab']], description: 'suggestParenthetical' },
      { keys: [['Esc']], description: 'suggestClose' },
    ],
  },
  {
    title: 'editing',
    items: [
      { keys: [['Mod', 'Z']], description: 'undo' },
      { keys: [['Mod', 'Shift', 'Z'], ['Mod', 'Y']], description: 'redo' },
      { keys: [['Mod', 'Shift', 'X']], description: 'cut' },
      { keys: [['Mod', 'Alt', 'M']], description: 'note' },
    ],
  },
  {
    title: 'help',
    items: [{ keys: [['Mod', '/'], ['F1']], description: 'shortcuts' }],
  },
];

export function isMac(platform = typeof navigator === 'undefined' ? '' : navigator.platform): boolean {
  return /mac|iphone|ipad/i.test(platform);
}

/** Nome da tecla como aparece no teclado de cada sistema. */
export function keyLabel(key: Key, mac = isMac()): string {
  if (key === 'Mod') return mac ? '⌘' : 'Ctrl';
  if (key === 'Alt') return mac ? '⌥' : 'Alt';
  if (key === 'Shift') return mac ? '⇧' : 'Shift';
  return key;
}
