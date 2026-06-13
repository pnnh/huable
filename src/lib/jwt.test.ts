import { describe, it, expect } from 'vitest'
import { parseJwtPayload, type JwtPayload } from './jwt'

describe('jwt', () => {
  // Helper to build a minimal unsigned jwt (for decode test only)
  function makeJwt(payload: object): string {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const body = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    return `${header}.${body}.`
  }

  it('parses valid JWT payload correctly', () => {
    const payload = {
      sub: 'user-123',
      email: 'dev@example.com',
      name: 'Dev User',
      iat: 1710000000,
      groups: ['admin'],
    }
    const jwt = makeJwt(payload)
    const result = parseJwtPayload(jwt)
    expect(result).not.toBeNull()
    expect(result?.sub).toBe('user-123')
    expect(result?.email).toBe('dev@example.com')
    expect(result?.name).toBe('Dev User')
    expect(result?.iat).toBe(1710000000)
    expect(result?.groups).toEqual(['admin'])
  })

  it('returns null for malformed JWT (not 3 parts)', () => {
    expect(parseJwtPayload('abc.def')).toBeNull()
    expect(parseJwtPayload('onlyonepart')).toBeNull()
    expect(parseJwtPayload('a.b.c.d')).toBeNull()
    expect(parseJwtPayload('')).toBeNull()
  })

  it('returns null for invalid base64 or non-JSON payload', () => {
    // bad base64 in middle
    expect(parseJwtPayload('eyJhbGciOiJub25lIn0.!!!.sig')).toBeNull()
    // valid base64 but not json
    const bad = 'eyJhbGciOiJub25lIn0.dGVzdA==.sig' // payload = "test" not obj
    expect(parseJwtPayload(bad)).toBeNull()
  })

  it('handles base64url variants ( - _ padding)', () => {
    // payload with chars that need padding fix: {"sub":"a+b/c="}
    const payload = { sub: 'a+b/c=' }
    const jwt = makeJwt(payload)
    const result = parseJwtPayload(jwt)
    expect(result?.sub).toBe('a+b/c=')
  })

  it('returns extra unknown fields via index signature', () => {
    const jwt = makeJwt({ sub: 'x', country: 'CN', custom: 42 })
    const result = parseJwtPayload(jwt) as JwtPayload
    expect(result.sub).toBe('x')
    expect(result.country).toBe('CN')
    expect((result as any).custom).toBe(42)
  })
})
