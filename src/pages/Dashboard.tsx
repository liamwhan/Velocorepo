import type { AnalyzeOptions, AnalyzeResult } from '@/shared/veloTypes'
import { VelocityChart } from '@/components/Charts/VelocityChart'

type Props = {
  opts: AnalyzeOptions
  result: AnalyzeResult
  onBack: () => void
}

export function Dashboard({ opts, result, onBack }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            ← New analysis
          </button>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">Velocity</h2>
          <p className="mt-1 font-mono text-xs text-zinc-500">{opts.repoPath}</p>
          <p className="text-sm text-zinc-400">
            Branch <span className="text-zinc-200">{opts.branch}</span>
            {opts.includeMerges ? ' · merges included' : ' · merges excluded'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Commits analyzed" value={result.commitsAnalyzed.toLocaleString()} />
        <Stat label="Active days" value={result.activeDays.toLocaleString()} />
        <Stat label="Total insertions" value={result.totalInsertions.toLocaleString()} />
        <Stat label="Total deletions" value={result.totalDeletions.toLocaleString()} />
      </div>

      {result.daily.length === 0 ? (
        <p className="text-zinc-500">No commits in this range for the selected branch.</p>
      ) : (
        <VelocityChart daily={result.daily} />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{value}</div>
    </div>
  )
}
