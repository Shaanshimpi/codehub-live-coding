import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { adminOnly } from '../../access/adminOnly'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: adminOnly,
    // Allow public signup - role enforcement happens in hooks
    create: ({ req }) => {
      // Admins and managers can always create
      if (req.user?.role === 'admin' || req.user?.role === 'manager') return true
      // Allow public signup (unauthenticated users)
      if (!req.user) return true
      // Others cannot create
      return false
    },
    delete: adminOnly,
    // Allow users to read their own data (for /api/users/me)
    read: ({ req }) => {
      if (!req.user) return false
      // Admins and managers can read anyone
      if (req.user.role === 'admin' || req.user.role === 'manager') return true
      // Users can only read their own data
      return {
        id: {
          equals: req.user.id,
        },
      }
    },
    update: ({ req }) => {
      // Admins and managers can update anyone
      if (req.user?.role === 'admin' || req.user?.role === 'manager') return true
      return false
    },
  },
  admin: {
    defaultColumns: ['name', 'email', 'role'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'student',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'Trainer', value: 'trainer' },
        { label: 'Student', value: 'student' },
      ],
      admin: {
        position: 'sidebar',
        description: 'User role determines access permissions',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Basic Info',
          fields: [
            {
              name: 'phone',
              type: 'text',
              admin: {
                description: 'Primary phone number',
              },
            },
            {
              name: 'altPhone',
              type: 'text',
              admin: {
                description: 'Alternate phone number',
              },
            },
          ],
        },
        {
          label: 'Personal Details',
          fields: [
            {
              name: 'dateOfBirth',
              type: 'date',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
                description: 'Date of birth',
              },
            },
            {
              name: 'college',
              type: 'text',
              admin: {
                description: 'College/University name',
              },
            },
            {
              name: 'educationalBackground',
              type: 'textarea',
              admin: {
                description: 'Educational background/qualifications',
              },
            },
          ],
        },
        {
          label: 'Address',
          fields: [
            {
              name: 'address',
              type: 'textarea',
              admin: {
                description: 'Street address',
              },
            },
            {
              name: 'city',
              type: 'text',
            },
            {
              name: 'state',
              type: 'text',
            },
            {
              name: 'postalCode',
              type: 'text',
              admin: {
                description: 'ZIP/Postal code',
              },
            },
            {
              name: 'country',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'trialStartDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Trial period start date',
      },
    },
    {
      name: 'trialEndDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Trial period end date (can be auto-calculated)',
      },
    },
    {
      name: 'isAdmissionConfirmed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Mark when student confirms admission after trial',
      },
    },
    {
      name: 'temporaryAccessGranted',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Temporarily grant access to this student, overriding all other access rules',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // Enforce student role for public signups (non-authenticated requests)
        if (operation === 'create' && !req.user) {
          // Always set to student for public signups, regardless of what was sent
          data.role = 'student'
        }
        
        // Auto-set trial dates for new students
        if (operation === 'create' && data.role === 'student') {
          const now = new Date()
          const trialDays = 7 // Default 7 days, can be fetched from Platform Settings if needed
          
          // Set trial start date to now if not provided
          if (!data.trialStartDate) {
            data.trialStartDate = now.toISOString()
          }
          
          // Set trial end date to 7 days from now if not provided
          if (!data.trialEndDate) {
            const trialEndDate = new Date(now)
            trialEndDate.setDate(trialEndDate.getDate() + trialDays)
            data.trialEndDate = trialEndDate.toISOString()
          }
        }
        
        return data
      },
    ],
  },
  timestamps: true,
}
