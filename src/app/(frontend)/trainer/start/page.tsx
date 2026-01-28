'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, Play } from 'lucide-react'

interface Language {
  id: string
  name: string
}

interface MeResponse {
  user?: {
    id: string
    email: string
    role?: string
  } | null
}

export default function TrainerStartPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [languages, setLanguages] = useState<Language[]>([])
  const [languageId, setLanguageId] = useState<string>('')
  const [me, setMe] = useState<MeResponse['user'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Who am I?
        const meRes = await fetch('/api/users/me', { cache: 'no-store' })
        if (meRes.ok) {
          const meData = await meRes.json()
          setMe(meData.user || null)
        }

        const langRes = await fetch('/api/languages?limit=100', { cache: 'no-store' })
        if (langRes.ok) {
          const langData = await langRes.json()
          const docs: Language[] = langData.docs || []
          setLanguages(docs)
          if (docs.length > 0) {
            setLanguageId(docs[0].id)
          }
        }
      } catch (e) {
        console.error('Error loading trainer start data', e)
        setError('Failed to load languages or user info')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!me?.id) {
      setError('You must be logged in to start a session.')
      return
    }

    if (!title.trim()) {
      setError('Please enter a session title.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          languageId: languageId || undefined,
          trainerId: me.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start session')
      }

      const joinCode = data.joinCode as string
      router.push(`/trainer/session/${joinCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-xl py-12 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <Radio className="h-7 w-7 text-primary" />
          Start Live Session
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a new live coding session and share the join code with your students.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium">Session Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Python Loops – Day 1"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={loading || submitting}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Language</label>
          <select
            value={languageId}
            onChange={(e) => setLanguageId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={loading || submitting || languages.length === 0}
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
          {languages.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No languages found. Add some in the admin under <strong>Languages</strong>.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || submitting || !title.trim() || !me?.id}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            'Starting...'
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Session
            </>
          )}
        </button>

        {me && (
          <p className="mt-2 text-xs text-muted-foreground">
            Logged in as <span className="font-mono">{me.email}</span>
          </p>
        )}
      </form>
    </div>
  )
}


