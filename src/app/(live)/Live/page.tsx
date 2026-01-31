import Link from 'next/link'
import React from 'react'

import { getMeUser } from '@/auth/getMeUser'

export default async function LiveIndexPage() {
  // Require authentication; redirect unauthenticated users to admin login
  await getMeUser({ nullUserRedirect: '/admin?redirect=/Live' })

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Live Coding Platform</h1>
          <p className="text-sm text-muted-foreground">
            Pick a lecture to join the live room (Phase 1 – Step 1 complete)
          </p>
        </header>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-3 text-sm font-medium">Quick Links</h2>
          <ul className="space-y-2">
            <li>
              <Link
                className="block rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                href="/Live/demo-lecture"
              >
                Demo Lecture
              </Link>
            </li>
            <li>
              <Link
                className="block rounded-md border px-4 py-2 text-center text-sm font-medium hover:bg-accent transition-colors"
                href="/Live/test-lecture"
              >
                Test Lecture
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Next:</strong> Step 2 will add a brand-new live code editor component.
          </p>
        </div>
      </div>
    </div>
  )
}

