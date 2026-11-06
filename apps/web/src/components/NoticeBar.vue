<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useNotice } from '../stores/notice';

const { t } = useI18n();
const notice = useNotice();
</script>

<template>
  <div v-if="notice.message" class="notice" role="status">
    <span>{{ notice.message }}</span>
    <button type="button" :aria-label="t('notice.dismiss')" @click="notice.dismiss()">×</button>
  </div>
</template>

<style scoped>
.notice {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(560px, calc(100% - 32px));
  padding: 8px 10px 8px 14px;
  border-radius: 8px;
  background: var(--ink);
  color: var(--page);
  font-size: 12.5px;
  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 45%);
}

button {
  color: inherit;
  opacity: 0.7;
  font-size: 15px;
  line-height: 1;
}

button:hover {
  opacity: 1;
}
</style>
