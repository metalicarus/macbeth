import type { Id } from './ids';
import type { Act, Play, Scene } from './model';

/*
 * Visões da estrutura da peça: o sumário de atos e cenas, onde fica cada
 * elemento e quem fala em cada cena.
 *
 * Atos e cenas sem título são "implícitos": surgem quando o texto começa
 * direto com falas ou rubricas e não existem como linha no editor. Para
 * navegar até eles usa-se o primeiro elemento que contêm (`target`).
 */

export interface OutlineScene {
  id: Id;
  title: string;
  /** Id do elemento a mostrar no editor ao escolher esta cena. */
  target: Id | null;
  speeches: number;
}

export interface OutlineAct {
  id: Id;
  title: string;
  target: Id | null;
  scenes: OutlineScene[];
}

function sceneTarget(scene: Scene): Id | null {
  return scene.title ? scene.id : (scene.elements[0]?.id ?? null);
}

function actTarget(act: Act): Id | null {
  if (act.title) return act.id;
  for (const scene of act.scenes) {
    const target = sceneTarget(scene);
    if (target) return target;
  }
  return null;
}

export function playOutline(play: Play): OutlineAct[] {
  return play.acts.map((act) => ({
    id: act.id,
    title: act.title,
    target: actTarget(act),
    scenes: act.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      target: sceneTarget(scene),
      speeches: scene.elements.filter((e) => e.type === 'speech').length,
    })),
  }));
}

export interface Location {
  actId: Id;
  /** Ausente quando o id é o do próprio ato. */
  sceneId?: Id;
}

/** Em que ato e cena está o ato, a cena ou o elemento `id`. */
export function locate(play: Play, id: Id): Location | null {
  for (const act of play.acts) {
    if (act.id === id) return { actId: act.id };
    for (const scene of act.scenes) {
      if (scene.id === id || scene.elements.some((e) => e.id === id)) return { actId: act.id, sceneId: scene.id };
    }
  }
  return null;
}

export interface CastColumn {
  actIndex: number;
  scene: OutlineScene;
}

export interface CastByScene {
  /** Uma coluna por cena, na ordem da peça. */
  columns: CastColumn[];
  /** Falas de cada personagem em cada cena: personagem → cena → número de falas. */
  speeches: Map<Id, Map<Id, number>>;
}

/** Quem fala em cada cena. Personagem que só aparece em rubrica não conta. */
export function castByScene(play: Play): CastByScene {
  const outline = playOutline(play);
  const columns = outline.flatMap((act, actIndex) => act.scenes.map((scene) => ({ actIndex, scene })));
  const speeches = new Map<Id, Map<Id, number>>(play.characters.map((c) => [c.id, new Map()]));

  for (const act of play.acts) {
    for (const scene of act.scenes) {
      for (const element of scene.elements) {
        if (element.type !== 'speech') continue;
        const row = speeches.get(element.characterId) ?? new Map<Id, number>();
        row.set(scene.id, (row.get(scene.id) ?? 0) + 1);
        speeches.set(element.characterId, row);
      }
    }
  }
  return { columns, speeches };
}
