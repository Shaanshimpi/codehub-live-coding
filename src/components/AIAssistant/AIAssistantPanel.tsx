'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, X, Loader2 } from 'lucide-react'
import type {
  AIAssistantRequest,
  AIAssistantResponse,
  AIMessage,
} from '@/types/ai-assistant'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface AIAssistantPanelProps {
  role: 'trainer' | 'student'
  lectureId: string
  language: string
  code: string
  output?: string
  input?: string
  onClose: () => void
  onInsertCode?: (code: string) => void
}

export function AIAssistantPanel({
  role,
  lectureId,
  language,
  code,
  output,
  input,
  onClose,
  onInsertCode,
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: AIMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setInputMessage('')

    try {
      const request: AIAssistantRequest = {
        type: 'answer-question',
        user: {
          id: 'user-1',
          name: role === 'trainer' ? 'Trainer' : 'Student',
          role,
        },
        session: {
          lectureId,
          isLive: true,
          timestamp: new Date(),
        },
        codeContext: {
          languageSlug: language,
          code,
          output,
          input,
        },
        message: userMessage.content,
      }

      const response = await fetch('/api/ai/live-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const data: AIAssistantResponse = await response.json()
      setMessages((prev) => [...prev, data.message])
    } catch (error) {
      console.error('AI request error:', error)
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-primary/50 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-primary/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-primary">AI Assistant</h3>
          <span className="text-[10px] text-muted-foreground">({role})</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-accent transition-colors"
          title="Close AI Assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-center text-center text-sm text-muted-foreground min-h-full">
            <div>
              <Sparkles className="mx-auto mb-2 h-8 w-8 opacity-50" />
              {role === 'student' ? (
                <>
                  <p className="font-medium">Hi! I&apos;m your coding tutor 👋</p>
                  <p className="text-xs mt-2">
                    Ask me anything about your code - errors, concepts, or how things work!
                  </p>
                  <p className="text-xs mt-1">
                    I&apos;ll explain things clearly and help you learn.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">AI Teaching Assistant</p>
                  <p className="text-xs mt-1">
                    Help with explanations, teaching strategies, and content
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted border'
              }`}
            >
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match

                    const { ref, ...rest } = props as any

                    return !isInline ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        className="text-xs"
                        {...rest}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="rounded bg-muted px-1 py-0.5 text-xs" {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-sm">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t bg-muted/10 p-2">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              role === 'student'
                ? "Ask about your code, errors, or concepts..."
                : "Ask about teaching strategies, explanations..."
            }
            className="flex-1 resize-none rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="flex items-center justify-center rounded-md bg-primary px-3 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
