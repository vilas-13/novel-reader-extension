chrome.runtime.onInstalled.addListener(() => {
  console.log('[Novel Reader] Extension installed.')
})

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    console.log('[Background] Message received:', message)
    sendResponse({ status: 'ok' })
    return true
  }
)
