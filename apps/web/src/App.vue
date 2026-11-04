<script setup lang="ts">
import { createPlay } from '@macbeth/core';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const play = createPlay();
</script>

<template>
  <header class="topbar">
    <span class="brand">Macbeth</span>
    <span class="file">{{ play.titlePage.title || t('app.untitled') }}</span>
  </header>
  <main class="desk"></main>
</template>
