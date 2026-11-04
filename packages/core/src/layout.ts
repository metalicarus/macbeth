import type { Play, Speech } from './model';

/*
 * Paginação da peça para impressão, na formatação Em linha.
 *
 * O texto usa uma fonte monoespaçada, então tudo é medido em caracteres e
 * linhas: quem desenha o PDF só converte para pontos. Isso mantém as regras
 * de página aqui, testáveis e independentes de biblioteca de PDF:
 *
 *   - cada ato (a partir do segundo) começa em página nova;
 *   - título de ato ou cena nunca fica sozinho no pé da página;
 *   - fala que não cabe é dividida, com "(continua)" no pé e
 *     "NOME (cont.)" no alto da página seguinte;
 *   - as páginas são numeradas, menos a folha de rosto.
 */

export interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** Uma linha impressa. Sem spans, é uma linha em branco. */
export interface Line {
  spans: Span[];
  align?: 'left' | 'center';
}

export interface LaidOutPage {
  /** Número impresso no alto da página; `null` na folha de rosto. */
  number: number | null;
  lines: Line[];
}

export interface LayoutOptions {
  charsPerLine: number;
  linesPerPage: number;
  /** Textos que dependem da língua da interface. */
  labels: { continues: string; continued: string };
}

interface Block {
  lines: Line[];
  /** Começa numa página nova (atos a partir do segundo). */
  pageBreak?: boolean;
  /** Não pode ficar no pé da página sem o começo do bloco seguinte. */
  keepWithNext?: boolean;
  /** Nome do personagem, para continuar a fala na página seguinte. */
  speaker?: string;
}

const BLANK: Line = { spans: [] };

/** Quebra os spans em linhas de até `width` caracteres. "\n" força quebra. */
export function wrap(spans: Span[], width: number, align: Line['align'] = 'left'): Line[] {
  const lines: Line[] = [];
  let current: Span[] = [];
  let length = 0;

  const push = () => {
    // Espaços no fim da linha não aparecem na impressão.
    const last = current.at(-1);
    if (last) last.text = last.text.trimEnd();
    lines.push({ spans: current.filter((s) => s.text), align });
    current = [];
    length = 0;
  };
  const add = (text: string, style: Omit<Span, 'text'>) => {
    const last = current.at(-1);
    if (last && last.bold === style.bold && last.italic === style.italic) last.text += text;
    else current.push({ text, ...style });
    length += text.length;
  };

  for (const span of spans) {
    const style = { ...(span.bold ? { bold: true } : {}), ...(span.italic ? { italic: true } : {}) };
    span.text.split('\n').forEach((segment, i) => {
      if (i > 0) push();
      for (const token of segment.match(/\s+|\S+/g) ?? []) {
        if (/^\s+$/.test(token)) {
          if (length > 0 && length + 1 <= width) add(' ', style);
          continue;
        }
        let word = token;
        if (length + word.length > width && length > 0) push();
        // Palavra maior que a linha inteira é cortada.
        while (word.length > width) {
          add(word.slice(0, width), style);
          push();
          word = word.slice(width);
        }
        add(word, style);
      }
    });
  }
  if (current.length > 0 || lines.length === 0) push();
  return lines;
}

function speechSpans(speech: Speech, speaker: string): Span[] {
  return [
    { text: speaker.toLocaleUpperCase('pt-BR'), bold: true },
    { text: ' – ' },
    ...(speech.parenthetical ? [{ text: `(${speech.parenthetical})`, italic: true }, { text: ' ' }] : []),
    { text: speech.text },
  ];
}

