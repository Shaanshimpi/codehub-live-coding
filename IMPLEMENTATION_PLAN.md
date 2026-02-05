# Student Fee Tracking & Payment Management - Implementation Plan

## Overview

This document outlines a phased approach to implement student fee tracking, payment blocking, and notification system for the CodeHub Live Coding Platform. The implementation includes:

- Platform Settings Global for configurable trial days, payment blocking toggles, and other settings
- Fees Collection with installments array for tracking student payments
- Extended Users Collection with personal information and trial/admission fields
- Payment Guard utility to check student payment status
- Frontend components for blocking unpaid students and showing due-date warnings
- API route updates to enforce payment checks

---

## Phase 1: Data Model Setup (Foundation)

### Goals
1. Create Platform Settings Global collection for admin-configurable settings
2. Create Fees Collection with installments array structure
3. Extend Users Collection with trial, admission, and personal information fields
4. Register new collections/globals in Payload config
5. Generate TypeScript types

### Code Changes

#### 1.1 Create Platform Settings Global
**File:** `live-coding/src/Settings/config.ts` (NEW)

```typescript
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
              name: 'availablePaymentMethods',
              type: 'array',
              required: true,
              defaultValue: ['cash', 'upi', 'card', 'bank_transfer'],
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
```

#### 1.2 Create Fees Collection
**File:** `live-coding/src/collections/Fees.ts` (NEW)

```typescript
import type { CollectionConfig } from 'payload'
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
        description: 'Currency code',
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
          type: 'select',
          admin: {
            description: 'Payment method used',
          },
          options: [
            { label: 'Cash', value: 'cash' },
            { label: 'UPI', value: 'upi' },
            { label: 'Card', value: 'card' },
            { label: 'Bank Transfer', value: 'bank_transfer' },
            { label: 'Other', value: 'other' },
          ],
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
        components: {
          RowLabel: ({ data }) => {
            return `Installment: ${data?.amount || 0} ${data?.currency || 'INR'} - Due: ${data?.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A'}`
          },
        },
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
        }
        return data
      },
    ],
  },
  timestamps: true,
}
```

#### 1.3 Extend Users Collection
**File:** `live-coding/src/collections/Users/index.ts` (MODIFY)

Add these fields after the existing `role` field:

```typescript
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
```

#### 1.4 Update Payload Config
**File:** `live-coding/src/payload.config.ts` (MODIFY)

Add imports:
```typescript
import { Fees } from './collections/Fees'
import { PlatformSettings } from './Settings/config'
```

Update collections array:
```typescript
collections: [Pages, Posts, Media, Categories, Users, Languages, LiveSessions, Folders, Files, Fees],
```

Update globals array:
```typescript
globals: [Header, Footer, PlatformSettings],
```

### Test Cases

#### Terminal/Cursor Browser Tests

1. **Verify Collections Created**
   ```bash
   # Check if Fees collection exists in Payload
   curl http://localhost:3000/api/fees -H "Cookie: payload-token=YOUR_ADMIN_TOKEN"
   ```

2. **Verify Global Settings Created**
   ```bash
   # Check if Platform Settings global exists
   curl http://localhost:3000/api/globals/platform-settings -H "Cookie: payload-token=YOUR_ADMIN_TOKEN"
   ```

3. **Verify TypeScript Types Generated**
   ```bash
   # Run type generation
   pnpm generate:types
   # Check if payload-types.ts includes Fees and PlatformSettings types
   grep -i "fees\|platformsettings" live-coding/src/payload-types.ts
   ```

#### Browser Tests (User)

1. **Access Payload Admin**
   - Navigate to `http://localhost:3000/admin`
   - Login as admin
   - Verify "Fees" collection appears in sidebar
   - Verify "Globals" → "Platform Settings" appears in sidebar

2. **Create Platform Settings**
   - Go to Globals → Platform Settings
   - Verify all tabs are visible (Trial & Enrollment, Payment & Fees, Platform Control, Limits)
   - Set trialDays to 7
   - Set blockUnpaidStudents to true
   - Set warningDaysBeforeDue to 7
   - Save and verify success message

3. **Create Test User with Personal Info**
   - Go to Collections → Users
   - Create new user or edit existing
   - Fill in Basic Info tab (phone, altPhone)
   - Fill in Personal Details tab (DOB, college, educationalBackground)
   - Fill in Address tab (address, city, state, postalCode, country)
   - Set trialStartDate and trialEndDate
   - Save and verify all fields are saved

