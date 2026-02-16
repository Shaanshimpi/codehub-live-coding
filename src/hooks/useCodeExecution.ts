import { useState, useCallback } from 'react'
import { executeCode, type ExecutionResult } from '@/services/codeExecution'

interface UseCodeExecutionOptions {
  /** Optional callback after successful execution */
  onExecutionComplete?: (result: ExecutionResult) => void | Promise<void>
  /** Optional callback on execution error */
  onExecutionError?: (error: Error) => void
}

interface UseCodeExecutionReturn {
  /** Execute code with given language and optional input */
  execute: (language: string, code: string, input?: string) => Promise<ExecutionResult | null>
  /** Whether code is currently executing */
  executing: boolean
  /** Last execution result */
  result: ExecutionResult | null
  /** Clear the execution result */
  clearResult: () => void
}

/**
 * Shared hook for code execution logic.
 * Handles execution state, error handling, and optional callbacks.
 */
export function useCodeExecution(options: UseCodeExecutionOptions = {}): UseCodeExecutionReturn {
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)

  const execute = useCallback(
    async (language: string, code: string, input?: string): Promise<ExecutionResult | null> => {
      setExecuting(true)
      setResult(null)

      try {
        const executionResult = await executeCode(language, code, input)
        setResult(executionResult)

        if (options.onExecutionComplete) {
          await options.onExecutionComplete(executionResult)
        }

        return executionResult
      } catch (error) {
        const errorResult: ExecutionResult = {
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Unknown error occurred',
          status: 'error',
          exitCode: 1,
        }
        setResult(errorResult)

        if (options.onExecutionError) {
          options.onExecutionError(error instanceof Error ? error : new Error('Unknown error'))
        } else {
          console.error('Execution error:', error)
        }

        return errorResult
      } finally {
        setExecuting(false)
      }
    },
    [options.onExecutionComplete, options.onExecutionError]
  )

  const clearResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    execute,
    executing,
    result,
    clearResult,
  }
}

