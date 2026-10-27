export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export function currentMonthKey(): string {
  return monthKey(new Date())
}

export function nextMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return monthKey(new Date(Date.UTC(y, m, 1))) // m is 1-based, Date.UTC month is 0-based → next month
}

export function prevMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return monthKey(new Date(Date.UTC(y, m - 2, 1)))
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/**
 * Inclusive month list between two ISO timestamps, ascending. UTC-safe.
 */
export function monthsBetween(startIso: string, endIso: string): string[] {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const months: string[] = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
  while (cursor <= last) {
    months.push(monthKey(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}

/**
 * [startIso, endIso) interval covering a "YYYY-MM" month. UTC-safe.
 */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  return { start: start.toISOString(), end: end.toISOString() }
}
