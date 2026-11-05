/** 표 열 정의. key 는 응답 필드 이름, value 로 계산 값(중첩 필드 등)을 줄 수 있다. */
export interface Column<T> {
  key: string
  label: string
  value?: (row: T) => unknown
}

/** ['name:업체명', 'bizRegNo:사업자등록번호'] → Column[] (단순 열을 짧게 선언). */
export function cols<T>(specs: readonly string[]): Column<T>[] {
  return specs.map((spec) => {
    const [key, label] = spec.split(':')
    return { key, label: label ?? key }
  })
}
