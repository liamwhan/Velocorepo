import { gitSpawn } from './gitSpawn'
import { assertSafeBranchRef } from './branchRef'

export async function isInsideWorkTree(repoPath: string): Promise<boolean> {
  const { stdout, code } = await gitSpawn(repoPath, ['rev-parse', '--is-inside-work-tree'])
  return code === 0 && stdout.trim() === 'true'
}

export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  const { stdout, code } = await gitSpawn(repoPath, [
    'rev-parse',
    '--abbrev-ref',
    'HEAD',
  ])
  if (code !== 0)
    return null
  const b = stdout.trim()
  return b === 'HEAD' ? null : b
}

export async function listBranches(repoPath: string): Promise<string[]> {
  const { stdout, code } = await gitSpawn(repoPath, [
    'branch',
    '-a',
    '--format=%(refname:short)',
  ])
  if (code !== 0)
    return []
  const set = new Set<string>()
  for (const line of stdout.split(/\r?\n/)) {
    const t = line.trim()
    if (t)
      set.add(t)
  }
  return [...set].sort()
}

export async function verifyRefExists(repoPath: string, branch: string): Promise<boolean> {
  const ref = assertSafeBranchRef(branch)
  const { code } = await gitSpawn(repoPath, ['rev-parse', '--verify', `${ref}^{commit}`])
  return code === 0
}

export async function runLogNumstat(
  repoPath: string,
  branch: string,
  options: { includeMerges: boolean; since?: string; until?: string },
): Promise<string> {
  const ref = assertSafeBranchRef(branch)
  const args = [
    'log',
    ref,
    '--date=iso-strict',
    '--pretty=format:@@@%H\t%aI\t%an\t%ae\t%s',
    '--numstat',
  ]
  if (!options.includeMerges)
    args.push('--no-merges')
  if (options.since)
    args.push('--since', options.since)
  if (options.until)
    args.push('--until', options.until)

  const { stdout, stderr, code } = await gitSpawn(repoPath, args)
  if (code !== 0)
    throw new Error(stderr.trim() || `git log failed with code ${code}`)
  return stdout
}
