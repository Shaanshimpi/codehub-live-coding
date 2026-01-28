import type { CollectionConfig } from 'payload'

export const LiveSessions: CollectionConfig = {
  slug: 'live-sessions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'joinCode', 'trainer', 'isActive', 'participantCount', 'startedAt'],
    group: 'Live Coding',
  },
  fields: [
    {
      name: 'joinCode',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique code for students to join (e.g., ABC-123-XYZ)',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Session title (e.g., "Introduction to Python")',
      },
    },
    {
      name: 'trainer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: {
        role: { equals: 'trainer' },
      },
      admin: {
        description: 'Trainer conducting this session',
      },
    },
    {
      name: 'language',
      type: 'relationship',
      relationTo: 'languages',
      admin: {
        description: 'Programming language for this session',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Is this session currently live?',
        position: 'sidebar',
      },
    },
    {
      name: 'currentCode',
      type: 'code',
      admin: {
        language: 'javascript',
        description: 'Current code being broadcast to students',
      },
    },
    {
      name: 'currentOutput',
      type: 'json',
      admin: {
        description: 'Output from the last code execution',
      },
    },
    {
      name: 'participantCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of students currently in session',
        position: 'sidebar',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When the session started',
        position: 'sidebar',
      },
    },
    {
      name: 'endedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When the session ended',
        position: 'sidebar',
      },
    },
  ],
  access: {
    // Anyone can read active sessions (to join)
    read: () => true,
    // Only trainers can create sessions
    create: ({ req }) => {
      if (!req.user) return false
      return req.user.role === 'trainer' || req.user.role === 'admin'
    },
    // Only the trainer who created the session can update it
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { trainer: { equals: req.user.id } }
    },
    // Only admins can delete sessions
    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.role === 'admin'
    },
  },
}