4. **Create Test Fee Record**
   - Go to Collections → Fees
   - Click "Create New"
   - Select a student from dropdown
   - Enter totalFee: 10000
   - Set currency: INR
   - Add 3 installments:
     - Installment 1: dueDate (today + 30 days), amount: 3000, isPaid: false
     - Installment 2: dueDate (today + 60 days), amount: 3000, isPaid: false
     - Installment 3: dueDate (today + 90 days), amount: 4000, isPaid: false
   - Save and verify fee record is created

---

## Phase 2: Payment Guard Utility

### Goals
1. Create reusable payment guard utility function
2. Implement logic to check trial period, admission status, and installment due dates
3. Respect Platform Settings for blocking and warning thresholds
4. Return structured status object for API consumption

### Code Changes

#### 2.1 Create Payment Guard Utility
**File:** `live-coding/src/utilities/paymentGuard.ts` (NEW)

```typescript
import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

export interface InstallmentInfo {
  dueDate: string
  amount: number
  paymentMethod?: string
  isPaid: boolean
}

export interface PaymentStatus {
  isBlocked: boolean
  isDueSoon: boolean
  nextInstallment: InstallmentInfo | null
  reason?: 'MAINTENANCE_MODE' | 'ADMISSION_NOT_CONFIRMED' | 'PAYMENT_OVERDUE' | 'TRIAL_EXPIRED'
  daysUntilDue?: number
  daysOverdue?: number
}

export async function checkStudentPaymentStatus(
  userId: number,
  req: PayloadRequest
): Promise<PaymentStatus> {
  const payload = await getPayload({ config })

  // 1. Fetch Platform Settings
  const settings = await payload.findGlobal({
    slug: 'platform-settings',
  })

  if (!settings) {
    // If settings don't exist, default to allowing access
    return {
      isBlocked: false,
      isDueSoon: false,
      nextInstallment: null,
    }
  }

  // 2. Check maintenance mode
  if (settings.maintenanceMode) {
    if (settings.allowAllStudentsDuringMaintenance) {
      return {
        isBlocked: false,
        isDueSoon: false,
        nextInstallment: null,
      }
    }
    return {
      isBlocked: true,
      isDueSoon: false,
      nextInstallment: null,
      reason: 'MAINTENANCE_MODE',
    }
  }

  // 3. Get user document
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
  })

  if (!user) {
    return {
      isBlocked: true,
      isDueSoon: false,
      nextInstallment: null,
      reason: 'ADMISSION_NOT_CONFIRMED',
    }
  }

  // 4. Check if user is in trial period
  if (user.trialEndDate) {
    const trialEnd = new Date(user.trialEndDate)
    const now = new Date()
    if (trialEnd > now) {
      // Trial is still active
      return {
        isBlocked: false,
        isDueSoon: false,
        nextInstallment: null,
      }
    }
  }

  // 5. Check admission confirmation
  if (!user.isAdmissionConfirmed) {
    return {
      isBlocked: true,
      isDueSoon: false,
      nextInstallment: null,
      reason: 'ADMISSION_NOT_CONFIRMED',
    }
  }

  // 6. Fetch active fees document for this student
  const fees = await payload.find({
    collection: 'fees',
    where: {
      and: [
        {
          student: {
            equals: userId,
          },
        },
        {
          isActive: {
            equals: true,
          },
        },
      ],
    },
    limit: 1,
  })

  if (fees.docs.length === 0) {
    // No fees record found - allow access (admin can create fees later)
    return {
      isBlocked: false,
      isDueSoon: false,
      nextInstallment: null,
    }
  }

  const feeRecord = fees.docs[0]

  // 7. Find the earliest unpaid installment
  if (!feeRecord.installments || !Array.isArray(feeRecord.installments)) {
    return {
      isBlocked: false,
      isDueSoon: false,
      nextInstallment: null,
    }
  }

  const unpaidInstallments = feeRecord.installments
    .filter((inst: any) => !inst.isPaid)
    .sort((a: any, b: any) => {
      const dateA = new Date(a.dueDate).getTime()
      const dateB = new Date(b.dueDate).getTime()
      return dateA - dateB
    })

  if (unpaidInstallments.length === 0) {
    // All installments are paid
    return {
      isBlocked: false,
      isDueSoon: false,
      nextInstallment: null,
    }
  }

  const nextInstallment = unpaidInstallments[0]
  const dueDate = new Date(nextInstallment.dueDate)
  const now = new Date()
  const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // 8. Calculate status based on Platform Settings
  const isOverdue = daysDiff < 0
  const daysOverdue = isOverdue ? Math.abs(daysDiff) : 0
  const gracePeriodActive = isOverdue && daysOverdue <= (settings.gracePeriodDays || 0)

  const installmentInfo: InstallmentInfo = {
    dueDate: nextInstallment.dueDate,
    amount: nextInstallment.amount,
    paymentMethod: nextInstallment.paymentMethod,
    isPaid: false,
  }

  // Check if due soon (within warning threshold)
  const isDueSoon = !isOverdue && daysDiff > 0 && daysDiff <= (settings.warningDaysBeforeDue || 7)

  // Check if should be blocked
  const shouldBlock = 
    settings.blockUnpaidStudents && 
    isOverdue && 
    !gracePeriodActive

  return {
    isBlocked: shouldBlock,
    isDueSoon,
    nextInstallment: installmentInfo,
    reason: shouldBlock ? 'PAYMENT_OVERDUE' : undefined,
    daysUntilDue: !isOverdue ? daysDiff : undefined,
    daysOverdue: isOverdue ? daysOverdue : undefined,
  }
}
```

