// Shared types for the Novel Reader Chrome Extension

export interface Message<T = unknown> {
  type: string
  payload?: T
}

export interface NovelChapter {
  title: string
  url: string
  content: string
}

export interface NovelMeta {
  title: string
  author: string
  coverUrl: string
  chapters: NovelChapter[]
}

export interface StorageSchema {
  bookmarks: string[]
  settings: ReaderSettings
}

export interface ReaderSettings {
  fontSize: number
  fontFamily: string
  theme: 'light' | 'dark' | 'sepia'
  lineHeight: number
}
