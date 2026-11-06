<script setup lang="ts">
import { castByScene, playOutline, type Id } from '@macbeth/core';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNavigation } from '../stores/navigation';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();
const navigation = useNavigation();

const outline = computed(() => playOutline(store.play));
const cast = computed(() => castByScene(store.play));
/** Personagem destacado ao clicar no nome; os outros ficam esmaecidos. */
const highlighted = ref<Id | null>(null);

/** Grupos de colunas por ato, para o cabeçalho de duas linhas. */
const actGroups = computed(() =>
  outline.value
    .map((act, i) => ({ id: act.id, title: act.title || t('outline.untitledAct'), span: act.scenes.length, index: i }))
    .filter((group) => group.span > 0),
);

/** Número da cena dentro do ato (1, 2, 3…), para o cabeçalho estreito. */
const columns = computed(() => {
  const counters = new Map<number, number>();
  return cast.value.columns.map((column) => {
    const n = (counters.get(column.actIndex) ?? 0) + 1;
    counters.set(column.actIndex, n);
    return { ...column, number: n, firstOfAct: n === 1 };
  });
});

const rows = computed(() =>
  store.play.characters.map((character) => {
    const speeches = cast.value.speeches.get(character.id) ?? new Map<Id, number>();
    return { character, speeches, scenes: speeches.size };
  }),
);

const mostPresent = computed(() =>
  [...rows.value]
    .filter((row) => row.scenes > 0)
    .sort((a, b) => b.scenes - a.scenes)
    .slice(0, 5),
);

function sceneLabel(title: string, number: number): string {
  return title || `${t('outline.untitledScene')} ${number}`;
}

function toggle(id: Id) {
  highlighted.value = highlighted.value === id ? null : id;
}

function go(target: Id | null) {
  if (target) navigation.goTo(target);
}
</script>

<template>
  <div class="structure">
    <div class="matrix-wrap">
      <h3>{{ t('structure.title') }}</h3>
      <p class="hint">{{ t('structure.hint') }}</p>

      <p v-if="store.play.characters.length === 0" class="hint empty">{{ t('structure.empty') }}</p>
      <div v-else class="scroll">
        <table class="matrix">
          <thead>
            <tr class="acts">
              <th></th>
              <th v-for="group in actGroups" :key="group.id" :colspan="group.span" class="act-start">{{ group.title }}</th>
              <th></th>
            </tr>
            <tr>
              <th class="row-head">{{ t('structure.character') }}</th>
              <th
                v-for="column in columns"
                :key="column.scene.id"
                :class="{ 'act-start': column.firstOfAct }"
                :title="sceneLabel(column.scene.title, column.number)"
              >
                {{ column.number }}
              </th>
              <th class="total">{{ t('structure.scenes') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.character.id"
              :class="{ on: highlighted === row.character.id, dim: highlighted && highlighted !== row.character.id }"
            >
              <th class="row-head">
                <button type="button" @click="toggle(row.character.id)">
                  <i :style="{ background: row.character.color }"></i>{{ row.character.name }}
                </button>
              </th>
              <td v-for="column in columns" :key="column.scene.id" :class="{ 'act-start': column.firstOfAct }">
                <button
                  v-if="row.speeches.get(column.scene.id)"
                  type="button"
                  class="cell"
                  :style="{ background: row.character.color }"
                  :title="
                    t('structure.cell', {
                      name: row.character.name,
                      scene: sceneLabel(column.scene.title, column.number),
                      speeches: t('editor.suggest.speeches', row.speeches.get(column.scene.id) ?? 0),
                    })
                  "
                  @click="go(column.scene.target)"
                ></button>
                <span v-else class="cell empty"></span>
              </td>
              <td class="total">{{ row.scenes }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <aside class="summary">
      <h4>{{ t('structure.summary') }}</h4>
      <dl>
        <dt>{{ t('structure.characters') }}</dt>
        <dd>{{ store.play.characters.length }}</dd>
        <dt>{{ t('structure.sceneCount') }}</dt>
        <dd>{{ columns.length }}</dd>
      </dl>
      <template v-if="mostPresent.length">
        <h4>{{ t('structure.mostPresent') }}</h4>
        <ul>
          <li v-for="row in mostPresent" :key="row.character.id">
            <i :style="{ background: row.character.color }"></i>
            <span>{{ row.character.name }}</span>
            <small>{{ t('structure.inScenes', row.scenes) }}</small>
          </li>
        </ul>
      </template>
    </aside>
  </div>
</template>

<style scoped>
.structure {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  min-height: 0;
  height: 100%;
}

.matrix-wrap {
  background: var(--page);
  overflow: auto;
  padding: 18px 22px;
  min-height: 0;
}

h3 {
  margin: 0 0 4px;
  font: 400 19px/1.2 var(--font-display);
}

h4 {
  margin: 0;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.empty {
  margin-top: 18px;
}

.scroll {
  overflow-x: auto;
  margin-top: 14px;
}

.matrix {
  border-collapse: separate;
  border-spacing: 0;
  font: 500 11.5px/1 var(--font-label);
  font-variant-numeric: tabular-nums;
}

.matrix th,
.matrix td {
  padding: 0;
  text-align: center;
}

.matrix thead th {
  color: var(--muted);
  font-weight: 500;
  height: 22px;
  min-width: 24px;
}

.matrix thead tr.acts th {
  color: var(--ink);
  font-weight: 600;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
  padding: 0 6px;
}

.matrix .act-start {
  border-left: 1px solid var(--line);
}

.matrix .row-head {
  text-align: left;
  padding-right: 14px;
}

.matrix tbody .row-head button {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  font: 500 12.5px/1 var(--font-ui);
  white-space: nowrap;
}

.matrix .row-head i {
  width: 9px;
  height: 9px;
  border-radius: 2px;
}

.cell {
  display: block;
  width: 14px;
  height: 14px;
  margin: auto;
  border-radius: 3px;
  padding: 0;
}

button.cell {
  cursor: pointer;
}

button.cell:hover {
  outline: 2px solid var(--ink);
  outline-offset: 1px;
}

.cell.empty {
  background: color-mix(in srgb, var(--line) 45%, transparent);
}

.matrix .total {
  padding-left: 12px;
  color: var(--muted);
  text-align: right;
}

tr.on .row-head button {
  color: var(--accent);
}

tr.dim button.cell {
  opacity: 0.25;
}

.summary {
  background: var(--pane);
  border-left: 1px solid var(--line);
  padding: 14px 12px;
  display: grid;
  gap: 12px;
  align-content: start;
  overflow: auto;
}

dl {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  margin: 0;
  font-size: 12.5px;
}

dt {
  color: var(--muted);
}

dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.summary ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.summary li {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  font-size: 12.5px;
}

.summary li i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.summary small {
  color: var(--muted);
}
</style>
