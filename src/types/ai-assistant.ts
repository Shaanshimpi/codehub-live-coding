// AI Assistant Types for Live Coding Platform

export type AIRequestType =
  | 'explain-code'
  | 'debug-error'
  | 'improve-code'
  | 'generate-tests'
  | 'answer-question'

export interface AIUser {
  id: string
  name: string
  role: 'trainer' | 'student'
}

export interface AISession {
  lectureId: string
  workspaceId?: string
  fileId?: string
  isLive: boolean
  timestamp: Date
}

export interface AICodeContext {
  languageSlug: string
  code: string
  selection?: {
    start: number
    end: number
    text: string
  }
  output?: string
  input?: string
}

export interface AIAssistantRequest {
  type: AIRequestType
  user: AIUser
  session: AISession
  codeContext: AICodeContext
  message?: string
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface AIAssistantResponse {
  message: AIMessage
  suggestions?: string[]
  code?: string
  tokensUsed?: number
}





