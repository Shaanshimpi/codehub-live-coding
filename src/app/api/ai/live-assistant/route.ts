import { NextRequest, NextResponse } from 'next/server'
import type {
  AIAssistantRequest,
  AIAssistantResponse,
  AIMessage,
} from '@/types/ai-assistant'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Default model
const DEFAULT_MODEL = 'openai/gpt-oss-120b:free'

// Fallback models
const FALLBACK_MODELS = [
  'openai/gpt-oss-20b:free',
  'google/gemma-3-27b-it:free',
  'openai/gpt-5-nano',
]

async function callOpenRouterAPI(
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ response: Response; errorData?: any }> {
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 500,
  }

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

function buildSystemPrompt(role: 'trainer' | 'student', language: string): string {
  const basePrompt =
    role === 'trainer'
      ? `You are a programming assistant helping an instructor teach ${language}.
Keep responses short and direct. Point out mistakes clearly without extra explanation.`
      : `You are a programming assistant helping a student with ${language}.

**CRITICAL RULES:**
- Keep responses SHORT and SIMPLE
- Directly point to the mistake - nothing else
- No long explanations, no teaching philosophy, no encouragement
- Just identify the error and what's wrong
- Maximum 2-3 sentences

**Examples:**
❌ DON'T: "I see you're missing a semicolon. In C, every statement needs to end with a semicolon. This is a common mistake that beginners make. Let me help you understand why this happens..."
✅ DO: "Missing semicolon on line 3. Add ';' after printf("hi")."

❌ DON'T: "It looks like you have a logical error in your loop. The condition might be causing an off-by-one error. Let's think about this together..."
✅ DO: "Line 5: Change 'i <= 5' to 'i < 5'. Loop runs one extra time."

Be direct. Point to the mistake. That's it.`

  return basePrompt
}

function buildUserMessage(
  codeContext: AIAssistantRequest['codeContext'],
  userQuestion?: string,
): string {
  const { code, output, input, languageSlug } = codeContext || {}
  const language = languageSlug || 'text'

  let message = ''

  if (userQuestion) {
    message += `${userQuestion}\n\n`
  }

  if (code) {
    message += `**Code:**\n\`\`\`${language}\n${code}\n\`\`\`\n\n`
  }

  if (output) {
    message += `**Output/Errors:**\n\`\`\`\n${output}\n\`\`\`\n\n`
  }

  if (input) {
    message += `**Input:**\n\`\`\`\n${input}\n\`\`\`\n\n`
  }

  return message
}

export async function POST(req: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 },
      )
    }

    const request: AIAssistantRequest = await req.json()
    const { user, codeContext, message } = request

    if (!user || !user.role) {
      return NextResponse.json(
        { error: 'Missing required field: user.role' },
        { status: 400 },
      )
    }

    if (!codeContext || !codeContext.languageSlug) {
      return NextResponse.json(
        { error: 'Missing required field: codeContext.languageSlug' },
        { status: 400 },
      )
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(user.role, codeContext.languageSlug)
    const userMessage = buildUserMessage(codeContext, message)

    // Try primary model
    let result = await callOpenRouterAPI(DEFAULT_MODEL, systemPrompt, userMessage)

    // If primary fails, try fallbacks
    if (!result.response.ok) {
      for (const fallbackModel of FALLBACK_MODELS) {
        result = await callOpenRouterAPI(fallbackModel, systemPrompt, userMessage)
        if (result.response.ok) {
          break
        }
      }
    }

    // Check if we still have an error
    if (!result.response.ok) {
      return NextResponse.json(
        {
          error:
            result.errorData?.error?.message ||
            result.errorData?.message ||
            'AI service unavailable. Please try again later.',
        },
        { status: result.response.status },
      )
    }

    // Parse response
    const responseText = await result.response.text()
    const data = JSON.parse(responseText)

    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 },
      )
    }

    const assistantContent = data.choices[0]?.message?.content || ''

    if (!assistantContent.trim()) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 500 },
      )
    }

    // Return simple response
    const aiMessage: AIMessage = {
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
    }

    return NextResponse.json({
      message: aiMessage,
      tokensUsed: data.usage?.total_tokens,
    })
  } catch (error) {
    console.error('[AI Assistant] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
