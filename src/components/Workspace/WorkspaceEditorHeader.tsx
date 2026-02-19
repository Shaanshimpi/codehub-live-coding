/**
 * Workspace Editor Header Component
 * 
 * Displays role badge, file name, language selector, save button, and AI toggle.
 * Used in TrainerSessionWorkspace, StudentSessionWorkspace, and WorkspaceLayout.
 * 
 * @module WorkspaceEditorHeader
 */

'use client'

import React from 'react'
import { Save, CheckCircle, Loader2, Sparkles, File } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'
import { cn } from '@/utilities/ui'

export type WorkspaceRole = 'trainer' | 'student' | 'workspace'

interface WorkspaceEditorHeaderProps {
  /** Role badge to display */
  role: WorkspaceRole
  /** Currently active file name */
  fileName: string
  /** Current programming language */
  language: string
  /** Callback when language changes */
  onLanguageChange: (language: string) => void
  /** Callback when save button is clicked */
  onSave: () => void
  /** Whether code is currently being saved */
  savingCode: boolean
  /** Whether last save was successful */
  saveSuccess: boolean
  /** Whether AI panel is currently shown */
  showAI: boolean
  /** Callback to toggle AI panel */
  onToggleAI: () => void
  /** Optional: Whether editor is read-only */
  readOnly?: boolean
  /** Optional: Custom save button text */
  saveButtonText?: string
}

/**
 * Workspace Editor Header Component
 * 
 * @example
 * ```tsx
 * <WorkspaceEditorHeader
 *   role="trainer"
 *   fileName="main.js"
 *   language="javascript"
 *   onLanguageChange={setLanguage}
 *   onSave={handleSaveCode}
 *   savingCode={savingCode}
 *   saveSuccess={saveSuccess}
 *   showAI={showAI}
 *   onToggleAI={() => setShowAI(!showAI)}
 * />
 * ```
 */
export function WorkspaceEditorHeader({
  role,
  fileName,
  language,
  onLanguageChange,
  onSave,
  savingCode,
  saveSuccess,
  showAI,
  onToggleAI,
  readOnly = false,
  saveButtonText,
}: WorkspaceEditorHeaderProps) {
  // Role badge configuration
  const roleConfig = {
    trainer: {
      label: 'TRAINER',
      className: 'bg-primary/10 text-primary',
    },
    student: {
      label: 'MY CODE',
      className: 'bg-success/10 text-success',
    },
    workspace: {
      label: 'WORKSPACE',
      className: 'bg-muted text-muted-foreground',
    },
  }

  const roleInfo = roleConfig[role]

  // Default save button text based on role
  const defaultSaveText = saveButtonText || (role === 'trainer' ? 'Save & Sync' : 'Save')

  console.log('[WorkspaceEditorHeader] Rendering header', {
    role,
    fileName,
    language,
    savingCode,
    saveSuccess,
    showAI,
    readOnly,
  })

  return (
    <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
      <div className="flex items-center gap-2">
        {/* Role Badge */}
        <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', roleInfo.className)}>
          {roleInfo.label}
        </span>

        {/* Active File Indicator */}
        <span className="text-xs text-muted-foreground">Active:</span>
        <span className="text-xs font-medium text-primary flex items-center gap-1">
          <File className="h-3 w-3" />
          {fileName}
        </span>

        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => {
            console.log('[WorkspaceEditorHeader] Language changed', {
              oldLanguage: language,
              newLanguage: e.target.value,
            })
            onLanguageChange(e.target.value)
          }}
          className="ml-2 rounded-md border bg-background px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={readOnly}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        {/* Save Button */}
        <button
          onClick={() => {
            console.log('[WorkspaceEditorHeader] Save button clicked')
            onSave()
          }}
          disabled={savingCode || readOnly}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
            saveSuccess
              ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400'
              : 'bg-background hover:bg-accent',
            (savingCode || readOnly) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {savingCode ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="h-3 w-3" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-3 w-3" />
              {defaultSaveText}
            </>
          )}
        </button>

        {/* AI Toggle Button */}
        <button
          onClick={() => {
            console.log('[WorkspaceEditorHeader] AI toggle clicked', {
              currentState: showAI,
              newState: !showAI,
            })
            onToggleAI()
          }}
          className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          {showAI ? 'Hide AI' : 'AI Help'}
        </button>
      </div>
    </div>
  )
}

