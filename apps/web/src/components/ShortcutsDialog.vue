<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { useI18n } from 'vue-i18n';
import { keyLabel, SHORTCUTS } from '../shortcuts';

const open = defineModel<boolean>('open', { required: true });
const { t } = useI18n();
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="shortcuts-overlay" />
      <DialogContent class="shortcuts-dialog">
        <header>
          <DialogTitle class="shortcuts-title">{{ t('shortcuts.title') }}</DialogTitle>
          <DialogClose class="shortcuts-close" :aria-label="t('shortcuts.close')">×</DialogClose>
        </header>
        <DialogDescription class="shortcuts-intro">{{ t('shortcuts.intro') }}</DialogDescription>

        <div class="shortcuts-groups">
          <section v-for="group in SHORTCUTS" :key="group.title">
            <h3>{{ t(`shortcuts.groups.${group.title}`) }}</h3>
            <dl>
              <template v-for="item in group.items" :key="item.description">
                <dt>
                  <template v-for="(combo, c) in item.keys" :key="c">
                    <span v-if="c > 0" class="or">/</span>
                    <kbd v-for="key in combo" :key="key">{{ keyLabel(key) }}</kbd>
                  </template>
                </dt>
                <dd>{{ t(`shortcuts.items.${item.description}`) }}</dd>
              </template>
            </dl>
          </section>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<!-- A janela é desenhada fora do componente (portal), onde estilos com escopo não chegam. -->
<style>
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgb(0 0 0 / 35%);
}

.shortcuts-dialog {
  position: fixed;
  z-index: 41;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(880px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 20px 24px 24px;
  border-radius: 12px;
  background: var(--page);
  color: var(--ink);
  border: 1px solid var(--line);
  box-shadow: 0 24px 60px -20px rgb(0 0 0 / 45%);
  font: 400 13px/1.45 var(--font-ui);
}

.shortcuts-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shortcuts-title {
  margin: 0;
  font: 400 22px/1.2 var(--font-display);
}

.shortcuts-close {
  font-size: 20px;
  line-height: 1;
  color: var(--muted);
}

.shortcuts-intro {
  margin: 6px 0 18px;
  color: var(--muted);
}

.shortcuts-groups {
  columns: 2 340px;
  column-gap: 32px;
}

.shortcuts-groups section {
  break-inside: avoid;
  margin-bottom: 18px;
}

.shortcuts-groups h3 {
  margin: 0 0 8px;
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.shortcuts-groups dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 7px 14px;
  margin: 0;
}

.shortcuts-groups dt {
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.shortcuts-groups dd {
  margin: 0;
}

.shortcuts-groups kbd {
  display: inline-block;
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 5px;
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  background: var(--pane);
  font: 600 11px/1.3 var(--font-label);
  text-align: center;
}

.shortcuts-groups .or {
  margin: 0 3px;
  color: var(--muted);
}
</style>
