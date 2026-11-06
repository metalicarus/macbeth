import type { ImportedParagraph } from '@macbeth/core';
import { strFromU8, unzipSync } from 'fflate';

/*
 * Parágrafos de um .odt (LibreOffice, e também exportado pelo Google Docs).
 * O .odt é um zip com o texto em content.xml; os estilos com itálico ficam
 * em content.xml (automáticos) e em styles.xml (os nomeados).
 */

const TEXT_NS = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0';
const STYLE_NS = 'urn:oasis:names:tc:opendocument:xmlns:style:1.0';
const FO_NS = 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0';

function parseXml(bytes: Uint8Array | undefined): Document | null {
  return bytes ? new DOMParser().parseFromString(strFromU8(bytes), 'application/xml') : null;
}

/** Nomes dos estilos (de parágrafo ou de trecho) que deixam o texto em itálico. */
function italicStyles(...docs: (Document | null)[]): Set<string> {
  const names = new Set<string>();
  for (const doc of docs) {
    if (!doc) continue;
    for (const style of doc.getElementsByTagNameNS(STYLE_NS, 'style')) {
      const props = style.getElementsByTagNameNS(STYLE_NS, 'text-properties')[0];
      if (props?.getAttributeNS(FO_NS, 'font-style') === 'italic') names.add(style.getAttributeNS(STYLE_NS, 'name') ?? '');
    }
  }
  return names;
}

/** Texto do parágrafo e quanto dele está em itálico. */
function readParagraph(paragraph: Element, italic: Set<string>): ImportedParagraph {
  const paragraphItalic = italic.has(paragraph.getAttributeNS(TEXT_NS, 'style-name') ?? '');
  let text = '';
  let italicText = '';

  const walk = (node: Node, inItalic: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.nodeValue;
      if (inItalic) italicText += node.nodeValue;
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.namespaceURI === TEXT_NS) {
      // Espaços repetidos, tabulações e quebras de linha são elementos no .odt.
      if (node.localName === 's') {
        text += ' '.repeat(Number(node.getAttributeNS(TEXT_NS, 'c') ?? 1));
        return;
      }
      if (node.localName === 'tab' || node.localName === 'line-break') {
        text += ' ';
        return;
      }
      if (node.localName === 'note') return;
    }
    const spanItalic = node.localName === 'span' && italic.has(node.getAttributeNS(TEXT_NS, 'style-name') ?? '');
    for (const child of node.childNodes) walk(child, inItalic || spanItalic);
  };
  walk(paragraph, paragraphItalic);

  const visible = text.replace(/\s/g, '');
  return { text, italic: visible !== '' && italicText.replace(/\s/g, '') === visible };
}

export function odtParagraphs(bytes: Uint8Array): ImportedParagraph[] {
  const files = unzipSync(bytes, { filter: (file) => file.name === 'content.xml' || file.name === 'styles.xml' });
  const content = parseXml(files['content.xml']);
  if (!content) throw new Error('content.xml ausente');

  const italic = italicStyles(content, parseXml(files['styles.xml']));
  const paragraphs: ImportedParagraph[] = [];
  for (const element of content.getElementsByTagNameNS(TEXT_NS, '*')) {
    if (element.localName === 'p' || element.localName === 'h') paragraphs.push(readParagraph(element, italic));
  }
  return paragraphs;
}
