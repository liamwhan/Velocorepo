/// <reference types="vite/client" />

import type {
  AnalyzeOptions,
  AnalyzeResponse,
  AppSettings,
  RepoInfoResponse,
} from './shared/veloTypes'

export interface VeloAPI {
  pickRepo: () => Promise<string | null>
  getRepoInfo: (repoPath: string) => Promise<RepoInfoResponse>
  analyze: (opts: AnalyzeOptions) => Promise<AnalyzeResponse>
  getSettings: () => Promise<AppSettings>
  saveSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  onAnalysisProgress: (cb: (p: { commitsParsed: number }) => void) => () => void
}

declare global {
  interface Window {
    velo?: VeloAPI
  }
}

export {}
