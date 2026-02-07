/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page = async ({ params, searchParams }: Args) => {
  const resolvedParams = await params
  const segments = resolvedParams.segments || []
  
  // Redirect /admin/unauthorized to home page
  if (segments.includes('unauthorized')) {
    redirect('/')
  }
  
  // Check user role and redirect students/trainers
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()
    const { user } = await payload.auth({ headers: requestHeaders })
    
    // Redirect students and trainers to home page
    if (user && (user.role === 'student' || user.role === 'trainer')) {
      redirect('/')
    }
  } catch (error) {
    // If auth fails, let Payload handle it (user not logged in)
    // Payload will show login page
  }
  
  return RootPage({ config, params, searchParams, importMap })
}

export default Page
