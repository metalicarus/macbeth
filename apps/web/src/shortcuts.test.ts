import { describe, expect, it } from 'vitest';
import ptBR from './locales/pt-BR.json';
import { keyLabel, SHORTCUTS } from './shortcuts';

describe('mapa de atalhos', () => {
  it('todo grupo e todo atalho tem descrição (as outras línguas são conferidas no teste do i18n)', () => {
    const groups = ptBR.shortcuts.groups as Record<string, string>;
    const items = ptBR.shortcuts.items as Record<string, string>;
    for (const group of SHORTCUTS) {
      expect(groups[group.title], group.title).toBeTruthy();
      for (const item of group.items) expect(items[item.description], item.description).toBeTruthy();
    }
  });

  it('mostra Ctrl e Alt no Windows e Linux, e ⌘ e ⌥ no macOS', () => {
    expect(keyLabel('Mod', false)).toBe('Ctrl');
    expect(keyLabel('Mod', true)).toBe('⌘');
    expect(keyLabel('Alt', true)).toBe('⌥');
    expect(keyLabel('Enter', true)).toBe('Enter');
  });
});
