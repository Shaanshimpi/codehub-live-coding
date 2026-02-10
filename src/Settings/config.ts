import type { GlobalConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const PlatformSettings: GlobalConfig = {
  slug: 'platform-settings',
  access: {
    read: () => true, // Allow authenticated users to read (for APIs)
    update: adminOnly,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Trial & Enrollment',
          fields: [
            {
              name: 'trialDays',
              type: 'number',
              required: true,
              defaultValue: 7,
              admin: {
                description: 'Number of days for student trial period',
              },
            },
            {
              name: 'autoExtendTrial',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Allow automatic trial extension',
              },
            },
          ],
        },
        {
          label: 'Payment & Fees',
          fields: [
            {
              name: 'blockUnpaidStudents',
              type: 'checkbox',
              required: true,
              defaultValue: true,
              admin: {
                description: 'Toggle to block students with overdue installments',
              },
            },
            {
              name: 'warningDaysBeforeDue',
              type: 'number',
              required: true,
              defaultValue: 7,
              admin: {
                description: 'Days before due date to show warning modal',
              },
            },
            {
              name: 'gracePeriodDays',
              type: 'number',
              required: true,
              defaultValue: 0,
              admin: {
                description: 'Days after due date before blocking (0 = block immediately)',
              },
            },
            {
              name: 'defaultCurrency',
              type: 'text',
              required: true,
              defaultValue: 'INR',
              admin: {
                description: 'Default currency for fees',
              },
            },
            {
              name: 'availableCurrencies',
              type: 'array',
              required: true,
              defaultValue: [
                { code: 'INR', label: 'INR - Indian Rupee' },
                { code: 'USD', label: 'USD - US Dollar' },
                { code: 'EUR', label: 'EUR - Euro' },
              ],
              fields: [
                {
                  name: 'code',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Currency code (e.g., INR, USD, EUR)',
                  },
                },
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Display label (e.g., INR - Indian Rupee)',
                  },
                },
              ],
              admin: {
                description: 'Available currencies for fees',
              },
            },
            {
              name: 'availablePaymentMethods',
              type: 'array',
              required: true,
              defaultValue: [
                { method: 'cash' },
                { method: 'upi' },
                { method: 'card' },
                { method: 'bank_transfer' },
              ],
              fields: [
                {
                  name: 'method',
                  type: 'text',
                  required: true,
                },
              ],
              admin: {
                description: 'Available payment methods',
              },
            },
          ],
        },
        {
          label: 'Platform Control',
          fields: [
            {
              name: 'maintenanceMode',
              type: 'checkbox',
              required: true,
              defaultValue: false,
              admin: {
                description: 'Temporarily block all students (except admins/trainers)',
              },
            },
            {
              name: 'allowAllStudentsDuringMaintenance',
              type: 'checkbox',
              required: true,
              defaultValue: false,
              admin: {
                description: 'If maintenance mode is on, allow all students regardless of fees',
              },
            },
          ],
        },
        {
          label: 'Limits',
          fields: [
            {
              name: 'maxInstallmentsPerFee',
              type: 'number',
              admin: {
                description: 'Maximum installments allowed per fee record (optional)',
              },
            },
          ],
        },
      ],
    },
  ],
}