### Test Cases

#### Terminal/Cursor Browser Tests

1. **Test Payment Guard - Trial Active**
   ```bash
   # Create test script: test-payment-guard-trial.js
   # Test with user in trial period
   node -e "
   const { checkStudentPaymentStatus } = require('./src/utilities/paymentGuard.ts');
   // Mock req object
   const result = await checkStudentPaymentStatus(1, mockReq);
   console.log('Trial Active Result:', JSON.stringify(result, null, 2));
   "
   ```

2. **Test Payment Guard - Admission Not Confirmed**
   ```bash
   # Test with user who hasn't confirmed admission
   # Should return isBlocked: true, reason: 'ADMISSION_NOT_CONFIRMED'
   ```

3. **Test Payment Guard - Payment Overdue**
   ```bash
   # Test with user who has overdue installment
   # Should return isBlocked: true, reason: 'PAYMENT_OVERDUE'
   ```

4. **Test Payment Guard - Due Soon**
   ```bash
   # Test with user who has installment due in 5 days
   # Should return isDueSoon: true, daysUntilDue: 5
   ```

#### Browser Tests (User)

1. **Test via API Endpoint (Create Test Endpoint)**
   - Create temporary test endpoint: `/api/test-payment-status`
   - Login as student
   - Navigate to test endpoint
   - Verify JSON response shows correct payment status

2. **Test Different Scenarios in Payload Admin**
   - Create user with trialEndDate in future → Should not be blocked
   - Create user with trialEndDate in past, isAdmissionConfirmed: false → Should be blocked
   - Create user with overdue installment → Should be blocked
   - Create user with installment due in 5 days → Should show isDueSoon: true

---

## Phase 3: API Route Integration

### Goals
1. Integrate payment guard into session join API
2. Integrate payment guard into workspace files API
3. Integrate payment guard into session live/broadcast APIs
4. Return payment status in API responses for frontend consumption
5. Return appropriate error codes (403) for blocked students

### Code Changes

#### 3.1 Update Session Join API
**File:** `live-coding/src/app/api/sessions/[code]/join/route.ts` (MODIFY)

Add import:
```typescript
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'
```

Add payment check after user authentication (around line 28):
```typescript
// Get authenticated user
const { user } = await getMeUser({ nullUserRedirect: undefined })
if (!user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

// Check payment status for students
if (user.role === 'student') {
  const paymentStatus = await checkStudentPaymentStatus(user.id, req as any)
  if (paymentStatus.isBlocked) {
    return NextResponse.json(
      { 
        error: paymentStatus.reason || 'PAYMENT_REQUIRED',
        message: 'Access blocked due to payment status',
        paymentStatus,
      },
      { status: 403 }
    )
  }
  // Include payment status in success response
  // ... rest of existing code ...
  return NextResponse.json({
    success: true,
    sessionId: session.id,
    title: session.title,
    language: languageName,
    participantCount,
    paymentStatus, // Add this
  })
}
```

