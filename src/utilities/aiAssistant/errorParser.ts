export type ParsedErrorKind = 'syntax-error' | 'runtime-error' | 'unknown-error'

export interface ParsedErrorLocation {
  kind: ParsedErrorKind
  line?: number
  column?: number
  message?: string
  raw?: string
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

function findCaretColumn(block: string): number | undefined {
  // Typical compiler formats include a caret line:
  //   some code here
  //          ^
  const lines = block.split(/\r?\n/)
  const caretLine = lines.find((l) => l.includes('^'))
  if (!caretLine) return undefined
  const idx = caretLine.indexOf('^')
  return idx >= 0 ? idx + 1 : undefined // 1-based column
}

/**
 * Best-effort parsing of line/column from various compiler/runtime outputs.
 * Input is usually `stderr` or `stdout || stderr` from our ExecutionResult.
 */
export function parseErrorLocation(
  output: string | undefined,
  languageSlug?: string,
): ParsedErrorLocation | null {
  if (!output || !output.trim()) return null

  const text = output.trim()
  const lang = (languageSlug || '').toLowerCase()

  // GCC/Clang style: main.c:3:15: error: expected ';' ...
  // Java/C# sometimes: Main.java:3: error: ...
  const gccLike = text.match(/^[^\s:]+:(\d+):(\d+):\s*(fatal\s+)?error:\s*(.+)$/m)
  if (gccLike) {
    return {
      kind: 'syntax-error',
      line: toInt(gccLike[1]),
      column: toInt(gccLike[2]),
      message: gccLike[4]?.trim(),
      raw: text,
    }
  }

  // OneCompiler / various compilers sometimes omit column: file:line: error: message
  const fileLineError = text.match(/^[^\s:]+:(\d+):\s*(fatal\s+)?error:\s*(.+)$/m)
  if (fileLineError) {
    return {
      kind: 'syntax-error',
      line: toInt(fileLineError[1]),
      column: findCaretColumn(text),
      message: fileLineError[3]?.trim(),
      raw: text,
    }
  }

  // Python traceback: File "main.py", line 5
  const py = text.match(/File\s+"[^"]+",\s+line\s+(\d+)/m)
  if (py) {
    const line = toInt(py[1])
    const column = findCaretColumn(text)
    const msg = text.match(/(SyntaxError|IndentationError|TabError):\s*(.+)$/m)
    const kind: ParsedErrorKind =
      msg?.[1] === 'SyntaxError' || msg?.[1] === 'IndentationError' || msg?.[1] === 'TabError'
        ? 'syntax-error'
        : 'runtime-error'
    return {
      kind,
      line,
      column,
      message: msg ? `${msg[1]}: ${msg[2]}` : undefined,
      raw: text,
    }
  }

  // JS/TS runtime stack often contains :line:column
  // Example: at foo (index.js:10:5)
  const stackLoc = text.match(/\(([^)]+):(\d+):(\d+)\)/m) || text.match(/at\s+.+:(\d+):(\d+)/m)
  if (stackLoc) {
    // stackLoc groups may vary; extract last 2 numbers reliably
    const numbers = [...text.matchAll(/:(\d+):(\d+)/g)]
    const last = numbers.at(-1)
    if (last) {
      return {
        kind: text.includes('SyntaxError') ? 'syntax-error' : 'runtime-error',
        line: toInt(last[1]),
        column: toInt(last[2]),
        message: text.split(/\r?\n/)[0]?.trim(),
        raw: text,
      }
    }
  }

  // Generic "line X" / "column Y"
  const genericLine = text.match(/\bline\s+(\d+)\b/i)
  const genericCol = text.match(/\bcol(?:umn)?\s+(\d+)\b/i)
  if (genericLine || genericCol) {
    const firstLine = text.split(/\r?\n/)[0]?.trim()
    const kind: ParsedErrorKind =
      /syntax|parse|expected|unexpected token|missing/i.test(text) || lang === 'python'
        ? 'syntax-error'
        : 'unknown-error'
    return {
      kind,
      line: toInt(genericLine?.[1]),
      column: toInt(genericCol?.[1]),
      message: firstLine,
      raw: text,
    }
  }

  // Fallback: we know there is an error-ish output, but no location.
  const fallbackKind: ParsedErrorKind =
    /traceback|exception|segmentation fault|runtime/i.test(text)
      ? 'runtime-error'
      : /syntax|parse|expected|unexpected/i.test(text)
        ? 'syntax-error'
        : 'unknown-error'

  return {
    kind: fallbackKind,
    message: text.split(/\r?\n/)[0]?.trim(),
    raw: text,
  }
}


