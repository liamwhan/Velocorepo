import { spawn } from 'node:child_process'

const GIT_ENV = {
  ...process.env,
  GIT_OPTIONAL_LOCKS: '0',
} as const

/**
 * Runs read-only git with fixed args. cwd must be the repository root.
 */
export function gitSpawn(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['--no-optional-locks', '--no-pager', ...args], {
      cwd,
      env: GIT_ENV,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d: string) => {
      stdout += d
    })
    child.stderr.on('data', (d: string) => {
      stderr += d
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ stdout, stderr, code })
    })
  })
}
