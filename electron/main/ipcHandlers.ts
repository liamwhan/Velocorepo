import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { AnalyzeOptions } from '../../src/shared/veloTypes'
import {
  getCurrentBranch,
  isInsideWorkTree,
  listBranches,
  runLogNumstat,
  verifyRefExists,
} from './git/repoGit'
import { parseLogNumstat } from './git/parseLogNumstat'
import { aggregateByDay } from './git/aggregateDaily'
import { loadMergedSettings, saveSettingsPartial } from './settingsStore'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null) {
  mainWindow = win
}

export function registerVeloIpc() {
  ipcMain.removeHandler('velo:pick-repo')
  ipcMain.removeHandler('velo:repo-info')
  ipcMain.removeHandler('velo:analyze')
  ipcMain.removeHandler('velo:get-settings')
  ipcMain.removeHandler('velo:save-settings')

  ipcMain.handle('velo:pick-repo', async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'VelocoRepo — select git repository folder',
    })
    if (r.canceled || !r.filePaths[0])
      return null
    return r.filePaths[0]
  })

  ipcMain.handle('velo:repo-info', async (_e, repoPath: unknown) => {
    if (typeof repoPath !== 'string' || !repoPath.trim()) {
      return { ok: false, error: 'Invalid path' } as const
    }
    const path = repoPath.trim()
    try {
      if (!(await isInsideWorkTree(path))) {
        return {
          ok: false,
          error: 'Not a git repository (no .git work tree).',
        } as const
      }
      const branches = await listBranches(path)
      const currentBranch = await getCurrentBranch(path)
      return {
        ok: true,
        path,
        currentBranch,
        branches,
      } as const
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: msg } as const
    }
  })

  ipcMain.handle('velo:analyze', async (event, opts: unknown) => {
    if (!opts || typeof opts !== 'object')
      return { ok: false, error: 'Invalid options' } as const
    const o = opts as Partial<AnalyzeOptions>
    if (typeof o.repoPath !== 'string' || typeof o.branch !== 'string')
      return { ok: false, error: 'Missing repoPath or branch' } as const
    const includeMerges = Boolean(o.includeMerges)
    const since = typeof o.since === 'string' && o.since.trim() ? o.since.trim() : undefined
    const until = typeof o.until === 'string' && o.until.trim() ? o.until.trim() : undefined

    try {
      const repoPath = o.repoPath.trim()
      if (!(await isInsideWorkTree(repoPath)))
        return { ok: false, error: 'Not a git repository.' } as const
      if (!(await verifyRefExists(repoPath, o.branch)))
        return { ok: false, error: 'Branch or ref not found.' } as const

      const stdout = await runLogNumstat(repoPath, o.branch, {
        includeMerges,
        since,
        until,
      })
      const commits = parseLogNumstat(stdout, (n) => {
        event.sender.send('velo:analysis-progress', { commitsParsed: n })
      })
      const daily = aggregateByDay(commits)
      let totalInsertions = 0
      let totalDeletions = 0
      for (const d of daily) {
        totalInsertions += d.insertions
        totalDeletions += d.deletions
      }
      return {
        ok: true,
        daily,
        commitsAnalyzed: commits.length,
        totalInsertions,
        totalDeletions,
        activeDays: daily.length,
      } as const
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: msg } as const
    }
  })

  ipcMain.handle('velo:get-settings', () => loadMergedSettings())

  ipcMain.handle('velo:save-settings', (_e, partial: unknown) => {
    try {
      return saveSettingsPartial(partial)
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(msg)
    }
  })
}
