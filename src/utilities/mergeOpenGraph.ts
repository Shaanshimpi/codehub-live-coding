import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: 'CodeHub - Interactive live coding platform for trainers and students. Learn programming with real-time code sessions.',
  images: [
    {
      url: `${getServerSideURL()}/codehub-og.webp`,
    },
  ],
  siteName: 'CodeHub',
  title: 'CodeHub - Live Coding Platform',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
