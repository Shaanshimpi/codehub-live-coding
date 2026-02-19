import { NextRequest, NextResponse } from 'next/server'
import type {
  AIAssistantRequest,
  AIAssistantResponse,
  AIMessage,
  ResponseStyle,
} from '@/types/ai-assistant'
import { validateAndFormatResponse } from '@/utilities/aiAssistant/responseValidator'
import { parseErrorLocation, classifyIssueFromOutput, generateCodeFrame, parseDryRun, buildErrorSpecificPrompt } from '@/utilities/aiAssistant'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

// Default model - can be configured
const DEFAULT_MODEL = 'nvidia/nemotron-nano-9b-v2:free'

// Fallback models in order of preference (if dynamic fetch fails)
const FALLBACK_MODELS = [
  'openai/gpt-oss-20b:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.1-8b-instruct:free',
]

/**
 * Fetches available models from OpenRouter and returns the best free OpenAI model
 */
async function getBestFreeOpenAIModel(): Promise<string | null> {
  try {
    console.log('[AI Assistant] Fetching available models from OpenRouter...')
    const modelsResponse = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'CodeHub Live Coding Platform',
      },
    })

    if (!modelsResponse.ok) {
      console.error('[AI Assistant] Failed to fetch models. Status:', modelsResponse.status)
      return null
    }

    const modelsData = await modelsResponse.json()
    const models = modelsData.data || []

    // Filter for free OpenAI models
    const freeOpenAIModels = models.filter((model: any) => {
      const id = model.id?.toLowerCase() || ''
      const pricing = model.pricing || {}
      const promptPrice = pricing.prompt || '0'
      const completionPrice = pricing.completion || '0'
      
      // Check if it's an OpenAI model and free (or very cheap)
      const isOpenAI = id.includes('openai/')
      const isFree = parseFloat(promptPrice) === 0 && parseFloat(completionPrice) === 0
      
      return isOpenAI && isFree
    })

    if (freeOpenAIModels.length === 0) {
      console.log('[AI Assistant] No free OpenAI models found, checking for cheapest OpenAI models...')
      // If no free models, get cheapest OpenAI models
      const openAIModels = models.filter((model: any) => {
        const id = model.id?.toLowerCase() || ''
        return id.includes('openai/')
      })

      if (openAIModels.length > 0) {
        // Sort by prompt price (ascending)
        openAIModels.sort((a: any, b: any) => {
          const priceA = parseFloat(a.pricing?.prompt || '999')
          const priceB = parseFloat(b.pricing?.prompt || '999')
          return priceA - priceB
        })
        const bestModel = openAIModels[0]
        console.log('[AI Assistant] Selected cheapest OpenAI model:', bestModel.id)
        return bestModel.id
      }
      return null
    }

    // Sort free models by context length (prefer higher context) or by model quality
    freeOpenAIModels.sort((a: any, b: any) => {
      // Prefer GPT-4 variants, then GPT-3.5, then others
      const aId = a.id?.toLowerCase() || ''
      const bId = b.id?.toLowerCase() || ''
      
      if (aId.includes('gpt-4') && !bId.includes('gpt-4')) return -1
      if (!aId.includes('gpt-4') && bId.includes('gpt-4')) return 1
      if (aId.includes('gpt-3.5') && !bId.includes('gpt-3.5')) return -1
      if (!aId.includes('gpt-3.5') && bId.includes('gpt-3.5')) return 1
      
      // Then by context length
      const aContext = a.context_length || 0
      const bContext = b.context_length || 0
      return bContext - aContext
    })

    const bestModel = freeOpenAIModels[0]
    console.log('[AI Assistant] Selected best free OpenAI model:', bestModel.id, '(context:', bestModel.context_length, ')')
    return bestModel.id
  } catch (error) {
    console.error('[AI Assistant] Error fetching models:', error)
    return null
  }
}

/**
 * Makes a request to OpenRouter API with a specific model
 */
function getModeParams(mode: ResponseStyle): { temperature: number; maxTokens: number } {
  switch (mode) {
    case 'full-explain':
      return { temperature: 0.25, maxTokens: 500 }
    case 'hint-only':
      return { temperature: 0.2, maxTokens: 200 }
    case 'visual':
      return { temperature: 0.2, maxTokens: 300 }
    case 'strict':
    default:
      return { temperature: 0.2, maxTokens: 300 }
  }
}

