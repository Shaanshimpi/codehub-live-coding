# Shared Components Reference

This document provides a comprehensive reference for all shared components created during the codebase optimization.

---

## Workspace Components

### WorkspaceModeToggle

**Location**: `src/components/Workspace/WorkspaceModeToggle.tsx`

**Purpose**: Mode toggle UI for switching between Explorer and Workspace modes.

**Props**:
```typescript
interface WorkspaceModeToggleProps {
  mode: 'explorer' | 'workspace'
  onChange: (mode: 'explorer' | 'workspace') => void
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { WorkspaceModeToggle } from '@/components/Workspace/WorkspaceModeToggle'

<WorkspaceModeToggle
  mode={workspaceMode}
  onChange={setWorkspaceMode}
  data-testid="mode-toggle"
/>
```

**Used In**:
- `WorkspaceLayout.tsx`
- `TrainerSessionWorkspace.tsx`
- `StudentSessionWorkspace.tsx`

---

### WorkspaceModeLayout

**Location**: `src/components/Workspace/WorkspaceModeLayout.tsx`

**Purpose**: Shared 3-column layout component for workspace mode.

**Props**:
```typescript
interface WorkspaceModeLayoutProps {
  fileExplorer?: React.ReactNode
  editor: React.ReactNode
  outputPanel?: React.ReactNode
  aiPanel?: React.ReactNode
  showFileExplorer?: boolean
  showOutput?: boolean
  showAI?: boolean
  className?: string
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { WorkspaceModeLayout } from '@/components/Workspace/WorkspaceModeLayout'

<WorkspaceModeLayout
  fileExplorer={<FileExplorer />}
  editor={<WorkspaceEditor />}
  outputPanel={<OutputPanelWrapper>...</OutputPanelWrapper>}
  aiPanel={<AIAssistantPanelWrapper>...</AIAssistantPanelWrapper>}
  showFileExplorer={showFileExplorer}
  showOutput={showOutput}
  showAI={showAI}
  data-testid="workspace-layout"
/>
```

**Layout Structure**:
- Left: File Explorer (256px width, optional)
- Center: Editor (flex-1, required)
- Right: Output Panel + AI Panel (optional, toggleable)

**Used In**:
- `WorkspaceLayout.tsx`
- `TrainerSessionWorkspace.tsx`
- `StudentSessionWorkspace.tsx`

---

### WorkspaceHeader

**Location**: `src/components/Workspace/WorkspaceHeader.tsx`

**Purpose**: Shared header component with configurable left and right sections.

**Props**:
```typescript
interface WorkspaceHeaderProps {
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  className?: string
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { WorkspaceHeader } from '@/components/Workspace/WorkspaceHeader'

<WorkspaceHeader
  leftContent={
    <>
      <Radio className="h-4 w-4 text-red-500" />
      <div>Session Info</div>
    </>
  }
  rightContent={
    <>
      <WorkspaceModeToggle mode={mode} onChange={setMode} />
      <button>Action</button>
    </>
  }
  data-testid="workspace-header"
/>
```

**Used In**:
- `WorkspaceLayout.tsx`
- `TrainerSessionWorkspace.tsx`
- `StudentSessionWorkspace.tsx`

---

### NoFileSelectedView

**Location**: `src/components/Workspace/NoFileSelectedView.tsx`

**Purpose**: Empty state component when no file is selected.

**Props**:
```typescript
interface NoFileSelectedViewProps {
  actionText?: string
  onAction?: () => void
  description?: string
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { NoFileSelectedView } from '@/components/Workspace/NoFileSelectedView'

<NoFileSelectedView
  actionText="Select or Create File"
  onAction={() => setShowFileModal(true)}
  description="Select a file from the explorer or create a new one"
/>
```

**Used In**:
- `WorkspaceLayout.tsx`
- `TrainerSessionWorkspace.tsx`
- `StudentSessionWorkspace.tsx`

---

### FileExplorerSidebar

**Location**: `src/components/Workspace/FileExplorerSidebar.tsx`

**Purpose**: Wrapper component for File Explorer sidebar with loading overlay support.

**Props**:
```typescript
interface FileExplorerSidebarProps {
  children: React.ReactNode
  loadingOverlay?: React.ReactNode
  className?: string
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { FileExplorerSidebar } from '@/components/Workspace/FileExplorerSidebar'
import { FileSwitchingOverlay } from '@/components/Workspace/FileSwitchingOverlay'

<FileExplorerSidebar
  loadingOverlay={<FileSwitchingOverlay visible={switchingFile} />}
>
  <FileExplorer />
</FileExplorerSidebar>
```

