'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { LiveCodePlayground } from '@/components/LiveCodePlayground'
import { Save, CheckCircle } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'

interface WorkspaceEditorProps {
  fileId: string
  fileName: string
  code: string
  language: string
  onLanguageChange: (languageId: string) => void
  onChange: (code: string) => void
  onRun: (code: string, input?: string) => void
  executing: boolean
  onSave?: () => void
}

export function WorkspaceEditor({
  fileId,
  fileName,
  code,
  language,
  onLanguageChange,
  onChange,
  onRun,
  executing,
  onSave,
}: WorkspaceEditorProps) {
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSavedCode, setLastSavedCode] = useState(code)

  // Track changes
  useEffect(() => {
    setHasChanges(code !== lastSavedCode)
  }, [code, lastSavedCode])

  // Auto-save debounced (every 2 seconds after typing stops)
  useEffect(() => {
    if (!hasChanges || saving) return

    const timer = setTimeout(() => {
      handleSave()
    }, 2000)

    return () => clearTimeout(timer)
  }, [code, hasChanges, saving])

  const handleSave = useCallback(async () => {
    if (saving || !hasChanges) return

    setSaving(true)
    setSaveSuccess(false)

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: code,
        }),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Please log in to save files')
        }
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || data.error || 'Failed to save file')
      }

      setLastSavedCode(code)
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)

      if (onSave) {
        onSave()
      }
    } catch (error) {
      console.error('Error saving file:', error)
      // Show error to user (you can add a toast notification here)
      alert(error instanceof Error ? error.message : 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }, [fileId, code, saving, hasChanges, onSave])

  const handleManualSave = () => {
    handleSave()
  }

  const currentLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.id === language)
  const monacoLanguage = currentLanguage?.monacoLanguage || 'javascript'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{fileName}</span>
          <span className="text-xs text-muted-foreground">({monacoLanguage})</span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="ml-2 rounded-md border bg-background px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 rounded-md bg-success/20 px-2 py-1 text-xs text-success">
              <CheckCircle className="h-3 w-3" />
              <span>Saved</span>
            </div>
          )}
          {hasChanges && !saveSuccess && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <button
            onClick={handleManualSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save (Ctrl+S)"
          >
            <Save className="h-3 w-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <LiveCodePlayground
          language={language}
          code={code}
          onChange={onChange}
          onRun={onRun}
          executing={executing}
          showAIHelper={false} // AI is in sidebar
          theme="vs-dark"
        />
      </div>
    </div>
  )
}

