// API route to proxy code execution to OneCompiler via RapidAPI
// https://rapidapi.com/onecompiler-onecompiler-default/api/onecompiler-apis
// This avoids CORS issues by making the request server-side

import { NextRequest, NextResponse } from 'next/server'

// OneCompiler API via RapidAPI
const ONECOMPILER_API = process.env.ONE_COMPILER_URL || 'https://onecompiler-apis.p.rapidapi.com/api/v1/run'
const ONECOMPILER_KEY = process.env.ONE_COMPILER_KEY || ''
const ONECOMPILER_HOST = process.env.ONE_COMPILER_HOST || 'onecompiler-apis.p.rapidapi.com'

// Language mapping for OneCompiler
// Maps our language IDs to OneCompiler's language identifiers
const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'nodejs',
  nodejs: 'nodejs',
  typescript: 'typescript',
  python: 'python',
  python2: 'python2',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  csharp: 'csharp',
  php: 'php',
  ruby: 'ruby',
  go: 'go',
  rust: 'rust',
  kotlin: 'kotlin',
  swift: 'swift',
  scala: 'scala',
  perl: 'perl',
  r: 'r',
  dart: 'dart',
  lua: 'lua',
  bash: 'bash',
  shell: 'bash',
  haskell: 'haskell',
  elixir: 'elixir',
  erlang: 'erlang',
  clojure: 'clojure',
  groovy: 'groovy',
  objectivec: 'objectivec',
  fsharp: 'fsharp',
  assembly: 'assembly',
  fortran: 'fortran',
  cobol: 'cobol',
  pascal: 'pascal',
}

// File name mapping based on language extensions
const FILE_NAMES: Record<string, string> = {
  javascript: 'index.js',
  nodejs: 'index.js',
  typescript: 'index.ts',
  python: 'main.py',
  python2: 'main.py',
  c: 'main.c',
  cpp: 'main.cpp',
  java: 'Main.java',
  csharp: 'Program.cs',
  php: 'index.php',
  ruby: 'main.rb',
  go: 'main.go',
  rust: 'main.rs',
  kotlin: 'Main.kt',
  swift: 'main.swift',
  scala: 'Main.scala',
  perl: 'main.pl',
  r: 'main.r',
  dart: 'main.dart',
  lua: 'main.lua',
  bash: 'script.sh',
  shell: 'script.sh',
  haskell: 'main.hs',
  elixir: 'main.ex',
  erlang: 'main.erl',
  clojure: 'main.clj',
  groovy: 'Main.groovy',
  objectivec: 'main.m',
  fsharp: 'Program.fs',
  assembly: 'main.asm',
  fortran: 'main.f90',
  cobol: 'main.cob',
  pascal: 'main.pas',
}

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!ONECOMPILER_KEY) {
      return NextResponse.json(
        { error: 'ONE_COMPILER_KEY not configured. Please add it to your .env file.' },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { language, code, input } = body

    if (!language || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: language and code' },
        { status: 400 },
      )
    }

    const oneCompilerLang = LANGUAGE_MAP[language] || language
    const fileName = FILE_NAMES[language] || 'main.txt'

    // Make request to OneCompiler via RapidAPI
    const response = await fetch(ONECOMPILER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': ONECOMPILER_KEY,
        'X-RapidAPI-Host': ONECOMPILER_HOST,
      },
      body: JSON.stringify({
        language: oneCompilerLang,
        stdin: input || '',
        files: [
          {
            name: fileName,
            content: code,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OneCompiler API error:', response.status, errorText)
      return NextResponse.json(
        { error: `OneCompiler API error: ${response.status} - ${errorText}` },
        { status: response.status },
      )
    }

    const result = await response.json()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Code execution API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

