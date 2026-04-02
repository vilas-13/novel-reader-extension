// Shared types for Novel Book Reader

export interface ChapterData {
  type: 'chapter'
  bookTitle: string
  title: string
  content: string
  prevUrl: string
  nextUrl: string
}

export interface BookData {
  type: 'book'
  title: string
  author: string
  cover: string
  description: string
  genres: string[]
  firstChapterUrl: string
}

export type PageData = ChapterData | BookData

export type MessageType = 'OPEN_READER' | 'GET_PAGE_INFO'

export interface PageInfoResponse {
  pageType: 'chapter' | 'book' | 'other'
  title?: string
  bookTitle?: string
  author?: string
}

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  fontFamily: 'serif' | 'sans-serif'
  theme: 'dark' | 'light' | 'sepia'
}
