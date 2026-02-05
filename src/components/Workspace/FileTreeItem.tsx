'use client'

import React, { useState } from 'react'
import { Folder, File as FileIcon, ChevronRight, ChevronDown, X } from 'lucide-react'
import { cn } from '@/utilities/ui'

interface File {
  id: string
  name: string
  content: string
  folder?: {
    id: string
    name: string
  }
}

interface Folder {
  id: string
  name: string
  parent?: {
    id: string
    name: string
  }
  children?: Folder[]
}

interface FileTreeItemProps {
  folder?: Folder
  file?: File
  files?: File[]
  selectedFileId?: string
  onFileClick: (file: File) => void
  onFileDelete?: (fileId: string) => void
  onFolderDelete?: (folderId: string) => void
  level: number
}

export function FileTreeItem({
  folder,
  file,
  files = [],
  selectedFileId,
  onFileClick,
  onFileDelete,
  onFolderDelete,
  level,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  const handleFileDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (file && onFileDelete && window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      onFileDelete(file.id)
    }
  }

  const handleFolderDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (folder && onFolderDelete && window.confirm(`Are you sure you want to delete folder "${folder.name}"? This will also delete all files inside.`)) {
      onFolderDelete(folder.id)
    }
  }

  if (file) {
    const isSelected = selectedFileId === file.id

    return (
      <div
        className={cn(
          'group flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-accent transition-colors',
          isSelected && 'bg-primary/10 text-primary font-medium'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0"
          onClick={() => onFileClick(file)}
        >
          <FileIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{file.name}</span>
        </div>
        {onFileDelete && isHovered && (
          <button
            onClick={handleFileDelete}
            className="opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded p-0.5 transition-opacity"
            title="Delete file"
          >
            <X className="h-3 w-3 text-destructive" />
          </button>
        )}
      </div>
    )
  }

  if (folder) {
    const folderFiles = files.filter(
      (f) => f.folder && typeof f.folder === 'object' && String(f.folder.id) === String(folder.id)
    )
    const childFolders = folder.children || []

    return (
      <div>
        <div
          className="group flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className="flex items-center gap-1 flex-1 cursor-pointer min-w-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
            )}
            <Folder className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{folder.name}</span>
          </div>
          {onFolderDelete && isHovered && (
            <button
              onClick={handleFolderDelete}
              className="opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded p-0.5 transition-opacity"
              title="Delete folder"
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          )}
        </div>

        {isExpanded && (
          <div>
            {/* Child Folders */}
            {childFolders.map((childFolder) => (
              <FileTreeItem
                key={childFolder.id}
                folder={childFolder}
                files={files}
                selectedFileId={selectedFileId}
                onFileClick={onFileClick}
                onFileDelete={onFileDelete}
                onFolderDelete={onFolderDelete}
                level={level + 1}
              />
            ))}

            {/* Files in this folder */}
            {folderFiles.map((f) => (
              <FileTreeItem
                key={f.id}
                file={f}
                selectedFileId={selectedFileId}
                onFileClick={onFileClick}
                onFileDelete={onFileDelete}
                onFolderDelete={onFolderDelete}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

