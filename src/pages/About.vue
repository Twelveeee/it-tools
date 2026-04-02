<script setup lang="ts">
import { useHead } from '@vueuse/head';

useHead({ title: 'About - IT Tools' });
</script>

<template>
  <div mx-auto mt-50px max-w-600px>
    <h1>About IT-Tools</h1>
    <p>
      This self-hosted fork aggregates useful tools for developers and people working in IT.
    </p>
    <h2>Technologies</h2>
    <p>
      IT-Tools is built with Vue.js (Vue 3) and Naive UI. Third-party open-source libraries are used in some tools.
    </p>
    <h2>Local use</h2>
    <p>
      This deployment is intended for personal use. Adjust the source code and configuration in your fork as needed.
    </p>
  </div>
</template>