#### 3.2 Update Workspace Files API
**File:** `live-coding/src/app/api/workspace/files/route.ts` (MODIFY)

Add import:
```typescript
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'
```

Add payment check after user authentication (around line 23):
```typescript
if (!user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

// Check payment status for students
if (user.role === 'student') {
  const paymentStatus = await checkStudentPaymentStatus(user.id, req as any)
  if (paymentStatus.isBlocked) {
    return NextResponse.json(
      { 
        error: paymentStatus.reason || 'PAYMENT_REQUIRED',
        message: 'Access blocked due to payment status',
        paymentStatus,
      },
      { status: 403 }
    )
  }
}
```

Update return statement to include payment status:
```typescript
return NextResponse.json({
  files: filesList,
  paymentStatus, // Add this if user is student
})
```

#### 3.3 Update Session Live API
**File:** `live-coding/src/app/api/sessions/[code]/live/route.ts` (MODIFY)

Add import and payment check (optional - for student polling):
```typescript
import { getMeUser } from '@/auth/getMeUser'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'

// After finding session, check if user is student and add payment status
let paymentStatus = null
try {
  const { user } = await getMeUser({ nullUserRedirect: undefined })
  if (user && user.role === 'student') {
    paymentStatus = await checkStudentPaymentStatus(user.id, req as any)
  }
} catch (error) {
  // User not authenticated, continue without payment status
}

return NextResponse.json({
  code: session.currentCode || '',
  output: session.currentOutput || null,
  isActive: session.isActive,
  title: session.title,
  language: languageSlug,
  participantCount,
  trainerWorkspaceFileId: session.trainerWorkspaceFileId || null,
  trainerWorkspaceFileName: session.trainerWorkspaceFileName || null,
  paymentStatus, // Add this
})
```

#### 3.4 Create User Payment Status API (Optional Helper)
**File:** `live-coding/src/app/api/user/payment-status/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getMeUser } from '@/auth/getMeUser'
import { checkStudentPaymentStatus } from '@/utilities/paymentGuard'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getMeUser({ nullUserRedirect: undefined })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'This endpoint is for students only' },
        { status: 403 }
      )
    }

    const paymentStatus = await checkStudentPaymentStatus(user.id, request as any)

    return NextResponse.json({
      paymentStatus,
    })
  } catch (error) {
    console.error('Error fetching payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    )
  }
}
```

### Test Cases

#### Terminal/Cursor Browser Tests

1. **Test Session Join - Blocked Student**
   ```bash
   # Login as student with overdue payment
   curl -X POST http://localhost:3000/api/sessions/ABC123/join \
     -H "Cookie: payload-token=STUDENT_TOKEN" \
     -H "Content-Type: application/json"
   # Expected: 403 status, error: "PAYMENT_OVERDUE"
   ```

2. **Test Session Join - Allowed Student**
   ```bash
   # Login as student with valid payment
   curl -X POST http://localhost:3000/api/sessions/ABC123/join \
     -H "Cookie: payload-token=STUDENT_TOKEN" \
     -H "Content-Type: application/json"
   # Expected: 200 status, includes paymentStatus in response
   ```

3. **Test Workspace Files - Blocked Student**
   ```bash
   curl http://localhost:3000/api/workspace/files \
     -H "Cookie: payload-token=STUDENT_TOKEN"
   # Expected: 403 status if blocked
   ```

4. **Test Payment Status Endpoint**
   ```bash
   curl http://localhost:3000/api/user/payment-status \
     -H "Cookie: payload-token=STUDENT_TOKEN"
   # Expected: 200 status, JSON with paymentStatus object
   ```

#### Browser Tests (User)

1. **Test Session Join Flow**
   - Login as student with overdue payment
   - Try to join a session via UI
   - Verify error message appears: "Access blocked due to payment status"
   - Check browser console/network tab for 403 response

2. **Test Workspace Access**
   - Login as student with overdue payment
   - Try to access workspace/files
   - Verify blocked message appears
   - Check network tab for 403 response

3. **Test Due Soon Warning**
   - Login as student with installment due in 5 days
   - Join session successfully (should not be blocked)
   - Check API response includes `paymentStatus.isDueSoon: true`

