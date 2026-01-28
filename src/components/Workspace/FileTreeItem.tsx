'use client'

import React, { useState } from 'react'
import { Folder, File as FileIcon, ChevronRight, ChevronDown } from 'lucide-react'
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
  level: number
}

export function FileTreeItem({
  folder,
  file,
  files = [],
  selectedFileId,
  onFileClick,
  level,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (file) {
    const isSelected = selectedFileId === file.id

    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer rounded hover:bg-accent transition-colors',
          isSelected && 'bg-primary/10 text-primary font-medium'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onFileClick(file)}
      >
        <FileIcon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{file.name}</span>
      </div>
    )
  }

  if (folder) {
    const folderFiles = files.filter(
      (f) => f.folder && typeof f.folder === 'object' && f.folder.id === folder.id
    )
    const childFolders = folder.children || []

    return (
      <div>
        <div
          className="flex items-center gap-1 px-2 py-1 text-xs cursor-pointer rounded hover:bg-accent transition-colors"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
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

