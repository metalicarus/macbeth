// Os pacotes dictionary-* só exportam um módulo para Node; o vite.config.ts
// aponta estes caminhos direto para os arquivos .aff e .dic de cada pacote.
import enAff from 'dictionary-en/index.aff?url';
import enDic from 'dictionary-en/index.dic?url';
import esAff from 'dictionary-es/index.aff?url';
import esDic from 'dictionary-es/index.dic?url';
import frAff from 'dictionary-fr/index.aff?url';
import frDic from 'dictionary-fr/index.dic?url';
import ptPtAff from 'dictionary-pt-pt/index.aff?url';
import ptPtDic from 'dictionary-pt-pt/index.dic?url';
import ptAff from 'dictionary-pt/index.aff?url';
import ptDic from 'dictionary-pt/index.dic?url';

export interface DictionaryFiles {
  /** Identificador do dicionário (para saber se já está carregado). */
  id: string;
  aff: string;
  dic: string;
}

const DICTIONARIES: Record<string, DictionaryFiles> = {
  'pt-BR': { id: 'pt-BR', aff: ptAff, dic: ptDic },
  'pt-PT': { id: 'pt-PT', aff: ptPtAff, dic: ptPtDic },
  es: { id: 'es', aff: esAff, dic: esDic },
  en: { id: 'en', aff: enAff, dic: enDic },
  fr: { id: 'fr', aff: frAff, dic: frDic },
};

/** "pt" sozinho é português do Brasil, como no resto do app. */
const BASE: Record<string, string> = { pt: 'pt-BR', es: 'es', en: 'en', fr: 'fr' };

/**
 * O dicionário para o idioma da peça: o código exato ("pt-PT") ou, se não
 * houver, o da língua base ("en-GB" → inglês). `null` se não houver nenhum.
 */
export function dictionaryFor(language: string): DictionaryFiles | null {
  const exact = Object.keys(DICTIONARIES).find((code) => code.toLowerCase() === language.toLowerCase());
  if (exact) return DICTIONARIES[exact]!;
  const base = BASE[language.toLowerCase().split('-')[0] ?? ''];
  return base ? DICTIONARIES[base]! : null;
}
