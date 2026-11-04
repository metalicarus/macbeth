<script setup lang="ts">
import { createPlay } from '@macbeth/core';

const play = createPlay({ title: 'Peça sem título' });
</script>

<template>
  <header class="topbar">
    <span class="brand">Macbeth</span>
    <span class="file">{{ play.titlePage.title }}</span>
  </header>
  <main class="desk"></main>
</template>
