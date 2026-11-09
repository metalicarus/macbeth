<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openLink } from '../links';

const open = defineModel<boolean>('open', { required: true });
const { t } = useI18n();

const version = __APP_VERSION__;
const SOURCE_URL = 'https://github.com/metalicarus/macbeth';
const AGPL_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';

interface Component {
  name: string;
  license: string;
  url: string;
  /** Detalhe ao lado do nome (a língua de cada dicionário). */
  note?: string;
}

/*
 * Os principais componentes, mantidos à mão. A lista completa, com todas as
 * dependências e o texto de cada licença, é gerada no build
 * (scripts/licenses.mjs) e aparece no fim da janela.
 */
const DICTIONARIES = 'https://github.com/wooorm/dictionaries';
const GROUPS: { title: string; items: Component[] }[] = [
  {
    title: 'dictionaries',
    items: [
      { name: 'dictionary-pt', note: 'pt-BR', license: 'LGPL-3.0 / MPL-2.0', url: DICTIONARIES },
      { name: 'dictionary-pt-pt', note: 'pt-PT', license: 'GPL-2.0 / LGPL-2.1 / MPL-1.1', url: DICTIONARIES },
      { name: 'dictionary-es', note: 'es', license: 'GPL-3.0 / LGPL-3.0 / MPL-1.1', url: DICTIONARIES },
      { name: 'dictionary-en', note: 'en', license: 'MIT / BSD', url: DICTIONARIES },
      { name: 'dictionary-fr', note: 'fr', license: 'MPL-2.0', url: DICTIONARIES },
      { name: 'Hunspell', license: 'MPL-1.1 / GPL-2.0 / LGPL-2.1', url: 'https://hunspell.github.io' },
      { name: 'hunspell-wasm', license: 'MIT', url: 'https://github.com/farscrl/hunspell-wasm' },
    ],
  },
  {
    title: 'fonts',
    items: [
      { name: 'Courier Prime', license: 'OFL-1.1', url: 'https://quoteunquoteapps.com/courierprime/' },
      { name: 'IBM Plex Sans', license: 'OFL-1.1', url: 'https://www.ibm.com/plex/' },
      { name: 'Young Serif', license: 'OFL-1.1', url: 'https://github.com/noirblancrouge/YoungSerif' },
    ],
  },
  {
    title: 'libraries',
    items: [
      { name: 'Vue', license: 'MIT', url: 'https://vuejs.org' },
      { name: 'Pinia', license: 'MIT', url: 'https://pinia.vuejs.org' },
      { name: 'Vue I18n', license: 'MIT', url: 'https://vue-i18n.intlify.dev' },
      { name: 'Reka UI', license: 'MIT', url: 'https://reka-ui.com' },
      { name: 'Tiptap', license: 'MIT', url: 'https://tiptap.dev' },
      { name: 'ProseMirror', license: 'MIT', url: 'https://prosemirror.net' },
      { name: 'pdf-lib', license: 'MIT', url: 'https://pdf-lib.js.org' },
      { name: 'mammoth', license: 'BSD-2-Clause', url: 'https://github.com/mwilliamson/mammoth.js' },
      { name: 'fflate', license: 'MIT', url: 'https://github.com/101arrowz/fflate' },
      { name: 'Tauri', license: 'Apache-2.0 / MIT', url: 'https://tauri.app' },
    ],
  },
];

/** A lista completa só é baixada quando a pessoa abre a seção. */
const fullList = ref<string | null>(null);
const fullListState = ref<'idle' | 'loading' | 'error'>('idle');

async function loadFullList(event: Event) {
  if (!(event.target as HTMLDetailsElement).open || fullList.value !== null || fullListState.value === 'loading') return;
  fullListState.value = 'loading';
  try {
    const response = await fetch('licenses.txt');
    if (!response.ok) throw new Error(String(response.status));
    fullList.value = await response.text();
    fullListState.value = 'idle';
  } catch {
    fullListState.value = 'error';
  }
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="about-overlay" />
      <DialogContent class="about-dialog">
        <header>
          <DialogTitle class="about-title">Macbeth</DialogTitle>
          <DialogClose class="about-close" :aria-label="t('about.close')">×</DialogClose>
        </header>
        <DialogDescription class="about-tagline">{{ t('about.tagline') }}</DialogDescription>
        <p class="about-meta">{{ t('about.version', { version }) }} · © 2026 metalicarus</p>

        <p>{{ t('about.license') }}</p>
        <p class="about-links">
          <a :href="SOURCE_URL" @click.prevent="openLink(SOURCE_URL)">{{ t('about.source') }}</a>
          <a :href="AGPL_URL" @click.prevent="openLink(AGPL_URL)">{{ t('about.agpl') }}</a>
        </p>

        <h3>{{ t('about.thirdParty') }}</h3>
        <p class="about-intro">{{ t('about.thirdPartyIntro') }}</p>
        <div class="about-groups">
          <section v-for="group in GROUPS" :key="group.title">
            <h4>{{ t(`about.groups.${group.title}`) }}</h4>
            <dl>
              <template v-for="item in group.items" :key="item.name">
                <dt>
                  <a :href="item.url" @click.prevent="openLink(item.url)">{{ item.name }}</a>
                  <small v-if="item.note">{{ item.note }}</small>
                </dt>
                <dd>{{ item.license }}</dd>
              </template>
            </dl>
          </section>
        </div>

        <details class="about-full" @toggle="loadFullList">
          <summary>{{ t('about.fullList') }}</summary>
          <p v-if="fullListState === 'loading'" class="about-intro">{{ t('about.loading') }}</p>
          <p v-else-if="fullListState === 'error'" class="about-intro">{{ t('about.loadError') }}</p>
          <pre v-else-if="fullList">{{ fullList }}</pre>
        </details>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<!-- A janela é desenhada fora do componente (portal), onde estilos com escopo não chegam. -->
<style>
.about-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgb(0 0 0 / 35%);
}

.about-dialog {
  position: fixed;
  z-index: 41;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(640px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 20px 24px 24px;
  border-radius: 12px;
  background: var(--page);
  color: var(--ink);
  border: 1px solid var(--line);
  box-shadow: 0 24px 60px -20px rgb(0 0 0 / 45%);
  font: 400 13px/1.5 var(--font-ui);
}

.about-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.about-title {
  margin: 0;
  font: 400 26px/1.2 var(--font-display);
}

/* O asterisco da marca, como na barra. */
.about-title::after {
  content: '*';
  color: var(--accent);
}

.about-close {
  font-size: 20px;
  line-height: 1;
  color: var(--muted);
}

.about-tagline {
  margin: 2px 0 0;
  font-size: 14px;
}

.about-meta,
.about-intro {
  margin: 4px 0 14px;
  color: var(--muted);
}

.about-dialog a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.about-links {
  display: flex;
  gap: 16px;
}

.about-dialog h3 {
  margin: 22px 0 0;
  font: 400 18px/1.2 var(--font-display);
}

.about-groups {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.about-groups h4 {
  margin: 0 0 6px;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.about-groups dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 3px 12px;
  margin: 0;
}

.about-groups dt small {
  margin-left: 6px;
  color: var(--muted);
}

.about-groups dd {
  margin: 0;
  color: var(--muted);
  text-align: right;
}

.about-full summary {
  cursor: pointer;
  color: var(--accent);
}

.about-full pre {
  max-height: 320px;
  overflow: auto;
  margin: 10px 0 0;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--pane);
  font: 400 11px/1.45 var(--font-script);
  white-space: pre-wrap;
}
</style>
