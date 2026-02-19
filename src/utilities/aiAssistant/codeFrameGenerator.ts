export interface CodeFrameOptions {
  contextLines?: number
  maxLineLength?: number
}

function padLeft(value: string, width: number): string {
  if (value.length >= width) return value
  return ' '.repeat(width - value.length) + value
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/**
 * Creates a small code frame with line numbers and an optional caret column.
 * Lines and columns are 1-based.
 */
export function generateCodeFrame(
  code: string,
  line: number,
  column?: number,
  options: CodeFrameOptions = {},
): string {
  const contextLines = options.contextLines ?? 1
  const maxLineLength = options.maxLineLength ?? 200

  const lines = code.split(/\r?\n/)
  const totalLines = lines.length
  const safeLine = clamp(line, 1, Math.max(1, totalLines))

  const start = clamp(safeLine - contextLines, 1, totalLines)
  const end = clamp(safeLine + contextLines, 1, totalLines)

  const width = String(end).length
  const out: string[] = []

  for (let ln = start; ln <= end; ln++) {
    const raw = lines[ln - 1] ?? ''
    const trimmed = raw.length > maxLineLength ? raw.slice(0, maxLineLength) + ' …' : raw
    out.push(`${padLeft(String(ln), width)} | ${trimmed}`)

    if (ln === safeLine && column && column > 0) {
      // Caret alignment: account for the "NN | " prefix
      const prefixLen = width + 3 // "NN" + " | "
      const caretPos = clamp(column, 1, Math.max(1, trimmed.length + 1))
      out.push(`${' '.repeat(prefixLen + caretPos - 1)}^`)
    }
  }

  return out.join('\n')
}


