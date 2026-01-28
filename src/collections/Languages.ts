import type { CollectionConfig } from 'payload'

export const Languages: CollectionConfig = {
  slug: 'languages',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'extension'],
    group: 'Live Coding',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Display name (e.g., JavaScript, Python)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Used for OneCompiler API (e.g., javascript, python)',
      },
    },
    {
      name: 'monacoLanguage',
      type: 'text',
      required: true,
      admin: {
        description: 'Monaco editor language ID (e.g., javascript, python)',
      },
    },
    {
      name: 'extension',
      type: 'text',
      required: true,
      admin: {
        description: 'File extension (e.g., .js, .py)',
      },
    },
    {
      name: 'defaultCode',
      type: 'code',
      admin: {
        description: 'Default starter code for this language',
      },
    },
  ],
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'trainer',
    update: ({ req }) => req.user?.role === 'trainer',
    delete: ({ req }) => req.user?.role === 'trainer',
  },
}

