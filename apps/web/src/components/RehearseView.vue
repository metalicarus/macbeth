<script setup lang="ts">
import { countSpeeches, initials, rehearsalScript, scenesWithCharacter, type Id, type RehearsalLine } from '@macbeth/core';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlayStore } from '../stores/play';
import { usePreferences } from '../stores/preferences';

const { t } = useI18n();
const store = usePlayStore();
const { rehearsal: settings } = storeToRefs(usePreferences());

type SpeechLine = Extract<RehearsalLine, { kind: 'speech' }>;

/** Quem tem falas, de quem mais fala para quem menos fala. */
const cast = computed(() => {
  const counts = countSpeeches(store.play);
  return store.play.characters.filter((c) => (counts.get(c.id) ?? 0) > 0).sort((a, b) => counts.get(b.id)! - counts.get(a.id)!);
});

const characterId = ref<Id | null>(null);
const sceneId = ref<Id | null>(null);
/** Falas do ator já conferidas nesta rodada. */
const revealed = ref(new Set<Id>());

const scenes = computed(() => (characterId.value ? scenesWithCharacter(store.play, characterId.value) : []));

// Personagem que sumiu (peça trocada, personagem removido): volta para quem mais fala.
watch(
  cast,
  (list) => {
    if (!list.some((c) => c.id === characterId.value)) characterId.value = list[0]?.id ?? null;
  },
  { immediate: true },
);
watch(
  scenes,
  (list) => {
    if (!list.some((s) => s.id === sceneId.value)) sceneId.value = list[0]?.id ?? null;
  },
  { immediate: true },
);

const lines = computed(() =>
  characterId.value
    ? rehearsalScript(store.play, {
        characterId: characterId.value,
        sceneId: settings.value.scope === 'scene' ? sceneId.value : null,
        cue: settings.value.cue,
      })
    : [],
);

const mine = computed(() => lines.value.filter((l): l is SpeechLine => l.kind === 'speech' && l.mine));
const done = computed(() => mine.value.filter((l) => revealed.value.has(l.id)).length);

