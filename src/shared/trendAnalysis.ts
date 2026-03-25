import type { DailyPoint, TrendBasis } from './veloTypes'

export function churnForDay(d: DailyPoint): number {
  return Math.abs(d.insertions) + Math.abs(d.deletions)
}

export function valuesForBasis(daily: DailyPoint[], basis: TrendBasis): number[] {
  if (basis === 'net')
    return daily.map((d) => d.net)
  return daily.map(churnForDay)
}

/** OLS of y on x = 0..n-1 (evenly spaced days in chart order). */
export function linearRegressionOnIndex(y: number[]): {
  slope: number
  intercept: number
  r2: number
  fitted: number[]
} {
  const n = y.length
  if (n === 0)
    return { slope: 0, intercept: 0, r2: 0, fitted: [] }
  if (n === 1) {
    const v = y[0]
    return { slope: 0, intercept: v, r2: 1, fitted: [v] }
  }
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (let i = 0; i < n; i++) {
    const x = i
    const yi = y[i]
    sumX += x
    sumY += yi
    sumXY += x * yi
    sumXX += x * x
  }
  const denom = n * sumXX - sumX * sumX
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const fitted = y.map((_, i) => slope * i + intercept)
  const yMean = sumY / n
  let ssTot = 0
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    ssTot += (y[i] - yMean) ** 2
    ssRes += (y[i] - fitted[i]) ** 2
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  return { slope, intercept, r2, fitted }
}

/**
 * Single split minimizing total SSE of two segment means.
 * Returns index of first day of the second segment, or null if not enough points.
 */
export function singleChangepointMean(y: number[]): { splitIndex: number } | null {
  const n = y.length
  if (n < 4)
    return null
  let bestK = 2
  let bestSse = Infinity
  for (let k = 2; k <= n - 2; k++) {
    const left = y.slice(0, k)
    const right = y.slice(k)
    const mL = left.reduce((a, b) => a + b, 0) / left.length
    const mR = right.reduce((a, b) => a + b, 0) / right.length
    let sse = 0
    for (let i = 0; i < k; i++)
      sse += (y[i] - mL) ** 2
    for (let i = k; i < n; i++)
      sse += (y[i] - mR) ** 2
    if (sse < bestSse) {
      bestSse = sse
      bestK = k
    }
  }
  return { splitIndex: bestK }
}

/** EWMA; first value seeds the series. Alpha in (0, 1]. */
export function ewmaSeries(y: number[], alpha: number): number[] {
  if (y.length === 0)
    return []
  const a = Math.min(1, Math.max(0.02, alpha))
  const out: number[] = [y[0]]
  let prev = y[0]
  for (let i = 1; i < y.length; i++) {
    prev = a * y[i] + (1 - a) * prev
    out.push(prev)
  }
  return out
}
