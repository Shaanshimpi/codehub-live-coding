/**
 * Dry Run Parser - Phase 5
 * Parses dry run tables from AI responses for logical error analysis
 */

export interface DryRunRow {
  step: number
  [key: string]: any // Variable values (e.g., i, sum, count, etc.)
}

/**
 * Parses a dry run table from AI response text
 * Expected format:
 * DRY RUN:
 * | step | variable1 | variable2 |
 * | 1    | value1    | value2    |
 * | 2    | value3    | value4    |
 * 
 * Or markdown table format
 */
export function parseDryRun(aiResponse: string): DryRunRow[] | null {
  console.log('[DryRunParser] Parsing dry run from AI response...')
  
  // Find the DRY RUN section
  const dryRunMatch = aiResponse.match(/DRY RUN:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
  if (!dryRunMatch) {
    console.log('[DryRunParser] No DRY RUN section found')
    return null
  }

  const tableText = dryRunMatch[1].trim()
  console.log('[DryRunParser] Found DRY RUN section:', tableText.substring(0, 200))

  // Parse markdown table format
  const lines = tableText.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    console.log('[DryRunParser] Table has less than 2 lines (header + data)')
    return null
  }

  // Parse header row
  const headerLine = lines[0]
  const headers = parseTableRow(headerLine)
  if (!headers || headers.length === 0) {
    console.log('[DryRunParser] Could not parse table headers')
    return null
  }

  console.log('[DryRunParser] Parsed headers:', headers)

  // Parse data rows (skip separator line if present, limit to 5 rows)
  const dataRows: DryRunRow[] = []
  for (let i = 1; i < lines.length && dataRows.length < 5; i++) {
    const line = lines[i].trim()
    
    // Skip separator lines (e.g., |---|---|)
    if (line.match(/^[\|\s\-:]+$/)) {
      continue
    }

    const values = parseTableRow(line)
    if (!values || values.length !== headers.length) {
      console.log('[DryRunParser] Skipping row - column count mismatch:', line)
      continue
    }

    // Build row object
    const row: DryRunRow = { step: dataRows.length + 1 }
    headers.forEach((header, index) => {
      const headerKey = header.toLowerCase().trim()
      const value = values[index]?.trim()
      
      // Try to parse numeric values
      if (value && !isNaN(Number(value)) && value !== '') {
        row[headerKey] = Number(value)
      } else {
        row[headerKey] = value
      }
    })

    // Ensure step is set correctly (use step column if present, otherwise use index)
    if (row.step === undefined || isNaN(Number(row.step))) {
      const stepIndex = headers.findIndex(h => h.toLowerCase().includes('step'))
      if (stepIndex >= 0 && values[stepIndex]) {
        row.step = Number(values[stepIndex]) || dataRows.length + 1
      } else {
        row.step = dataRows.length + 1
      }
    }

    dataRows.push(row)
    console.log('[DryRunParser] Parsed row:', row)
  }

  if (dataRows.length === 0) {
    console.log('[DryRunParser] No valid data rows found')
    return null
  }

  console.log('[DryRunParser] Successfully parsed', dataRows.length, 'dry run rows')
  return dataRows
}

/**
 * Parses a table row (markdown format: | col1 | col2 | col3 |)
 */
function parseTableRow(row: string): string[] | null {
  // Remove leading/trailing pipes and split by pipe
  const cleaned = row.replace(/^\||\|$/g, '').trim()
  if (!cleaned) {
    return null
  }

  const columns = cleaned.split('|').map(col => col.trim())
  return columns.filter(col => col.length > 0)
}

/**
 * Validates dry run structure
 */
export function validateDryRun(dryRun: DryRunRow[]): boolean {
  if (!dryRun || dryRun.length === 0) {
    return false
  }

  if (dryRun.length > 5) {
    console.warn('[DryRunParser] Dry run has more than 5 rows, truncating...')
    return false
  }

  // Check that all rows have a step
  return dryRun.every(row => typeof row.step === 'number' && row.step > 0)
}

