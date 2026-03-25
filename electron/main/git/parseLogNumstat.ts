export interface ParsedCommit {
  hash: string
  authorIso: string
  authorName: string
  authorEmail: string
  subject: string
  insertions: number
  deletions: number
  filesChanged: number
}

function parseNumstatLine(line: string): { ins: number; del: number } | null {
  const tab = line.indexOf('\t')
  if (tab < 0)
    return null
  const tab2 = line.indexOf('\t', tab + 1)
  if (tab2 < 0)
    return null
  const a = line.slice(0, tab)
  const b = line.slice(tab + 1, tab2)
  const ins = a === '-' ? 0 : Number.parseInt(a, 10)
  const del = b === '-' ? 0 : Number.parseInt(b, 10)
  if (Number.isNaN(ins) || Number.isNaN(del))
    return null
  return { ins, del }
}

/**
 * Parses output of:
 * git log <ref> --pretty=format:@@@%H\t%aI\t%an\t%ae\t%s --numstat
 */
export function parseLogNumstat(
  stdout: string,
  onProgress?: (commitsParsed: number) => void,
): ParsedCommit[] {
  const lines = stdout.split(/\r?\n/)
  const commits: ParsedCommit[] = []
  let current: ParsedCommit | null = null

  for (const line of lines) {
    if (line.startsWith('@@@')) {
      if (current) {
        commits.push(current)
        if (commits.length % 250 === 0)
          onProgress?.(commits.length)
      }
      const rest = line.slice(3)
      const parts = rest.split('\t')
      if (parts.length < 5) {
        current = null
        continue
      }
      const hash = parts[0]
      const authorIso = parts[1]
      const authorName = parts[2]
      const authorEmail = parts[3]
      const subject = parts.slice(4).join('\t')
      current = {
        hash,
        authorIso,
        authorName,
        authorEmail,
        subject,
        insertions: 0,
        deletions: 0,
        filesChanged: 0,
      }
      continue
    }
    if (!current || line.trim() === '')
      continue
    const stat = parseNumstatLine(line)
    if (!stat)
      continue
    current.insertions += stat.ins
    current.deletions += stat.del
    current.filesChanged += 1
  }
  if (current) {
    commits.push(current)
    onProgress?.(commits.length)
  }

  return commits
}
