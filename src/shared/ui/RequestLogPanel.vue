<script setup lang="ts">
import { ref } from 'vue'
import { clearRequestLog, requestLog } from '../http/requestLog'

const open = ref(true)
</script>

<template>
  <section class="request-log">
    <header>
      <b>요청 기록</b> ({{ requestLog.length }})
      <button type="button" @click="open = !open">{{ open ? '접기' : '펼치기' }}</button>
      <button type="button" @click="clearRequestLog">비우기</button>
    </header>
    <table v-if="open" class="table compact">
      <tr v-for="r in requestLog" :key="r.seq" :class="{ bad: r.status === 0 || r.status >= 400 }">
        <td>{{ r.at }}</td>
        <td>{{ r.method }}</td>
        <td>{{ r.path }}</td>
        <td>{{ r.status }}</td>
        <td>{{ r.code ?? '' }}</td>
        <td>{{ r.ms }}ms</td>
        <td class="muted">{{ r.requestId ?? '' }}</td>
      </tr>
    </table>
  </section>
</template>
