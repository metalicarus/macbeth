import { newId } from '@macbeth/core';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/*
 * Todo elemento da peça precisa de um id estável: notas, cortes e marcações
 * vão se ancorar nele. Elementos novos (Enter, colar, desfazer) e cópias com
 * id repetido recebem um id novo logo depois da alteração.
 */
export const UniqueIds = Extension.create({
  name: 'uniqueIds',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('uniqueIds'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const tr = newState.tr;
          const seen = new Set<string>();
          newState.doc.forEach((node, offset) => {
            const id = node.attrs.id as string | null | undefined;
            if (id === undefined) return;
            if (id && !seen.has(id)) {
              seen.add(id);
              return;
            }
            tr.setNodeAttribute(offset, 'id', newId());
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
