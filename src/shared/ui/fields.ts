/**
 * 폼 필드 정의와 값 변환. 화면은 필드 배열만 선언하고 FormFields · ApiForm 이 그린다.
 * 화이트박스 원칙: 프론트는 입력을 막지 않는다(필수 표시만) — 검증은 서버 응답(fieldErrors)으로 확인한다.
 */
export type FieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'date'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'csv' // 쉼표 구분 입력 → string[]
  | 'multicheck' // 옵션 여러 개 선택 → string[]
  | 'boolmap' // 옵션별 체크 → Record<string, boolean>
  | 'list' // 행 추가 · 삭제 → itemFields 객체 배열
  | 'readonly' // 표시만, 요청에 넣지 않음
  | 'file' // 고르면 upload 를 불러 받은 fileId 를 값으로

export interface Option {
  value: string
  label: string
}

export interface FieldDef {
  key: string
  label: string
  type?: FieldType
  options?: readonly Option[]
  required?: boolean
  placeholder?: string
  help?: string
  itemFields?: readonly FieldDef[]
  /** type 'file' — src/api 의 올리기 함수(명시적 호출). 값 = 응답 fileId. */
  upload?: (file: File) => Promise<{ fileId: string; fileName?: string }>
}

export type FormValues = Record<string, unknown>

/** enum 코드 배열 → 옵션(값 = 표시). 이름이 필요하면 { value, label } 을 직접 쓴다. */
export function opts(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: value }))
}

function emptyValue(field: FieldDef): unknown {
  switch (field.type) {
    case 'checkbox':
      return false
    case 'number':
      return null
    case 'multicheck':
    case 'list':
      return []
    case 'boolmap':
      return {}
    default:
      return ''
  }
}

/** 필드 정의 + 서버 값(상세 응답 등)으로 폼 초기값을 만든다. */
export function initialValues(fields: readonly FieldDef[], source?: object | null): FormValues {
  const src = (source ?? {}) as Record<string, unknown>
  const values: FormValues = {}
  for (const field of fields) {
    const v = src[field.key]
    if (v === undefined || v === null) {
      values[field.key] = emptyValue(field)
    } else if (field.type === 'csv' && Array.isArray(v)) {
      values[field.key] = v.join(', ')
    } else if (field.type === 'list' && Array.isArray(v)) {
      values[field.key] = v.map((item) => initialValues(field.itemFields ?? [], item as object))
    } else if (field.type === 'boolmap' && typeof v === 'object') {
      values[field.key] = { ...(v as object) }
    } else {
      values[field.key] = v
    }
  }
  return values
}

/** 폼 값 → 요청 본문. 빈 문자열은 null, 숫자 · 쉼표 목록 · 행 목록을 변환, readonly 는 뺀다. */
export function toPayload(fields: readonly FieldDef[], values: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    const v = values[field.key]
    switch (field.type) {
      case 'readonly':
        break
      case 'number':
        out[field.key] = v === '' || v === null || v === undefined ? null : Number(v)
        break
      case 'csv':
        out[field.key] = String(v ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        break
      case 'list':
        out[field.key] = ((v as FormValues[] | undefined) ?? []).map((item) => toPayload(field.itemFields ?? [], item))
        break
      default:
        out[field.key] = v === '' ? null : v
    }
  }
  return out
}

export function newListItem(field: FieldDef): FormValues {
  return initialValues(field.itemFields ?? [])
}
