type ScanIssue = {
  path: string
  pattern: string
}

const SQL_INJECTION_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'sql_comment', regex: /(?:--|\/\*|\*\/)/ },
  { name: 'union_select', regex: /\bunion\s+(?:all\s+)?select\b/i },
  { name: 'boolean_tautology', regex: /(?:'|%27|\b)\s*(?:or|and)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/i },
  { name: 'stacked_statement', regex: /;\s*(?:select|insert|update|delete|drop|alter|truncate|exec|execute)\b/i },
  { name: 'dangerous_sql_keyword', regex: /\b(?:drop\s+table|truncate\s+table|alter\s+table|exec(?:ute)?\s+|sp_executesql|xp_cmdshell)\b/i },
  { name: 'time_based_probe', regex: /\b(?:sleep|benchmark|waitfor\s+delay)\s*\(/i },
]

const MAX_SCAN_DEPTH = 8

const shouldScanText = (value: string): boolean => value.trim().length > 0

const findSqlInjectionIssue = (value: string, path: string): ScanIssue | null => {
  if (!shouldScanText(value)) return null
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.regex.test(value)) {
      return { path, pattern: pattern.name }
    }
  }
  return null
}

const isFileLike = (value: unknown): boolean => {
  return (
    typeof File !== 'undefined' && value instanceof File
  ) || (
    typeof Blob !== 'undefined' && value instanceof Blob
  )
}

const scanValue = (value: unknown, path: string, depth: number, seen: WeakSet<object>): ScanIssue | null => {
  if (depth > MAX_SCAN_DEPTH || value === undefined || value === null) return null
  if (typeof value === 'string') return findSqlInjectionIssue(value, path)
  if (typeof value === 'number' || typeof value === 'boolean') return null
  if (isFileLike(value)) return null

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    for (const [key, entryValue] of value.entries()) {
      const issue = scanValue(entryValue, `${path}.${key}`, depth + 1, seen)
      if (issue) return issue
    }
    return null
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const issue = scanValue(value[index], `${path}[${index}]`, depth + 1, seen)
      if (issue) return issue
    }
    return null
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return null
    seen.add(value)
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      const issue = scanValue(entryValue, `${path}.${key}`, depth + 1, seen)
      if (issue) return issue
    }
  }

  return null
}

export const assertNoSqlInjectionPayload = (value: unknown, path = 'request'): void => {
  const issue = scanValue(value, path, 0, new WeakSet<object>())
  if (!issue) return
  throw new Error(`Entrada rechazada por patron sospechoso de SQL injection en ${issue.path}.`)
}
