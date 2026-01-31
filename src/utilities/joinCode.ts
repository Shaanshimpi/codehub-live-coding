/**
 * Generate a unique, readable join code for live sessions
 * Format: ABC-123-XYZ (easy to read and type)
 */
export function generateJoinCode(): string {
  // Exclude confusing characters: 0, O, I, 1, L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  
  const part = () =>
    Array(3)
      .fill(0)
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join('')

  return `${part()}-${part()}-${part()}` // e.g., "ABC-234-XYZ"
}

/**
 * Validate join code format
 */
export function isValidJoinCode(code: string): boolean {
  // Format: XXX-XXX-XXX where X is alphanumeric (no confusing chars)
  const pattern = /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/
  return pattern.test(code.toUpperCase())
}


