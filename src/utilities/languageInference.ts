/**
 * Utility functions for inferring programming language from file names.
 * 
 * @module languageInference
 */

import { SUPPORTED_LANGUAGES } from '@/components/LiveCodePlayground/types'

/**
 * Infers programming language from file name based on file extension.
 * 
 * @param fileName - The file name (e.g., "script.js", "main.py")
 * @param fallback - Fallback language if extension not found (default: 'javascript')
 * @returns Language ID (e.g., 'javascript', 'python')
 * 
 * @example
 * ```ts
 * inferLanguageFromFileName('script.js') // Returns 'javascript'
 * inferLanguageFromFileName('main.py') // Returns 'python'
 * inferLanguageFromFileName('unknown.xyz') // Returns 'javascript' (fallback)
 * ```
 */
export function inferLanguageFromFileName(
  fileName: string,
  fallback: string = 'javascript'
): string {
  const parts = fileName.split('.')
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
  
  if (!ext) {
    console.log('[languageInference] No extension found, using fallback', { fileName, fallback })
    return fallback
  }
  
  const byExt = SUPPORTED_LANGUAGES.find(
    (lang) => lang.extension.replace('.', '') === ext
  )
  
  if (byExt) {
    console.log('[languageInference] Language inferred from extension', { fileName, ext, language: byExt.id })
    return byExt.id
  }
  
  console.log('[languageInference] Extension not found in supported languages, using fallback', { 
    fileName, 
    ext, 
    fallback 
  })
  return fallback
}

