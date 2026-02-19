import type { ParsedErrorLocation } from './errorParser'

export type AIAssistantIssueType =
  | 'syntax-error'
  | 'runtime-error'
  | 'logical-error'
  | 'wrong-output'
  | 'no-error'
  | 'unknown'

export interface ClassifiedIssue {
  type: AIAssistantIssueType
  confidence: number
  reason: string
}

/**
 * Phase 1 classifier: works with what we currently have available in the AI request
 * (typically `stdout || stderr` as a single string).
 *
 * Later phases can improve this by passing the full ExecutionResult + expected output.
 */
export function classifyIssueFromOutput(
  output: string | undefined,
  parsedLocation?: ParsedErrorLocation | null,
): ClassifiedIssue {
  if (!output || !output.trim()) {
    return { type: 'no-error', confidence: 0.9, reason: 'No output provided' }
  }

  const text = output.toLowerCase()

  if (parsedLocation?.kind === 'syntax-error') {
    return { type: 'syntax-error', confidence: 0.9, reason: 'Parsed syntax error location/message' }
  }

  if (parsedLocation?.kind === 'runtime-error') {
    return { type: 'runtime-error', confidence: 0.85, reason: 'Parsed runtime error location/message' }
  }

  if (text.includes('traceback') || text.includes('exception') || text.includes('runtimeerror')) {
    return { type: 'runtime-error', confidence: 0.8, reason: 'Looks like a runtime error output' }
  }

  if (
    text.includes('syntaxerror') ||
    text.includes('indentationerror') ||
    text.includes('taberror') ||
    text.includes('error:') ||
    text.includes('compilation') ||
    text.includes('compile')
  ) {
    return { type: 'syntax-error', confidence: 0.7, reason: 'Looks like a compilation/syntax error output' }
  }

  // With only one output string, we cannot reliably detect wrong-output/logical-error.
  // Keep this as unknown for now (Phase 5+ will improve).
  return { type: 'unknown', confidence: 0.4, reason: 'Insufficient info (stdout/stderr conflated)' }
}


