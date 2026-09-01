import { describe, it, expect } from 'vitest'
import { t } from './i18n'
import type { LangKey } from './language'

describe('i18n', () => {
  it('returns translated string for supported lang and existing key', () => {
    expect(t('en', 'launchTool')).toBe('Launch Tool')
    expect(t('zh', 'learnMore')).toBe('了解更多')
    expect(t('fr', 'launchTool')).toBe('Lancer l\'outil')
    expect(t('en', 'siteName')).toBe('Huable')
  })

  it('falls back to English for unknown lang', () => {
    expect(t('xx' as LangKey, 'home')).toBe(t('en', 'home'))
    expect(t('ru' as LangKey, 'signIn')).toBe('Sign in')
  })

  it('returns the key itself when key missing in locale and English', () => {
    const missing = 'thisKeyDoesNotExist123' as any
    expect(t('en', missing)).toBe(missing)
    expect(t('zh', missing)).toBe(missing)
  })

  it('uses the requested lang translation when the key exists for that lang', () => {
    expect(t('fr', 'cookieAccept')).toBe('Compris')
    expect(t('zh', 'launchTool')).toBe('开始使用')
  })
})
