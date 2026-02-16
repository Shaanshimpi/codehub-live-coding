import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

// Helper function to generate URL-friendly slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length
}

export const Folders: CollectionConfig = {
  slug: 'folders',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'user', 'parentFolder', 'createdAt'],
    group: 'Workspace',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      hooks: {
        afterChange: [
          async ({ data, req, value }) => {
            // Auto-generate slug when name changes if slug is missing
            if (value && data?.id && (!data.slug || data.slug === '')) {
              const slug = generateSlug(value)
              try {
                await req.payload.update({
                  collection: 'folders',
                  id: data.id,
                  data: { slug },
                  overrideAccess: true,
                })
              } catch (error) {
                console.error('Failed to auto-generate slug for folder:', error)
              }
            }
          },
        ],
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: false, // Not globally unique, but unique per user
      admin: {
        description: 'URL-friendly identifier for this folder. Auto-generated from name.',
      },
      hooks: {
        beforeValidate: [
          async ({ data, operation, value, req }) => {
            // Auto-generate slug from name if not provided or empty
            const name = data?.name
            if (!name && !value) return ''
            
            // If slug is already provided and valid, use it
            if (value && /^[a-z0-9-]+$/.test(value)) {
              return value
            }

            // Generate slug from name
            if (!name) return value || ''
            let slug = generateSlug(name)

            // Ensure uniqueness per user
            if (req.user) {
              let counter = 1
              const baseSlug = slug
              while (true) {
                const existing = await req.payload.find({
                  collection: 'folders',
                  where: {
                    and: [
                      { slug: { equals: slug } },
                      { user: { equals: req.user.id } },
                      ...(operation === 'update' && data?.id
                        ? [{ id: { not_equals: data.id } }]
                        : []),
                    ],
                  },
                  limit: 1,
                })

                if (existing.docs.length === 0) break
                slug = `${baseSlug}-${counter}`
                counter++
              }
            }

            return slug
          },
        ],
      },
      validate: (async (value, options) => {
        if (!value) return 'Slug is required'
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Slug can only contain lowercase letters, numbers, and hyphens'
        }

        // Check uniqueness per user
        if (options?.req?.user) {
          const existing = await options.req.payload.find({
            collection: 'folders',
            where: {
              and: [
                { slug: { equals: value } },
                { user: { equals: options.req.user.id } },
                ...(options.operation === 'update' && (options.data as any)?.id
                  ? [{ id: { not_equals: (options.data as any).id } }]
                  : []),
              ],
            },
            limit: 1,
          })

          if (existing.docs.length > 0) {
            return 'A folder with this slug already exists in your workspace'
          }
        }

        return true
      }) as TextFieldSingleValidation,
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

