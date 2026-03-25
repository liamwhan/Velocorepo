import type { ParsedCommit } from './parseLogNumstat'
import type { DailyPoint } from '../../../src/shared/veloTypes'

function dayFromAuthorIso(iso: string): string {
  if (iso.length >= 10)
    return iso.slice(0, 10)
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()))
    return '1970-01-01'
  return d.toISOString().slice(0, 10)
}

export function aggregateByDay(commits: ParsedCommit[]): DailyPoint[] {
  const map = new Map<
    string,
    { insertions: number; deletions: number; commits: number; filesChanged: number }
  >()

  for (const c of commits) {
    const day = dayFromAuthorIso(c.authorIso)
    const prev = map.get(day) ?? {
      insertions: 0,
      deletions: 0,
      commits: 0,
      filesChanged: 0,
    }
    prev.insertions += c.insertions
    prev.deletions += c.deletions
    prev.commits += 1
    prev.filesChanged += c.filesChanged
    map.set(day, prev)
  }

  const dates = [...map.keys()].sort()
  return dates.map((date) => {
    const v = map.get(date)!
    return {
      date,
      insertions: v.insertions,
      deletions: v.deletions,
      net: v.insertions - v.deletions,
      commits: v.commits,
      filesChanged: v.filesChanged,
    }
  })
}
