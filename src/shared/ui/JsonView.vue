<script setup lang="ts">
import { toJson } from '../format/format'

defineProps<{ value: unknown }>()
</script>

<template>
  <pre class="json">{{ toJson(value) }}</pre>
</template>
