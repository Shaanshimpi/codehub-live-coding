import type { CollectionConfig } from 'payload'

export const Folders: CollectionConfig = {
  slug: 'folders',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'user', 'parentFolder', 'createdAt'],
    group: 'Workspace',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ req }) => req.user?.id,
      admin: {
        description: 'Owner of this folder (student or trainer). Defaults to current user.',
      },
    },
    {
      name: 'parentFolder',
      type: 'relationship',
      relationTo: 'folders',
      admin: {
        description: 'Parent folder (null = root level)',
      },
    },
  ],
  access: {
    // Users can only read their own folders
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

