import { Node, type Extensions } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Text from '@tiptap/extension-text';

/*
 * O editor é uma lista plana de elementos, como no Final Draft: ato, cena,
 * rubrica e fala, um depois do outro. Os atos e cenas do core são montados a
 * partir dessa sequência (veja convert.ts).
 *
 * A fala é o único elemento com partes: personagem, parentético opcional e o
 * texto. Na formatação "Em linha" as três aparecem na mesma linha.
 *
 * Nenhum elemento aceita negrito ou itálico: a aparência vem do tipo.
 */

// Atributos que existem só no documento, sem aparecer no HTML.
const hidden = { default: null, rendered: false } as const;

/** `extra` guarda campos do .mbth que esta versão não conhece, para devolvê-los ao salvar. */
const identity = { id: hidden, extra: hidden };

const PlayDocument = Document.extend({ content: 'playElement+' });

export const Act = Node.create({
  name: 'act',
  group: 'playElement',
  content: 'text*',
  marks: '',
  defining: true,
  addAttributes: () => identity,
  parseHTML: () => [{ tag: 'h2[data-type="act"]' }],
  renderHTML: () => ['h2', { 'data-type': 'act', class: 'el el-act' }, 0],
});

export const Scene = Node.create({
  name: 'scene',
  group: 'playElement',
  content: 'text*',
  marks: '',
  defining: true,
  addAttributes: () => ({ ...identity, place: hidden }),
  parseHTML: () => [{ tag: 'h3[data-type="scene"]' }],
  renderHTML: () => ['h3', { 'data-type': 'scene', class: 'el el-scene' }, 0],
});

export const Direction = Node.create({
  name: 'direction',
  group: 'playElement',
  content: 'text*',
  marks: '',
  addAttributes: () => identity,
  parseHTML: () => [{ tag: 'p[data-type="direction"]' }],
  renderHTML: () => ['p', { 'data-type': 'direction', class: 'el el-direction' }, 0],
});

export const Speech = Node.create({
  name: 'speech',
  group: 'playElement',
  content: 'speechCue speechParenthetical? speechLine',
  marks: '',
  addAttributes: () => identity,
  parseHTML: () => [{ tag: 'div[data-type="speech"]' }],
  renderHTML: () => ['div', { 'data-type': 'speech', class: 'el el-speech' }, 0],
});

/** O nome do personagem. O id do cadastro fica em `characterId`. */
export const SpeechCue = Node.create({
  name: 'speechCue',
  content: 'text*',
  marks: '',
  addAttributes: () => ({ characterId: hidden }),
  parseHTML: () => [{ tag: 'span[data-type="speech-cue"]' }],
  // Nomes próprios não passam pelo corretor ortográfico.
  renderHTML: () => ['span', { 'data-type': 'speech-cue', class: 'speech-cue', spellcheck: 'false' }, 0],
});

export const SpeechParenthetical = Node.create({
  name: 'speechParenthetical',
  content: 'text*',
  marks: '',
  parseHTML: () => [{ tag: 'span[data-type="speech-parenthetical"]' }],
  renderHTML: () => ['span', { 'data-type': 'speech-parenthetical', class: 'speech-parenthetical' }, 0],
});

/** O texto da fala. Shift+Enter quebra o verso sem sair da fala. */
export const SpeechLine = Node.create({
  name: 'speechLine',
  content: 'inline*',
  marks: '',
  parseHTML: () => [{ tag: 'span[data-type="speech-line"]' }],
  renderHTML: () => ['span', { 'data-type': 'speech-line', class: 'speech-line' }, 0],
});

export const playExtensions: Extensions = [
  PlayDocument,
  Text,
  HardBreak,
  Act,
  Scene,
  Direction,
  Speech,
  SpeechCue,
  SpeechParenthetical,
  SpeechLine,
];
