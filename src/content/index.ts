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

function scrapeChapterFromDoc(doc: Document, url: string): ChapterData {
  const qd = <T extends Element>(sel: string) => doc.querySelector<T>(sel)

  const title =
    qd('.chr-text h2')?.textContent?.trim() ||
    qd('#chr-head h2')?.textContent?.trim() ||
    qd('.chr-c h2')?.textContent?.trim() ||
    Array.from(doc.querySelectorAll('h2'))
      .find(h => !/next|prev/i.test(h.textContent ?? ''))
      ?.textContent?.trim() ||
    'Chapter'

  const bookTitle =
    qd('.breadcrumb li:nth-child(2) a')?.textContent?.trim() ||
    qd('.chr-text .bread a')?.textContent?.trim() ||
    qd<HTMLAnchorElement>('a[href*="/b/"]')?.textContent?.trim() ||
    doc.title.split(' – ')[0].split(' - ')[0].trim()

  const contentEl = qd('#chr-content') || qd('.chr-c') || qd('.reading-content')
  const content = contentEl?.innerHTML ?? '<p>Could not extract chapter content.</p>'

  // Resolve relative hrefs against the chapter's own URL
  const base = new URL(url)
  const navLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('.chr-nav a, .nav-buttons a'))
  const resolve = (a: HTMLAnchorElement) => a.getAttribute('href')
    ? new URL(a.getAttribute('href')!, base).href
    : ''
  const prevUrl = resolve(navLinks.find(a => /prev/i.test(a.textContent ?? '')) ?? document.createElement('a'))
  const nextUrl = resolve(navLinks.find(a => /next/i.test(a.textContent ?? '')) ?? document.createElement('a'))

  return { type: 'chapter', title, bookTitle, content, prevUrl, nextUrl }
}

function scrapeChapter(): ChapterData {
  return scrapeChapterFromDoc(document, window.location.href)
}