**Used In**:
- `WorkspaceLayout.tsx`
- `TrainerSessionWorkspace.tsx`
- `StudentSessionWorkspace.tsx`

---

### OutputPanelWrapper

**Location**: `src/components/Workspace/OutputPanelWrapper.tsx`

**Purpose**: Wrapper component for Output Panel with consistent header.

**Props**:
```typescript
interface OutputPanelWrapperProps {
  children: React.ReactNode
  className?: string
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { OutputPanelWrapper } from '@/components/Workspace/OutputPanelWrapper'

<OutputPanelWrapper>
  <OutputPanel
    result={executionResult}
    executing={executing}
    onClear={() => setExecutionResult(null)}
  />
</OutputPanelWrapper>
```

**Used In**:
- `WorkspaceLayout.tsx`
- `TrainerSessionWorkspace.tsx`
- `StudentSessionWorkspace.tsx`

---

### AIAssistantPanelWrapper

**Location**: `src/components/Workspace/AIAssistantPanelWrapper.tsx`

**Purpose**: Wrapper component for AI Assistant Panel with consistent styling.

**Props**:
```typescript
interface AIAssistantPanelWrapperProps {
  children: React.ReactNode
  className?: string
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { AIAssistantPanelWrapper } from '@/components/Workspace/AIAssistantPanelWrapper'

<AIAssistantPanelWrapper>
  <AIAssistantPanel
    role="trainer"
    lectureId={sessionCode}
    language={language}
    code={code}
    onClose={() => setShowAI(false)}
  />
</AIAssistantPanelWrapper>
```

**Used In**:
- `WorkspaceLayout.tsx`
- `TrainerSessionWorkspace.tsx`
- `StudentSessionWorkspace.tsx`

---

### FileSwitchingOverlay

**Location**: `src/components/Workspace/FileSwitchingOverlay.tsx`

**Purpose**: Loading overlay component for file switching.

**Props**:
```typescript
interface FileSwitchingOverlayProps {
  visible: boolean
  message?: string
  className?: string
  'data-testid'?: string
}
```

**Usage**:
```tsx
import { FileSwitchingOverlay } from '@/components/Workspace/FileSwitchingOverlay'

<FileSwitchingOverlay
  visible={switchingFile}
  message="Saving current file..."
/>
```

**Used In**:
- `TrainerSessionWorkspace.tsx` (via FileExplorerSidebar)
- `StudentSessionWorkspace.tsx` (via FileExplorerSidebar)

---

## Custom Hooks

### useCodeExecution

**Location**: `src/hooks/useCodeExecution.ts`

**Purpose**: Shared hook for code execution logic.

**Options**:
```typescript
interface UseCodeExecutionOptions {
  onExecutionComplete?: (result: ExecutionResult) => void | Promise<void>
  onExecutionError?: (error: Error) => void
}
```

**Returns**:
```typescript
interface UseCodeExecutionReturn {
  execute: (language: string, code: string, input?: string) => Promise<ExecutionResult | null>
  executing: boolean
  result: ExecutionResult | null
  clearResult: () => void
}
```

**Usage**:
```tsx
import { useCodeExecution } from '@/hooks/useCodeExecution'

const { execute, executing, result, clearResult } = useCodeExecution({
  onExecutionComplete: async (result) => {
    // Broadcast to session
    await fetch(`/api/sessions/${sessionCode}/broadcast`, {
      method: 'POST',
      body: JSON.stringify({ output: result }),
    })
  },
})

// Execute code
await execute('javascript', 'console.log("Hello")')
```

---

### useFileSave

**Location**: `src/hooks/useFileSave.ts`

**Purpose**: Shared hook for file saving logic with session syncing.

**Options**:
```typescript
interface UseFileSaveOptions {
  sessionCode?: string
  onSaveComplete?: () => void | Promise<void>
  onSaveError?: (error: Error) => void
  syncToSession?: boolean
  sessionSyncType?: 'broadcast' | 'scratchpad'
}
```

**Returns**:
```typescript
interface UseFileSaveReturn {
  saveFile: (fileId: string, content: string, language?: string) => Promise<boolean>
  saving: boolean
  saveSuccess: boolean
  resetSaveSuccess: () => void
}
```

**Usage**:
```tsx
import { useFileSave } from '@/hooks/useFileSave'

const { saveFile, saving, saveSuccess } = useFileSave({
  sessionCode: 'ABC123',
  syncToSession: true,
  sessionSyncType: 'broadcast', // or 'scratchpad' for student
  onSaveComplete: () => {
    setRefreshKey(prev => prev + 1)
  },
})

// Save file
await saveFile(fileId, code, language)
```

---

### useFileSelectionModal

**Location**: `src/hooks/useFileSelectionModal.ts`

