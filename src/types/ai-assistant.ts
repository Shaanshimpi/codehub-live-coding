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

// Phase 3: Response style / mode for controlling verbosity & format
export type ResponseStyle = 'strict' | 'visual' | 'hint-only' | 'full-explain'

export interface AIAssistantRequest {
  type: AIRequestType
  user: AIUser
  session: AISession
  codeContext: AICodeContext
  message?: string
  // Optional response mode hint for the AI (Phase 3)
  responseMode?: ResponseStyle
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

// Phase 2: Structured response fields (backward compatible)
export type ResponseMode = 'syntax-error' | 'logical-error' | 'runtime-error' | 'explanation' | 'hint'

export interface StructuredErrorInfo {
  line: number
  column: number
  message: string
  codeFrame?: string
}

export interface StructuredDiff {
  line: number
  before: string
  after: string
}

export interface AIAssistantResponse {
  // Existing fields (backward compatible)
  message: AIMessage
  suggestions?: string[]
  code?: string
  tokensUsed?: number
  
  // Phase 2: New structured fields (optional for backward compatibility)
  mode?: ResponseMode
  summary?: string
  error?: StructuredErrorInfo
  hint?: string
  dryRun?: Array<Record<string, any>>
  diff?: StructuredDiff[]
  codeFrame?: string
}







