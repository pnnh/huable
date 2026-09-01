import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LangKey } from '@/lib/language'
import type { ToolData } from '@/data/tools'

// Hoisted mocks for next/* (must be before importing the components under test)
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...rest }: any) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, className, fill, ...rest }: any) => (
    // Render as regular img for test; ignore fill (jsdom has no layout)
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={src} alt={alt} className={className} {...rest} />
  ),
}))

// Now safe to import SUTs
import ToolGrid from './ToolGrid'
import ToolCard from './ToolCard'

// Minimal stable test data (avoid pulling the entire 700+ line tools list into every test)
const sampleTools: ToolData[] = [
  {
    id: 'basex',
    url: 'https://basex.huable.xyz',
    logo: '/images/basex/logo.png',
    name: { en: 'BaseX', es: 'BaseX', fr: 'BaseX', zh: 'BaseX' },
    description: {
      en: 'Browser-based Base encoding & decoding toolkit.',
      es: 'Kit de herramientas de codificación Base.',
      fr: 'Boîte à outils d\'encodage Base.',
      zh: '基于浏览器的 Base 编解码工具集。',
    },
    features: { en: [], es: [], fr: [], zh: [] },
    detail: { en: '', es: '', fr: '', zh: '' },
    tags: ['encoding', 'base64', 'base58'],
  },
  {
    id: 'hashx',
    url: 'https://hashx.huable.xyz',
    logo: '/images/hashx/logo.png',
    name: { en: 'HashX', es: 'HashX', fr: 'HashX', zh: 'HashX' },
    description: {
      en: 'Fast privacy-first hash toolkit in browser.',
      es: 'Kit de hash rápido.',
      fr: 'Boîte à outils de hachage.',
      zh: '高速隐私哈希工具集。',
    },
    features: { en: [], es: [], fr: [], zh: [] },
    detail: { en: '', es: '', fr: '', zh: '' },
    tags: ['hash', 'sha256', 'blake3'],
  },
]

const lang: LangKey = 'en'

describe('ToolGrid', () => {
  it('renders a grid of ToolCards for provided tools', () => {
    const { container } = render(<ToolGrid tools={sampleTools} lang={lang} />)

    // grid container
    const grid = container.querySelector('div.grid')
    expect(grid).toBeTruthy()
    expect(grid?.className).toContain('grid-cols-1')
    expect(grid?.className).toContain('sm:grid-cols-2')

    // cards rendered (by name)
    expect(screen.getByText('BaseX')).toBeInTheDocument()
    expect(screen.getByText('HashX')).toBeInTheDocument()

    // descriptions visible
    expect(screen.getByText(/Browser-based Base encoding/)).toBeInTheDocument()
    expect(screen.getByText(/Fast privacy-first hash/)).toBeInTheDocument()
  })

  it('renders first 3 tags per card', () => {
    render(<ToolGrid tools={[sampleTools[0]]} lang={lang} />)
    // tags from sample
    expect(screen.getByText('encoding')).toBeInTheDocument()
    expect(screen.getByText('base64')).toBeInTheDocument()
    expect(screen.getByText('base58')).toBeInTheDocument()
  })
})

describe('ToolCard', () => {
  it('renders name, localized description, and action labels via i18n', () => {
    render(<ToolCard tool={sampleTools[0]} lang={lang} />)

    expect(screen.getByRole('heading', { name: 'BaseX' })).toBeInTheDocument()
    expect(screen.getByText(/Browser-based Base encoding/)).toBeInTheDocument()

    // from i18n t(lang, 'learnMore') and t(lang, 'launchTool')
    expect(screen.getByText('Learn More →')).toBeInTheDocument()
    expect(screen.getByText('Launch Tool')).toBeInTheDocument()
  })

  it('produces correct detail hrefs for given lang', () => {
    const { container } = render(<ToolCard tool={sampleTools[1]} lang="zh" />)
    const links = container.querySelectorAll('a[href="/zh/tools/hashx/"]')
    expect(links.length).toBeGreaterThanOrEqual(1)
  })

  it('includes external launch anchor with correct url and attributes', () => {
    const { container } = render(<ToolCard tool={sampleTools[0]} lang={lang} />)
    const external = container.querySelector('a[href="https://basex.huable.xyz"][target="_blank"]')
    expect(external).toBeTruthy()
    expect(external?.getAttribute('rel')).toContain('noopener')
  })
})
