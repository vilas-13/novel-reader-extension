import { useEffect, useState } from 'react'
import './App.css'

interface PageInfo {
  pageType: 'chapter' | 'book' | 'other' | 'loading' | 'error'
  title?: string
  bookTitle?: string
  author?: string
}

function App() {
  const [info, setInfo] = useState<PageInfo>({ pageType: 'loading' })
  const [status, setStatus] = useState('')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id || !tab.url?.includes('novelbin.com')) {
        setInfo({ pageType: 'other' })
        return
      }
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          setInfo({ pageType: 'error' })
          return
        }
        setInfo(response as PageInfo)
      })
    })
  }, [])

  const openReader = () => {
    setStatus('')
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: 'OPEN_READER' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          setStatus('Could not connect. Reload the page.')
          return
        }
        if (response.status === 'ok') {
          window.close()
        } else {
          setStatus('Go to a chapter page first.')
        }
      })
    })
  }

  return (
    <div className="popup">
      <div className="popup-header">
        <span className="popup-logo">📖</span>
        <div>
          <h1>Novel Book Reader</h1>
          <p className="popup-tagline">NovelBin reader</p>
        </div>
      </div>

      <div className="popup-body">
        {info.pageType === 'loading' && (
          <p className="popup-muted">Connecting…</p>
        )}

        {info.pageType === 'other' && (
          <div className="popup-notice">
            <span className="popup-notice-icon">🌐</span>
            <p>Navigate to <strong>novelbin.com</strong> to start reading.</p>
          </div>
        )}

        {info.pageType === 'error' && (
          <div className="popup-notice popup-notice--warn">
            <span className="popup-notice-icon">⚠️</span>
            <p>Reload the NovelBin page and try again.</p>
          </div>
        )}

        {info.pageType === 'chapter' && (
          <>
            <div className="popup-meta">
              <p className="popup-meta-book">📚 {info.bookTitle}</p>
              <p className="popup-meta-chapter">{info.title}</p>
            </div>
            <button className="popup-btn" onClick={openReader}>
              Open Reader
            </button>
            {status && <p className="popup-status-warn">{status}</p>}
          </>
        )}

        {info.pageType === 'book' && (
          <div className="popup-meta">
            <p className="popup-meta-book">📚 {info.title}</p>
            {info.author && <p className="popup-meta-author">by {info.author}</p>}
            <p className="popup-hint">Open a chapter page to use the reader.</p>
          </div>
        )}
      </div>

      <div className="popup-footer">Novel Book Reader · v1.0</div>
    </div>
  )
}

export default App
