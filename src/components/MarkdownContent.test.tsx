import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MarkdownContent from './MarkdownContent'

describe('MarkdownContent', () => {
  it('renders basic markdown to html (headings, paragraph, emphasis)', () => {
    const { container } = render(
      <MarkdownContent content={'# Title\n\nHello **world** and *italic*.'} />
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument()
    expect(container.innerHTML).toContain('<strong>world</strong>')
    expect(container.innerHTML).toContain('<em>italic</em>')
    expect(screen.getByText(/Hello/)).toBeInTheDocument()
  })

  it('applies className prop to wrapper', () => {
    const { container } = render(
      <MarkdownContent content="para" className="my-custom prose-lg" />
    )
    const div = container.querySelector('div')
    expect(div).toHaveClass('prose', 'max-w-none', 'my-custom', 'prose-lg')
  })

  it('sanitizes dangerous content and only allows configured tags/attrs', () => {
    const malicious = `
<script>alert(1)</script>
<a href="javascript:alert(2)" title="ok">bad link</a>
<img src="https://example.com/x.png" alt="good" title="img" />
<p onclick="evil()">no events</p>
<code class="lang-ts">const x=1</code>
<span class="evil-tracker" onclick="evil()">hi</span>
`
    const { container } = render(<MarkdownContent content={malicious} />)

    // script removed
    expect(container.innerHTML).not.toContain('script')
    expect(container.innerHTML).not.toContain('alert(1)')

    // js: scheme link sanitized (href removed or neutralized by sanitize-html)
    const badLink = container.querySelector('a[title="ok"]')
    if (badLink) {
      const href = badLink.getAttribute('href')
      expect(href == null || href === '' || !href.startsWith('javascript:')).toBe(true)
    }

    // good img kept with allowed attrs
    const goodImg = container.querySelector('img')
    expect(goodImg).toBeTruthy()
    expect(goodImg?.getAttribute('src')).toBe('https://example.com/x.png')
    expect(goodImg?.getAttribute('alt')).toBe('good')

    // p has no onclick
    const p = container.querySelector('p')
    expect(p?.hasAttribute('onclick')).toBe(false)

    // arbitrary classes outside the hljs/language-* allowlist are stripped
    const code = container.querySelector('code')
    expect(code).not.toHaveClass('lang-ts')

    // span is allowed for highlight tokens, but arbitrary classes/handlers are not
    const span = container.querySelector('span')
    expect(span?.hasAttribute('onclick')).toBe(false)
    expect(span).not.toHaveClass('evil-tracker')
  })

  it('applies syntax highlighting classes to fenced code blocks', () => {
    const md = '```ts\nconst x: number = 1;\n```'
    const { container } = render(<MarkdownContent content={md} />)

    const code = container.querySelector('code')
    expect(code).toHaveClass('hljs')
    expect(code).toHaveClass('language-ts')
    // highlight.js wraps tokens in spans with hljs-* classes
    expect(container.querySelector('span[class*="hljs-"]')).toBeTruthy()
  })

  it('supports lists, links with http/https, and relative links', () => {
    const md = `
- item1
- item2

1. first
2. second

[relative](/files/1/a.txt)
[external](https://example.com)
`
    const { container } = render(<MarkdownContent content={md} />)

    expect(container.querySelectorAll('ul li').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(2)

    const rel = container.querySelector('a[href="/files/1/a.txt"]')
    expect(rel).toBeTruthy()

    const ext = container.querySelector('a[href="https://example.com"]')
    expect(ext).toBeTruthy()
  })
})
