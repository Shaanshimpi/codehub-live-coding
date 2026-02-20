"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { Play, Square, ChevronDown, ChevronUp, Sparkles, ZoomIn, ZoomOut } from 'lucide-react'
import { LiveCodePlaygroundProps, SUPPORTED_LANGUAGES } from './types'
import { useTheme } from '@/providers/Theme'
import { parseErrorLocation } from '@/utilities/aiAssistant'

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
  theme: themeProp,
  runDisabled = false,
  allowRunInReadOnly = false,
}: LiveCodePlaygroundProps) {
  const editorRef = useRef<any>(null)
  const executedCodeRef = useRef<string>('') // Track the code that was executed
  const [showInput, setShowInput] = useState(false)
  const [input, setInput] = useState('')
  const [fontSize, setFontSize] = useState<number>(14)
  const monaco = useMonaco()
  const { theme: appTheme } = useTheme()

  
  // Determine Monaco theme based on app theme or prop
  const monacoTheme = themeProp || (appTheme === 'dark' ? 'vs-dark' : 'vs')

  const currentLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.id === language)
  const monacoLanguage = currentLanguage?.monacoLanguage || 'javascript'

  const handleRun = useCallback(() => {
    if (runDisabled) return // Prevent running if disabled
    // Get current code from editor to avoid stale state
    const currentCode = editorRef.current?.getValue() || code
    // Store the code that's being executed
    executedCodeRef.current = currentCode
    onRun(currentCode, showInput ? input : undefined)
  }, [code, input, showInput, onRun, runDisabled])

  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor

      // Add keyboard shortcut: Ctrl+Enter or Cmd+Enter to run code
      if (monaco) {
        editor.addCommand(
          // eslint-disable-next-line no-bitwise
          (monaco as any).KeyMod.CtrlCmd | (monaco as any).KeyCode.Enter,
          () => {
            if ((!readOnly || allowRunInReadOnly) && !executing && !runDisabled) {
              handleRun()
            }
          },
        )

      // Disable copy/select when readOnly
      if (readOnly) {
        // Disable all copy shortcuts
        editor.addCommand((monaco as any).KeyMod.CtrlCmd | (monaco as any).KeyCode.KeyC, () => {})
        editor.addCommand((monaco as any).KeyMod.CtrlCmd | (monaco as any).KeyCode.KeyA, () => {})
        editor.addCommand((monaco as any).KeyMod.CtrlCmd | (monaco as any).KeyCode.KeyX, () => {}) // Cut
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
  }, [readOnly, executing, handleRun, monaco, allowRunInReadOnly, runDisabled])

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

  // Load persisted font size (shared across all editors)
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('codehub:editorFontSize') : null
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!Number.isNaN(parsed) && parsed >= 10 && parsed <= 32) {
          setFontSize(parsed)
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Persist font size when it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('codehub:editorFontSize', String(fontSize))
      }
    } catch {
      // Ignore storage errors
    }
  }, [fontSize])

  const handleZoomIn = useCallback(() => {
    setFontSize((prev) => Math.min(32, prev + 1))
  }, [])

  const handleZoomOut = useCallback(() => {
    setFontSize((prev) => Math.max(10, prev - 1))
  }, [])

  // Phase 4: Highlight syntax errors in Monaco using local parsing (no AI)
  useEffect(() => {
    if (!monaco || !editorRef.current) {
      return
    }

    const editor = editorRef.current
    const model = editor.getModel?.() || (editor as any).getModel()
    
    if (!model) {
      return
    }

    // Get current code from editor
    const currentCode = editor.getValue?.() || code

    // Only show markers if the code hasn't changed since execution
    // If user has typed/changed code, clear markers
    if (currentCode !== executedCodeRef.current) {
      console.log('[Monaco Debug] Code changed, clearing markers', {
        currentCodeLength: currentCode.length,
        executedCodeLength: executedCodeRef.current.length,
        codesMatch: currentCode === executedCodeRef.current
      })
      monaco.editor.setModelMarkers(model, 'syntax-error', [])
      return
    }

    // Clear markers when there is no result or success
    if (!executionResult || executionResult.status === 'success') {
      monaco.editor.setModelMarkers(model, 'syntax-error', [])
      return
    }

    // Focus on compilation errors for syntax highlighting
    if (executionResult.status !== 'compilation_error') {
      monaco.editor.setModelMarkers(model, 'syntax-error', [])
      return
    }

    const rawOutput = executionResult.stderr || executionResult.stdout || ''
    if (!rawOutput.trim()) {
      monaco.editor.setModelMarkers(model, 'syntax-error', [])
      return
    }

    const parsed = parseErrorLocation(rawOutput, language)

    if (!parsed || !parsed.line) {
      monaco.editor.setModelMarkers(model, 'syntax-error', [])
      return
    }

    const line = parsed.line > 0 ? parsed.line : 1
    const column = parsed.column && parsed.column > 0 ? parsed.column : 1
    const message = parsed.message || executionResult.stderr || 'Compilation error'

    // Verify line exists in model
    const lineCount = model.getLineCount?.() || 0
    if (line > lineCount) {
      return
    }

    const lineText = model.getLineContent?.(line) || ''
    const severity = monaco.MarkerSeverity?.Error ?? 8
    const startCol = Math.max(1, column)
    const endCol = Math.min(Math.max(column + 5, column + 1), lineText.length + 1)

    const markers = [
      {
        startLineNumber: line,
        startColumn: startCol,
        endLineNumber: line,
        endColumn: endCol,
        message: message,
        severity: severity,
        source: 'syntax-error',
      },
    ]

    try {
      console.log('[Monaco Debug] Setting error markers', {
        line,
        column,
        message: message.substring(0, 50),
        currentCodeLength: currentCode.length,
        executedCodeLength: executedCodeRef.current.length,
        codesMatch: currentCode === executedCodeRef.current
      })
      monaco.editor.setModelMarkers(model, 'syntax-error', markers)
      editor.revealLineInCenter?.(line)
      const currentMarkers = monaco.editor.getModelMarkers({ resource: model.uri })
      console.log('[Monaco Debug] Markers after setting:', currentMarkers.length, currentMarkers)
    } catch (error) {
      console.error('[MonacoMarkers] Error setting markers:', error)
    }
  }, [executionResult, language, monaco, code])

  // Update Monaco theme when app theme changes
  useEffect(() => {
    if (monaco && editorRef.current && !themeProp) {
      const newTheme = appTheme === 'dark' ? 'vs-dark' : 'vs'
      // Monaco editor will automatically update when theme prop changes
      // But we can also use monaco.editor.setTheme() if needed
      if (monaco.editor) {
        monaco.editor.setTheme(newTheme)
      }
    }
  }, [appTheme, monaco, themeProp])

  // Set up listener to clear error markers when content changes
  useEffect(() => {
    if (!monaco || !editorRef.current) {
      console.log('[Monaco Debug] Listener setup skipped: monaco or editor not available', {
        hasMonaco: !!monaco,
        hasEditor: !!editorRef.current
      })
      return
    }

    const editor = editorRef.current
    const model = editor.getModel?.() || (editor as any).getModel()
    
    if (!model) {
      console.log('[Monaco Debug] Listener setup skipped: model not available')
      return
    }

    console.log('[Monaco Debug] Setting up onDidChangeContent listener', {
      modelUri: model.uri?.toString(),
      language: model.getLanguageId?.()
    })

    // Clear error markers when content changes
    const disposable = model.onDidChangeContent((e: any) => {
      console.log('[Monaco Debug] onDidChangeContent fired', {
        changes: e.changes,
        versionId: e.versionId,
        isUndoing: e.isUndoing,
        isRedoing: e.isRedoing
      })
      if (monaco && model) {
        console.log('[Monaco Debug] Clearing markers via onDidChangeContent')
        // Clear markers immediately when user types
        monaco.editor.setModelMarkers(model, 'syntax-error', [])
        // Also clear the executed code ref so markers won't be re-set
        executedCodeRef.current = ''
        console.log('[Monaco Debug] Markers cleared, executedCodeRef reset')
      } else {
        console.log('[Monaco Debug] onDidChangeContent: monaco or model not available', { monaco: !!monaco, model: !!model })
      }
    })

    return () => {
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose()
      }
    }
  }, [monaco]) // Only set up once when monaco is available

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
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r pr-2 mr-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] hover:bg-accent transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-muted-foreground w-10 text-center">
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] hover:bg-accent transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>

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
          {(!readOnly || allowRunInReadOnly) && (
            <button
              type="button"
              onClick={executing ? handleStop : handleRun}
              disabled={(executing && !onStopExecution) || runDisabled}
              className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                executing
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : runDisabled
                    ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                    : 'bg-success text-background hover:bg-success/90'
              }`}
              title={
                executing
                  ? 'Stop execution'
                  : runDisabled
                    ? 'Please save your code before running'
                    : 'Run code (Ctrl+Enter)'
              }
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
            disabled={readOnly && !allowRunInReadOnly}
          />
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height={height}
          language={monacoLanguage}
          value={code}
          onChange={(value) => {
            const newValue = value || ''
            console.log('[Monaco Debug] onChange fired', {
              valueLength: newValue.length,
              hasMonaco: !!monaco,
              hasEditorRef: !!editorRef.current
            })
            // Clear error markers when user types or makes changes
            if (monaco && editorRef.current) {
              const editor = editorRef.current
              const model = editor.getModel?.() || (editor as any).getModel()
              if (model) {
                console.log('[Monaco Debug] Clearing markers via onChange')
                monaco.editor.setModelMarkers(model, 'syntax-error', [])
                const currentMarkers = monaco.editor.getModelMarkers({ resource: model.uri })
                console.log('[Monaco Debug] Markers after clearing:', currentMarkers.length)
              } else {
                console.log('[Monaco Debug] onChange: model not available')
              }
            } else {
              console.log('[Monaco Debug] onChange: monaco or editorRef not available')
            }
            onChange(newValue)
          }}
          onMount={handleEditorDidMount}
          theme={monacoTheme}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize,
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

