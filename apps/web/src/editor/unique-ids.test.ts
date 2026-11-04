// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { playExtensions } from './schema';
import { UniqueIds } from './unique-ids';

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

function ids(e: Editor): (string | null)[] {
  return (e.getJSON().content ?? []).map((n) => (n.attrs?.id as string | null) ?? null);
}

const direction = (id: string | null, text: string) => ({
  type: 'direction',
  attrs: { id },
  content: [{ type: 'text', text }],
});

describe('UniqueIds', () => {
  it('dá id aos elementos que chegam sem', () => {
    editor = new Editor({ extensions: [...playExtensions, UniqueIds] });
    editor.commands.setContent({ type: 'doc', content: [direction(null, 'Escuro.'), direction(null, 'Luz.')] });

    const [a, b] = ids(editor);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('troca o id repetido e mantém o primeiro', () => {
    editor = new Editor({ extensions: [...playExtensions, UniqueIds] });
    editor.commands.setContent({ type: 'doc', content: [direction('x', 'Escuro.'), direction('x', 'Luz.')] });

    const [a, b] = ids(editor);
    expect(a).toBe('x');
    expect(b).not.toBe('x');
  });

  it('não mexe em ids que já são únicos', () => {
    editor = new Editor({ extensions: [...playExtensions, UniqueIds] });
    editor.commands.setContent({ type: 'doc', content: [direction('a', 'Escuro.'), direction('b', 'Luz.')] });
    editor.commands.insertContentAt(editor.state.doc.content.size, direction(null, 'Trovão.'));

    expect(ids(editor).slice(0, 2)).toEqual(['a', 'b']);
    expect(ids(editor)[2]).toBeTruthy();
  });
});