4. **Test Trial Period**
   - Login as student with active trial (trialEndDate in future)
   - Join session successfully
   - Verify no payment checks are blocking

---

## Phase 4: Frontend Components

### Goals
1. Create PaymentBlocked component for full-screen blocking UI
2. Create PaymentDueModal component for warning modal
3. Update StudentSessionWorkspace to check payment status and show appropriate UI
4. Handle payment status from API responses
5. Implement localStorage for modal dismissal (optional)

### Code Changes

#### 4.1 Create Payment Blocked Component
**File:** `live-coding/src/components/PaymentBlocked/index.tsx` (NEW)

```typescript
'use client'

import React from 'react'
import { AlertCircle, CreditCard, Mail, Phone } from 'lucide-react'
import { cn } from '@/utilities/ui'

interface PaymentBlockedProps {
  reason?: string
  nextInstallment?: {
    dueDate: string
    amount: number
    paymentMethod?: string
  }
  daysOverdue?: number
}

export function PaymentBlocked({ reason, nextInstallment, daysOverdue }: PaymentBlockedProps) {
  const getReasonMessage = () => {
    switch (reason) {
      case 'PAYMENT_OVERDUE':
        return daysOverdue 
          ? `Your payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
          : 'Your payment is overdue'
      case 'ADMISSION_NOT_CONFIRMED':
        return 'Please confirm your admission to continue'
      case 'MAINTENANCE_MODE':
        return 'Platform is currently under maintenance'
      default:
        return 'Access is currently restricted'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Access Restricted
          </h1>
          
          <p className="mb-6 text-gray-600">
            {getReasonMessage()}
          </p>

          {nextInstallment && (
            <div className="mb-6 w-full rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Next Installment</h3>
              </div>
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Amount:</span> ₹{nextInstallment.amount}
                </p>
                <p>
                  <span className="font-medium">Due Date:</span>{' '}
                  {new Date(nextInstallment.dueDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {nextInstallment.paymentMethod && (
                  <p>
                    <span className="font-medium">Payment Method:</span>{' '}
                    {nextInstallment.paymentMethod}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="w-full space-y-3">
            <p className="text-sm text-gray-600">
              Please contact us to resolve this issue:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4" />
                <span>support@codehub.com</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4" />
                <span>+91 1234567890</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 4.2 Create Payment Due Modal Component
**File:** `live-coding/src/components/PaymentDueModal/index.tsx` (NEW)

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, CreditCard } from 'lucide-react'
import { cn } from '@/utilities/ui'

interface PaymentDueModalProps {
  isOpen: boolean
  onClose: () => void
  nextInstallment: {
    dueDate: string
    amount: number
    paymentMethod?: string
  }
  daysUntilDue: number
}

export function PaymentDueModal({ 
  isOpen, 
  onClose, 
  nextInstallment, 
  daysUntilDue 
}: PaymentDueModalProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Check if user has dismissed this modal before
      const dismissedKey = `payment-due-dismissed-${nextInstallment.dueDate}`
      const wasDismissed = localStorage.getItem(dismissedKey)
      if (wasDismissed) {
        setDismissed(true)
      }
    }
  }, [isOpen, nextInstallment.dueDate])

  const handleDismiss = () => {
    const dismissedKey = `payment-due-dismissed-${nextInstallment.dueDate}`
    localStorage.setItem(dismissedKey, 'true')
    setDismissed(true)
    onClose()
  }

  if (!isOpen || dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-yellow-100 p-2">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Payment Due Soon
          </h2>
        </div>

        <p className="mb-4 text-gray-700">
          Your next installment is due in{' '}
          <span className="font-semibold text-yellow-600">
            {daysUntilDue} day{daysUntilDue > 1 ? 's' : ''}
          </span>
          . Please make sure to complete the payment to avoid service interruption.
        </p>

        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Installment Details</h3>
          </div>
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <span className="font-medium">Amount:</span> ₹{nextInstallment.amount}
            </p>
            <p>
              <span className="font-medium">Due Date:</span>{' '}
              {new Date(nextInstallment.dueDate).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Remind Me Later
          </button>
          <button
            onClick={() => {
              // Navigate to payment page or contact page
              window.location.href = '/contact'
            }}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### 4.3 Update StudentSessionWorkspace
**File:** `live-coding/src/components/SessionWorkspace/StudentSessionWorkspace.tsx` (MODIFY)

Add imports at top:
```typescript
import { PaymentBlocked } from '@/components/PaymentBlocked'
import { PaymentDueModal } from '@/components/PaymentDueModal'
```

Add state for payment status (around line 82):
```typescript
const [paymentStatus, setPaymentStatus] = useState<{
  isBlocked: boolean
  isDueSoon: boolean
  nextInstallment: any
  reason?: string
} | null>(null)
const [showPaymentModal, setShowPaymentModal] = useState(false)
```

Add function to check payment status (add after existing functions):
```typescript
const checkPaymentStatus = useCallback(async () => {
  try {
    const res = await fetch('/api/user/payment-status', {
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      setPaymentStatus(data.paymentStatus)
      if (data.paymentStatus.isDueSoon) {
        setShowPaymentModal(true)
      }
    }
  } catch (error) {
    console.error('Error checking payment status:', error)
  }
}, [])
```

Call checkPaymentStatus in useEffect on mount:
```typescript
useEffect(() => {
  checkPaymentStatus()
  // ... existing useEffect code ...
}, [checkPaymentStatus])
```

Add early return for blocked students (before main render, after all hooks):
```typescript
// Early return if payment is blocked
if (paymentStatus?.isBlocked) {
  return (
    <PaymentBlocked
      reason={paymentStatus.reason}
      nextInstallment={paymentStatus.nextInstallment}
      daysOverdue={paymentStatus.daysOverdue}
    />
  )
}
```

Add modal before main return:
```typescript
return (
  <>
    {paymentStatus?.isDueSoon && paymentStatus.nextInstallment && (
      <PaymentDueModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        nextInstallment={paymentStatus.nextInstallment}
        daysUntilDue={paymentStatus.daysUntilDue || 0}
      />
    )}
    {/* ... existing JSX ... */}
  </>
)
```

### Test Cases

#### Terminal/Cursor Browser Tests

1. **Test Component Rendering**
   ```bash
   # Check if components compile without errors
   pnpm build
   # Should complete without TypeScript errors
   ```

2. **Test Payment Status API Integration**
   ```bash
   # Verify API returns correct structure
   curl http://localhost:3000/api/user/payment-status \
     -H "Cookie: payload-token=STUDENT_TOKEN" \
     | jq '.paymentStatus'
   ```

#### Browser Tests (User)

1. **Test Blocked Student UI**
   - Login as student with overdue payment
   - Navigate to session join page
   - Verify PaymentBlocked component is displayed
   - Verify installment details are shown
   - Verify contact information is visible

2. **Test Due Soon Modal**
   - Login as student with installment due in 5 days
   - Join a session
   - Verify PaymentDueModal appears
   - Click "Remind Me Later"
   - Refresh page - modal should not appear again (localStorage)
   - Clear localStorage and refresh - modal should appear again

3. **Test Normal Access**
   - Login as student with all payments up to date
   - Join session
   - Verify no blocking UI or modal appears
   - Verify workspace functions normally

4. **Test Trial Period Student**
   - Login as student with active trial
   - Join session
   - Verify no payment checks interfere
   - Verify workspace functions normally

---

## Phase 5: Admin UI Enhancements

### Goals
1. Improve Fees collection admin UI with better organization
2. Add helpful admin hints and computed fields
3. Add validation for installments (total should match totalFee)
4. Add quick actions for marking payments as paid

### Code Changes

#### 5.1 Enhance Fees Collection Admin UI
**File:** `live-coding/src/collections/Fees.ts` (MODIFY)

Add validation hook:
```typescript
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
  afterRead: [
    ({ doc }) => {
      // Add computed field for unpaid installments count
      if (doc.installments && Array.isArray(doc.installments)) {
        const unpaidCount = doc.installments.filter((inst: any) => !inst.isPaid).length
        const paidCount = doc.installments.filter((inst: any) => inst.isPaid).length
        return {
          ...doc,
          _unpaidInstallmentsCount: unpaidCount,
          _paidInstallmentsCount: paidCount,
        }
      }
      return doc
    },
  ],
},
```

Add custom admin components for better UI:
```typescript
admin: {
  defaultColumns: ['student', 'totalFee', 'currency', 'updatedAt'],
  useAsTitle: 'student',
  description: 'Manage student fee records and installment schedules',
  components: {
    // Add custom list view if needed
  },
},
```

### Test Cases

#### Terminal/Cursor Browser Tests

1. **Test Installment Validation**
   ```bash
   # Try to create fee with installments that don't sum to totalFee
   # Should return validation error
   ```

2. **Test Auto-paidAt Setting**
   ```bash
   # Update installment with isPaid: true
   # Verify paidAt is automatically set
   ```

#### Browser Tests (User)

1. **Test Fee Creation Validation**
   - Go to Collections → Fees → Create New
   - Set totalFee: 10000
   - Add installments: 3000, 3000, 5000 (total: 11000)
   - Try to save
   - Verify error message appears: "Total installments must equal total fee"

2. **Test Mark Payment as Paid**
   - Edit existing fee record
   - Check "isPaid" checkbox for an installment
   - Save
   - Verify "paidAt" field is automatically filled with current date/time

3. **Test Installment Summary**
   - View fees list
   - Verify unpaid/paid counts are visible (if added to columns)

---

## Phase 6: Testing & Refinement

### Goals
1. End-to-end testing of all payment flows
2. Test edge cases (no fees record, all paid, etc.)
3. Test Platform Settings changes take effect immediately
4. Performance testing for payment guard queries
5. Documentation updates

### Test Cases

#### Comprehensive Browser Tests (User)

1. **Complete Student Journey - Trial to Paid**
   - Create new student user
   - Set trialStartDate and trialEndDate (7 days from now)
   - Login as student, join session → Should work (trial active)
   - Wait for trial to expire (or manually set trialEndDate to past)
   - Set isAdmissionConfirmed: false
   - Try to join session → Should be blocked (admission not confirmed)
   - Set isAdmissionConfirmed: true
   - Try to join session → Should work (no fees record yet)
   - Create fees record with overdue installment
   - Try to join session → Should be blocked (payment overdue)
   - Mark installment as paid
   - Try to join session → Should work

2. **Platform Settings Changes**
   - Set blockUnpaidStudents: false
   - Login as student with overdue payment
   - Join session → Should work (blocking disabled)
   - Set blockUnpaidStudents: true
   - Refresh page, try to join → Should be blocked
   - Set warningDaysBeforeDue: 14
   - Create installment due in 10 days
   - Join session → Should show due soon modal

3. **Maintenance Mode**
   - Set maintenanceMode: true, allowAllStudentsDuringMaintenance: false
   - Login as student → Should be blocked
   - Set allowAllStudentsDuringMaintenance: true
   - Refresh → Should work
   - Set maintenanceMode: false
   - Refresh → Should work normally

4. **Multiple Installments**
   - Create fee with 5 installments
   - Mark first 2 as paid
   - Verify system checks 3rd installment (earliest unpaid)
   - Mark 3rd as paid
   - Verify system checks 4th installment

5. **Grace Period**
   - Set gracePeriodDays: 3
   - Create installment overdue by 2 days
   - Join session → Should work (within grace period)
   - Wait or manually set dueDate to 4 days ago
   - Join session → Should be blocked (beyond grace period)

---

## Deployment Checklist

- [ ] Run database migrations (Payload will auto-generate)
- [ ] Set default Platform Settings values
- [ ] Test all API endpoints
- [ ] Test frontend components in production build
- [ ] Verify TypeScript types are generated
- [ ] Test payment guard performance with large user base
- [ ] Set up monitoring for payment-related errors
- [ ] Document admin workflow for managing fees
- [ ] Create backup strategy for fees data

---

## Rollback Plan

If issues arise:

1. **Disable Payment Blocking Temporarily**
   - Set `blockUnpaidStudents: false` in Platform Settings
   - All students can access regardless of payment status

2. **Disable Maintenance Mode**
   - Set `maintenanceMode: false`
   - Platform returns to normal operation

3. **Remove Payment Checks from APIs**
   - Comment out payment guard calls in API routes
   - Students can access without payment checks

---

## Notes

- All payment status checks are server-side for security
- Frontend components are for UX only, not security
- Platform Settings changes take effect immediately (no restart needed)
- Payment guard queries are optimized to fetch only necessary data
- Consider adding caching for Platform Settings if needed
- Future enhancement: Add payment gateway integration
- Future enhancement: Add automated email reminders for due installments

