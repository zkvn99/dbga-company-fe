import { ref, shallowRef } from 'vue'
import { ApiError } from '../http/ApiError'

/** 비동기 호출 상태(로딩 · 결과 · 오류). 실패는 던지지 않고 error 에 담는다 — 화면이 ResultBox 로 보여 준다. */
export function useAsync<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const loading = ref(false)
  const data = shallowRef<R>()
  const error = shallowRef<ApiError | null>(null)
  const done = ref(false)

  async function run(...args: A): Promise<R | undefined> {
    loading.value = true
    error.value = null
    try {
      const result = await fn(...args)
      data.value = result
      done.value = true
      return result
    } catch (e) {
      error.value = ApiError.from(e)
      done.value = false
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, data, error, done, run }
}
