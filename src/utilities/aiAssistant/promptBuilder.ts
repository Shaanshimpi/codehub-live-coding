/**
 * Prompt Builder - Phase 6
 * Creates error-specific prompts based on classification
 */

import type { AICodeContext } from '@/types/ai-assistant'
import type { ParsedErrorLocation } from './errorParser'

export interface ClassificationResult {
  type: 'syntax-error' | 'logical-error' | 'runtime-error' | 'wrong-output' | 'no-error' | 'unknown'
  confidence?: number
}

export interface PromptContext {
  code: string
  output?: string
  input?: string
  language: string
  parsedError?: ParsedErrorLocation | null
  codeFrame?: string
  issueType?: string
}

/**
 * Builds error-specific prompt based on classification
 */
export function buildErrorSpecificPrompt(
  classification: ClassificationResult,
  context: PromptContext,
  requestType: string,
  customMessage?: string,
): string {
  console.log('[PromptBuilder] Building prompt for error type:', classification.type)

  let message = ''

  if (customMessage) {
    message += `${customMessage}\n\n`
  }

  // Add code
  message += `**Code:**\n\`\`\`${context.language}\n${context.code}\n\`\`\`\n\n`

  // Add output/errors
  if (context.output) {
    message += `**Output/Errors:**\n\`\`\`\n${context.output}\n\`\`\`\n\n`
  }

  // Error-specific instructions based on classification
  switch (classification.type) {
    case 'syntax-error':
      message += buildSyntaxErrorPrompt(context)
      break
    case 'logical-error':
      message += buildLogicalErrorPrompt(context)
      break
    case 'runtime-error':
      message += buildRuntimeErrorPrompt(context)
      break
    case 'wrong-output':
      message += buildWrongOutputPrompt(context)
      break
    case 'no-error':
      message += buildGeneralPrompt(context, requestType)
      break
    case 'unknown':
      message += buildGeneralPrompt(context, requestType)
      break
    default:
      message += buildGeneralPrompt(context, requestType)
      break
  }

  if (context.input) {
    message += `\n**Input provided:**\n\`\`\`\n${context.input}\n\`\`\`\n\n`
  }

  console.log('[PromptBuilder] Prompt built, length:', message.length)
  return message
}

/**
 * Syntax error prompt - error location already known
 */
function buildSyntaxErrorPrompt(context: PromptContext): string {
  let prompt = '**SYNTAX ERROR DETECTED**\n\n'
  
  if (context.parsedError?.line) {
    prompt += `The error is at line ${context.parsedError.line}, column ${context.parsedError.column || 0}.\n`
    prompt += `Error message: ${context.parsedError.message || 'Syntax error'}\n\n`
  }

  if (context.codeFrame) {
    prompt += `**Code frame:**\n\`\`\`\n${context.codeFrame}\n\`\`\`\n\n`
  }

  prompt += 'Please explain:\n'
  prompt += '1. What the syntax error is\n'
  prompt += '2. Why it occurred\n'
  prompt += '3. How to fix it\n'
  prompt += '\nDo NOT try to locate the error - it is already identified above.\n'

  return prompt
}

/**
 * Logical error prompt - includes dry run requirement
 */
function buildLogicalErrorPrompt(context: PromptContext): string {
  let prompt = '**LOGICAL ERROR DETECTED**\n\n'
  prompt += 'The code compiles and runs, but produces incorrect output or behavior.\n\n'
  
  prompt += '**IMPORTANT - DRY RUN REQUIRED:**\n'
  prompt += 'Please provide a DRY RUN table showing step-by-step execution.\n'
  prompt += 'Format:\n'
  prompt += 'DRY RUN:\n'
  prompt += '| step | [variable1] | [variable2] | ... |\n'
  prompt += '| 1    | [value]     | [value]     | ... |\n'
  prompt += '| 2    | [value]     | [value]     | ... |\n'
  prompt += '\n- Maximum 5 rows\n'
  prompt += '- Include all relevant variables that change during execution\n'
  prompt += '- Show the step where the logical error occurs\n'
  prompt += '\nAfter the dry run, explain:\n'
  prompt += '1. What the logical error is\n'
  prompt += '2. Why it produces wrong output\n'
  prompt += '3. How to fix it\n'

  return prompt
}

/**
 * Runtime error prompt
 */
function buildRuntimeErrorPrompt(context: PromptContext): string {
  let prompt = '**RUNTIME ERROR DETECTED**\n\n'
  
  if (context.parsedError?.message) {
    prompt += `Error: ${context.parsedError.message}\n\n`
  }

  if (context.parsedError?.line) {
    prompt += `Error occurred at line ${context.parsedError.line}.\n\n`
  }

  prompt += 'Please explain:\n'
  prompt += '1. What the runtime error is\n'
  prompt += '2. What caused it (null pointer, array bounds, etc.)\n'
  prompt += '3. How to fix it\n'
  prompt += '4. How to prevent it in the future\n'

  return prompt
}

/**
 * Wrong output prompt
 */
function buildWrongOutputPrompt(context: PromptContext): string {
  let prompt = '**WRONG OUTPUT DETECTED**\n\n'
  prompt += 'The code runs without errors but produces incorrect output.\n\n'
  
  prompt += 'Please:\n'
  prompt += '1. Analyze the code logic\n'
  prompt += '2. Identify where the logic goes wrong\n'
  prompt += '3. Explain what the correct output should be\n'
  prompt += '4. Suggest how to fix it\n'
  
  if (context.output) {
    prompt += '\nCurrent output is shown above.\n'
  }

  return prompt
}

/**
 * General prompt for no errors or explanations
 */
function buildGeneralPrompt(context: PromptContext, requestType: string): string {
  let prompt = ''

  switch (requestType) {
    case 'explain-code':
      prompt += 'Please explain what this code does, including:\n'
      prompt += '1. Overall purpose\n'
      prompt += '2. Key concepts used\n'
      prompt += '3. How it works step by step\n'
      break
    case 'debug-error':
      prompt += 'Please help analyze this code and identify any potential issues.\n'
      break
    case 'improve-code':
      prompt += 'Please suggest improvements to this code, including:\n'
      prompt += '1. Code quality improvements\n'
      prompt += '2. Performance optimizations\n'
      prompt += '3. Best practices\n'
      break
    case 'generate-tests':
      prompt += 'Please generate test cases for this code.\n'
      break
    case 'answer-question':
      // Custom message already included
      break
    default:
      prompt += 'Please help with this request.\n'
      break
  }

  return prompt
}

