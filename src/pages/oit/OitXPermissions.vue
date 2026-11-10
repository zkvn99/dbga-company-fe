<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { type PermissionCatalog, accountManageApi } from '@/api/accountManage'
import { oit } from '@/portals/oit'
import DataTable from '@/shared/ui/DataTable.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { screenPath } from '@/shared/portal/types'
import { cols } from '@/shared/ui/table'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 권한 조회 (화면설계서 밖 — ADR-0030 · ADR-0031): 역할 × 기본 세트 기능 표(잠금 표시) · 위임 가능 기능 · API ↔ 기능 표. 조회만.
 * 세트 편집 · 역할 이름 변경은 OIT-X-PERMISSION-SET.
 */
const catalog = useAsync(accountManageApi.permissions)
const data = computed(() => catalog.data.value ?? null)

/** 모든 역할 기능의 합집합(처음 나온 순서) + 설명. */
const features = computed(() => {
  const map = new Map<string, string>()
  for (const r of data.value?.roles ?? []) for (const f of r.features) if (!map.has(f.code)) map.set(f.code, f.description)
  return [...map.entries()].map(([code, description]) => ({ code, description }))
})
const has = (role: PermissionCatalog['roles'][number], code: string) => role.features.some((f) => f.code === code)
const locked = (role: PermissionCatalog['roles'][number], code: string) => role.assignable?.some((a) => a.code === code && a.locked) ?? false
function mark(role: PermissionCatalog['roles'][number], code: string): string {
  if (!has(role, code)) return ''
  return locked(role, code) ? '● 잠금' : '●'
}

const delegableColumns = cols<PermissionCatalog['delegable'][number]>(['code:기능 코드', 'label:이름'])
const apiColumns = cols<PermissionCatalog['apis'][number]>(['method:메서드', 'path:경로', 'feature:기능 코드', 'description:설명'])

onMounted(() => void catalog.run())
</script>

<template>
  <div>
    <p><RouterLink :to="screenPath(oit, 'OIT-X-PERMISSION-SET')">권한 세트 · 역할 이름 관리 (OIT-X-PERMISSION-SET)</RouterLink></p>
    <ResultBox :error="catalog.error.value" />
    <template v-if="data">
      <h3>역할별 기본 세트 기능</h3>
      <p class="muted">● = 그 역할 기본 세트에 있음 · 잠금 = 끌 수 없는 기능(어느 세트든 유지). 기본 세트 이름: {{ data.roles.map((r) => `${r.roleName} — ${r.sets?.find((s) => s.isDefault)?.name ?? '-'}`).join(' · ') }}</p>
      <table class="table">
        <thead>
          <tr>
            <th>기능 코드</th>
            <th>설명</th>
            <th v-for="r in data.roles" :key="r.role">{{ r.roleName }}<br /><code class="muted">{{ r.role }}</code></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in features" :key="f.code">
            <td><code>{{ f.code }}</code></td>
            <td>{{ f.description }}</td>
            <td v-for="r in data.roles" :key="r.role">{{ mark(r, f.code) }}</td>
          </tr>
        </tbody>
      </table>
      <h3>위임 가능 기능 (조직 관리자)</h3>
      <DataTable :rows="data.delegable" :columns="delegableColumns" />
      <h3>API ↔ 기능</h3>
      <DataTable :rows="data.apis" :columns="apiColumns" />
    </template>
  </div>
</template>
