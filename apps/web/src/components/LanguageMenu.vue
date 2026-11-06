<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Locale } from '../i18n';
import { usePreferences } from '../stores/preferences';

const { t, locale } = useI18n();
const { language } = storeToRefs(usePreferences());

/** Cada língua no próprio nome, para quem não lê a atual achar a sua. */
const NAMES: Record<Locale, string> = { 'pt-BR': 'Português', en: 'English', es: 'Español' };
const SHORT: Record<Locale, string> = { 'pt-BR': 'PT', en: 'EN', es: 'ES' };

const current = computed(() => SHORT[locale.value as Locale] ?? 'PT');
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button type="button" class="language" :aria-label="t('language.label')" :title="t('language.label')">
        {{ current }}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="popup-menu" align="end" :side-offset="6">
        <DropdownMenuRadioGroup v-model="language">
          <DropdownMenuRadioItem class="popup-menu-item" value="auto">
            <span>
              <DropdownMenuItemIndicator as="span">✓ </DropdownMenuItemIndicator>
              {{ t('language.auto') }}
            </span>
            <small>{{ t('language.autoHint') }}</small>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem v-for="(name, code) in NAMES" :key="code" class="popup-menu-item" :value="code">
            <span>
              <DropdownMenuItemIndicator as="span">✓ </DropdownMenuItemIndicator>
              {{ name }}
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style scoped>
.language {
  min-width: 30px;
  height: 26px;
  padding: 0 7px;
  border-radius: 13px;
  border: 1px solid var(--line);
  font: 600 11px/1 var(--font-label);
  letter-spacing: 0.06em;
  color: var(--muted);
}

.language:hover {
  color: var(--ink);
}
</style>