**Purpose**: Shared hook for file selection modal state management.

**Options**:
```typescript
interface UseFileSelectionModalOptions {
  required?: boolean
  warningMessage?: string
  onCloseWithoutSelection?: () => void
}
```

**Returns**:
```typescript
interface UseFileSelectionModalReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  handleClose: (hasSelection?: boolean) => void
}
```

**Usage**:
```tsx
import { useFileSelectionModal } from '@/hooks/useFileSelectionModal'

const { isOpen, open, handleClose } = useFileSelectionModal({
  required: true,
  warningMessage: 'A file is required to start the session.',
})

<FileSelectionModal
  isOpen={isOpen}
  onSelect={handleFileSelect}
  onClose={() => handleClose(!!selectedFile)}
/>
```

---

## Utility Hooks

### useFolderFileFilter

**Location**: `src/utilities/useFolderFileFilter.ts`

**Purpose**: Utility hook for filtering folders and files by current folder.

**Options**:
```typescript
interface UseFolderFileFilterOptions<TFolder, TFile> {
  folders: TFolder[]
  files: TFile[]
  currentFolder: TFolder | null
}
```

**Returns**:
```typescript
interface UseFolderFileFilterReturn<TFolder, TFile> {
  childFolders: TFolder[]
  childFiles: TFile[]
}
```

**Usage**:
```tsx
import { useFolderFileFilter } from '@/utilities/useFolderFileFilter'

const currentFolder = currentFolderSlug
  ? explorerFolders.find(f => f.slug === currentFolderSlug) || null
  : null

const { childFolders, childFiles } = useFolderFileFilter({
  folders: explorerFolders,
  files: explorerFiles,
  currentFolder,
})

<FolderExplorerView
  currentFolder={currentFolder}
  childFolders={childFolders}
  childFiles={childFiles}
/>
```

---

## Best Practices

### When to Use Shared Components

1. **Use `WorkspaceModeLayout`** when creating a new workspace-like view
2. **Use `WorkspaceHeader`** when creating a header that needs consistent styling
3. **Use wrapper components** (`FileExplorerSidebar`, `OutputPanelWrapper`, etc.) for consistent styling
4. **Use hooks** (`useCodeExecution`, `useFileSave`) for shared business logic

### Component Composition

Components are designed to be composable:

```tsx
<WorkspaceModeLayout
  fileExplorer={
    <FileExplorerSidebar loadingOverlay={<FileSwitchingOverlay visible={switching} />}>
      <FileExplorer />
    </FileExplorerSidebar>
  }
  editor={
    selectedFile ? <WorkspaceEditor /> : <NoFileSelectedView />
  }
  outputPanel={
    <OutputPanelWrapper>
      <OutputPanel />
    </OutputPanelWrapper>
  }
  aiPanel={
    <AIAssistantPanelWrapper>
      <AIAssistantPanel />
    </AIAssistantPanelWrapper>
  }
/>
```

### Testing

All components include `data-testid` attributes for testing:
- `data-testid="mode-toggle"`
- `data-testid="workspace-layout"`
- `data-testid="workspace-header"`
- `data-testid="no-file-selected"`
- `data-testid="file-explorer-sidebar"`
- `data-testid="output-panel-wrapper"`
- `data-testid="ai-panel-wrapper"`
- `data-testid="file-switching-overlay"`

---

## Migration Notes

### Breaking Changes

None. All changes are backward compatible.

### Deprecated Patterns

The following patterns are now deprecated in favor of shared components:

1. ❌ Inline mode toggle UI → ✅ Use `WorkspaceModeToggle`
2. ❌ Custom 3-column layout → ✅ Use `WorkspaceModeLayout`
3. ❌ Custom header implementation → ✅ Use `WorkspaceHeader`
4. ❌ Inline empty state → ✅ Use `NoFileSelectedView`
5. ❌ Custom file explorer wrapper → ✅ Use `FileExplorerSidebar`
6. ❌ Custom output panel wrapper → ✅ Use `OutputPanelWrapper`
7. ❌ Custom AI panel wrapper → ✅ Use `AIAssistantPanelWrapper`
8. ❌ Inline loading overlay → ✅ Use `FileSwitchingOverlay`
9. ❌ Duplicate code execution logic → ✅ Use `useCodeExecution`
10. ❌ Duplicate file save logic → ✅ Use `useFileSave`
11. ❌ Manual modal state management → ✅ Use `useFileSelectionModal`
12. ❌ Manual folder/file filtering → ✅ Use `useFolderFileFilter`

---

## Support

For questions or issues:
- Review component source code for detailed implementation
- Check test files for usage examples
- Refer to `OPTIMIZATION_SUMMARY.md` for overview

