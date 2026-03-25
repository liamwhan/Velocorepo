import { contextBridge, ipcRenderer } from 'electron'
import type {
  AnalyzeOptions,
  AnalyzeResponse,
  AppSettings,
  RepoInfoResponse,
} from '../../src/shared/veloTypes'

const velo = {
  pickRepo: (): Promise<string | null> => ipcRenderer.invoke('velo:pick-repo'),
  getRepoInfo: (repoPath: string): Promise<RepoInfoResponse> =>
    ipcRenderer.invoke('velo:repo-info', repoPath),
  analyze: (opts: AnalyzeOptions): Promise<AnalyzeResponse> =>
    ipcRenderer.invoke('velo:analyze', opts),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('velo:get-settings'),
  saveSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('velo:save-settings', partial),
  onAnalysisProgress: (cb: (p: { commitsParsed: number }) => void) => {
    const fn = (_: Electron.IpcRendererEvent, p: { commitsParsed: number }) => cb(p)
    ipcRenderer.on('velo:analysis-progress', fn)
    return () => ipcRenderer.removeListener('velo:analysis-progress', fn)
  },
}

contextBridge.exposeInMainWorld('velo', velo)
