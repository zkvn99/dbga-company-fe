import { describe, expect, it } from 'vitest'
import { fileNameOf } from './client'

describe('fileNameOf', () => {
  it('RFC 5987 filename* (한글) 을 먼저, 없으면 filename, 둘 다 없으면 download', () => {
    expect(fileNameOf(`attachment; filename="=?UTF-8?Q?x?="; filename*=UTF-8''%EC%83%81%ED%92%88.pdf`)).toBe('상품.pdf')
    expect(fileNameOf('attachment; filename="a.pdf"')).toBe('a.pdf')
    expect(fileNameOf(null)).toBe('download')
  })
})
