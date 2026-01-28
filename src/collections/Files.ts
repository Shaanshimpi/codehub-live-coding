import type { CollectionConfig } from 'payload'

export const Files: CollectionConfig = {
  slug: 'files',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'user', 'folder', 'updatedAt'],
    group: 'Workspace',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      type: 'code',
      admin: {
        language: 'javascript',
        description: 'File content (code)',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Owner of this file (student or trainer). Defaults to current user.',
      },
      defaultValue: ({ req }) => req.user?.id,
    },
    {
      name: 'folder',
      type: 'relationship',
      relationTo: 'folders',
      admin: {
        description: 'Parent folder (null = root level)',
      },
    },
  ],
  access: {
    // Users can only read their own files
    read: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
  },
}

