export const todayISO = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatDate = (value?: string): string => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  const isoDatePrefixMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  const date = isoDatePrefixMatch
    ? new Date(Number(isoDatePrefixMatch[1]), Number(isoDatePrefixMatch[2]) - 1, Number(isoDatePrefixMatch[3]))
    : new Date(trimmed)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}
