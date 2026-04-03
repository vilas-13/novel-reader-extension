chrome.runtime.onInstalled.addListener(() => {
  console.log('[Novel Reader] Extension installed.')
})

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message.type === 'FETCH_CHAPTER') {
      fetch(message.url, {
        credentials: 'omit',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        }
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          return res.text()
        })
        .then(html => {
          sendResponse({ status: 'ok', html })
        })
        .catch(err => {
          sendResponse({ status: 'error', error: err.message })
        })
      return true
    }

    console.log('[Background] Message received:', message)
    sendResponse({ status: 'ok' })
    return true
  }
)
