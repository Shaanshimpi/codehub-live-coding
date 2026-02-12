'use client'

import React, { useState } from 'react'
import { Folder, File as FileIcon, ChevronRight, ChevronDown, X, MoreVertical, Edit2, FolderOpen, Trash2 } from 'lucide-react'
import { cn } from '@/utilities/ui'
import { RenameItemModal } from './RenameItemModal'
import { MoveItemModal } from './MoveItemModal'

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
  onFileRename?: (fileId: string, newName: string) => void
  onFolderRename?: (folderId: string, newName: string) => void
  onFileMove?: (fileId: string, newFolderId: string | number | null) => void
  onFolderMove?: (folderId: string, newParentId: string | number | null) => void
  allFolders?: Folder[] // For move modal folder picker
  readOnly?: boolean
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
  onFileRename,
  onFolderRename,
  onFileMove,
  onFolderMove,
  allFolders = [],
  readOnly = false,
  level,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)

  const handleFileDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (file && onFileDelete && window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      onFileDelete(file.id)
    }
  }

  const handleFolderDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (folder && onFolderDelete && window.confirm(`Are you sure you want to delete folder "${folder.name}"? This will also delete all files inside.`)) {
      onFolderDelete(folder.id)
    }
  }

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    setShowRenameModal(true)
  }

  const handleMove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    setShowMoveModal(true)
  }

  const handleRenameSuccess = () => {
    // Refresh will be handled by parent component
    setShowRenameModal(false)
  }

  const handleMoveSuccess = () => {
    // Refresh will be handled by parent component
    setShowMoveModal(false)
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
        {!readOnly && (onFileDelete || onFileRename || onFileMove) && isHovered && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="hover:bg-accent rounded p-0.5"
              title="File actions"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-6 z-20 w-40 rounded-md border bg-card shadow-lg">
                  {onFileRename && (
                    <button
                      onClick={handleRename}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                    >
                      <Edit2 className="h-3 w-3" />
                      Rename
                    </button>
                  )}
                  {onFileMove && (
                    <button
                      onClick={handleMove}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                    >
                      <FolderOpen className="h-3 w-3" />
                      Move
                    </button>
                  )}
                  {onFileDelete && (
                    <button
                      onClick={handleFileDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/20 text-destructive text-left"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {showRenameModal && (
          <RenameItemModal
            isOpen={showRenameModal}
            itemType="file"
            currentName={file.name}
            itemId={file.id}
            onClose={() => setShowRenameModal(false)}
            onSuccess={handleRenameSuccess}
          />
        )}
        {showMoveModal && (
          <MoveItemModal
            isOpen={showMoveModal}
            itemType="file"
            itemId={file.id}
            currentParentId={file.folder?.id || null}
            folders={allFolders}
            onClose={() => setShowMoveModal(false)}
            onSuccess={handleMoveSuccess}
          />
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
          {!readOnly && (onFolderDelete || onFolderRename || onFolderMove) && isHovered && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="hover:bg-accent rounded p-0.5"
                title="Folder actions"
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-6 z-20 w-40 rounded-md border bg-card shadow-lg">
                    {onFolderRename && (
                      <button
                        onClick={handleRename}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                      >
                        <Edit2 className="h-3 w-3" />
                        Rename
                      </button>
                    )}
                    {onFolderMove && (
                      <button
                        onClick={handleMove}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                      >
                        <FolderOpen className="h-3 w-3" />
                        Move
                      </button>
                    )}
                    {onFolderDelete && (
                      <button
                        onClick={handleFolderDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/20 text-destructive text-left"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {showRenameModal && folder && (
          <RenameItemModal
            isOpen={showRenameModal}
            itemType="folder"
            currentName={folder.name}
            itemId={folder.id}
            onClose={() => setShowRenameModal(false)}
            onSuccess={handleRenameSuccess}
          />
        )}
        {showMoveModal && folder && (
          <MoveItemModal
            isOpen={showMoveModal}
            itemType="folder"
            itemId={folder.id}
            currentParentId={folder.parent?.id || null}
            folders={allFolders}
            onClose={() => setShowMoveModal(false)}
            onSuccess={handleMoveSuccess}
          />
        )}

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
                onFileRename={onFileRename}
                onFolderRename={onFolderRename}
                onFileMove={onFileMove}
                onFolderMove={onFolderMove}
                allFolders={allFolders}
                readOnly={readOnly}
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
                onFileRename={onFileRename}
                onFolderRename={onFolderRename}
                onFileMove={onFileMove}
                onFolderMove={onFolderMove}
                allFolders={allFolders}
                readOnly={readOnly}
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