function blocksOf(play: Play, width: number): Block[] {
  const names = new Map(play.characters.map((c) => [c.id, c.name]));
  const blocks: Block[] = [];

  play.acts.forEach((act, a) => {
    if (act.title) {
      blocks.push({
        lines: wrap([{ text: act.title.toLocaleUpperCase('pt-BR'), bold: true }], width, 'center'),
        pageBreak: a > 0,
        keepWithNext: true,
      });
    } else if (a > 0) {
      blocks.push({ lines: [], pageBreak: true });
    }

    for (const scene of act.scenes) {
      const title = [scene.title, scene.place].filter(Boolean).join(' – ');
      if (title) blocks.push({ lines: wrap([{ text: title, bold: true }], width, 'center'), keepWithNext: true });

      for (const element of scene.elements) {
        if (element.type === 'direction') {
          blocks.push({ lines: wrap([{ text: `(${element.text})`, italic: true }], width) });
        } else {
          const speaker = names.get(element.characterId) ?? '';
          blocks.push({ lines: wrap(speechSpans(element, speaker), width), speaker });
        }
      }
    }
  });

  return blocks;
}

function titlePage(play: Play, options: LayoutOptions): LaidOutPage | null {
  const { title, subtitle, author } = play.titlePage;
  if (!title) return null;
  const width = options.charsPerLine;
  const lines: Line[] = [
    ...wrap([{ text: title.toLocaleUpperCase('pt-BR'), bold: true }], width, 'center'),
    ...(subtitle ? [BLANK, ...wrap([{ text: subtitle }], width, 'center')] : []),
    ...(author ? [BLANK, BLANK, ...wrap([{ text: author }], width, 'center')] : []),
  ];
  // Centraliza o bloco na altura da página, um pouco acima do meio.
  const top = Math.max(0, Math.floor((options.linesPerPage - lines.length) / 3));
  return { number: null, lines: [...Array<Line>(top).fill(BLANK), ...lines] };
}

export function layoutPlay(play: Play, options: LayoutOptions): LaidOutPage[] {
  const { linesPerPage, charsPerLine, labels } = options;
  const pages: LaidOutPage[] = [];
  const cover = titlePage(play, options);
  if (cover) pages.push(cover);

  let page: Line[] = [];
  let number = 1;
  const newPage = () => {
    if (page.length > 0) {
      pages.push({ number: number++, lines: page });
      page = [];
    }
  };
  const free = () => linesPerPage - page.length;

  const blocks = blocksOf(play, charsPerLine);
  blocks.forEach((block, i) => {
    if (block.pageBreak) newPage();
    if (block.lines.length === 0) return;

    const gap = page.length > 0 ? 1 : 0;
    const next = blocks[i + 1];
    // Título precisa levar junto ao menos duas linhas do que vem depois.
    const companion = block.keepWithNext && next ? 1 + Math.min(2, next.lines.length) : 0;

    if (gap + block.lines.length + companion <= free()) {
      if (gap) page.push(BLANK);
      page.push(...block.lines);
      return;
    }

    // Não cabe inteiro. Se der para pôr ao menos duas linhas e ainda reservar a do
    // "(continua)", divide; senão, o bloco vai todo para a página seguinte.
    let lines = block.lines;
    const room = free() - gap - (block.speaker ? 1 : 0);
    if (!block.keepWithNext && room >= 2 && lines.length - room >= 1) {
      if (gap) page.push(BLANK);
      page.push(...lines.slice(0, room));
      if (block.speaker) page.push({ spans: [{ text: labels.continues, italic: true }] });
      lines = lines.slice(room);
      newPage();
      if (block.speaker) {
        page.push({ spans: [{ text: `${block.speaker.toLocaleUpperCase('pt-BR')} ${labels.continued}`, bold: true }] });
      }
    } else {
      newPage();
    }

    // Blocos maiores que uma página inteira continuam pelas páginas seguintes.
    while (lines.length > free()) {
      const take = free();
      page.push(...lines.slice(0, take));
      lines = lines.slice(take);
      newPage();
    }
    page.push(...lines);
  });

  newPage();
  // Peça vazia ainda gera um PDF com uma página.
  if (pages.length === 0) pages.push({ number: 1, lines: [] });
  return pages;
}
