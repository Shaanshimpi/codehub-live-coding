// Code Execution Service using OneCompiler API
// https://onecompiler.com

export interface ExecutionResult {
  stdout: string
  stderr: string
  status: 'success' | 'runtime_error' | 'compilation_error' | 'timeout' | 'error'
  executionTime?: number
  memory?: number
  exitCode?: number
}

interface OneCompilerResponse {
  stdout?: string
  stderr?: string
  exception?: string
  status?: string
  executionTime?: number
  memory?: number
}

// Use our Next.js API route to avoid CORS issues
const EXECUTION_API = '/api/execute'

/**
 * Execute code using OneCompiler (via our API proxy)
 * @param language - Programming language (javascript, python, c, cpp, java)
 * @param code - Source code to execute
 * @param input - Optional stdin input
 * @returns Execution result with stdout, stderr, and status
 */
export async function executeCode(
  language: string,
  code: string,
  input?: string,
): Promise<ExecutionResult> {
  try {
    // Call our Next.js API route (which proxies to OneCompiler)
    const response = await fetch(EXECUTION_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        code,
        input: input || '',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${response.status}`)
    }

    const result: OneCompilerResponse = await response.json()

    // Determine status from the response
    let status: ExecutionResult['status'] = 'success'
    if (result.exception || result.stderr) {
      // Check if it's a compilation error or runtime error
      const errorMessage = result.exception || result.stderr || ''
      if (
        errorMessage.includes('SyntaxError') ||
        errorMessage.includes('compilation') ||
        errorMessage.includes('error:') ||
        errorMessage.toLowerCase().includes('compile')
      ) {
        status = 'compilation_error'
      } else {
        status = 'runtime_error'
      }
    }

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || result.exception || '',
      status,
      executionTime: result.executionTime,
      memory: result.memory,
      exitCode: status === 'success' ? 0 : 1,
    }
  } catch (error) {
    console.error('Code execution failed:', error)

    // Return error result instead of throwing
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Execution failed',
      status: 'error',
      exitCode: 1,
    }
  }
}

/**
 * Get list of supported languages
 */
export function getSupportedLanguages(): string[] {
  return ['javascript', 'python', 'c', 'cpp', 'java']
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return getSupportedLanguages().includes(language)
}

