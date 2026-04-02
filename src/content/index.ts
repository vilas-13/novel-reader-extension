// ── Types ──────────────────────────────────────────────────────────────────

interface ChapterData {
  type: 'chapter'
  bookTitle: string
  title: string
  content: string
  prevUrl: string
  nextUrl: string
}

interface BookData {
  type: 'book'
  title: string
  author: string
  cover: string
  description: string
  genres: string[]
  firstChapterUrl: string
}

// ── Page detection ──────────────────────────────────────────────────────────

type PageType = 'book' | 'chapter' | 'other'

function detectPage(): PageType {
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'b') return 'other'
  if (parts.length >= 3) return 'chapter'
  if (parts.length === 2) return 'book'
  return 'other'
}

// ── Scrapers ────────────────────────────────────────────────────────────────

function qs<T extends Element>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel)
}

function scrapeChapter(): ChapterData {
  // Chapter title
  const title =
    qs('.chr-text h2')?.textContent?.trim() ||
    qs('#chr-head h2')?.textContent?.trim() ||
    qs('.chr-c h2')?.textContent?.trim() ||
    Array.from(document.querySelectorAll('h2'))
      .find(h => !/next|prev/i.test(h.textContent ?? ''))
      ?.textContent?.trim() ||
    'Chapter'

  // Book title from breadcrumb
  const bookTitle =
    qs('.breadcrumb li:nth-child(2) a')?.textContent?.trim() ||
    qs('.chr-text .bread a')?.textContent?.trim() ||
    qs('a[href*="/b/"]')?.textContent?.trim() ||
    document.title.split(' – ')[0].split(' - ')[0].trim()

  // Content
  const contentEl = qs('#chr-content') || qs('.chr-c') || qs('.reading-content')
  const content = contentEl?.innerHTML ?? '<p>Could not extract chapter content.</p>'

  // Prev / Next navigation
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.chr-nav a, .nav-buttons a'))
  const prevUrl = navLinks.find(a => /prev/i.test(a.textContent ?? ''))?.href ?? ''
  const nextUrl = navLinks.find(a => /next/i.test(a.textContent ?? ''))?.href ?? ''

  return { type: 'chapter', title, bookTitle, content, prevUrl, nextUrl }
}

function scrapeBook(): BookData {
  const title =
    qs<HTMLElement>('h3.title')?.textContent?.trim() ||
    qs<HTMLElement>('h1')?.textContent?.trim() ||
    document.title.split(' – ')[0].split(' - ')[0].trim()

  // Author — find the <li> that contains "Author" label
  let author = ''
  document.querySelectorAll('.info-meta li').forEach(li => {
    if (/author/i.test(li.querySelector('h3, label, span')?.textContent ?? '') ||
        /author/i.test((li as HTMLElement).innerText)) {
      const link = li.querySelector('a')
      if (link) author = link.textContent?.trim() ?? ''
    }
  })

  const cover =
    (qs<HTMLImageElement>('.book img'))?.src ||
    (qs<HTMLImageElement>('.col-info-desc img'))?.src ||
    (qs<HTMLImageElement>('.info-cover img'))?.src ||
    ''

  const description =
    qs('#tab-description .desc-text')?.textContent?.trim() ||
    qs('.desc-text')?.textContent?.trim() ||
    qs('#tab-description')?.textContent?.trim() ||
    ''

  const genres: string[] = Array.from(
    document.querySelectorAll('.info-meta a[href*="/genre/"]')
  ).map(a => a.textContent?.trim() ?? '').filter(Boolean)

  // First chapter link
  const firstChapterUrl =
    (qs<HTMLAnchorElement>('a[href*="chapter-1"]'))?.href ||
    window.location.href + '/chapter-1'

  return { type: 'book', title, author, cover, description, genres, firstChapterUrl }
}

// ── Utilities ───────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitize(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll(
    'script,style,ins,iframe,noscript,[class*="adsbygoogle"],[id*="adsbygoogle"],' +
    '[class*="ads-"],[id*="ads-"],#ads,#ad,.ad,.adv'
  ).forEach(el => el.remove())
  return div.innerHTML
}

// ── Reader overlay ──────────────────────────────────────────────────────────

let overlay: HTMLDivElement | null = null

