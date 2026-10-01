// CSV Export utility: converts data arrays to CSV format.
import { stringify } from 'csv-parse/sync'

/**
 * Converts an array of objects to CSV string
 * @param {Array<Object>} data - Array of data objects
 * @param {Array<string>} columns - Column names in order
 * @param {Object} columnLabels - Optional labels for columns (defaults to column names)
 * @returns {string} CSV string
 */
export function toCSV(data, columns, columnLabels = {}) {
  if (!data || data.length === 0) {
    // Return header only
    const headers = columns.map((col) => columnLabels[col] || col)
    return stringify([headers], { header: true })
  }

  // Prepare rows with selected columns
  const rows = data.map((item) => {
    const row = {}
    columns.forEach((col) => {
      let value = item[col]
      // Handle nested objects
      if (value === null || value === undefined) {
        row[columnLabels[col] || col] = ''
      } else if (typeof value === 'object' && value !== null) {
        row[columnLabels[col] || col] = JSON.stringify(value)
      } else {
        row[columnLabels[col] || col] = value
      }
    })
    return row
  })

  // Include header
  const headers = columns.map((col) => columnLabels[col] || col)
  return stringify(rows, { header: true, columns: headers })
}

/**
 * Student profile CSV export columns
 */
export const STUDENT_EXPORT_COLUMNS = [
  'rollNumber',
  'registrationNumber',
  'universityEnrollmentNumber',
  'branch',
  'batch',
  'section',
  'classGroup',
  'alternateClassGroup',
  'cgpaOverall',
  'backlogsActive',
  'tenthPercent',
  'twelfthPercent',
  'placementStatus',
  'currentTier',
  'isBlacklisted',
  'blacklistReason',
  'createdAt',
  'updatedAt',
]

export const STUDENT_EXPORT_LABELS = {
  rollNumber: 'Roll Number',
  registrationNumber: 'Registration Number',
  universityEnrollmentNumber: 'University Enrollment',
  branch: 'Branch',
  batch: 'Batch',
  section: 'Section',
  classGroup: 'Class Group',
  alternateClassGroup: 'Alt Class Group',
  cgpaOverall: 'CGPA Overall',
  backlogsActive: 'Active Backlogs',
  tenthPercent: '10th %',
  twelfthPercent: '12th %',
  placementStatus: 'Placement Status',
  currentTier: 'Current Tier',
  isBlacklisted: 'Blacklisted',
  blacklistReason: 'Blacklist Reason',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
}

/**
 * Application CSV export columns
 */
export const APPLICATION_EXPORT_COLUMNS = [
  'rollNumber',
  'studentName',
  'branch',
  'batch',
  'driveTitle',
  'company',
  'jobType',
  'ctcLpa',
  'tier',
  'overallStatus',
  'appliedAt',
  'round1Status',
  'round2Status',
  'round3Status',
  'round4Status',
  'round5Status',
  'withdrawnAt',
]

export const APPLICATION_EXPORT_LABELS = {
  rollNumber: 'Roll Number',
  studentName: 'Student Name',
  branch: 'Branch',
  batch: 'Batch',
  driveTitle: 'Drive Title',
  company: 'Company',
  jobType: 'Job Type',
  ctcLpa: 'CTC (LPA)',
  tier: 'Tier',
  overallStatus: 'Overall Status',
  appliedAt: 'Applied At',
  round1Status: 'Round 1',
  round2Status: 'Round 2',
  round3Status: 'Round 3',
  round4Status: 'Round 4',
  round5Status: 'Round 5',
  withdrawnAt: 'Withdrawn At',
}

/**
 * Statistics overview CSV export columns
 */
export const STATS_OVERVIEW_EXPORT_COLUMNS = ['metric', 'value']

export const STATS_OVERVIEW_EXPORT_LABELS = {
  metric: 'Metric',
  value: 'Value',
}

/**
 * Drive funnel CSV export columns
 */
export const FUNNEL_EXPORT_COLUMNS = ['stage', 'count', 'conversionRate']

export const FUNNEL_EXPORT_LABELS = {
  stage: 'Stage',
  count: 'Count',
  conversionRate: 'Conversion Rate (%)',
}
