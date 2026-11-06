import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { SCHEMA_VERSION, type Play } from './model';

/**
 * O arquivo .mbth é um zip. A peça fica em play.json; qualquer outra entrada
 * (de uma versão mais nova ou da versão Pro) é guardada em `extras` e gravada
 * de volta sem alteração. Pelo mesmo motivo, campos desconhecidos dentro do
 * play.json são preservados: o parse não descarta nada que não conhece.
 */
export const MBTH_PLAY_ENTRY = 'play.json';
export const MBTH_MIME_TYPE = 'application/x-macbeth';

export interface MbthFile {
  play: Play;
  extras: Record<string, Uint8Array>;
}

export class MbthError extends Error {
  constructor(
    readonly code: 'not-a-zip' | 'missing-play' | 'invalid-json' | 'newer-version' | 'invalid-structure',
    message: string,
  ) {
    super(message);
    this.name = 'MbthError';
  }
}

export function writeMbth({ play, extras }: MbthFile): Uint8Array {
  return zipSync({
    ...extras,
    [MBTH_PLAY_ENTRY]: strToU8(JSON.stringify(play, null, 2)),
  });
}

export function readMbth(bytes: Uint8Array): MbthFile {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new MbthError('not-a-zip', 'O arquivo não é um .mbth válido.');
  }

  const { [MBTH_PLAY_ENTRY]: playBytes, ...extras } = entries;
  if (!playBytes) throw new MbthError('missing-play', 'O arquivo .mbth não contém a peça.');

  let data: unknown;
  try {
    data = JSON.parse(strFromU8(playBytes));
  } catch {
    throw new MbthError('invalid-json', 'O conteúdo da peça está corrompido.');
  }

  return { play: validatePlay(data), extras };
}

type Obj = Record<string, unknown>;

function fail(path: string, expected: string): never {
  throw new MbthError('invalid-structure', `Estrutura inválida em ${path}: esperado ${expected}.`);
}

function obj(value: unknown, path: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'um objeto');
  return value as Obj;
}

function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'uma lista');
  return value;
}

function str(o: Obj, key: string, path: string, optional = false): void {
  const value = o[key];
  if (optional && value === undefined) return;
  if (typeof value !== 'string') fail(`${path}.${key}`, 'um texto');
}

function int(o: Obj, key: string, path: string): void {
  const value = o[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) fail(`${path}.${key}`, 'um número inteiro');
}

/** Cortes e notas são opcionais; quando existem, precisam ter o formato certo. */
function validateAnnotations(element: Obj, path: string): void {
  if (element.cuts !== undefined) {
    arr(element.cuts, `${path}.cuts`).forEach((item, c) => {
      const cut = obj(item, `${path}.cuts[${c}]`);
      int(cut, 'from', `${path}.cuts[${c}]`);
      int(cut, 'to', `${path}.cuts[${c}]`);
    });
  }
  if (element.notes !== undefined) {
    arr(element.notes, `${path}.notes`).forEach((item, n) => {
      const notePath = `${path}.notes[${n}]`;
      const note = obj(item, notePath);
      str(note, 'id', notePath);
      str(note, 'text', notePath);
      str(note, 'createdAt', notePath);
      if (note.resolved !== undefined && typeof note.resolved !== 'boolean') fail(`${notePath}.resolved`, 'verdadeiro ou falso');
    });
  }
}

export function validatePlay(data: unknown): Play {
  const play = obj(data, 'peça');

  const version = play.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    fail('peça.schemaVersion', 'um número inteiro');
  }
  if (version > SCHEMA_VERSION) {
    throw new MbthError(
      'newer-version',
      'Este arquivo foi salvo por uma versão mais nova do Macbeth. Atualize o aplicativo para abri-lo.',
    );
  }

  const titlePage = obj(play.titlePage, 'peça.titlePage');
  str(titlePage, 'title', 'peça.titlePage');
  str(titlePage, 'author', 'peça.titlePage');
  str(titlePage, 'subtitle', 'peça.titlePage', true);
  str(titlePage, 'language', 'peça.titlePage', true);

  if (play.dictionary !== undefined) {
    arr(play.dictionary, 'peça.dictionary').forEach((word, i) => {
      if (typeof word !== 'string') fail(`peça.dictionary[${i}]`, 'um texto');
    });
  }

  const characterIds = new Set<string>();
  arr(play.characters, 'peça.characters').forEach((item, i) => {
    const path = `peça.characters[${i}]`;
    const c = obj(item, path);
    str(c, 'id', path);
    str(c, 'name', path);
    str(c, 'color', path);
    str(c, 'description', path, true);
    characterIds.add(c.id as string);
  });

  const acts = arr(play.acts, 'peça.acts');
  if (acts.length === 0) fail('peça.acts', 'pelo menos um ato');
  acts.forEach((item, a) => {
    const actPath = `peça.acts[${a}]`;
    const act = obj(item, actPath);
    str(act, 'id', actPath);
    str(act, 'title', actPath);

    arr(act.scenes, `${actPath}.scenes`).forEach((item, s) => {
      const scenePath = `${actPath}.scenes[${s}]`;
      const scene = obj(item, scenePath);
      str(scene, 'id', scenePath);
      str(scene, 'title', scenePath);
      str(scene, 'place', scenePath, true);

      arr(scene.elements, `${scenePath}.elements`).forEach((item, e) => {
        const path = `${scenePath}.elements[${e}]`;
        const element = obj(item, path);
        str(element, 'id', path);
        str(element, 'text', path);
        if (element.type === 'speech') {
          str(element, 'characterId', path);
          str(element, 'parenthetical', path, true);
          if (!characterIds.has(element.characterId as string)) {
            fail(`${path}.characterId`, 'um personagem cadastrado');
          }
        } else if (element.type !== 'direction') {
          fail(`${path}.type`, '"speech" ou "direction"');
        }
        validateAnnotations(element, path);
      });
    });
  });

  return play as unknown as Play;
}