function openReader(data: ChapterData): void {
  if (overlay) overlay.remove()

  overlay = document.createElement('div')
  overlay.id = 'nr-overlay'
  overlay.setAttribute('data-theme', 'dark')
  overlay.innerHTML = `
    <div id="nr-header">
      <span id="nr-book-title">${escHtml(data.bookTitle)}</span>
      <div id="nr-controls">
        <button id="nr-settings-btn" title="Settings">⚙</button>
        <button id="nr-font-toggle" title="Toggle font">Aa</button>
        <button id="nr-close-btn" title="Close (Esc)">✕</button>
      </div>
    </div>

    <div id="nr-settings-panel" hidden>
      <label>Size
        <input id="nr-font-size" type="range" min="14" max="28" value="18" />
        <span id="nr-font-size-val">18px</span>
      </label>
      <label>Spacing
        <input id="nr-line-height" type="range" min="140" max="230" value="185" />
        <span id="nr-line-height-val">1.85</span>
      </label>
      <label>Theme
        <select id="nr-theme">
          <option value="dark" selected>Dark</option>
          <option value="light">Light</option>
          <option value="sepia">Sepia</option>
        </select>
      </label>
    </div>

    <div id="nr-body">
      <div id="nr-chapter-meta">
        <h1 id="nr-chapter-title">${escHtml(data.title)}</h1>
      </div>
      <div id="nr-content">${sanitize(data.content)}</div>
    </div>

    <div id="nr-footer">
      <a id="nr-prev" href="${data.prevUrl || '#'}" ${!data.prevUrl ? 'class="nr-disabled"' : ''}>← Prev</a>
      <span id="nr-progress">0%</span>
      <a id="nr-next" href="${data.nextUrl || '#'}" ${!data.nextUrl ? 'class="nr-disabled"' : ''}>Next →</a>
    </div>
  `

  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  // Wire up controls
  overlay.querySelector('#nr-close-btn')!.addEventListener('click', closeReader)
  document.addEventListener('keydown', onEscape)

  const panel = overlay.querySelector('#nr-settings-panel') as HTMLElement
  overlay.querySelector('#nr-settings-btn')!.addEventListener('click', () => {
    panel.hidden = !panel.hidden
  })

  // Font family toggle (Serif ↔ Sans-serif)
  const contentEl = overlay.querySelector('#nr-content') as HTMLElement
  let sansSerif = false
  overlay.querySelector('#nr-font-toggle')!.addEventListener('click', () => {
    sansSerif = !sansSerif
    contentEl.style.fontFamily = sansSerif
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      : "Georgia, 'Times New Roman', serif"
  })

  // Font size
  const fontInput = overlay.querySelector('#nr-font-size') as HTMLInputElement
  const fontVal   = overlay.querySelector('#nr-font-size-val') as HTMLElement
  fontInput.addEventListener('input', () => {
    contentEl.style.fontSize = fontInput.value + 'px'
    fontVal.textContent = fontInput.value + 'px'
  })

  // Line height
  const lhInput = overlay.querySelector('#nr-line-height') as HTMLInputElement
  const lhVal   = overlay.querySelector('#nr-line-height-val') as HTMLElement
  lhInput.addEventListener('input', () => {
    const v = (parseInt(lhInput.value) / 100).toFixed(2)
    contentEl.style.lineHeight = v
    lhVal.textContent = v
  })

  // Theme
  const themeSelect = overlay.querySelector('#nr-theme') as HTMLSelectElement
  themeSelect.addEventListener('change', () => {
    overlay!.setAttribute('data-theme', themeSelect.value)
  })

  // Scroll progress
  const body  = overlay.querySelector('#nr-body') as HTMLElement
  const progEl = overlay.querySelector('#nr-progress') as HTMLElement
  body.addEventListener('scroll', () => {
    const max = body.scrollHeight - body.clientHeight
    progEl.textContent = max > 0 ? Math.round((body.scrollTop / max) * 100) + '%' : '100%'
  })
}

function closeReader(): void {
  overlay?.remove()
  overlay = null
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onEscape)
}

function onEscape(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeReader()
}

// ── Book info banner ─────────────────────────────────────────────────────────

function injectBookBanner(data: BookData): void {
  if (document.getElementById('nr-book-banner')) return

  const banner = document.createElement('div')
  banner.id = 'nr-book-banner'

  const genreHtml = data.genres
    .slice(0, 5)
    .map(g => `<span class="nr-genre-tag">${escHtml(g)}</span>`)
    .join('')

  const descPreview = data.description.length > 480
    ? data.description.slice(0, 480) + '…'
    : data.description

  banner.innerHTML = `
    <div id="nr-banner-inner">
      <button class="nr-banner-close" id="nr-banner-close">✕</button>
      ${data.cover ? `<img src="${data.cover}" alt="cover" id="nr-banner-cover" />` : ''}
      <div id="nr-banner-info">
        <h2>${escHtml(data.title)}</h2>
        ${data.author ? `<p class="nr-author">by ${escHtml(data.author)}</p>` : ''}
        ${genreHtml ? `<div class="nr-genres">${genreHtml}</div>` : ''}
        <p class="nr-desc">${escHtml(descPreview)}</p>
        <a class="nr-read-btn" href="${data.firstChapterUrl}">Start Reading →</a>
      </div>
    </div>
  `

  banner.querySelector('#nr-banner-close')!.addEventListener('click', () => banner.remove())
  // Click backdrop to dismiss
  banner.addEventListener('click', (e) => { if (e.target === banner) banner.remove() })

  document.body.appendChild(banner)
}

// ── Floating trigger button ──────────────────────────────────────────────────

function injectTriggerBtn(data: ChapterData): void {
  if (document.getElementById('nr-trigger')) return
  const btn = document.createElement('button')
  btn.id = 'nr-trigger'
  btn.textContent = '📖 Open Reader'
  btn.addEventListener('click', () => openReader(data))
  document.body.appendChild(btn)
}

// ── Message listener (from popup) ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_READER') {
    if (detectPage() === 'chapter') {
      openReader(scrapeChapter())
      sendResponse({ status: 'ok' })
    } else {
      sendResponse({ status: 'not-chapter' })
    }
    return true
  }

  if (message.type === 'GET_PAGE_INFO') {
    const pageType = detectPage()
    if (pageType === 'chapter') {
      const d = scrapeChapter()
      sendResponse({ pageType, title: d.title, bookTitle: d.bookTitle })
    } else if (pageType === 'book') {
      const d = scrapeBook()
      sendResponse({ pageType, title: d.title, author: d.author })
    } else {
      sendResponse({ pageType: 'other' })
    }
    return true
  }
})

// ── Init ─────────────────────────────────────────────────────────────────────

function init(): void {
  const pageType = detectPage()
  if (pageType === 'chapter') {
    injectTriggerBtn(scrapeChapter())
  } else if (pageType === 'book') {
    injectBookBanner(scrapeBook())
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

