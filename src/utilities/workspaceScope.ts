export interface WorkspaceScope {
  /**
   * Optional folder ID that defines the root of the visible workspace subtree.
   * When undefined/null, the entire workspace (all root folders) is visible.
   */
  scopeFolderId?: string | null

  /**
   * Optional explicit owner user ID. When omitted, the current authenticated
   * user is assumed to be the workspace owner.
   */
  ownerUserId?: string | number | null
}

/**
 * Minimal folder shape used for building breadcrumb paths.
 */
export interface BasicFolderRef {
  id: string | number
  name?: string | null
  slug?: string | null
  parentFolder?: BasicFolderRef | { id: string | number; name?: string | null; slug?: string | null } | null
}

/**
 * Build an ordered folder path chain from root to the given folder.
 * Assumes that each folder has an embedded parentFolder object (as returned
 * by Payload when using depth >= 1).
 */
export function buildFolderPathChain(folder: BasicFolderRef | null | undefined): BasicFolderRef[] {
  if (!folder) return []

  const chain: BasicFolderRef[] = []
  const visited = new Set<string>()

  let current: BasicFolderRef | null | undefined = folder

  while (current && typeof current === 'object') {
    const key = String(current.id)
    if (visited.has(key)) break
    visited.add(key)

    chain.unshift({
      id: current.id,
      name: current.name ?? null,
      slug: current.slug ?? null,
    })

    const parent: BasicFolderRef | null = current.parentFolder
      ? (typeof current.parentFolder === 'object' && current.parentFolder !== null 
          ? current.parentFolder as BasicFolderRef 
          : null)
      : null
    if (!parent) break
    current = parent
  }

  return chain
}