function restart() {
  revealed.value = new Set();
  scriptView.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

// Outro personagem ou outro trecho: a rodada recomeça.
watch([characterId, sceneId, () => settings.value.scope], restart);

function isShown(line: SpeechLine): boolean {
  return settings.value.mask === 'visible' || revealed.value.has(line.id);
}

function toggle(line: SpeechLine) {
  const next = new Set(revealed.value);
  if (next.has(line.id)) next.delete(line.id);
  else next.add(line.id);
  revealed.value = next;
}

/** Espaço ou Enter: mostra a próxima fala do ator ainda não conferida e rola até ela. */
async function revealNext() {
  const line = mine.value.find((l) => !revealed.value.has(l.id));
  if (!line) return;
  revealed.value = new Set(revealed.value).add(line.id);
  await nextTick();
  document.querySelector(`[data-line="${line.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return;
  const target = event.target as HTMLElement;
  // Nos campos e botões, Espaço e Enter continuam com a função normal deles. A
  // exceção é a própria aba "Ensaiar", já selecionada: reativá-la não faria nada.
  const onActiveTab = target.getAttribute('role') === 'tab' && target.getAttribute('aria-selected') === 'true';
  if (!onActiveTab && target.closest('select, input, textarea, button, [role="tab"]')) return;
  event.preventDefault();
  void revealNext();
}

const scriptView = ref<HTMLElement>();

onMounted(async () => {
  window.addEventListener('keydown', onKeydown);
  // O foco sai da aba "Ensaiar" e vai para o texto, para o Espaço revelar falas de cara.
  await nextTick();
  scriptView.value?.focus();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

/** Texto escondido: primeiras letras, ou só a forma das linhas. */
function masked(text: string): string {
  return settings.value.mask === 'initials' ? initials(text) : text.replace(/\S/g, '·');
}

function sceneLabel(scene: { act: string; title: string }): string {
  return [scene.act, scene.title || t('rehearse.untitledScene')].filter(Boolean).join(' · ');
}

const heading = computed(() => {
  if (settings.value.scope === 'play') return t('rehearse.wholePlay');
  const scene = scenes.value.find((s) => s.id === sceneId.value);
  return scene ? sceneLabel(scene) : '';
});
</script>

<template>
  <div class="rehearse">
    <aside class="options">
      <p v-if="cast.length === 0" class="hint">{{ t('rehearse.noCharacters') }}</p>
      <template v-else>
        <label class="field">
          <span>{{ t('rehearse.character') }}</span>
          <select v-model="characterId">
            <option v-for="c in cast" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <fieldset class="field">
          <legend>{{ t('rehearse.scope') }}</legend>
          <div class="seg">
            <button type="button" :aria-pressed="settings.scope === 'scene'" @click="settings.scope = 'scene'">
              {{ t('rehearse.scopeScene') }}
            </button>
            <button type="button" :aria-pressed="settings.scope === 'play'" @click="settings.scope = 'play'">
              {{ t('rehearse.scopePlay') }}
            </button>
          </div>
          <select v-if="settings.scope === 'scene'" v-model="sceneId" :aria-label="t('rehearse.scene')">
            <option v-for="s in scenes" :key="s.id" :value="s.id">{{ sceneLabel(s) }}</option>
          </select>
        </fieldset>

        <fieldset class="field">
          <legend>{{ t('rehearse.mask') }}</legend>
          <div class="seg">
            <button
              v-for="option in ['initials', 'hidden', 'visible'] as const"
              :key="option"
              type="button"
              :aria-pressed="settings.mask === option"
              @click="settings.mask = option"
            >
              {{ t(`rehearse.mask${option[0]!.toUpperCase()}${option.slice(1)}`) }}
            </button>
          </div>
        </fieldset>

        <fieldset class="field">
          <legend>{{ t('rehearse.cue') }}</legend>
          <div class="seg">
            <button type="button" :aria-pressed="settings.cue === 'words'" @click="settings.cue = 'words'">
              {{ t('rehearse.cueWords') }}
            </button>
            <button type="button" :aria-pressed="settings.cue === 'speech'" @click="settings.cue = 'speech'">
              {{ t('rehearse.cueSpeech') }}
            </button>
          </div>
        </fieldset>

        <button type="button" class="restart" @click="restart">{{ t('rehearse.restart') }}</button>
        <p class="hint">{{ t('rehearse.hint') }}</p>
      </template>
    </aside>

    <div class="stage">
      <div v-if="characterId" class="phone">
        <header>
          <b>{{ heading }}</b>
          <small>{{ cast.find((c) => c.id === characterId)?.name }}</small>
        </header>

        <div ref="scriptView" class="script-view" tabindex="-1">
          <template v-for="line in lines" :key="line.id">
            <h3 v-if="line.kind === 'scene' && settings.scope === 'play'" class="scene">
              {{ sceneLabel(line) }}
            </h3>
            <p v-else-if="line.kind === 'direction'" class="direction">({{ line.text }})</p>
            <template v-else-if="line.kind === 'speech'">
              <button
                v-if="line.mine"
                type="button"
                class="line mine"
                :class="{ open: isShown(line) }"
                :data-line="line.id"
                :aria-label="isShown(line) ? undefined : t('rehearse.reveal')"
                @click="toggle(line)"
              >
                <small>{{ t('rehearse.yourLine') }}</small>
                <span v-if="line.parenthetical" class="paren">({{ line.parenthetical }})</span>
                <span class="text" :class="{ masked: !isShown(line) }">{{ isShown(line) ? line.text : masked(line.text) }}</span>
              </button>
              <div v-else class="line" :data-line="line.id">
                <span class="cue"><i :style="{ background: line.color }"></i>{{ line.speaker }}</span>
                <span v-if="line.parenthetical" class="paren">({{ line.parenthetical }})</span>
                <span class="text">
                  <template v-if="line.cueStart !== undefined">
                    {{ line.text.slice(0, line.cueStart) }}<mark class="deixa">{{ line.text.slice(line.cueStart) }}</mark>
                  </template>
                  <template v-else>{{ line.text }}</template>
                </span>
              </div>
            </template>
          </template>
        </div>

        <footer>
          <div class="progress"><i :style="{ width: mine.length ? `${(done / mine.length) * 100}%` : '0' }"></i></div>
          <small>{{ t('rehearse.progress', { done, total: mine.length }) }}</small>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rehearse {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.options {
  background: var(--pane);
  border-right: 1px solid var(--line);
  padding: 14px 12px;
  display: grid;
  gap: 16px;
  align-content: start;
  overflow: auto;
}

.field {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.field > span,
legend {
  padding: 0;
  margin-bottom: 6px;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

select {
  font: inherit;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--page);
  color: var(--ink);
}

.seg {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 7px;
  overflow: hidden;
}

.seg button {
  flex: 1;
  padding: 6px 4px;
  font-size: 12px;
  color: var(--muted);
}

.seg button[aria-pressed='true'] {
  background: var(--accent);
  color: var(--accent-ink);
}

.restart {
  padding: 7px 10px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.stage {
  background: var(--desk);
  display: grid;
  place-items: center;
  padding: 20px;
  min-height: 0;
  overflow: hidden;
}

/* Coluna estreita, como a tela de um celular: o mesmo modo vai para o celular depois. */
.phone {
  width: min(420px, 100%);
  height: 100%;
  max-height: 760px;
  background: var(--page);
  border-radius: 28px;
  border: 8px solid #101218;
  box-shadow: 0 20px 50px -20px rgb(0 0 0 / 50%);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.phone header {
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 2px;
}

.phone header b {
  font: 400 16px/1.2 var(--font-display);
}

.phone header small,
.phone footer small {
  color: var(--muted);
  font-size: 12px;
}

.script-view {
  outline: none;
  overflow: auto;
  padding: 14px 16px;
  display: grid;
  gap: 12px;
  align-content: start;
  font: 400 14px/1.5 var(--font-script);
}

.scene {
  margin: 8px 0 0;
  font: 700 13px/1.3 var(--font-script);
  text-align: center;
}

.direction {
  margin: 0;
  font-style: italic;
  color: var(--muted);
  font-size: 13px;
}

.line {
  display: grid;
  gap: 2px;
  text-align: left;
  font: inherit;
}

.cue {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 12.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cue i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.paren {
  font-style: italic;
  color: var(--muted);
  font-size: 13px;
}

.text {
  white-space: pre-line;
}

.deixa {
  background: var(--accent-soft);
  color: inherit;
  box-shadow: 0 0 0 2px var(--accent-soft);
  border-radius: 2px;
}

.mine {
  border: 1px dashed var(--accent);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
}

.mine.open {
  border-style: solid;
  background: color-mix(in srgb, var(--accent-soft) 40%, transparent);
}

.mine small {
  color: var(--accent);
  font: 600 10.5px/1 var(--font-label);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.masked {
  letter-spacing: 0.06em;
  color: var(--muted);
}

.phone footer {
  padding: 10px 16px 14px;
  border-top: 1px solid var(--line);
  display: grid;
  gap: 6px;
}

.progress {
  height: 4px;
  border-radius: 2px;
  background: var(--line);
  overflow: hidden;
}

.progress i {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

@media (prefers-reduced-motion: reduce) {
  .progress i {
    transition: none;
  }
}
</style>
