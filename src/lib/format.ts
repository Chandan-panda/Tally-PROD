import { format, isToday, isYesterday, parseISO } from 'date-fns'

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export function friendlyDay(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, d MMM yyyy')
}

export const shortDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy')

export function makeMoneyFmt(currency: string, locale: string) {
  let f: Intl.NumberFormat
  try {
    f = new Intl.NumberFormat(locale || undefined, { style: 'currency', currency, maximumFractionDigits: 2 })
  } catch {
    f = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
  }
  return (n: number) => f.format(n)
}

export function compactMoney(n: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n)
  } catch {
    return String(n)
  }
}
