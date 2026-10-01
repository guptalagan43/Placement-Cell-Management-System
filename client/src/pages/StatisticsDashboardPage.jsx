// Statistics Dashboard Page: Coordinator/TPO view with charts.
// Traces to FR-STA-01, FR-STA-03.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Loader2, BarChart2, Filter, RefreshCw, TrendingUp, Users, Award } from 'lucide-react'
import * as statsApi from '../api/stats.api.js'
import * as driveApi from '../api/drive.api.js'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  Cell,
  Legend,
} from 'recharts'

const COLORS = {
  primary: '#15803D',
  primaryLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',
  neutral: '#6B7280',
  neutralLight: '#F3F4F6',
}

const DEPARTMENT_LABELS = {
  'Computer Science & Engineering': 'CSE',
  'Information Technology': 'IT',
  'Electronics & Communication Engineering': 'ECE',
  'Electrical Engineering': 'EEE',
  'Mechanical Engineering': 'MECH',
  'Civil Engineering': 'CIVIL',
  'Management Studies': 'MGMT',
  'Basic Sciences & Humanities': 'BSH',
}

const formatCTC = (ctcLpa) => {
  if (!ctcLpa && ctcLpa !== 0) return '-'
  return `₹${ctcLpa} LPA`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded-lg shadow-raised p-3">
        <p className="font-heading text-sm font-semibold text-ink-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-body text-sm text-ink-600">
            {entry.name}: <strong>{entry.value !== null ? entry.value : '-'}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const FunnelTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded-lg shadow-raised p-3">
        <p className="font-heading text-sm font-semibold text-ink-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-body text-sm text-ink-600">
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function StatisticsDashboardPage() {
  const { user } = useAuth()
  const isTPO = user?.role === 'tpo'

  const [overview, setOverview] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [drives, setDrives] = useState([])
  const [selectedDriveId, setSelectedDriveId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [funnelLoading, setFunnelLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deptSortBy, setDeptSortBy] = useState('placementPercentage')
  const [deptSortOrder, setDeptSortOrder] = useState('desc')

  const fetchOverview = useCallback(async () => {
    let mounted = true
    setLoading(true)
    setError(null)
    try {
      const res = await statsApi.getOverviewStats()
      if (mounted) {
        setOverview(res)
      }
    } catch (err) {
      if (mounted) {
        setError(err.message || 'Failed to fetch statistics')
      }
    } finally {
      if (mounted) {
        setLoading(false)
      }
    }
  }, [])

  const fetchDrives = useCallback(async () => {
    let mounted = true
    try {
      const res = await driveApi.getDrives({
        status: 'registration_open,registration_closed,in_progress,completed,results_declared',
        limit: 100,
      })
      if (mounted) {
        setDrives(res.drives || [])
        if (res.drives?.length > 0 && !selectedDriveId) {
          setSelectedDriveId(res.drives[0]._id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch drives:', err)
    }
  }, [selectedDriveId])

  const fetchFunnel = useCallback(async (driveId) => {
    if (!driveId) return
    let mounted = true
    setFunnelLoading(true)
    try {
      const res = await statsApi.getDriveFunnel(driveId)
      if (mounted) {
        setFunnel(res)
      }
    } catch (err) {
      console.error('Failed to fetch funnel:', err)
    } finally {
      if (mounted) {
        setFunnelLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      await fetchOverview()
      await fetchDrives()
    }
    loadData()
  }, [fetchOverview, fetchDrives])

  useEffect(() => {
    const loadFunnel = async () => {
      await fetchFunnel(selectedDriveId)
    }
    loadFunnel()
  }, [selectedDriveId, fetchFunnel])

  const departmentData = useMemo(() => {
    if (!overview?.departmentBreakdown) return []
    const data = overview.departmentBreakdown.map((dept) => ({
      name: DEPARTMENT_LABELS[dept.department] || dept.department,
      fullName: dept.department,
      totalStudents: dept.totalStudents,
      placedStudents: dept.placedStudents,
      placementPercentage: dept.placementPercentage,
      fill:
        dept.placementPercentage > 50
          ? COLORS.primary
          : dept.placementPercentage > 25
            ? COLORS.warning
            : COLORS.neutral,
    }))

    // Sort the data
    const sortedData = [...data].sort((a, b) => {
      let valA = a[deptSortBy]
      let valB = b[deptSortBy]

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
      }

      if (valA < valB) return deptSortOrder === 'asc' ? -1 : 1
      if (valA > valB) return deptSortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sortedData
  }, [overview?.departmentBreakdown, deptSortBy, deptSortOrder])

  const funnelData = useMemo(() => {
    if (!funnel?.funnel) return []
    return [
      { name: 'Applied', value: funnel.funnel.applied, fullName: 'Applied' },
      { name: 'Shortlisted', value: funnel.funnel.shortlisted, fullName: 'Shortlisted' },
      { name: 'Selected', value: funnel.funnel.selected, fullName: 'Selected' },
    ]
  }, [funnel?.funnel])

  const funnelStages = useMemo(() => {
    if (!funnel?.funnel) return []
    const stages = [
      { name: 'Applied', value: funnel.funnel.applied, rate: '100%' },
      {
        name: 'Shortlisted',
        value: funnel.funnel.shortlisted,
        rate: funnel.conversionRates?.appliedToShortlisted || '0%',
      },
      {
        name: 'Selected',
        value: funnel.funnel.selected,
        rate: funnel.conversionRates?.shortlistedToSelected || '0%',
      },
    ]
    return stages
  }, [funnel?.funnel, funnel?.conversionRates])

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Statistics Dashboard</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Real-time placement statistics and analytics
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
          <h1 className="font-heading text-2xl font-bold text-ink-900">Statistics Dashboard</h1>
          <p className="font-body text-sm text-ink-600 mt-1">
            Real-time placement statistics and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOverview()
              fetchDrives()
            }}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
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

      {/* Overview Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100">
              <Users className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <p className="font-body text-sm text-ink-500">Total Students</p>
              <p className="font-heading text-2xl font-bold text-ink-900">
                {overview?.overview?.totalStudents ?? '-'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-success bg-opacity-10">
              <Award className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="font-body text-sm text-ink-500">Placed Students</p>
              <p className="font-heading text-2xl font-bold text-ink-900">
                {overview?.overview?.placedStudents ?? '-'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100">
              <TrendingUp className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <p className="font-body text-sm text-ink-500">Placement %</p>
              <p className="font-heading text-2xl font-bold text-ink-900">
                {overview?.overview?.placementPercentage !== undefined
                  ? `${overview.overview.placementPercentage.toFixed(2)}%`
                  : '-'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-info bg-opacity-10">
              <BarChart2 className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="font-body text-sm text-ink-500">Avg CTC</p>
              <p className="font-heading text-2xl font-bold text-ink-900">
                {overview?.overview?.avgCtcLpa ? formatCTC(overview.overview.avgCtcLpa) : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department-wise Placement Bar Chart */}
        <Card>
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-ink-900">
                Department-wise Placement Percentage
              </h3>
              <p className="font-body text-xs text-ink-500 mt-1">
                {isTPO ? 'Institute-wide view' : `Department: ${user?.department}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={deptSortBy}
                onChange={(e) => setDeptSortBy(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="placementPercentage">Sort by Placement %</option>
                <option value="name">Sort by Department Name</option>
                <option value="placedStudents">Sort by Placed Students</option>
                <option value="totalStudents">Sort by Total Students</option>
              </select>
              <select
                value={deptSortOrder}
                onChange={(e) => setDeptSortOrder(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 w-28"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          <div className="p-4 h-80">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    type="number"
                    domain={[0, 'dataMax + 10']}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="placementPercentage"
                    name="Placement %"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-ink-400">
                <p className="font-body text-sm">No department data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* CTC Summary Cards */}
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-heading text-lg font-semibold text-ink-900">CTC Summary</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg bg-info bg-opacity-10">
                <p className="font-body text-xs text-ink-500 uppercase tracking-wider">
                  Median CTC
                </p>
                <p className="font-heading text-xl font-bold text-ink-900 mt-1">
                  {overview?.overview?.medianCtcLpa
                    ? formatCTC(overview.overview.medianCtcLpa)
                    : '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-warning bg-opacity-10">
                <p className="font-body text-xs text-ink-500 uppercase tracking-wider">
                  Highest CTC
                </p>
                <p className="font-heading text-xl font-bold text-ink-900 mt-1">
                  {overview?.overview?.highestCtcLpa
                    ? formatCTC(overview.overview.highestCtcLpa)
                    : '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary bg-opacity-10">
                <p className="font-body text-xs text-ink-500 uppercase tracking-wider">
                  Average CTC
                </p>
                <p className="font-heading text-xl font-bold text-ink-900 mt-1">
                  {overview?.overview?.avgCtcLpa ? formatCTC(overview.overview.avgCtcLpa) : '-'}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="font-body text-xs text-ink-500">
                Based on {overview?.overview?.placedStudents ?? 0} placed student
                {overview?.overview?.placedStudents !== 1 ? 's' : ''}
                {overview?.overview?.avgCtcLpa && ' with recorded offers'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Drive Funnel Section */}
      <Card>
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-ink-900">
              Drive Funnel Analysis
            </h3>
            <p className="font-body text-xs text-ink-500 mt-1">
              Track conversion from application to selection
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative max-w-xs">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <select
                value={selectedDriveId || ''}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                disabled={funnelLoading}
                className="w-full pl-10 pr-10 py-2 rounded-md border border-border bg-surface text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 appearance-none"
              >
                <option value="">Select a drive...</option>
                {drives.map((drive) => (
                  <option key={drive._id} value={drive._id}>
                    {drive.title} @ {drive.company?.name}
                  </option>
                ))}
              </select>
            </div>
            {funnelLoading && <Loader2 className="w-4 h-4 animate-spin text-primary-700" />}
          </div>
        </div>

        <div className="p-4">
          {selectedDriveId ? (
            funnelData.length > 0 ? (
              <div className="space-y-6">
                {/* Funnel Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Funnel
                        dataKey="value"
                        nameKey="name"
                        data={funnelData}
                        stroke="#fff"
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={500}
                        minSize={0}
                        maxSize={100}
                        trapezoid={true}
                        gap={8}
                      >
                        {funnelData.map((entry, index) => (
                          <Cell
                            key={`funnel-${index}`}
                            fill={
                              index === 0
                                ? COLORS.primary
                                : index === 1
                                  ? COLORS.warning
                                  : COLORS.success
                            }
                          />
                        ))}
                      </Funnel>
                      <Tooltip content={<FunnelTooltip />} />
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>

                {/* Funnel Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {funnelStages.map((stage, index) => (
                    <div
                      key={stage.name}
                      className={`p-4 rounded-lg border ${
                        index === 0
                          ? 'bg-primary-50 border-primary-200'
                          : index === 1
                            ? 'bg-warning-50 border-warning-200'
                            : 'bg-success-50 border-success-200'
                      }`}
                    >
                      <p className="font-body text-xs text-ink-500 uppercase tracking-wider">
                        {stage.name}
                      </p>
                      <p className="font-heading text-2xl font-bold text-ink-900 mt-1">
                        {stage.value}
                      </p>
                      <p className="font-body text-sm text-ink-600 mt-1">{stage.rate} conversion</p>
                    </div>
                  ))}
                </div>

                {/* Additional Stats */}
                <div className="grid gap-4 sm:grid-cols-4 pt-4 border-t border-border">
                  <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                    <p className="font-body text-xs text-ink-500">Rejected</p>
                    <p className="font-heading text-lg font-bold text-danger mt-1">
                      {funnel?.funnel?.rejected ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                    <p className="font-body text-xs text-ink-500">Pending</p>
                    <p className="font-heading text-lg font-bold text-warning mt-1">
                      {funnel?.funnel?.pending ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                    <p className="font-body text-xs text-ink-500">Withdrawn</p>
                    <p className="font-heading text-lg font-bold text-neutral mt-1">
                      {funnel?.funnel?.withdrawn ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                    <p className="font-body text-xs text-ink-500">Applied → Selected</p>
                    <p className="font-heading text-lg font-bold text-ink-900 mt-1">
                      {funnel?.conversionRates?.appliedToSelected ?? '0.00'}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart2 className="w-12 h-12 text-ink-300 mx-auto mb-4" />
                <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
                  No Funnel Data
                </h3>
                <p className="font-body text-ink-500">
                  No applications found for the selected drive
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-ink-300 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-ink-900 mb-2">
                Select a Drive
              </h3>
              <p className="font-body text-ink-500">
                Choose a drive from the dropdown to view its funnel analysis
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
