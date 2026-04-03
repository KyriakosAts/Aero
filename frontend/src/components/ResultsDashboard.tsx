import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts'
import { SimulationDataPayload } from '../api/client'
import { Card } from './Card'
import { Alert } from './Alert'

interface ResultsDashboardProps {
  data: SimulationDataPayload
}

function formatNumber(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a'
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  })
}

function toNumeric(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim()
    return Number(normalized)
  }
  return Number(value)
}

export function ResultsDashboard({ data }: ResultsDashboardProps) {
  const summary = data.summary ?? {}
  const stationProfile = data.station_profile ?? []
  const curve = data.performance_curve ?? []
  const curveRows = (Array.isArray(curve) ? curve : []) as unknown as Array<Record<string, unknown>>
  const legacyPreviewRows = Array.isArray((data as Record<string, unknown>).table_preview)
    ? ((data as Record<string, unknown>).table_preview as Array<Record<string, unknown>>)
    : []
  const explicitRows = Array.isArray(data.table_rows)
    ? (data.table_rows as Array<Record<string, unknown>>)
    : []
  const stationRows = stationProfile.map((row) => ({
    station: row.station,
    temperature_K: row.temperature_K,
    pressure_Pa: row.pressure_Pa,
  })) as Array<Record<string, unknown>>
  const normalizedTableRows = explicitRows.length > 0
    ? explicitRows
    : curveRows.length > 0
        ? curveRows
        : legacyPreviewRows.length > 0
          ? legacyPreviewRows
          : stationRows
  const tableColumns = (data.table_columns && data.table_columns.length > 0)
    ? data.table_columns
    : Object.keys(normalizedTableRows[0] ?? {})
  const customBuilder = (data as { custom_builder?: { engine_name?: string; component_count?: number; component_sequence?: string[] } }).custom_builder
  const [xAxisColumn, setXAxisColumn] = useState<string>('')
  const [yAxisPrimary, setYAxisPrimary] = useState<string>('')
  const [yAxisSecondary, setYAxisSecondary] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  const plotSourceRows = curveRows.length > 0 ? curveRows : normalizedTableRows

  const curveNumericColumns = useMemo(() => {
    const keys = new Set<string>()
    plotSourceRows.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        if (value !== null && value !== '' && !Number.isNaN(toNumeric(value))) {
          keys.add(key)
        }
      })
    })
    return Array.from(keys)
  }, [plotSourceRows])

  useEffect(() => {
    if (!xAxisColumn && curveNumericColumns.length > 0) {
      setXAxisColumn(
        curveNumericColumns.includes('point')
          ? 'point'
          : curveNumericColumns[0]
      )
    }
    if (!yAxisPrimary && curveNumericColumns.length > 1) {
      setYAxisPrimary(
        curveNumericColumns.includes('net_thrust')
          ? 'net_thrust'
          : curveNumericColumns[1]
      )
    }
    if (!yAxisSecondary && curveNumericColumns.length > 2) {
      setYAxisSecondary(
        curveNumericColumns.includes('fuel_flow')
          ? 'fuel_flow'
          : curveNumericColumns[2]
      )
    }
  }, [curveNumericColumns, xAxisColumn, yAxisPrimary, yAxisSecondary])

  const plotRows = useMemo(() => {
    if (!xAxisColumn || !yAxisPrimary) {
      return []
    }

    return plotSourceRows
      .map((row) => {
          const x = toNumeric(row[xAxisColumn])
          const y1 = toNumeric(row[yAxisPrimary])
          const y2 = yAxisSecondary ? toNumeric(row[yAxisSecondary]) : null

        return {
          x,
          y1,
          y2,
          hasY2: y2 !== null && !Number.isNaN(y2),
        }
      })
      .filter((row) => !Number.isNaN(row.x) && !Number.isNaN(row.y1))
  }, [plotSourceRows, xAxisColumn, yAxisPrimary, yAxisSecondary])

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) {
      return normalizedTableRows
    }

    const q = searchTerm.toLowerCase()
    return normalizedTableRows.filter((row) =>
      tableColumns.some((column) => String(row[column] ?? '').toLowerCase().includes(q))
    )
  }, [normalizedTableRows, tableColumns, searchTerm])

  const pageSize = 25
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, pageCount)

  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage)
    }
  }, [safePage, page])

  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const pressureBars = stationProfile.map((row) => ({
    ...row,
    pressure_kPa:
      row.pressure_Pa === null || row.pressure_Pa === undefined
        ? null
        : row.pressure_Pa / 1000,
  }))

  return (
    <div className="space-y-6">
      {data.warning && (
        <Alert
          type="info"
          title="Fallback Data"
          message={data.warning}
        />
      )}

      {customBuilder && (
        <Card title="Custom Builder Summary" description="Configuration used for this simulation run">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
              <p className="text-slate-400">Engine Name</p>
              <p className="font-semibold text-slate-100 mt-1">{customBuilder.engine_name ?? 'n/a'}</p>
            </div>
            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
              <p className="text-slate-400">Components</p>
              <p className="font-semibold text-slate-100 mt-1">{customBuilder.component_count ?? 0}</p>
            </div>
            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3 md:col-span-1">
              <p className="text-slate-400">Sequence</p>
              <p className="font-semibold text-slate-100 mt-1">{(customBuilder.component_sequence ?? []).join(' -> ') || 'n/a'}</p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Key Performance Indicators" description={`Data source: ${data.source ?? 'unknown'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Net Thrust</p>
            <p className="text-2xl font-semibold text-emerald-300">{formatNumber(summary.net_thrust_N, 2)} N</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Fuel Flow</p>
            <p className="text-2xl font-semibold text-cyan-300">{formatNumber(summary.fuel_flow_kg_s, 4)} kg/s</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">TSFC</p>
            <p className="text-2xl font-semibold text-amber-300">{formatNumber(summary.tsfc_kg_per_Ns, 6)} kg/(N.s)</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Compressor PR</p>
            <p className="text-2xl font-semibold text-blue-300">{formatNumber(summary.compressor_pr, 3)}</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Turbine Inlet Temp</p>
            <p className="text-2xl font-semibold text-rose-300">{formatNumber(summary.turbine_inlet_temp_K, 2)} K</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">N1 Speed</p>
            <p className="text-2xl font-semibold text-violet-300">{formatNumber(summary.n1_percent, 2)}%</p>
          </div>
        </div>
      </Card>

      <Card title="Performance Curve" description="Fuel flow vs thrust and shaft speed over operating points">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="fuel_flow" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="net_thrust" name="Net Thrust (N)" stroke="#4ade80" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="n1_percent" name="N1 (%)" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Station Diagram" description="Temperature and pressure evolution through stations 0-9">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pressureBars} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="station" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Legend />
              <Bar yAxisId="right" dataKey="pressure_kPa" name="Pressure (kPa)" fill="#22d3ee" opacity={0.35} />
              <Line yAxisId="left" type="monotone" dataKey="temperature_K" name="Temperature (K)" stroke="#f97316" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Custom Plot Explorer" description="Plot any numeric output columns against each other">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">X Axis</label>
            <select value={xAxisColumn} onChange={(e) => setXAxisColumn(e.target.value)} className="parameter-input" disabled={curveNumericColumns.length === 0}>
              {curveNumericColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Y Axis (Primary)</label>
            <select value={yAxisPrimary} onChange={(e) => setYAxisPrimary(e.target.value)} className="parameter-input" disabled={curveNumericColumns.length === 0}>
              {curveNumericColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Y Axis (Secondary)</label>
            <select value={yAxisSecondary} onChange={(e) => setYAxisSecondary(e.target.value)} className="parameter-input" disabled={curveNumericColumns.length === 0}>
              <option value="">None</option>
              {curveNumericColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
        </div>

        {curveNumericColumns.length === 0 ? (
          <p className="text-sm text-slate-400">No numeric columns available for plotting in this dataset.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plotRows} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="x" stroke="#94a3b8" />
                <YAxis yAxisId="left" stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="y1" name={yAxisPrimary || 'Y1'} stroke="#38bdf8" strokeWidth={2} dot={false} />
                {yAxisSecondary && (
                  <Line yAxisId="right" type="monotone" dataKey="y2" name={yAxisSecondary} stroke="#f59e0b" strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Full Results Table" description={`All rows/columns (${normalizedTableRows.length} rows)`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            placeholder="Search any value..."
            className="input-field md:max-w-sm"
          />
          <div className="text-xs text-slate-400">
            Showing {pageRows.length} of {filteredRows.length} filtered rows
          </div>
        </div>

        {tableColumns.length === 0 ? (
          <p className="text-sm text-slate-400">No table data available for this run.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-slate-300 border-b border-slate-700">
                  {tableColumns.map((key) => (
                    <th key={key} className="py-2 pr-4 font-medium whitespace-nowrap">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800/70 text-slate-400">
                    {tableColumns.map((column) => (
                      <td key={column} className="py-2 pr-4 whitespace-nowrap">{String(row[column] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            className="btn-secondary disabled:opacity-40"
            disabled={safePage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </button>
          <span className="text-sm text-slate-300">Page {safePage} / {pageCount}</span>
          <button
            type="button"
            className="btn-secondary disabled:opacity-40"
            disabled={safePage >= pageCount}
            onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  )
}
