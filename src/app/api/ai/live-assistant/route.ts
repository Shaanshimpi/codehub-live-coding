import { NextRequest, NextResponse } from 'next/server'
import type { AIAssistantRequest, AIAssistantResponse, AIMessage } from '@/types/ai-assistant'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Default model - can be configured
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free'

export async function POST(req: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 },
      )
    }

    const request: AIAssistantRequest = await req.json()
    const { type, user, codeContext, message } = request

    // Build system prompt based on role and request type
    const systemPrompt = buildSystemPrompt(user.role, type, codeContext.languageSlug)

    // Build user message
    const userMessage = buildUserMessage(type, codeContext, message)

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'CodeHub Live Coding Platform',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenRouter API error:', response.status, errorData)
      return NextResponse.json(
        { error: errorData.error?.message || 'Error from OpenRouter API' },
        { status: response.status },
      )
    }

    const data = await response.json()
    const assistantContent = data.choices?.[0]?.message?.content || 'No response from AI'

    const aiMessage: AIMessage = {
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
    }

    const result: AIAssistantResponse = {
      message: aiMessage,
      tokensUsed: data.usage?.total_tokens,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI Assistant API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

function buildSystemPrompt(role: 'trainer' | 'student', type: string, language: string): string {
  const basePrompt =
    role === 'trainer'
      ? `You are an expert programming teaching assistant helping an instructor teach ${language}.
Your role is to help create educational content, explain concepts, and suggest teaching strategies.
Provide clear explanations that instructors can use to teach students.`
      : `You are a friendly programming tutor helping a student learn ${language}.

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

  switch (type) {
    case 'explain-code':
      return role === 'student'
        ? `${basePrompt}\n\nExplain what this code does in simple terms. Focus on the purpose and logic flow, not just line-by-line translation.`
        : `${basePrompt}\n\nProvide a detailed explanation of this code that an instructor can use to teach.`

    case 'debug-error':
      return role === 'student'
        ? `${basePrompt}\n\nThe student has an error. Don't fix it for them!
Instead:
1. Help them understand the error message
2. Guide them to the problematic line
3. Ask questions to help them discover the fix
4. Explain the concept behind the error
Example: "What do you think this error means? Let's look at line X together..."`
        : `${basePrompt}\n\nAnalyze this error and suggest how to explain it to students pedagogically.`

    case 'improve-code':
      return role === 'student'
        ? `${basePrompt}\n\nDon't rewrite their code! Instead:
1. Point out what they did well
2. Ask questions about potential improvements
3. Explain concepts that could help them improve
4. Let them make the changes themselves`
        : `${basePrompt}\n\nSuggest teaching points and best practices for this code.`

    case 'generate-tests':
      return role === 'student'
        ? `${basePrompt}\n\nHelp them understand what test cases would be good for this code.
Don't write the tests - guide them to think of edge cases and scenarios.`
        : `${basePrompt}\n\nSuggest test cases that would help students understand the code behavior.`

    default:
      return basePrompt
  }
}

function buildUserMessage(
  type: string,
  codeContext: AIAssistantRequest['codeContext'],
  customMessage?: string,
): string {
  const { code, output, input, selection } = codeContext

  let message = ''

  if (customMessage) {
    message += `${customMessage}\n\n`
  }

  message += `**Code:**\n\`\`\`${codeContext.languageSlug}\n${code}\n\`\`\`\n\n`

  if (selection) {
    message += `**Selected portion:**\n\`\`\`${codeContext.languageSlug}\n${selection.text}\n\`\`\`\n\n`
  }

  if (output) {
    message += `**Output/Errors:**\n\`\`\`\n${output}\n\`\`\`\n\n`
  }

  if (input) {
    message += `**Input provided:**\n\`\`\`\n${input}\n\`\`\`\n\n`
  }

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
  }

  return message
}