async function callOpenRouterAPI(
  model: string,
  systemPrompt: string,
  userMessage: string,
  responseMode: ResponseStyle,
): Promise<{ response: Response; errorData?: any }> {
  const { temperature, maxTokens } = getModeParams(responseMode)
  
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
  }

  console.log('[AI Assistant] Calling OpenRouter with params:', {
    model,
    responseMode,
    temperature,
    maxTokens,
  })

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'CodeHub Live Coding Platform',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    let errorData: any
    try {
      const errorText = await response.text()
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { raw: errorText }
      }
    } catch {
      errorData = { message: 'Unknown error from OpenRouter API' }
    }
    return { response, errorData }
  }

  return { response }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log('[AI Assistant] Request received at', new Date().toISOString())
  
  try {
    console.log('[AI Assistant] Checking OPENROUTER_API_KEY...')
    if (!OPENROUTER_API_KEY) {
      console.error('[AI Assistant] OPENROUTER_API_KEY not configured')
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 },
      )
    }
    console.log('[AI Assistant] OPENROUTER_API_KEY found (length:', OPENROUTER_API_KEY.length, ')')

    console.log('[AI Assistant] Parsing request body...')
    let request: AIAssistantRequest
    try {
      request = await req.json()
      console.log('[AI Assistant] Request parsed successfully. Type:', request.type, 'Role:', request.user?.role)
    } catch (parseError) {
      console.error('[AI Assistant] Failed to parse request body:', parseError)
      throw new Error(`Failed to parse request body: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }

    const { type, user, codeContext, message } = request
    
    // Validate required fields
    console.log('[AI Assistant] Validating request fields...')
    if (!type) {
      console.error('[AI Assistant] Missing type field')
      throw new Error('Missing required field: type')
    }
    if (!user || !user.role) {
      console.error('[AI Assistant] Missing or invalid user field')
      throw new Error('Missing required field: user.role')
    }
    if (!codeContext || !codeContext.languageSlug) {
      console.error('[AI Assistant] Missing or invalid codeContext field')
      throw new Error('Missing required field: codeContext.languageSlug')
    }
    console.log('[AI Assistant] Request validation passed')

    // Determine response mode (Phase 3)
    const responseMode: ResponseStyle =
      request.responseMode ||
      ((): ResponseStyle => {
        switch (type) {
          case 'debug-error':
            return 'visual'
          case 'improve-code':
            return 'full-explain'
          case 'generate-tests':
            return 'strict'
          default:
            return 'strict'
        }
      })()
    console.log('[AI Assistant][Mode] responseMode:', responseMode)

    // Phase 1: local parsing/classification (best-effort)
    const rawOutput = codeContext?.output
    const parsedError = parseErrorLocation(rawOutput, codeContext?.languageSlug)
    const issue = classifyIssueFromOutput(rawOutput, parsedError)
    console.log('[AI Assistant][Phase1] Issue classification:', {
      type: issue.type,
      confidence: issue.confidence,
      hasParsedError: !!parsedError,
      rawOutputLength: rawOutput?.length || 0,
    })
    const codeFrame =
      parsedError?.line && codeContext?.code
        ? generateCodeFrame(codeContext.code, parsedError.line, parsedError.column)
        : undefined

    console.log('[AI Assistant][Phase1] issue:', issue)
    console.log('[AI Assistant][Phase1] parsedError:', parsedError)
    if (codeFrame) {
      console.log('[AI Assistant][Phase1] codeFrame:\n' + codeFrame)
    }

    // Phase 6: Error classification routing
    console.log('[AI Assistant][Phase6] Classification result:', JSON.stringify(issue, null, 2))
    console.log('[AI Assistant][Phase6] Routing to prompt for error type:', issue.type)

    // Build system prompt based on role and request type
    console.log('[AI Assistant] Building system prompt...')
    let systemPrompt: string
    try {
      systemPrompt = buildSystemPrompt(user.role, type, codeContext.languageSlug, responseMode)
      console.log('[AI Assistant] System prompt built (length:', systemPrompt.length, ')')
    } catch (promptError) {
      console.error('[AI Assistant] Failed to build system prompt:', promptError)
      throw new Error(`Failed to build system prompt: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`)
    }

    // Phase 6: Build error-specific user message
    console.log('[AI Assistant][Phase6] Building error-specific prompt...')
    let userMessage: string
    try {
      // Map 'unknown' to 'no-error' for prompt builder
      const promptType = issue.type === 'unknown' ? 'no-error' : issue.type
      userMessage = buildErrorSpecificPrompt(
        { type: promptType as 'syntax-error' | 'logical-error' | 'runtime-error' | 'wrong-output' | 'no-error', confidence: issue.confidence },
        {
          code: codeContext.code || '',
          output: codeContext.output,
          input: codeContext.input,
          language: codeContext.languageSlug || 'text',
          parsedError: parsedError || undefined,
          codeFrame: codeFrame,
          issueType: issue.type,
        },
        type,
        message,
      )
      console.log('[AI Assistant][Phase6] Error-specific prompt built (length:', userMessage.length, ')')
      console.log('[AI Assistant][Phase6] Prompt includes error type keywords:', 
        userMessage.includes('SYNTAX ERROR') || 
        userMessage.includes('LOGICAL ERROR') || 
        userMessage.includes('RUNTIME ERROR') ||
        userMessage.includes('WRONG OUTPUT'))
    } catch (messageError) {
      console.error('[AI Assistant] Failed to build error-specific prompt:', messageError)
      // Fallback to old buildUserMessage
      console.log('[AI Assistant] Falling back to generic buildUserMessage...')
      userMessage = buildUserMessage(type, codeContext, message, {
        issueType: issue.type,
        parsedError,
        codeFrame,
      })
      console.log('[AI Assistant] Fallback user message built (length:', userMessage.length, ')')
    }

    // Try primary model first
    console.log('[AI Assistant] Attempting primary model:', DEFAULT_MODEL)
    const primaryFetchStartTime = Date.now()
    let primaryResult = await callOpenRouterAPI(DEFAULT_MODEL, systemPrompt, userMessage, responseMode)
    const primaryFetchDuration = Date.now() - primaryFetchStartTime
    console.log('[AI Assistant] Primary model responded in', primaryFetchDuration, 'ms. Status:', primaryResult.response.status)

    // If primary model fails, try fallback
    if (!primaryResult.response.ok) {
      const errorStatus = primaryResult.response.status
      const shouldFallback = errorStatus === 401 || errorStatus === 402 || errorStatus === 403 || 
                             errorStatus === 404 || errorStatus === 429 || errorStatus === 502 || 
                             errorStatus === 503 || errorStatus >= 500
      
      if (shouldFallback) {
        console.warn('[AI Assistant] Primary model failed with status', errorStatus, '- attempting fallback...')
        if (primaryResult.errorData) {
          console.error('[AI Assistant] Error details:', JSON.stringify(primaryResult.errorData))
        }

        // Fetch best free OpenAI model
        console.log('[AI Assistant] Fetching best free OpenAI model...')
        const fallbackModel = await getBestFreeOpenAIModel()
        
        if (fallbackModel) {
          console.log('[AI Assistant] Using fallback model:', fallbackModel)
          const fallbackFetchStartTime = Date.now()
          const fallbackResult = await callOpenRouterAPI(
            fallbackModel,
            systemPrompt,
            userMessage,
            responseMode,
          )
          const fallbackFetchDuration = Date.now() - fallbackFetchStartTime
          console.log('[AI Assistant] Fallback model responded in', fallbackFetchDuration, 'ms. Status:', fallbackResult.response.status)

          if (fallbackResult.response.ok) {
            // Use fallback response
            primaryResult = fallbackResult
          } else {
            console.error('[AI Assistant] Fallback model also failed. Trying hardcoded fallbacks...')
            // Try hardcoded fallback models
            for (const hardcodedModel of FALLBACK_MODELS) {
              console.log('[AI Assistant] Trying hardcoded fallback:', hardcodedModel)
              const hardcodedResult = await callOpenRouterAPI(
                hardcodedModel,
                systemPrompt,
                userMessage,
                responseMode,
              )
              if (hardcodedResult.response.ok) {
                console.log('[AI Assistant] Hardcoded fallback succeeded:', hardcodedModel)
                primaryResult = hardcodedResult
                break
              }
            }
          }
        } else {
          console.warn('[AI Assistant] Could not fetch models, trying hardcoded fallbacks...')
          // Try hardcoded fallback models
          for (const hardcodedModel of FALLBACK_MODELS) {
            console.log('[AI Assistant] Trying hardcoded fallback:', hardcodedModel)
            const hardcodedResult = await callOpenRouterAPI(
              hardcodedModel,
              systemPrompt,
              userMessage,
              responseMode,
            )
            if (hardcodedResult.response.ok) {
              console.log('[AI Assistant] Hardcoded fallback succeeded:', hardcodedModel)
              primaryResult = hardcodedResult
              break
            }
          }
        }
      }
    }

    // Check if we still have an error
    if (!primaryResult.response.ok) {
      console.error('[AI Assistant] All models failed. Final status:', primaryResult.response.status)
      return NextResponse.json(
        { 
          error: primaryResult.errorData?.error?.message || 
                 primaryResult.errorData?.message || 
                 'All AI models failed. Please try again later.' 
        },
        { status: primaryResult.response.status },
      )
    }

    // Parse successful response - SIMPLIFIED VERSION
    console.log('[AI Assistant] Parsing OpenRouter API response...')
    let data: any
    try {
      const responseText = await primaryResult.response.text()
      console.log('[AI Assistant] Response body length:', responseText.length, 'bytes')
      data = JSON.parse(responseText)
      console.log('[AI Assistant] Response parsed successfully')
    } catch (parseError) {
      console.error('[AI Assistant] Failed to parse OpenRouter response:', parseError)
      throw new Error(`Failed to parse OpenRouter API response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }
    
    // Check if response has choices
    if (!data.choices || data.choices.length === 0) {
      console.error('[AI Assistant] No choices in response')
      throw new Error('No choices returned from OpenRouter API')
    }

    // Extract simple text content
    const assistantContent = data.choices[0]?.message?.content || ''
    
    if (!assistantContent || assistantContent.trim().length === 0) {
      console.error('[AI Assistant] Content is empty!')
      throw new Error('Empty response from AI')
    }
    
    console.log('[AI Assistant] Assistant content length:', assistantContent.length)
    console.log('[AI Assistant] Assistant content preview:', assistantContent.substring(0, 200))

    // Return simple response that works with chatbot
    const aiMessage: AIMessage = {
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
    }

    const totalDuration = Date.now() - startTime
    console.log('[AI Assistant] Request completed successfully in', totalDuration, 'ms')
    
    return NextResponse.json({
      message: aiMessage,
      tokensUsed: data.usage?.total_tokens,
    })
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('[AI Assistant] Error after', totalDuration, 'ms:', error)
    console.error('[AI Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

function buildSystemPrompt(
  role: 'trainer' | 'student',
  type: string,
  language: string,
  responseMode: ResponseStyle,
): string {
  // Ensure we have valid values
  const safeRole = role || 'student'
  const safeLanguage = language || 'programming'
  const safeType = type || 'answer-question'
  
  const basePrompt =
    safeRole === 'trainer'
      ? `You are an expert programming teaching assistant helping an instructor teach ${safeLanguage}.
Your role is to help create educational content, explain concepts, and suggest teaching strategies.
Provide clear explanations that instructors can use to teach students.`
      : `You are a friendly programming tutor helping a student learn ${safeLanguage}.

**IMPORTANT RULES:**
1. NEVER write complete code solutions - let students learn by doing
2. Guide students to discover answers themselves through hints and questions
3. When students make mistakes, help them understand WHY it's wrong
4. Break down complex problems into smaller, manageable steps
5. Explain concepts (syntax, datatypes, algorithms, keywords) clearly
6. Use Socratic method - ask guiding questions to help them think
7. Encourage and be patient - learning to code is challenging
8. When showing syntax, use minimal examples with placeholders like _____ for students to fill in

Example good response to "My code has error":
❌ DON'T: "Here's the fixed code: [complete solution]"
✅ DO: "I see you're missing a semicolon. In C, every statement needs to end with ;
Can you check line 3? What do you think should be at the end of that line?"

Be encouraging, patient, and educational!`

  let prompt: string

  switch (safeType) {
    case 'explain-code':
      prompt = safeRole === 'student'
        ? `${basePrompt}\n\nExplain what this code does in simple terms. Focus on the purpose and logic flow, not just line-by-line translation.`
        : `${basePrompt}\n\nProvide a detailed explanation of this code that an instructor can use to teach.`
      break

    case 'debug-error':
      prompt = safeRole === 'student'
        ? `${basePrompt}\n\nThe student has an error. Don't fix it for them!
Instead:
1. Help them understand the error message
2. Guide them to the problematic line
3. Ask questions to help them discover the fix
4. Explain the concept behind the error
Example: "What do you think this error means? Let's look at line X together..."`
        : `${basePrompt}\n\nAnalyze this error and suggest how to explain it to students pedagogically.`
      break

    case 'improve-code':
      prompt = safeRole === 'student'
        ? `${basePrompt}\n\nDon't rewrite their code! Instead:
1. Point out what they did well
2. Ask questions about potential improvements
3. Explain concepts that could help them improve
4. Let them make the changes themselves`
        : `${basePrompt}\n\nSuggest teaching points and best practices for this code.`
      break

    case 'generate-tests':
      prompt = safeRole === 'student'
        ? `${basePrompt}\n\nHelp them understand what test cases would be good for this code.
Don't write the tests - guide them to think of edge cases and scenarios.`
        : `${basePrompt}\n\nSuggest test cases that would help students understand the code behavior.`
      break

    case 'answer-question':
      prompt = basePrompt
      break

    default:
      prompt = basePrompt
  }

  // Phase 3: Global compression rules
  const compressionRules = `

General response rules:
- Default response must be under 8 lines unless the user explicitly asks for a detailed explanation.
- If the issue can be explained in 1 sentence, respond in exactly 1 sentence.
`

  // Phase 3: Mode-specific behavior
  let modeRules = ''
  switch (responseMode) {
    case 'strict':
      modeRules += `- Be as short and direct as possible.\n- Avoid repeating information.\n- Prefer 1–3 short bullet points maximum.\n`
      break
    case 'visual':
      modeRules += `- Prefer visual structure: SUMMARY then a short code frame or table.\n- Avoid long paragraphs; use succinct bullets.\n`
      break
    case 'hint-only':
      modeRules += `- Do NOT give the full solution.\n- Give 1–3 very short hints only.\n- Each hint should be one short sentence.\n`
      break
    case 'full-explain':
      modeRules += `- You may be more detailed, but still avoid unnecessary verbosity.\n- Focus on clarity and step-by-step reasoning.\n`
      break
  }

  return `${prompt}\n${compressionRules}\nMode: ${responseMode}\n${modeRules}`
}

function buildUserMessage(
  type: string,
  codeContext: AIAssistantRequest['codeContext'],
  customMessage?: string,
  phase1?: {
    issueType?: string
    parsedError?: unknown
    codeFrame?: string
  },
): string {
  const { code, output, input, selection } = codeContext || {}

  let message = ''

  if (customMessage) {
    message += `${customMessage}\n\n`
  }

  // Safely handle code - use empty string if undefined
  const codeContent = code || ''
  const languageSlug = codeContext?.languageSlug || 'text'
  message += `**Code:**\n\`\`\`${languageSlug}\n${codeContent}\n\`\`\`\n\n`

  if (selection && selection.text) {
    message += `**Selected portion:**\n\`\`\`${languageSlug}\n${selection.text}\n\`\`\`\n\n`
  }

  if (output) {
    message += `**Output/Errors:**\n\`\`\`\n${output}\n\`\`\`\n\n`
  }

  if (phase1?.issueType || phase1?.parsedError || phase1?.codeFrame) {
    message += `**Local analysis (Phase 1):**\n`
    if (phase1.issueType) {
      message += `- Detected issue type: ${phase1.issueType}\n`
    }
    if (phase1.parsedError) {
      message += `- Parsed error: \`${JSON.stringify(phase1.parsedError)}\`\n`
    }
    if (phase1.codeFrame) {
      message += `\n**Code frame:**\n\`\`\`\n${phase1.codeFrame}\n\`\`\`\n\n`
    } else {
      message += `\n`
    }
  }

  if (input) {
    message += `**Input provided:**\n\`\`\`\n${input}\n\`\`\`\n\n`
  }

  // Note: Phase 5 dry run logic is now handled in buildErrorSpecificPrompt (Phase 6)
  // This function is kept as fallback for compatibility

  // Add request-specific instructions
  switch (type) {
    case 'explain-code':
      message += 'Please explain what this code does.'
      break
    case 'debug-error':
      message += 'Please help me debug this error.'
      break
    case 'improve-code':
      message += 'Please suggest improvements to this code.'
      break
    case 'generate-tests':
      message += 'Please generate test cases for this code.'
      break
    case 'answer-question':
      // For answer-question, the customMessage already contains the question
      break
    default:
      message += 'Please help with this request.'
      break
  }

  return message
}

