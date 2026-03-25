import { useState } from 'react'
import { SetupWizard } from '@/pages/SetupWizard'
import { Dashboard } from '@/pages/Dashboard'
import type { AnalyzeOptions, AnalyzeResponse, AnalyzeResult } from '@/shared/veloTypes'

export default function App() {
  const [view, setView] = useState<'wizard' | 'dash'>('wizard')
  const [opts, setOpts] = useState<AnalyzeOptions | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)

  function onAnalyzed(o: AnalyzeOptions, r: AnalyzeResponse) {
    if (r.ok) {
      setOpts(o)
      setResult(r)
      setView('dash')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">VelocoRepo</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Read-only git history → daily insertions, deletions, and net velocity.
        </p>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        {view === 'wizard' && <SetupWizard onAnalyzed={onAnalyzed} />}
        {view === 'dash' && opts && result && (
          <Dashboard
            opts={opts}
            result={result}
            onBack={() => {
              setView('wizard')
              setResult(null)
              setOpts(null)
            }}
          />
        )}
      </main>
    </div>
  )
}
