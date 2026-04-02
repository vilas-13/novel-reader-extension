console.log('[Novel Reader] Content script loaded.')

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Content] Message received:', message)
  sendResponse({ status: 'ok' })
  return true
})
