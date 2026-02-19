/**
 * Shared type definitions for workspace-related components and hooks.
 * 
 * This file consolidates all WorkspaceFile and Folder type definitions
 * to ensure consistency across the codebase.
 * 
 * @module types/workspace
 */

import type { BasicFolderRef } from '@/utilities/workspaceScope'

/**
 * Base workspace file type with minimal required fields
 */
export type BaseWorkspaceFile = {
  id: string
  name: string
}

/**
 * Workspace file with content (used in editor components)
 */
export type WorkspaceFileWithContent = BaseWorkspaceFile & {
  content: string
}

/**
 * Workspace file with folder information (used in explorer views)
 */
export type WorkspaceFileWithFolder = BaseWorkspaceFile & {
  folder?: {
    id: string | number
    name?: string | null
    slug?: string | null
  } | null
}

/**
 * Full workspace file with all optional fields (used in modals and API responses)
 */
export type WorkspaceFileFull = BaseWorkspaceFile & {
  content?: string
  folder?: {
    id: string | number
    name?: string | null
    slug?: string | null
  } | null
  language?: string
}

/**
 * Folder type with slug (used in explorer views)
 * Extends BasicFolderRef which already includes parentFolder
 */
export type Folder = BasicFolderRef

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use WorkspaceFileWithContent instead
 */
export type WorkspaceFile = WorkspaceFileWithContent

