<script setup lang="ts">
import { onMounted } from 'vue'
import { reloadMe } from '../portal/session'
import { usePortal } from '../portal/usePortal'
import KeyValueTable from '../ui/KeyValueTable.vue'
import ResultBox from '../ui/ResultBox.vue'
import { useAsync } from '../ui/useAsync'

/** 내 계정(GET …/me) 원본 값. 기능 코드(features) · 셋업 여부를 확인한다. */
const { portal } = usePortal()
const me = useAsync(() => portal.value.me!())

async function load(): Promise<void> {
  await me.run()
  await reloadMe(portal.value)
}

onMounted(load)
</script>

<template>
  <div>
    <button type="button" @click="load">다시 읽기</button>
    <ResultBox :error="me.error.value" />
    <KeyValueTable :data="me.data.value" />
  </div>
</template>
