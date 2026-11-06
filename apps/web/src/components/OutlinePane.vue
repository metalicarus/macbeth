<script setup lang="ts">
import { castByScene, playOutline } from '@macbeth/core';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNavigation } from '../stores/navigation';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();
const navigation = useNavigation();

const outline = computed(() => playOutline(store.play));
const cast = computed(() => castByScene(store.play));

/** Quem fala na cena onde está o cursor, com o número de falas. */
const inScene = computed(() => {
  const sceneId = navigation.current?.sceneId;
  if (!sceneId) return null;
  return store.play.characters
    .map((character) => ({ character, count: cast.value.speeches.get(character.id)?.get(sceneId) ?? 0 }))
    .filter((row) => row.count > 0);
});

function go(target: string | null) {
  if (target) navigation.goTo(target);
}
</script>

<template>
  <aside class="outline">
    <section>
      <h4>{{ t('outline.acts') }}</h4>
      <ul class="tree">
        <template v-for="act in outline" :key="act.id">
          <li>
            <button
              type="button"
              class="act"
              :class="{ on: navigation.current?.actId === act.id && !navigation.current?.sceneId, untitled: !act.title }"
              :disabled="!act.target"
              @click="go(act.target)"
            >
              {{ act.title || t('outline.untitledAct') }}
            </button>
          </li>
          <li v-for="scene in act.scenes" :key="scene.id">
            <button
              type="button"
              class="scene"
              :class="{ on: navigation.current?.sceneId === scene.id, untitled: !scene.title }"
              :aria-current="navigation.current?.sceneId === scene.id ? 'location' : undefined"
              :disabled="!scene.target"
              @click="go(scene.target)"
            >
              <span>{{ scene.title || t('outline.untitledScene') }}</span>
              <small>{{ scene.speeches }}</small>
            </button>
          </li>
        </template>
      </ul>
    </section>

    <section>
      <h4>{{ t('outline.inScene') }}</h4>
      <p v-if="inScene === null" class="hint">{{ t('outline.noScene') }}</p>
      <p v-else-if="inScene.length === 0" class="hint">{{ t('outline.nobody') }}</p>
      <ul v-else class="cast">
        <li v-for="{ character, count } in inScene" :key="character.id">
          <i :style="{ background: character.color }"></i>
          <span>{{ character.name }}</span>
          <small>{{ t('editor.suggest.speeches', count) }}</small>
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped>
.outline {
  background: var(--pane);
  border-right: 1px solid var(--line);
  overflow: auto;
  min-height: 0;
  padding: 14px 10px;
  display: grid;
  gap: 22px;
  align-content: start;
}

section {
  display: grid;
  gap: 8px;
}

h4 {
  margin: 0 0 0 6px;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1px;
}

.tree button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  text-align: left;
}

.tree button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
}

.tree button:disabled {
  cursor: default;
}

.tree .act {
  font-weight: 600;
  margin-top: 6px;
}

.tree .scene {
  padding-left: 18px;
  color: var(--muted);
}

.tree .on {
  background: var(--accent-soft);
  color: var(--ink);
}

.tree .untitled {
  font-style: italic;
}

.tree small,
.cast small {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.cast li {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
}

.cast i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.cast span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint {
  margin: 0 6px;
  font-size: 12px;
  color: var(--muted);
}
</style>
