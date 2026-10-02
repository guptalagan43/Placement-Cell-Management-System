// Statistics service: Database-level aggregations for placement statistics.
// Traces to FR-STA-01, FR-STA-03.
import mongoose from 'mongoose'
import Application from '../models/Application.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Drive from '../models/Drive.model.js'
import { ApiError } from '../utils/api-error.js'
import { DEPARTMENTS } from '../constants/departments.js'

/**
 * Calculates median from sorted array of numbers
 */
function calculateMedian(sortedNumbers) {
  if (!sortedNumbers.length) return null
  const mid = Math.floor(sortedNumbers.length / 2)
  if (sortedNumbers.length % 2 === 0) {
    return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2
  }
  return sortedNumbers[mid]
}

/**
 * Gets overall placement statistics for a given scope
 * @param {Object} options - Query options
 * @param {string} [options.departmentScope] - Department scope for coordinators (branch filter)
 * @returns {Promise<Object>} Statistics object
 */
export async function getOverviewStats({ departmentScope } = {}) {
  // Build match stage for student profiles
  const studentMatch = {}
  if (departmentScope) {
    studentMatch.branch = departmentScope
  }

  // Get total students in scope
  const totalStudents = await StudentProfile.countDocuments(studentMatch)

  // Get placed students in scope
  const placedStudents = await StudentProfile.countDocuments({
    ...studentMatch,
    placementStatus: 'placed',
  })

  // Get placed students with offer details (for CTC calculations)
  const placedProfiles = await StudentProfile.find({
    ...studentMatch,
    placementStatus: 'placed',
  }).lean()

  // Get applications for placed students to get drive CTC
  const placedStudentIds = placedProfiles.map((p) => p._id)

  // Get all applications for these students where overallStatus is offer_accepted or selected
  const successfulApplications = await Application.aggregate([
    {
      $match: {
        student: { $in: placedStudentIds },
        overallStatus: { $in: ['offer_accepted', 'selected', 'offer_issued'] },
      },
    },
    {
      $lookup: {
        from: 'drives',
        localField: 'drive',
        foreignField: '_id',
        as: 'drive',
      },
    },
    { $unwind: '$drive' },
    {
      $project: {
        ctcLpa: '$drive.compensation.ctcLpa',
        student: 1,
      },
    },
    // Deduplicate: keep only the highest CTC per student so that tier-upgrade
    // scenarios (multiple accepted applications) don't inflate the averages.
    {
      $group: {
        _id: '$student',
        ctcLpa: { $max: '$ctcLpa' },
      },
    },
  ])

  const ctcValues = successfulApplications
    .map((app) => app.ctcLpa)
    .filter((ctc) => ctc !== undefined && ctc !== null)
    .sort((a, b) => a - b)

  let avgCtc = null
  let medianCtc = null
  let highestCtc = null

  if (ctcValues.length > 0) {
    avgCtc = ctcValues.reduce((sum, val) => sum + val, 0) / ctcValues.length
    medianCtc = calculateMedian(ctcValues)
    highestCtc = ctcValues[ctcValues.length - 1]
  }

  // Department-wise breakdown
  const deptBreakdown = await StudentProfile.aggregate([
    { $match: studentMatch },
    {
      $group: {
        _id: '$branch',
        total: { $sum: 1 },
        placed: {
          $sum: {
            $cond: [{ $eq: ['$placementStatus', 'placed'] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        department: '$_id',
        totalStudents: '$total',
        placedStudents: '$placed',
        placementPercentage: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$placed', '$total'] }, 100] },
          ],
        },
      },
    },
    { $sort: { department: 1 } },
  ])

  // Ensure all departments are represented
  const allDepts = DEPARTMENTS.map((dept) => {
    const found = deptBreakdown.find((d) => d.department === dept)
    return (
      found || {
        department: dept,
        totalStudents: 0,
        placedStudents: 0,
        placementPercentage: 0,
      }
    )
  })

  const placementPercentage =
    totalStudents > 0 ? ((placedStudents / totalStudents) * 100).toFixed(2) : '0.00'

  return {
    overview: {
      totalStudents,
      placedStudents,
      placementPercentage: parseFloat(placementPercentage),
      avgCtcLpa: avgCtc ? Number(avgCtc.toFixed(2)) : null,
      medianCtcLpa: medianCtc ? Number(medianCtc.toFixed(2)) : null,
      highestCtcLpa: highestCtc ? Number(highestCtc.toFixed(2)) : null,
    },
    departmentBreakdown: allDepts,
  }
}

/**
 * Gets funnel statistics for a specific drive
 * @param {string} driveId - Drive ObjectId
 * @param {string} [departmentScope] - Department scope for coordinators
 * @returns {Promise<Object>} Funnel statistics
 */
export async function getDriveFunnel(driveId, departmentScope) {
  // Verify drive exists and user has access
  const driveFilter = { _id: new mongoose.Types.ObjectId(driveId) }
  if (departmentScope) {
    driveFilter.departmentScope = departmentScope
  }

  const drive = await Drive.findOne(driveFilter).lean()
  if (!drive) {
    throw new ApiError(404, 'Drive not found or access denied', 'DRIVE_NOT_FOUND')
  }

  // Build student match for department scoping
  const studentMatch = {}
  if (departmentScope) {
    studentMatch['studentProfile.branch'] = departmentScope
  }

  // Get all applications for this drive
  const applications = await Application.aggregate([
    { $match: { drive: new mongoose.Types.ObjectId(driveId) } },
    {
      $lookup: {
        from: 'studentprofiles',
        localField: 'student',
        foreignField: '_id',
        as: 'studentProfile',
      },
    },
    { $unwind: '$studentProfile' },
    { $match: studentMatch },
    {
      $project: {
        overallStatus: 1,
        roundStatuses: 1,
      },
    },
  ])

  const totalApplied = applications.length

  // Count by overall status
  const statusCounts = {}
  applications.forEach((app) => {
    statusCounts[app.overallStatus] = (statusCounts[app.overallStatus] || 0) + 1
  })

  // Count shortlisted (at least one round shortlisted or cleared)
  let shortlistedCount = 0
  let selectedCount = 0
  let rejectedCount = 0

  applications.forEach((app) => {
    const roundStatuses = app.roundStatuses || []
    const hasShortlisted = roundStatuses.some(
      (rs) => rs.status === 'shortlisted' || rs.status === 'cleared'
    )
    const anyRejected = roundStatuses.some(
      (rs) => rs.status === 'not_cleared' || rs.status === 'absent'
    )

    if (app.overallStatus === 'offer_accepted' || app.overallStatus === 'selected') {
      selectedCount++
    } else if (app.overallStatus === 'shortlisted' || hasShortlisted) {
      shortlistedCount++
    } else if (app.overallStatus === 'rejected' || anyRejected) {
      rejectedCount++
    } else if (app.overallStatus === 'offer_issued') {
      selectedCount++
    }
  })

  // Also count pending
  const pendingCount = statusCounts.applied || 0
  const withdrawnCount = statusCounts.withdrawn || 0

  return {
    drive: {
      id: drive._id.toString(),
      title: drive.title,
      company: drive.company?.toString(),
      status: drive.status,
    },
    funnel: {
      applied: totalApplied,
      shortlisted: shortlistedCount,
      selected: selectedCount,
      rejected: rejectedCount,
      pending: pendingCount,
      withdrawn: withdrawnCount,
    },
    conversionRates: {
      appliedToShortlisted:
        totalApplied > 0 ? ((shortlistedCount / totalApplied) * 100).toFixed(2) : '0.00',
      shortlistedToSelected:
        shortlistedCount > 0 ? ((selectedCount / shortlistedCount) * 100).toFixed(2) : '0.00',
      appliedToSelected:
        totalApplied > 0 ? ((selectedCount / totalApplied) * 100).toFixed(2) : '0.00',
    },
  }
}

export default {
  getOverviewStats,
  getDriveFunnel,
}