async function fetchChapter(url: string): Promise<ChapterData> {
  const res = await fetch(url, { credentials: 'omit' })
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return scrapeChapterFromDoc(doc, url)
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

  const coverImg =
    qs<HTMLImageElement>('.book img') ||
    qs<HTMLImageElement>('.col-info-desc img') ||
    qs<HTMLImageElement>('.info-cover img')
  const cover =
    coverImg?.getAttribute('data-src') ||
    coverImg?.getAttribute('data-lazy-src') ||
    coverImg?.getAttribute('data-original') ||
    (coverImg?.src && !coverImg.src.includes('placeholder') && !coverImg.src.includes('data:') ? coverImg.src : '') ||
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

// Persisted settings across chapter navigations
const settings = { fontSize: 18, lineHeight: 185, sansSerif: false, theme: 'dark' }

function openReader(data: ChapterData): void {
  if (overlay) overlay.remove()

  overlay = document.createElement('div')
  overlay.id = 'nr-overlay'
  overlay.setAttribute('data-theme', settings.theme)
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
        <input id="nr-font-size" type="range" min="14" max="28" value="${settings.fontSize}" />
        <span id="nr-font-size-val">${settings.fontSize}px</span>
      </label>
      <label>Spacing
        <input id="nr-line-height" type="range" min="140" max="230" value="${settings.lineHeight}" />
        <span id="nr-line-height-val">${(settings.lineHeight / 100).toFixed(2)}</span>
      </label>
      <label>Theme
        <select id="nr-theme">
          <option value="dark"     ${settings.theme === 'dark'     ? 'selected' : ''}>Dark</option>
          <option value="amoled"   ${settings.theme === 'amoled'   ? 'selected' : ''}>AMOLED</option>
          <option value="midnight" ${settings.theme === 'midnight' ? 'selected' : ''}>Midnight</option>
          <option value="forest"   ${settings.theme === 'forest'   ? 'selected' : ''}>Forest</option>
          <option value="ocean"    ${settings.theme === 'ocean'    ? 'selected' : ''}>Ocean</option>
          <option value="rose"     ${settings.theme === 'rose'     ? 'selected' : ''}>Rose</option>
          <option value="dusk"     ${settings.theme === 'dusk'     ? 'selected' : ''}>Dusk</option>
          <option value="sepia"    ${settings.theme === 'sepia'    ? 'selected' : ''}>Sepia</option>
          <option value="light"    ${settings.theme === 'light'    ? 'selected' : ''}>Light</option>
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
      <button id="nr-prev" ${!data.prevUrl ? 'disabled' : ''} data-url="${data.prevUrl}">← Prev</button>
      <span id="nr-progress">0%</span>
      <button id="nr-next" ${!data.nextUrl ? 'disabled' : ''} data-url="${data.nextUrl}">Next →</button>
    </div>
  `

  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  // Enter browser fullscreen automatically
  document.documentElement.requestFullscreen().catch(() => { /* ignore if denied */ })

  wireOverlay()
  applySettings()
}

function updateChapterContent(data: ChapterData): void {
  if (!overlay) return
  const body = overlay.querySelector('#nr-body') as HTMLElement

  ;(overlay.querySelector('#nr-chapter-title') as HTMLElement).textContent = data.title
  ;(overlay.querySelector('#nr-book-title') as HTMLElement).textContent = data.bookTitle
  ;(overlay.querySelector('#nr-content') as HTMLElement).innerHTML = sanitize(data.content)

  const prevBtn = overlay.querySelector('#nr-prev') as HTMLButtonElement
  const nextBtn = overlay.querySelector('#nr-next') as HTMLButtonElement
  prevBtn.disabled = !data.prevUrl
  prevBtn.dataset.url = data.prevUrl
  prevBtn.textContent = '← Prev'
  nextBtn.disabled = !data.nextUrl
  nextBtn.dataset.url = data.nextUrl
  nextBtn.textContent = 'Next →'

  // Reset scroll + progress
  body.scrollTop = 0
  ;(overlay.querySelector('#nr-progress') as HTMLElement).textContent = '0%'
}

function applySettings(): void {
  if (!overlay) return
  const contentEl = overlay.querySelector('#nr-content') as HTMLElement
  contentEl.style.fontSize = settings.fontSize + 'px'
  contentEl.style.lineHeight = (settings.lineHeight / 100).toFixed(2)
  contentEl.style.fontFamily = settings.sansSerif
    ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    : "Georgia, 'Times New Roman', serif"
}

function wireOverlay(): void {
  if (!overlay) return

  overlay.querySelector('#nr-close-btn')!.addEventListener('click', closeReader)
  document.addEventListener('keydown', onEscape)

  const panel = overlay.querySelector('#nr-settings-panel') as HTMLElement
  overlay.querySelector('#nr-settings-btn')!.addEventListener('click', () => {
    panel.hidden = !panel.hidden
  })

  overlay.querySelector('#nr-font-toggle')!.addEventListener('click', () => {
    settings.sansSerif = !settings.sansSerif
    applySettings()
  })

  const fontInput = overlay.querySelector('#nr-font-size') as HTMLInputElement
  const fontVal   = overlay.querySelector('#nr-font-size-val') as HTMLElement
  fontInput.addEventListener('input', () => {
    settings.fontSize = Number(fontInput.value)
    fontVal.textContent = fontInput.value + 'px'
    applySettings()
  })

  const lhInput = overlay.querySelector('#nr-line-height') as HTMLInputElement
  const lhVal   = overlay.querySelector('#nr-line-height-val') as HTMLElement
  lhInput.addEventListener('input', () => {
    settings.lineHeight = Number(lhInput.value)
    lhVal.textContent = (settings.lineHeight / 100).toFixed(2)
    applySettings()
  })

  const themeSelect = overlay.querySelector('#nr-theme') as HTMLSelectElement
  themeSelect.addEventListener('change', () => {
    settings.theme = themeSelect.value
    overlay!.setAttribute('data-theme', settings.theme)
  })

  // Scroll progress
  const body   = overlay.querySelector('#nr-body') as HTMLElement
  const progEl = overlay.querySelector('#nr-progress') as HTMLElement
  body.addEventListener('scroll', () => {
    const max = body.scrollHeight - body.clientHeight
    progEl.textContent = max > 0 ? Math.round((body.scrollTop / max) * 100) + '%' : '100%'
  })

  // In-place chapter navigation — no page reload
  async function navigate(btn: HTMLButtonElement): Promise<void> {
    const url = btn.dataset.url
    if (!url) return
    btn.disabled = true
    btn.textContent = btn.id === 'nr-next' ? 'Loading…' : '…'
    try {
      const data = await fetchChapter(url)
      updateChapterContent(data)
      const trigger = document.getElementById('nr-trigger') as HTMLButtonElement | null
      if (trigger) trigger.onclick = () => openReader(data)
    } catch {
      // Restore button on error so user can retry
      btn.disabled = false
      btn.textContent = btn.id === 'nr-next' ? 'Next →' : '← Prev'
    }
  }

  overlay.querySelector('#nr-prev')!.addEventListener('click', (e) => {
    navigate(e.currentTarget as HTMLButtonElement)
  })
  overlay.querySelector('#nr-next')!.addEventListener('click', (e) => {
    navigate(e.currentTarget as HTMLButtonElement)
  })
}

function closeReader(): void {
  overlay?.remove()
  overlay = null
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onEscape)
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
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

  const PREVIEW_LEN = 480
  const isLong = data.description.length > PREVIEW_LEN
  const descPreview = isLong ? data.description.slice(0, PREVIEW_LEN) + '…' : data.description

  banner.innerHTML = `
    <div id="nr-banner-inner">
      <button class="nr-banner-close" id="nr-banner-close">✕</button>
      ${data.cover ? `<img src="${data.cover}" alt="cover" id="nr-banner-cover" />` : ''}
      <div id="nr-banner-info">
        <h2>${escHtml(data.title)}</h2>
        ${data.author ? `<p class="nr-author">by ${escHtml(data.author)}</p>` : ''}
        ${genreHtml ? `<div class="nr-genres">${genreHtml}</div>` : ''}
        <p class="nr-desc" id="nr-desc-text">${escHtml(descPreview)}</p>
        ${isLong ? `<button class="nr-desc-toggle" id="nr-desc-toggle">Show more ▾</button>` : ''}
        <a class="nr-read-btn" href="${data.firstChapterUrl}">Start Reading →</a>
      </div>
    </div>
  `

  banner.querySelector('#nr-banner-close')!.addEventListener('click', () => banner.remove())

  // Show more / Show less toggle
  const toggleBtn = banner.querySelector('#nr-desc-toggle') as HTMLButtonElement | null
  const descEl = banner.querySelector('#nr-desc-text') as HTMLElement | null
  if (toggleBtn && descEl) {
    let expanded = false
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded
      descEl.textContent = expanded ? data.description : descPreview
      descEl.classList.toggle('nr-desc-expanded', expanded)
      toggleBtn.textContent = expanded ? 'Show less ▴' : 'Show more ▾'
    })
  }
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

