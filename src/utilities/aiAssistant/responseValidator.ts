// Phase 2: Response validation utility
import type { AIAssistantResponse, ResponseMode } from '@/types/ai-assistant'

export interface ValidationResult {
  valid: boolean
  response?: AIAssistantResponse
  error?: string
  fallback?: boolean
}

/**
 * Validates and formats AI response
 * If response is plain text, converts it to structured format with fallback flag
 */
export function validateAndFormatResponse(
  aiResponseText: string,
  existingStructuredData?: Partial<AIAssistantResponse>
): ValidationResult {
  console.log('[ResponseValidator] Validating response...')
  console.log('[ResponseValidator] Response length:', aiResponseText.length)
  
  // If we already have structured data from Phase 1, use it
  if (existingStructuredData) {
    console.log('[ResponseValidator] Using existing structured data:', JSON.stringify(existingStructuredData, null, 2))
    return {
      valid: true,
      response: {
        message: {
          role: 'assistant',
          content: aiResponseText,
          timestamp: new Date(),
        },
        ...existingStructuredData,
      },
    }
  }
  
  // Try to parse as JSON (if AI returns structured format)
  try {
    const parsed = JSON.parse(aiResponseText)
    if (parsed.mode && parsed.summary) {
      console.log('[ResponseValidator] Response is structured JSON')
      return {
        valid: true,
        response: {
          message: {
            role: 'assistant',
            content: parsed.summary || aiResponseText,
            timestamp: new Date(),
          },
          mode: parsed.mode,
          summary: parsed.summary,
          error: parsed.error,
          hint: parsed.hint,
          dryRun: parsed.dryRun,
          diff: parsed.diff,
          codeFrame: parsed.codeFrame,
        },
      }
    }
  } catch {
    // Not JSON, continue with text fallback
  }
  
  // Fallback: plain text response
  console.log('[ResponseValidator] Response is plain text, using fallback')
  return {
    valid: true,
    response: {
      message: {
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
      },
      mode: 'explanation',
      summary: aiResponseText,
    },
    fallback: true,
  }
}

/**
 * Validates structured response has required fields
 */
export function validateStructuredResponse(response: any): ValidationResult {
  console.log('[ResponseValidator] Validating structured response:', JSON.stringify(response, null, 2))
  
  if (!response) {
    return { valid: false, error: 'Response is null or undefined' }
  }
  
  // Check required fields based on mode
  if (response.mode === 'syntax-error' && !response.error) {
    return { valid: false, error: 'Missing required field: error (for syntax-error mode)' }
  }
  
  if (response.mode === 'logical-error' && !response.dryRun) {
    // dryRun is optional but recommended
    console.log('[ResponseValidator] Warning: logical-error mode without dryRun')
  }
  
  return { valid: true, response }
}

