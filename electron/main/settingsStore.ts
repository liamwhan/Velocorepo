import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppSettings } from '../../src/shared/veloTypes'

const FILE_NAME = 'velocorepo-settings.json'

function defaultSettings(): AppSettings {
  return {
    combineInsDel: false,
    includeMerges: false,
  }
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), FILE_NAME)
}

function sanitizePartial(p: unknown): Partial<AppSettings> {
  if (!p || typeof p !== 'object')
    return {}
  const o = p as Record<string, unknown>
  const out: Partial<AppSettings> = {}
  if (typeof o.repoPath === 'string')
    out.repoPath = o.repoPath
  if (typeof o.branch === 'string')
    out.branch = o.branch.slice(0, 512)
  if (typeof o.includeMerges === 'boolean')
    out.includeMerges = o.includeMerges
  if (typeof o.since === 'string')
    out.since = o.since.length ? o.since.slice(0, 80) : undefined
  if (typeof o.until === 'string')
    out.until = o.until.length ? o.until.slice(0, 80) : undefined
  if ('rollingWindowDays' in o) {
    if (o.rollingWindowDays === null)
      out.rollingWindowDays = undefined
    else if (typeof o.rollingWindowDays === 'number' && Number.isFinite(o.rollingWindowDays)) {
      out.rollingWindowDays = Math.min(365, Math.max(1, Math.round(o.rollingWindowDays)))
    }
  }
  if (typeof o.combineInsDel === 'boolean')
    out.combineInsDel = o.combineInsDel
  if (o.trendBasis === 'net' || o.trendBasis === 'churn')
    out.trendBasis = o.trendBasis
  if (typeof o.showLinearTrend === 'boolean')
    out.showLinearTrend = o.showLinearTrend
  if (typeof o.showChangepoint === 'boolean')
    out.showChangepoint = o.showChangepoint
  if (typeof o.showEwma === 'boolean')
    out.showEwma = o.showEwma
  if (typeof o.ewmaAlpha === 'number' && Number.isFinite(o.ewmaAlpha)) {
    out.ewmaAlpha = Math.min(1, Math.max(0.02, o.ewmaAlpha))
  }
  return out
}

export function loadMergedSettings(): AppSettings {
  try {
    const p = settingsPath()
    if (!fs.existsSync(p))
      return defaultSettings()
    const raw = fs.readFileSync(p, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object')
      return defaultSettings()
    return { ...defaultSettings(), ...sanitizePartial(parsed) } as AppSettings
  }
  catch {
    return defaultSettings()
  }
}

export function saveSettingsPartial(partial: unknown): AppSettings {
  const current = loadMergedSettings()
  const clean = sanitizePartial(partial)
  const next: Record<string, unknown> = { ...current }
  for (const [k, v] of Object.entries(clean)) {
    if (v === undefined)
      delete next[k]
    else
      next[k] = v
  }
  const result = next as AppSettings
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(result, null, 2), 'utf8')
  return result
}
