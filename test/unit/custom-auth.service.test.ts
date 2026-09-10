import { describe, expect, it } from 'vitest'
import {
  generateSessionToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../src/v1/custom/auth.service'

describe('auth.service', () => {
  it('hash + verify de senha (roundtrip)', () => {
    const h = hashPassword('S3nh@Fort3!')
    expect(h).toMatch(/^pbkdf2\$\d+\$/)
    expect(verifyPassword('S3nh@Fort3!', h)).toBe(true)
    expect(verifyPassword('errada', h)).toBe(false)
  })

  it('verifyPassword rejeita hash malformado sem throw', () => {
    expect(verifyPassword('x', 'lixo')).toBe(false)
    expect(verifyPassword('x', '')).toBe(false)
    expect(verifyPassword('x', 'md5$abc$def')).toBe(false)
  })

  it('token gerado tem 64 hex e é diferente a cada chamada', () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('hashToken é sha256 hex determinístico', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken('abc')).not.toBe(hashToken('abd'))
  })

  it('hashPassword usa salt por senha (mesma senha → hashes diferentes)', () => {
    expect(hashPassword('x')).not.toBe(hashPassword('x'))
  })
})
