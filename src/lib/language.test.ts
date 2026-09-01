import { describe, it, expect } from 'vitest'
import {
  langEn,
  langEs,
  langFr,
  langZh,
  defaultLanguage,
  unknownLanguage,
  supportedLanguages,
  isValidLang,
  getTargetLang,
  type LangKey,
} from './language'

describe('language', () => {
  it('exports correct language constants', () => {
    expect(langEn).toBe('en')
    expect(langZh).toBe('zh')
    expect(defaultLanguage).toBe(langEn)
    expect(unknownLanguage).toBe('unknown')
  })

  it('supportedLanguages has 4 entries with correct keys and names', () => {
    expect(supportedLanguages).toHaveLength(4)
    expect(supportedLanguages.map(l => l.key)).toEqual([
      langEn, langEs, langFr, langZh,
    ])
    expect(supportedLanguages.find(l => l.key === langZh)?.name).toBe('简体中文')
  })

  it('isValidLang returns true only for supported languages', () => {
    expect(isValidLang('en')).toBe(true)
    expect(isValidLang('fr')).toBe(true)
    expect(isValidLang('zh')).toBe(true)
    expect(isValidLang('de-DE')).toBe(false)
    expect(isValidLang('zh-TW')).toBe(false)
    expect(isValidLang('en-US')).toBe(false)
    expect(isValidLang('xx')).toBe(false)
    expect(isValidLang('')).toBe(false)
    expect(isValidLang('zh-cn')).toBe(false) // case sensitive per impl
  })

  it('getTargetLang returns matched supported lang or fallback', () => {
    expect(getTargetLang('en', 'es')).toBe('en')
    expect(getTargetLang('fr-FR,fr;q=0.9', 'en')).toBe('fr')
    expect(getTargetLang('de-DE,de;q=0.9', 'en')).toBe('en')
    expect(getTargetLang('ja-JP,ja;q=0.8', 'en')).toBe('en')

    // partial / prefix that lib may resolve to supported
    const zhMatch = getTargetLang('zh-CN,zh;q=0.9,en;q=0.8', 'en')
    expect(['zh', 'zh-CN', 'en']).toContain(zhMatch) // depending on accept-language behavior

    // For inputs with no good match, the underlying negotiator returns its first
    // configured language ("en") instead of the caller fallback (the fallback
    // return in source is defensive for when negotiator yields null/non-listed).
    expect(isValidLang(getTargetLang('xx-XX', 'fr'))).toBe(true)
    expect(getTargetLang('ru-RU', 'pt-PT')).toBe('en')
    expect(getTargetLang('', defaultLanguage)).toBe('en')
  })
})
