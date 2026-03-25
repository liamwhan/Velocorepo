/** IPC contracts for VelocoRepo (renderer ↔ main). */

export interface RepoInfoResult {
  ok: true
  path: string
  currentBranch: string | null
  branches: string[]
}

export interface RepoInfoError {
  ok: false
  error: string
}

export type RepoInfoResponse = RepoInfoResult | RepoInfoError

export interface AnalyzeOptions {
  repoPath: string
  branch: string
  includeMerges: boolean
  since?: string
  until?: string
}

export interface DailyPoint {
  date: string
  insertions: number
  deletions: number
  net: number
  commits: number
  filesChanged: number
}

export interface AnalyzeResult {
  ok: true
  daily: DailyPoint[]
  commitsAnalyzed: number
  totalInsertions: number
  totalDeletions: number
  activeDays: number
}

export interface AnalyzeError {
  ok: false
  error: string
}

export type AnalyzeResponse = AnalyzeResult | AnalyzeError

export interface AnalysisProgress {
  commitsParsed: number
}

/** Which series drives trend / changepoint / EWMA. */
export type TrendBasis = 'net' | 'churn'

/** Persisted UI preferences (userData JSON). */
export interface AppSettings {
  repoPath?: string
  branch?: string
  includeMerges?: boolean
  since?: string
  until?: string
  /**
   * Rolling average window for net (calendar days), 1–365.
   * Omit when unset. `null` in save requests clears the stored value.
   */
  rollingWindowDays?: number | null
  combineInsDel?: boolean
  /** Trend / changepoint / EWMA basis. Default net. */
  trendBasis?: TrendBasis
  showLinearTrend?: boolean
  showChangepoint?: boolean
  showEwma?: boolean
  /** EWMA smoothing; typical 0.08–0.35. */
  ewmaAlpha?: number
}
