import { useEffect, useRef, useState } from 'react'
import type { AnalyzeOptions, AnalyzeResponse, RepoInfoResponse } from '@/shared/veloTypes'

type Props = {
  onAnalyzed: (opts: AnalyzeOptions, result: AnalyzeResponse) => void
}

export function SetupWizard({ onAnalyzed }: Props) {
  const velo = window.velo
  const [path, setPath] = useState<string | null>(null)
  const [info, setInfo] = useState<RepoInfoResponse | null>(null)
  const [branch, setBranch] = useState('')
  const [includeMerges, setIncludeMerges] = useState(false)
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const preferredBranchRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!velo)
      return
    const unsub = velo.onAnalysisProgress((p) => setProgress(p.commitsParsed))
    return unsub
  }, [velo])

  useEffect(() => {
    if (!velo)
      return
    let cancelled = false
    void velo.getSettings().then((s) => {
      if (cancelled)
        return
      preferredBranchRef.current = s.branch
      if (s.repoPath)
        setPath(s.repoPath)
      setSince(s.since ?? '')
      setUntil(s.until ?? '')
      setIncludeMerges(!!s.includeMerges)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [velo])

  useEffect(() => {
    if (!path || !velo)
      return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const r = await velo.getRepoInfo(path)
      if (cancelled)
        return
      setLoading(false)
      setInfo(r)
      if (r.ok) {
        const pref = preferredBranchRef.current
        const pick = pref && r.branches.includes(pref)
          ? pref
          : r.currentBranch && r.branches.includes(r.currentBranch)
            ? r.currentBranch
            : r.branches[0] ?? 'HEAD'
        setBranch(pick)
      }
      else {
        setError(r.error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [path, velo])

  useEffect(() => {
    if (!velo || !hydrated)
      return
    const t = window.setTimeout(() => {
      const sinceT = since.trim()
      const untilT = until.trim()
      void velo.saveSettings({
        includeMerges,
        since: sinceT,
        until: untilT,
        ...(path ? { repoPath: path } : {}),
        ...(branch ? { branch } : {}),
      })
    }, 450)
    return () => window.clearTimeout(t)
  }, [velo, hydrated, path, branch, includeMerges, since, until])

  async function pickFolder() {
    if (!velo)
      return
    setError(null)
    const p = await velo.pickRepo()
    setPath(p)
    setInfo(null)
    setProgress(null)
  }

  async function runAnalyze() {
    if (!velo || !path || !branch)
      return
    setLoading(true)
    setError(null)
    setProgress(0)
    const opts: AnalyzeOptions = {
      repoPath: path,
      branch,
      includeMerges,
      since: since.trim() || undefined,
      until: until.trim() || undefined,
    }
    void velo.saveSettings({
      repoPath: path,
      branch,
      includeMerges,
      since: since.trim(),
      until: until.trim(),
    })
    const result = await velo.analyze(opts)
    setLoading(false)
    setProgress(null)
    if (result.ok)
      onAnalyzed(opts, result)
    else
      setError(result.error)
  }

  if (!velo) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-6 text-zinc-300">
        VelocoRepo API is unavailable. Run inside the Electron app.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Repository</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Choose a local folder. Git is only queried read-only from the main process. Your last repo and date filters are restored on restart.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={pickFolder}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Select folder…
          </button>
          {path && (
            <code className="truncate text-xs text-zinc-400" title={path}>
              {path}
            </code>
          )}
        </div>
      </div>

      {info && info.ok && (
        <div className="space-y-4">
          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-zinc-300">
              Branch or ref
            </label>
            {info.branches.length > 0 ? (
              <select
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                {info.branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. main or HEAD"
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={includeMerges}
              onChange={(e) => setIncludeMerges(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Include merge commits
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="since" className="block text-xs text-zinc-400">
                Since (optional)
              </label>
              <input
                id="since"
                type="text"
                placeholder="e.g. 2024-01-01"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label htmlFor="until" className="block text-xs text-zinc-400">
                Until (optional)
              </label>
              <input
                id="until"
                type="text"
                placeholder="e.g. 2025-12-31"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={runAnalyze}
            disabled={loading || !branch}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Analyze velocity'}
          </button>
          {progress !== null && loading && (
            <p className="text-center text-xs text-zinc-500">
              Parsed {progress.toLocaleString()} commits…
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
