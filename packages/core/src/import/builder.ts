import { addCharacter, findCharacterByName } from '../characters';
import { newId, type Id } from '../ids';
import { SCHEMA_VERSION, type Act, type Play, type Scene, type Speech, type TitlePage } from '../model';

/**
 * Monta uma peça elemento por elemento, na ordem em que aparecem num texto
 * importado. Atos e cenas sem título são criados quando o texto começa
 * direto com falas ou rubricas; personagens são cadastrados pelo nome, sem
 * diferenciar maiúsculas e acentos ("MACBETH" e "Macbeth" são o mesmo).
 */
export class PlayBuilder {
  private play: Play = { schemaVersion: SCHEMA_VERSION, titlePage: { title: '', author: '' }, characters: [], acts: [] };
  private currentAct: Act | undefined;
  private currentScene: Scene | undefined;
  private lastSpeech: Speech | undefined;

  titlePage(patch: Partial<TitlePage>): void {
    this.play.titlePage = { ...this.play.titlePage, ...patch };
  }

  /** Cadastra (ou acha) o personagem; a descrição só entra se ele ainda não tiver uma. */
  character(name: string, description?: string): Id {
    const existing = findCharacterByName(this.play, name);
    if (existing) {
      if (description && !existing.description) existing.description = description;
      return existing.id;
    }
    const added = addCharacter(this.play, name);
    this.play = added.play;
    if (description) added.character.description = description;
    return added.character.id;
  }

  act(title: string): void {
    this.currentAct = { id: newId(), title, scenes: [] };
    this.play.acts.push(this.currentAct);
    this.currentScene = undefined;
    this.lastSpeech = undefined;
  }

  scene(title: string): void {
    // O ato vem antes: criar um ato zera a cena atual.
    const act = this.ensureAct();
    this.currentScene = { id: newId(), title, elements: [] };
    act.scenes.push(this.currentScene);
    this.lastSpeech = undefined;
  }

  direction(text: string): void {
    this.ensureScene().elements.push({ id: newId(), type: 'direction', text });
    this.lastSpeech = undefined;
  }

  speech(name: string, text: string, parenthetical?: string): void {
    const speech: Speech = {
      id: newId(),
      type: 'speech',
      characterId: this.character(name),
      ...(parenthetical ? { parenthetical } : {}),
      text,
    };
    this.ensureScene().elements.push(speech);
    this.lastSpeech = speech;
  }

  /** Acrescenta uma linha à última fala, se a última coisa montada for uma fala. */
  continueSpeech(text: string): boolean {
    if (!this.lastSpeech) return false;
    this.lastSpeech.text = this.lastSpeech.text ? `${this.lastSpeech.text}\n${text}` : text;
    return true;
  }

  /** Parentético da última fala, quando ele vem numa linha própria antes do texto. */
  setParenthetical(text: string): boolean {
    if (!this.lastSpeech || this.lastSpeech.text || this.lastSpeech.parenthetical) return false;
    this.lastSpeech.parenthetical = text;
    return true;
  }

  build(): Play {
    if (this.play.acts.length === 0) this.ensureAct();
    return this.play;
  }

  private ensureAct(): Act {
    if (!this.currentAct) this.act('');
    return this.currentAct!;
  }

  private ensureScene(): Scene {
    if (!this.currentScene) this.scene('');
    return this.currentScene!;
  }
}

export interface PlaySummary {
  acts: number;
  scenes: number;
  characters: number;
  speeches: number;
}

export function summarizePlay(play: Play): PlaySummary {
  const scenes = play.acts.flatMap((a) => a.scenes);
  return {
    acts: play.acts.filter((a) => a.title).length,
    scenes: scenes.filter((s) => s.title).length,
    characters: play.characters.length,
    speeches: scenes.flatMap((s) => s.elements).filter((e) => e.type === 'speech').length,
  };
}
