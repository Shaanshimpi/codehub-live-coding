import type { CollectionConfig } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

import { adminOnly } from '@/access/adminOnly'
import { authenticated } from '@/access/authenticated'

export const Fees: CollectionConfig = {
  slug: 'fees',
  access: {
    create: adminOnly,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      // Students can read their own fees
      return {
        student: {
          equals: req.user.id,
        },
      }
    },
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    defaultColumns: ['student', 'totalFee', 'currency', 'updatedAt'],
    useAsTitle: 'student',
    description: 'Manage student fee records and installment schedules',
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Student this fee record belongs to',
      },
    },
    {
      name: 'courseName',
      type: 'text',
      admin: {
        description: 'Course name or identifier (optional)',
      },
    },
    {
      name: 'totalFee',
      type: 'number',
      required: true,
      admin: {
        description: 'Total fee amount',
      },
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'INR',
      admin: {
        description: 'Currency code (e.g., INR, USD, EUR)',
      },
    },
    {
      name: 'installments',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'dueDate',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
            description: 'Due date for this installment',
          },
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          admin: {
            description: 'Amount for this installment',
          },
        },
        {
          name: 'isPaid',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Mark as paid when payment is received',
          },
        },
        {
          name: 'paymentMethod',
          type: 'text',
          admin: {
            description: 'Payment method used (e.g., cash, upi, card, bank_transfer)',
          },
        },
        {
          name: 'paidAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
            description: 'Date when payment was received',
          },
        },
        {
          name: 'notes',
          type: 'textarea',
          admin: {
            description: 'Admin notes about this payment',
          },
        },
      ],
      admin: {
        description: 'Installment schedule',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Mark as active if this is the current fee record for the student',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        // Auto-set paidAt when isPaid is toggled to true
        if (data.installments && Array.isArray(data.installments)) {
          data.installments = data.installments.map((installment: any) => {
            if (installment.isPaid && !installment.paidAt) {
              installment.paidAt = new Date().toISOString()
            }
            return installment
          })

          // Validate total installments match totalFee
          const totalInstallments = data.installments.reduce(
            (sum: number, inst: any) => sum + (inst.amount || 0),
            0
          )
          if (Math.abs(totalInstallments - (data.totalFee || 0)) > 0.01) {
            throw new Error(
              `Total installments (${totalInstallments}) must equal total fee (${data.totalFee})`
            )
          }
        }
        return data
      },
    ],
  },
  timestamps: true,
}

