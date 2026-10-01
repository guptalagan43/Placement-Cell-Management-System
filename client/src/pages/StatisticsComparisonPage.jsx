// Statistics Comparison Page: TPO view with year-over-year trend charts.
// Traces to FR-STA-02.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Loader2,
  Filter,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronUp,
  BarChart2,
  TrendingUp,
} from 'lucide-react'
import * as statsCompareApi from '../api/statsCompare.api.js'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

const COLORS = {
  primary: '#15803D',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
  neutral: '#6B7280',
  secondary: '#7C3AED',
}

const METRIC_OPTIONS = [
  {
    key: 'placementPercentage',
    label: 'Placement %',
    format: (v) => (v !== null ? `${v.toFixed(2)}%` : '-'),
  },
  { key: 'avgCtcLpa', label: 'Avg CTC (LPA)', format: (v) => (v !== null ? `₹${v}L` : '-') },
  { key: 'medianCtcLpa', label: 'Median CTC (LPA)', format: (v) => (v !== null ? `₹${v}L` : '-') },
  {
    key: 'highestCtcLpa',
    label: 'Highest CTC (LPA)',
    format: (v) => (v !== null ? `₹${v}L` : '-'),
  },
  { key: 'placedStudents', label: 'Placed Students', format: (v) => v },
  { key: 'totalStudents', label: 'Total Students', format: (v) => v },
  { key: 'totalDrives', label: 'Total Drives', format: (v) => v },
  { key: 'totalApplications', label: 'Total Applications', format: (v) => v },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded-lg shadow-raised p-3">
        <p className="font-heading text-sm font-semibold text-ink-900">Season: {label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-body text-sm text-ink-600 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: <strong>{entry.value !== null ? entry.value : '-'}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const METRIC_COLORS = [
  COLORS.primary,
  COLORS.warning,
  COLORS.info,
  COLORS.danger,
  COLORS.secondary,
  COLORS.neutral,
]

export default function StatisticsComparisonPage() {
  useAuth()

  const [seasons, setSeasons] = useState([])
  const [selectedSeasons, setSelectedSeasons] = useState([])
  const [comparison, setComparison] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState('placementPercentage')
  const [seasonsLoading, setSeasonsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false)

  const fetchSeasons = useCallback(async () => {
    setSeasonsLoading(true)
    try {
      const res = await statsCompareApi.getAvailableSeasons()
      setSeasons(res.seasons || [])
      // Default to last 2 seasons if available
      if (res.seasons?.length >= 2) {
        setSelectedSeasons([res.seasons[1], res.seasons[0]]) // oldest first
      } else if (res.seasons?.length === 1) {
        setSelectedSeasons([res.seasons[0]])
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch seasons')
    } finally {
      setSeasonsLoading(false)
    }
  }, [])

  const fetchComparison = useCallback(async () => {
    if (selectedSeasons.length === 0) return
    setError(null)
    try {
      const res = await statsCompareApi.compareSeasons(selectedSeasons.join(','))
      setComparison(res)
    } catch (err) {
      setError(err.message || 'Failed to fetch comparison')
    }
  }, [selectedSeasons])

  useEffect(() => {
    const loadSeasons = async () => {
      await fetchSeasons()
    }
    loadSeasons()
  }, [fetchSeasons])

  useEffect(() => {
    const loadComparison = async () => {
      if (selectedSeasons.length > 0) {
        await fetchComparison()
      } else {
        setComparison(null)
      }
    }
    loadComparison()
  }, [selectedSeasons, fetchComparison])

  const trendData = useMemo(() => {
    if (!comparison?.trends) return []
    return comparison.trends
  }, [comparison])

  const seasonStats = useMemo(() => {
    if (!comparison?.seasons) return []
    return comparison.seasons
  }, [comparison])

  const currentMetricData = useMemo(() => {
    return trendData.map((t) => ({
      season: t.season,
      value: t[selectedMetric],
    }))
  }, [trendData, selectedMetric])

  const metricInfo = METRIC_OPTIONS.find((m) => m.key === selectedMetric)

  const handleSeasonToggle = (season) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season].sort()
    )
    setShowSeasonDropdown(false)
  }

  const handleSeasonSelectAll = () => {
    setSelectedSeasons([...seasons].sort())
    setShowSeasonDropdown(false)
  }

  const handleSeasonClear = () => {
    setSelectedSeasons([])
    setShowSeasonDropdown(false)
  }

  if (seasonsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">
            Year-over-Year Comparison
          </h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Compare placement statistics across multiple seasons
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-6 bg-primary-100 rounded w-3/4 mb-3" />
              <div className="h-4 bg-primary-100 rounded w-1/2 mb-2" />
              <div className="space-y-3">
                <div className="h-8 bg-primary-100 rounded w-full" />
                <div className="h-8 bg-primary-100 rounded w-full" />
                <div className="h-8 bg-primary-100 rounded w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">
            Year-over-Year Comparison
          </h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Compare placement statistics across multiple seasons
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSeasons}
            disabled={seasonsLoading}
            icon={<RefreshCw className={`w-4 h-4 ${seasonsLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="bg-danger bg-opacity-10 border border-danger text-danger rounded-lg p-4 flex items-center justify-between"
          role="alert"
        >
          <span className="font-body text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Season Selector */}
      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-heading text-lg font-semibold text-ink-900 mb-3">
            Select Seasons to Compare
          </h3>
          <div className="relative">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                icon={
                  showSeasonDropdown ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )
                }
              >
                {selectedSeasons.length === 0
                  ? 'Select seasons...'
                  : selectedSeasons.map((s) => (
                      <Badge key={s} tone="primary" size="sm" className="mr-1">
                        {s}
                      </Badge>
                    ))}
              </Button>
              {showSeasonDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-raised z-10 max-h-60 overflow-auto">
                  <div className="p-2 border-b border-border flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-left"
                      onClick={handleSeasonSelectAll}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-left"
                      onClick={handleSeasonClear}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="p-2 space-y-1">
                    {seasons.map((season) => (
                      <label
                        key={season}
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSeasons.includes(season)}
                          onChange={() => handleSeasonToggle(season)}
                          className="w-4 h-4 text-primary-700 border-border rounded focus:ring-primary-500"
                        />
                        <span className="font-body text-sm text-ink-900">{season}</span>
                      </label>
                    ))}
                    {seasons.length === 0 && (
                      <p className="px-3 py-4 font-body text-sm text-ink-500 text-center">
                        No seasons available
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {selectedSeasons.length > 0 && (
            <p className="font-body text-xs text-ink-500 mt-2">
              Comparing {selectedSeasons.length} season{selectedSeasons.length > 1 ? 's' : ''}
              {selectedSeasons.length < 2 && ' (add at least 2 for trend comparison)'}
            </p>
          )}
        </div>
      </Card>

      {/* Metric Selector */}
      <Card>
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary-700" />
              <span className="font-heading text-base font-semibold text-ink-900">Metric</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {METRIC_OPTIONS.map((metric) => (
                <Button
                  key={metric.key}
                  variant={selectedMetric === metric.key ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric(metric.key)}
                  className="whitespace-nowrap"
                >
                  {metric.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Trend Chart */}
      <Card>
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-ink-900">
                {metricInfo?.label} Trend
              </h3>
              <p className="font-body text-xs text-ink-500 mt-1">
                {trendData.length} season{trendData.length > 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 h-80">
          {trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-400">
              <TrendingUp className="w-12 h-12 mb-4" />
              <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
                No Data to Display
              </h3>
              <p className="font-body text-ink-500 mb-4">
                Select at least one season to view comparison
              </p>
            </div>
          ) : trendData.length === 1 ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-400">
              <BarChart2 className="w-12 h-12 mb-4" />
              <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
                Single Season Selected
              </h3>
              <p className="font-body text-ink-500 mb-4">
                Select 2 or more seasons to see trend comparison
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={currentMetricData}
                margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="season"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => {
                    if (selectedMetric.includes('Ctc')) return `₹${value}L`
                    if (selectedMetric === 'placementPercentage') return `${value}%`
                    return value
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={metricInfo?.label}
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ r: 6, strokeWidth: 3, fill: '#fff', stroke: COLORS.primary }}
                  activeDot={{ r: 8, strokeWidth: 2 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Comparison Table */}
      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-heading text-lg font-semibold text-ink-900">
            Season Comparison Table
          </h3>
        </div>
        <div className="p-4">
          {seasonStats.length === 0 ? (
            <div className="text-center py-12 text-ink-400">
              <p className="font-body">No comparison data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-primary-50 border-b border-border">
                    <th className="px-4 py-3 text-left font-body text-xs font-semibold text-ink-600 uppercase tracking-wider">
                      Season
                    </th>
                    {METRIC_OPTIONS.map((metric) => (
                      <th
                        key={metric.key}
                        className={`px-4 py-3 text-right font-body text-xs font-semibold text-ink-600 uppercase tracking-wider ${selectedMetric === metric.key ? 'bg-primary-100 text-primary-700' : ''}`}
                      >
                        {metric.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {seasonStats.map((season, index) => (
                    <tr
                      key={season.season}
                      className={`hover:bg-primary-50/50 ${index % 2 === 0 ? 'bg-surface' : 'bg-primary-50/30'}`}
                    >
                      <td className="px-4 py-4 font-heading text-sm font-semibold text-ink-900">
                        {season.season}
                      </td>
                      {METRIC_OPTIONS.map((metric) => (
                        <td
                          key={metric.key}
                          className={`px-4 py-4 font-body text-sm text-right ${selectedMetric === metric.key ? 'font-semibold text-primary-700' : 'text-ink-600'}`}
                        >
                          {season.overview[metric.key] !== null &&
                          season.overview[metric.key] !== undefined
                            ? metric.format(season.overview[metric.key])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Department Breakdown Comparison (if multiple seasons) */}
      {seasonStats.length > 1 && (
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-heading text-lg font-semibold text-ink-900">
              Department-wise Placement % Comparison
            </h3>
          </div>
          <div className="p-4 h-80">
            {seasonStats[0]?.departmentBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={seasonStats[0].departmentBreakdown}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    type="number"
                    domain={[0, 'dataMax + 15']}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={100}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {seasonStats.map((season, seasonIndex) => (
                    <Bar
                      key={season.season}
                      dataKey="placementPercentage"
                      name={season.season}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={30}
                      stackId="a"
                      fill={METRIC_COLORS[seasonIndex % METRIC_COLORS.length]}
                    >
                      {season.departmentBreakdown.map((entry, entryIndex) => (
                        <Cell
                          key={`dept-${season.season}-${entryIndex}`}
                          fill={METRIC_COLORS[seasonIndex % METRIC_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-ink-400">
                <p className="font-body text-sm">No department breakdown data available</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
