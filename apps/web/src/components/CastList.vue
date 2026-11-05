<script setup lang="ts">
import { CHARACTER_COLORS, CharacterError, countSpeeches, type Character, type Id } from '@macbeth/core';
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlayStore } from '../stores/play';

const { t } = useI18n();
const store = usePlayStore();

const counts = computed(() => countSpeeches(store.play));
/** Erro de nome por linha (id do personagem) ou no campo de cadastro ("new"). */
const errors = ref<Record<string, string>>({});
const newName = ref('');

function errorText(error: unknown): string {
  if (error instanceof CharacterError && (error.code === 'empty-name' || error.code === 'duplicate-name')) {
    return t(`cast.errors.${error.code}`);
  }
  throw error;
}

function rename(character: Character, event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.value === character.name) return;
  try {
    store.renameCharacter(character.id, input.value);
    delete errors.value[character.id];
  } catch (error) {
    errors.value[character.id] = errorText(error);
    input.value = character.name;
  }
}

function add() {
  try {
    store.addCharacter(newName.value);
    newName.value = '';
    delete errors.value.new;
  } catch (error) {
    errors.value.new = errorText(error);
  }
}

function recolor(id: Id, color: string) {
  store.setCharacterColor(id, color);
}
</script>

<template>
  <section class="cast">
    <h4>{{ t('cast.title') }}</h4>
    <p v-if="store.play.characters.length === 0" class="hint">{{ t('cast.empty') }}</p>

    <ul>
      <li v-for="character in store.play.characters" :key="character.id">
        <div class="row">
          <PopoverRoot>
            <PopoverTrigger
              class="swatch"
              :style="{ background: character.color }"
              :aria-label="t('cast.color', { name: character.name })"
            />
            <PopoverPortal>
              <PopoverContent class="palette" side="bottom" align="start" :side-offset="6">
                <button
                  v-for="color in CHARACTER_COLORS"
                  :key="color"
                  type="button"
                  class="swatch"
                  :style="{ background: color }"
                  :aria-label="color"
                  :aria-pressed="color === character.color"
                  @click="recolor(character.id, color)"
                />
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>

          <input
            class="name"
            type="text"
            :value="character.name"
            :aria-label="t('cast.name', { name: character.name })"
            @input="delete errors[character.id]"
            @change="rename(character, $event)"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <small>{{ t('editor.suggest.speeches', counts.get(character.id) ?? 0) }}</small>
          <button
            v-if="!counts.get(character.id)"
            type="button"
            class="remove"
            :aria-label="t('cast.remove', { name: character.name })"
            :title="t('cast.remove', { name: character.name })"
            @click="store.removeCharacter(character.id)"
          >
            ×
          </button>
        </div>
        <p v-if="errors[character.id]" class="error" role="alert">{{ errors[character.id] }}</p>
      </li>
    </ul>

    <form class="add" @submit.prevent="add">
      <input
        v-model="newName"
        type="text"
        :placeholder="t('cast.addPlaceholder')"
        :aria-label="t('cast.add')"
        @input="delete errors.new"
      />
      <button type="submit">{{ t('cast.add') }}</button>
    </form>
    <p v-if="errors.new" class="error" role="alert">{{ errors.new }}</p>
  </section>
</template>

<style scoped>
.cast {
  display: grid;
  gap: 10px;
}

h4 {
  margin: 0;
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
  gap: 4px;
}

.row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 8px;
}

.swatch {
  width: 14px;
  height: 14px;
  padding: 0;
  border-radius: 3px;
  border: 0;
  cursor: pointer;
}

.palette {
  display: grid;
  grid-template-columns: repeat(4, 14px);
  gap: 8px;
  padding: 10px;
  background: var(--page);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 35%);
  z-index: 10;
}

.palette .swatch[aria-pressed='true'] {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

input {
  font: inherit;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink);
}

input:hover,
input:focus {
  border-color: var(--line);
  background: var(--page);
}

small {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.remove {
  color: var(--muted);
  font-size: 15px;
  line-height: 1;
}

.remove:hover {
  color: var(--cut);
}

.add {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}

.add input {
  border-color: var(--line);
  background: var(--page);
}

.add input::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

.add button {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink);
}

.hint,
.error {
  margin: 0;
  font-size: 12px;
}

.hint {
  color: var(--muted);
}

.error {
  color: var(--cut);
  padding-left: 22px;
}
</style>
