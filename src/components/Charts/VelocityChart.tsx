import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { DailyPoint, TrendBasis } from '@/shared/veloTypes'
import { rollingAverageNet } from '@/shared/stats'
import {
  ewmaSeries,
  linearRegressionOnIndex,
  singleChangepointMean,
  valuesForBasis,
} from '@/shared/trendAnalysis'

type Props = {
  daily: DailyPoint[]
}

function churnTotal(d: DailyPoint): number {
  return Math.abs(d.insertions) + Math.abs(d.deletions)
}

function parseRollingInput(text: string): number | null {
  const t = text.trim()
  if (t === '')
    return null
  if (!/^\d+$/.test(t))
    return null
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n))
    return null
  return Math.min(365, Math.max(1, n))
}

function attachChangepointMarkLine(
  series: NonNullable<EChartsOption['series']>,
  dates: string[],
  splitIndex: number | null,
  show: boolean,
) {
  if (!show || splitIndex === null || splitIndex < 0 || splitIndex >= dates.length)
    return
  const x = dates[splitIndex]
  const list = Array.isArray(series) ? series : [series]
  for (const s of list) {
    if (s && typeof s === 'object' && 'name' in s && s.name === 'Net') {
      Object.assign(s as Record<string, unknown>, {
        markLine: {
          symbol: ['none', 'none'],
          lineStyle: { color: '#fbbf24', width: 2 },
          label: {
            show: true,
            formatter: 'Shift',
            color: '#fbbf24',
            fontSize: 11,
          },
          data: [{ xAxis: x }],
        },
      })
      break
    }
  }
}

