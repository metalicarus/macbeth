import {
  addCharacter,
  findCharacter,
  findCharacterByName,
  newId,
  normalizeName,
  type Act,
  type Play,
  type Scene,
  type SceneElement,
} from '@macbeth/core';
import type { JSONContent } from '@tiptap/core';

/*
 * Converte a peça do core no documento do editor e de volta.
 *
 * Campos que esta versão não conhece vão para o atributo `extra` de cada nó
 * e voltam para o mesmo lugar, para que salvar não apague dados de versões
 * mais novas ou da versão Pro.
 */

type Extra = Record<string, unknown> | null;

function extraOf(value: object, known: readonly string[]): Extra {
  const rest = Object.fromEntries(Object.entries(value).filter(([key]) => !known.includes(key)));
  return Object.keys(rest).length > 0 ? rest : null;
}

const ACT_KEYS = ['id', 'title', 'scenes'] as const;
const SCENE_KEYS = ['id', 'title', 'place', 'elements'] as const;
const DIRECTION_KEYS = ['id', 'type', 'text'] as const;
const SPEECH_KEYS = ['id', 'type', 'characterId', 'parenthetical', 'text'] as const;

/** Texto simples, com quebras de verso ("\n") virando hardBreak. */
function inline(text: string): JSONContent[] {
  return text.split('\n').flatMap((line, i) => {
    const parts: JSONContent[] = i > 0 ? [{ type: 'hardBreak' }] : [];
    if (line) parts.push({ type: 'text', text: line });
    return parts;
  });
}

function withContent(node: JSONContent, text: string): JSONContent {
  const content = inline(text);
  return content.length > 0 ? { ...node, content } : node;
}

function textOf(node: JSONContent | undefined): string {
  return (node?.content ?? [])
    .map((child) => (child.type === 'hardBreak' ? '\n' : (child.text ?? '')))
    .join('');
}

function elementToNode(element: SceneElement, names: Map<string, string>): JSONContent {
  if (element.type === 'direction') {
    return withContent(
      { type: 'direction', attrs: { id: element.id, extra: extraOf(element, DIRECTION_KEYS) } },
      element.text,
    );
  }
  return {
    type: 'speech',
    attrs: { id: element.id, extra: extraOf(element, SPEECH_KEYS) },
    content: [
      withContent({ type: 'speechCue', attrs: { characterId: element.characterId } }, names.get(element.characterId) ?? ''),
      ...(element.parenthetical ? [withContent({ type: 'speechParenthetical' }, element.parenthetical)] : []),
      withContent({ type: 'speechLine' }, element.text),
    ],
  };
}

export function playToDoc(play: Play): JSONContent {
  const names = new Map(play.characters.map((c) => [c.id, c.name]));
  const content: JSONContent[] = [];

  for (const act of play.acts) {
    content.push(withContent({ type: 'act', attrs: { id: act.id, extra: extraOf(act, ACT_KEYS) } }, act.title));

    for (const scene of act.scenes) {
      content.push(
        withContent(
          { type: 'scene', attrs: { id: scene.id, place: scene.place ?? null, extra: extraOf(scene, SCENE_KEYS) } },
          scene.title,
        ),
      );

      for (const element of scene.elements) content.push(elementToNode(element, names));
    }
  }

  return { type: 'doc', content };
}

/**
 * Monta a peça a partir do documento. `base` fornece o que o editor não
 * mostra (folha de rosto, cadastro de personagens, campos desconhecidos).
 *
 * O nome digitado no campo Personagem é o que vale: se ele não bate com o
 * personagem ligado à fala, a fala passa para o personagem com esse nome, que
 * é cadastrado se ainda não existir.
 */
export function docToPlay(doc: JSONContent, base: Play): Play {
  let play: Play = { ...base, acts: [] };
  const acts: Act[] = [];
  let act: Act | undefined;
  let scene: Scene | undefined;

  // Elementos antes do primeiro ato ou da primeira cena ganham um ato ou cena sem título.
  const currentAct = (): Act => {
    if (!act) {
      act = { id: newId(), title: '', scenes: [] };
      acts.push(act);
    }
    return act;
  };
  const currentScene = (): Scene => {
    if (!scene) {
      scene = { id: newId(), title: '', elements: [] };
      currentAct().scenes.push(scene);
    }
    return scene;
  };

  for (const node of doc.content ?? []) {
    const attrs = node.attrs ?? {};
    const extra = (attrs.extra as Extra) ?? {};
    const id = (attrs.id as string | null) ?? newId();

    switch (node.type) {
      case 'act':
        act = { ...extra, id, title: textOf(node), scenes: [] };
        acts.push(act);
        scene = undefined;
        break;

      case 'scene': {
        const place = attrs.place as string | null;
        scene = { ...extra, id, title: textOf(node), ...(place ? { place } : {}), elements: [] };
        currentAct().scenes.push(scene);
        break;
      }

      case 'direction':
        currentScene().elements.push({ ...extra, id, type: 'direction', text: textOf(node) });
        break;

      case 'speech': {
        const parts = node.content ?? [];
        const cue = parts.find((p) => p.type === 'speechCue');
        const parenthetical = textOf(parts.find((p) => p.type === 'speechParenthetical'));
        const text = textOf(parts.find((p) => p.type === 'speechLine'));

        const resolved = resolveCharacter(play, (cue?.attrs?.characterId as string | null) ?? null, textOf(cue));
        play = resolved.play;

        if (!resolved.characterId) {
          // Fala sem personagem: guarda o texto como rubrica para não perdê-lo.
          currentScene().elements.push({ id, type: 'direction', text });
          break;
        }
        currentScene().elements.push({
          ...extra,
          id,
          type: 'speech',
          characterId: resolved.characterId,
          ...(parenthetical ? { parenthetical } : {}),
          text,
        });
        break;
      }
    }
  }

  if (acts.length === 0) acts.push({ id: newId(), title: '', scenes: [] });
  return { ...play, acts };
}

function resolveCharacter(play: Play, characterId: string | null, name: string): { play: Play; characterId?: string } {
  const linked = characterId ? findCharacter(play, characterId) : undefined;
  const typed = normalizeName(name);

  if (linked && (!typed || normalizeName(linked.name) === typed)) return { play, characterId: linked.id };
  if (!typed) return { play };

  const existing = findCharacterByName(play, name);
  if (existing) return { play, characterId: existing.id };

  const added = addCharacter(play, name);
  return { play: added.play, characterId: added.character.id };
}
