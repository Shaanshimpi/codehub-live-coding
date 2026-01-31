'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { Play, Square, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { LiveCodePlaygroundProps, SUPPORTED_LANGUAGES } from './types'

export function LiveCodePlayground({
  language,
  code,
  onChange,
  onRun,
  readOnly = false,
  showAIHelper = false,
  onAIRequest,
  executing = false,
  executionResult = null,
  onStopExecution,
  height = '100%',
  theme = 'vs-dark',
}: LiveCodePlaygroundProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const [showInput, setShowInput] = useState(false)
  const [input, setInput] = useState('')
  const monaco = useMonaco()

  // Update editor content when code prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== code) {
      editorRef.current.setValue(code)
    }
  }, [code])

  const currentLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.id === language)
  const monacoLanguage = currentLanguage?.monacoLanguage || 'javascript'

  const handleRun = useCallback(() => {
    // Get current code from editor to avoid stale state
    const currentCode = editorRef.current?.getValue() || code
    onRun(currentCode, showInput ? input : undefined)
  }, [code, input, showInput, onRun])

  const handleEditorDidMount = useCallback((editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    // Add keyboard shortcut: Ctrl+Enter or Cmd+Enter to run code
    if (monaco) {
      editor.addCommand(
        // eslint-disable-next-line no-bitwise
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          if (!readOnly && !executing) {
            handleRun()
          }
        },
      )

      // Disable copy/select when readOnly
      if (readOnly) {
        // Disable all copy shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {})
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {})
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {}) // Cut
      }
    }
    
    // Disable copy/select when readOnly
    if (readOnly) {
      // Disable context menu (right-click copy)
      const contextMenuHandler = () => {
        // Prevent default context menu
      }
      editor.onContextMenu(contextMenuHandler)

      // Disable text selection
      editor.updateOptions({
        readOnly: true,
        selectOnLineNumbers: false,
        selectionHighlight: false,
      })
    }
  }, [readOnly, executing, handleRun, monaco])

  const handleStop = useCallback(() => {
    if (onStopExecution) {
      onStopExecution()
    }
  }, [onStopExecution])

  const handleAIClick = useCallback(() => {
    if (onAIRequest) {
      onAIRequest()
    }
  }, [onAIRequest])

  // Sync theme with app theme
  useEffect(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    // Theme is already set via prop, but we could react to changes here
  }, [])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Controls Bar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Language Label */}
          <span className="text-xs font-medium text-muted-foreground">
            {currentLanguage?.name || 'Unknown'}
          </span>

          {readOnly && (
            <span className="rounded-md bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning">
              READ ONLY
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Input Toggle */}
          <button
            type="button"
            onClick={() => setShowInput((prev) => !prev)}
            className="rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors"
            title="Toggle input panel"
          >
            {showInput ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span className="ml-1">Input</span>
          </button>

          {/* AI Helper Button */}
          {showAIHelper && onAIRequest && (
            <button
              type="button"
              onClick={handleAIClick}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors"
              title="Open AI Assistant"
            >
              <Sparkles className="h-3 w-3" />
              <span>AI</span>
            </button>
          )}

          {/* Run / Stop Button */}
          {!readOnly && (
            <button
              type="button"
              onClick={executing ? handleStop : handleRun}
              disabled={executing && !onStopExecution}
              className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                executing
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-success text-background hover:bg-success/90'
              }`}
              title={executing ? 'Stop execution' : 'Run code (Ctrl+Enter)'}
            >
              {executing ? (
                <>
                  <Square className="h-3 w-3" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  <span>Run</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Input Panel (collapsible) */}
      {showInput && (
        <div className="border-b bg-muted/10 p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter program input (stdin)..."
            className="w-full resize-none rounded-md border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            rows={3}
            disabled={readOnly}
          />
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height={height}
          language={monacoLanguage}
          defaultValue={code}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          theme={theme}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            folding: true,
            quickSuggestions: !readOnly,
            suggestOnTriggerCharacters: !readOnly,
            // Disable selection and copy when readOnly
            selectOnLineNumbers: !readOnly,
            selectionHighlight: !readOnly,
            contextmenu: !readOnly, // Disable context menu when readOnly
            copyWithSyntaxHighlighting: false, // Disable syntax highlighting in copy
          }}
        />
      </div>

    </div>
  )
}

