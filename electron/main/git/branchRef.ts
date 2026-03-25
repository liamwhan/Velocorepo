/**
 * Branch / ref names from `git branch -a` are single-line tokens without newlines.
 * Reject anything that could break spawn or escape the intended ref.
 */
const BRANCH_REF_RE = /^[a-zA-Z0-9/._-]+$/

export function assertSafeBranchRef(branch: string): string {
  const t = branch.trim()
  if (!t || t.length > 512)
    throw new Error('Invalid branch name')
  if (!BRANCH_REF_RE.test(t))
    throw new Error('Branch name contains unsupported characters')
  if (t.includes('..') || t.startsWith('-'))
    throw new Error('Invalid branch name')
  return t
}