export function VelocityChart({ daily }: Props) {
  const chartRef = useRef<ReactECharts>(null)
  const velo = window.velo
  const [combineInsDel, setCombineInsDel] = useState(false)
  const [rollingInput, setRollingInput] = useState('')
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const [trendBasis, setTrendBasis] = useState<TrendBasis>('net')
  const [showLinearTrend, setShowLinearTrend] = useState(true)
  const [showChangepoint, setShowChangepoint] = useState(true)
  const [showEwma, setShowEwma] = useState(true)
  const [ewmaAlpha, setEwmaAlpha] = useState(0.18)

  const rollingDays = useMemo(() => parseRollingInput(rollingInput), [rollingInput])
  const showRolling = rollingDays !== null

  const rolling = useMemo(() => {
    if (!showRolling || rollingDays === null)
      return []
    return rollingAverageNet(daily, rollingDays)
  }, [daily, rollingDays, showRolling])

  const yTrend = useMemo(() => valuesForBasis(daily, trendBasis), [daily, trendBasis])

  const regression = useMemo(() => linearRegressionOnIndex(yTrend), [yTrend])
  const changepoint = useMemo(() => singleChangepointMean(yTrend), [yTrend])
  const ewma = useMemo(() => ewmaSeries(yTrend, ewmaAlpha), [yTrend, ewmaAlpha])

  useEffect(() => {
    if (!velo)
      return
    void velo.getSettings().then((s) => {
      if (typeof s.combineInsDel === 'boolean')
        setCombineInsDel(s.combineInsDel)
      if (typeof s.rollingWindowDays === 'number')
        setRollingInput(String(s.rollingWindowDays))
      else
        setRollingInput('')
      if (s.trendBasis === 'net' || s.trendBasis === 'churn')
        setTrendBasis(s.trendBasis)
      if (typeof s.showLinearTrend === 'boolean')
        setShowLinearTrend(s.showLinearTrend)
      if (typeof s.showChangepoint === 'boolean')
        setShowChangepoint(s.showChangepoint)
      if (typeof s.showEwma === 'boolean')
        setShowEwma(s.showEwma)
      if (typeof s.ewmaAlpha === 'number' && Number.isFinite(s.ewmaAlpha))
        setEwmaAlpha(s.ewmaAlpha)
      setPrefsLoaded(true)
    })
  }, [velo])

  useEffect(() => {
    if (!velo || !prefsLoaded)
      return
    const t = window.setTimeout(() => {
      const n = parseRollingInput(rollingInput)
      void velo.saveSettings({
        ...(n === null ? { rollingWindowDays: null } : { rollingWindowDays: n }),
        combineInsDel,
        trendBasis,
        showLinearTrend,
        showChangepoint,
        showEwma,
        ewmaAlpha,
      })
    }, 400)
    return () => window.clearTimeout(t)
  }, [
    velo,
    prefsLoaded,
    rollingInput,
    combineInsDel,
    trendBasis,
    showLinearTrend,
    showChangepoint,
    showEwma,
    ewmaAlpha,
  ])

  const commitRollingField = useCallback(() => {
    const n = parseRollingInput(rollingInput)
    if (n === null)
      setRollingInput('')
    else
      setRollingInput(String(n))
  }, [rollingInput])

  const dates = useMemo(() => daily.map((d) => d.date), [daily])
  const churnSeries = useMemo(
    () => daily.map((d) => churnTotal(d)),
    [daily],
  )

  const rollingSeriesName
    = showRolling && rollingDays !== null ? `Net (${rollingDays}d avg)` : ''

  const basisLabel = trendBasis === 'net' ? 'Net' : 'Churn (|ins|+|del|)'

  const trendLineName = `Linear trend (${trendBasis})`
  const ewmaLineName = `EWMA (${trendBasis})`

  const option: EChartsOption = useMemo(() => {
    const baseLegend = combineInsDel
      ? ['|insertions| + |deletions|', 'Net']
      : ['Insertions', 'Deletions', 'Net']

    const extraLegend: string[] = []
    if (showRolling && rollingSeriesName)
      extraLegend.push(rollingSeriesName)
    if (showLinearTrend && daily.length >= 2)
      extraLegend.push(trendLineName)
    if (showEwma && daily.length >= 1)
      extraLegend.push(ewmaLineName)

    const legendData = [...baseLegend, ...extraLegend]

    const trendOnSecondAxis = trendBasis === 'churn'

    const baseSeries: NonNullable<EChartsOption['series']> = combineInsDel
      ? [
          {
            name: '|insertions| + |deletions|',
            type: 'line',
            data: churnSeries,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2.5 },
            itemStyle: { color: '#a3e635' },
            yAxisIndex: trendOnSecondAxis ? 1 : 0,
          },
          {
            name: 'Net',
            type: 'bar',
            data: daily.map((d) => d.net),
            itemStyle: { color: '#38bdf8', opacity: 0.35 },
          },
        ]
      : [
          {
            name: 'Insertions',
            type: 'line',
            data: daily.map((d) => d.insertions),
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2 },
            itemStyle: { color: '#34d399' },
          },
          {
            name: 'Deletions',
            type: 'line',
            data: daily.map((d) => d.deletions),
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2 },
            itemStyle: { color: '#f87171' },
          },
          {
            name: 'Net',
            type: 'bar',
            data: daily.map((d) => d.net),
            itemStyle: { color: '#38bdf8', opacity: 0.35 },
          },
        ]

    const extraSeries: NonNullable<EChartsOption['series']> = []

    if (showRolling && rollingDays !== null && rollingSeriesName) {
      extraSeries.push({
        name: rollingSeriesName,
        type: 'line',
        data: rolling,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: '#c084fc' },
      })
    }

    if (showLinearTrend && daily.length >= 2) {
      extraSeries.push({
        name: trendLineName,
        type: 'line',
        data: regression.fitted,
        smooth: false,
        showSymbol: false,
        lineStyle: { width: 2.5, type: 'solid' },
        itemStyle: { color: '#f59e0b' },
        yAxisIndex: trendOnSecondAxis ? 1 : 0,
      })
    }

    if (showEwma && daily.length >= 1) {
      extraSeries.push({
        name: ewmaLineName,
        type: 'line',
        data: ewma,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, type: 'solid' },
        itemStyle: { color: '#fb923c' },
        yAxisIndex: trendOnSecondAxis ? 1 : 0,
      })
    }

    const series: EChartsOption['series'] = [...baseSeries, ...extraSeries]

    const cpIdx = changepoint?.splitIndex ?? null
    attachChangepointMarkLine(
      series,
      dates,
      showChangepoint ? cpIdx : null,
      Boolean(cpIdx !== null && showChangepoint),
    )

    return {
      backgroundColor: 'transparent',
      textStyle: { color: '#a1a1aa' },
      tooltip: { trigger: 'axis' },
      legend: {
        data: legendData,
        textStyle: { color: '#a1a1aa' },
        top: 0,
        type: 'scroll',
      },
      grid: {
        left: 56,
        right: trendOnSecondAxis ? 52 : 24,
        bottom: 56,
        top: 44,
      },
      dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 8 }],
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#a1a1aa', rotate: 35 },
      },
      yAxis: trendOnSecondAxis
        ? [
            {
              type: 'value',
              name: 'Net scale',
              nameTextStyle: { color: '#71717a', fontSize: 10 },
              axisLabel: { color: '#a1a1aa' },
              splitLine: { lineStyle: { color: '#27272a' } },
            },
            {
              type: 'value',
              name: 'Churn (trend)',
              position: 'right',
              nameTextStyle: { color: '#fb923c', fontSize: 10 },
              axisLabel: { color: '#fdba74' },
              splitLine: { show: false },
            },
          ]
        : {
            type: 'value',
            axisLabel: { color: '#a1a1aa' },
            splitLine: { lineStyle: { color: '#27272a' } },
          },
      series,
    }
  }, [
    combineInsDel,
    daily,
    dates,
    rolling,
    churnSeries,
    showRolling,
    rollingDays,
    rollingSeriesName,
    regression.fitted,
    ewma,
    showLinearTrend,
    showEwma,
    showChangepoint,
    changepoint,
    trendLineName,
    ewmaLineName,
    trendBasis,
  ])

  function getInstance() {
    return chartRef.current?.getEchartsInstance()
  }

  function downloadDataUrl(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  function exportPng() {
    const inst = getInstance()
    if (!inst)
      return
    const url = inst.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#18181b',
    })
    downloadDataUrl(url, 'velocorepo-velocity.png')
  }

  function exportSvg() {
    const inst = getInstance()
    if (!inst)
      return
    const url = inst.getDataURL({ type: 'svg', backgroundColor: '#18181b' })
    downloadDataUrl(url, 'velocorepo-velocity.svg')
  }

  const shiftLabel
    = changepoint && showChangepoint ? dates[changepoint.splitIndex] : null

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
        <div className="font-medium text-zinc-300">Trend analysis ({basisLabel})</div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {daily.length >= 2 && (
            <span>
              Slope
              {' '}
              <span className="tabular-nums text-zinc-200">
                {regression.slope >= 0 ? '+' : ''}
                {regression.slope.toFixed(2)}
              </span>
              {' '}
              / day · R²
              {' '}
              <span className="tabular-nums text-zinc-200">{regression.r2.toFixed(2)}</span>
            </span>
          )}
          {shiftLabel && (
            <span>
              Shift
              {' '}
              <span className="text-amber-400/90">{shiftLabel}</span>
            </span>
          )}
          {daily.length < 4 && showChangepoint && (
            <span className="text-zinc-500">(Need ≥4 days for shift detection)</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Trend basis</span>
            <div className="inline-flex rounded-lg border border-zinc-600 p-0.5">
              {(['net', 'churn'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setTrendBasis(b)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    trendBasis === b
                      ? 'bg-zinc-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {b === 'net' ? 'Net' : 'Churn'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showLinearTrend}
                onChange={(e) => setShowLinearTrend(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Linear trend
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showChangepoint}
                onChange={(e) => setShowChangepoint(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Shift marker
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showEwma}
                onChange={(e) => setShowEwma(e.target.checked)}
                className="rounded border-zinc-600"
              />
              EWMA smooth
            </label>
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap">EWMA α</span>
              <input
                type="range"
                min={0.05}
                max={0.45}
                step={0.01}
                value={ewmaAlpha}
                onChange={(e) => setEwmaAlpha(Number.parseFloat(e.target.value))}
                className="w-28 accent-orange-400"
              />
              <span className="tabular-nums text-zinc-500">{ewmaAlpha.toFixed(2)}</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-700/60 pt-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={combineInsDel}
                onChange={(e) => setCombineInsDel(e.target.checked)}
                className="rounded border-zinc-600"
              />
              <span title="One line: |insertions| + |deletions| per day (total churn)">
                Single churn line (|ins| + |del|)
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="whitespace-nowrap">Net rolling window</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="off"
                value={rollingInput}
                onChange={(e) => setRollingInput(e.target.value)}
                onBlur={commitRollingField}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    (e.target as HTMLInputElement).blur()
                }}
                className="w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-zinc-100 tabular-nums placeholder:text-zinc-600"
              />
              <span className="text-zinc-500">days (empty = hide, always net)</span>
            </label>
            <button
              type="button"
              onClick={exportPng}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              Export PNG
            </button>
            <button
              type="button"
              onClick={exportSvg}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              Export SVG
            </button>
          </div>
        </div>
        <ReactECharts
          ref={chartRef}
          option={option}
          notMerge
          lazyUpdate={false}
          style={{ height: 420, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  )
}
