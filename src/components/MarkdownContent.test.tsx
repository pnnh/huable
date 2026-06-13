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

    // code with class kept
    const code = container.querySelector('code')
    expect(code).toHaveClass('lang-ts')
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
