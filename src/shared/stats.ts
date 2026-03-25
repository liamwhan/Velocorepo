import type { DailyPoint } from './veloTypes'

function subDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Trailing calendar window mean of `net`; missing days count as 0 in the window. */
export function rollingAverageNet(daily: DailyPoint[], windowSize: number): number[] {
  if (daily.length === 0)
    return []
  const byDate = new Map(daily.map((d) => [d.date, d]))
  const dates = daily.map((d) => d.date)
  const out: number[] = []
  for (let i = 0; i < dates.length; i++) {
    const end = dates[i]
    let sum = 0
    for (let w = 0; w < windowSize; w++) {
      const ds = subDays(end, w)
      sum += byDate.get(ds)?.net ?? 0
    }
    out.push(sum / windowSize)
  }
  return out
}
