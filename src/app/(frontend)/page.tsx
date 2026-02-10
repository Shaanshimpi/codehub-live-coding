import type { Metadata } from 'next'
import { Code } from 'lucide-react'
import { HomePageClient } from './page-client'

export const metadata: Metadata = {
  title: 'CodeHub - Live Coding Platform',
  description: 'Interactive live coding platform for students and trainers',
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Code className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold">CodeHub</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Live Coding Platform for Interactive Learning
          </p>
        </div>

        {/* Action Buttons - Client-side to react to auth state */}
        <HomePageClient />

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 pt-12 mt-12 border-t">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Personal Workspace</h3>
            <p className="text-sm text-muted-foreground">
              Create, organize, and manage your code files in nested folders
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Live Sessions</h3>
            <p className="text-sm text-muted-foreground">
              Join interactive coding sessions with real-time code sharing
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Get guided help and explanations while you learn
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
