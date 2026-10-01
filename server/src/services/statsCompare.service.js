// Statistics Comparison service: Year-over-year comparison for placement seasons.
// Traces to FR-STA-02.
import mongoose from 'mongoose'
import Drive from '../models/Drive.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Application from '../models/Application.model.js'
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
 * Gets available seasons from drives
 */
export async function getAvailableSeasons() {
  const seasons = await Drive.distinct('season', { season: { $nin: [null, ''] } })
  return seasons.filter((s) => s).sort((a, b) => b.localeCompare(a)) // Descending
}

/**
 * Gets overview statistics for a specific season
 * @param {string} season - Season string (e.g., "2024-25")
 * @param {string} [departmentScope] - Department scope for coordinators
 * @returns {Promise<Object>} Statistics object for the season
 */
export async function getSeasonOverviewStats(season, departmentScope) {
  // Get all drives for this season
  const driveFilter = { season }
  if (departmentScope) {
    driveFilter.departmentScope = departmentScope
  }
  const drivesInSeason = await Drive.find(driveFilter).select('_id').lean()
  const driveIds = drivesInSeason.map((d) => d._id)

  if (driveIds.length === 0) {
    // Return empty stats for this season
    return {
      season,
      overview: {
        totalStudents: 0,
        placedStudents: 0,
        placementPercentage: 0,
        avgCtcLpa: null,
        medianCtcLpa: null,
        highestCtcLpa: null,
        totalDrives: 0,
        totalApplications: 0,
      },
      departmentBreakdown: DEPARTMENTS.map((dept) => ({
        department: dept,
        totalStudents: 0,
        placedStudents: 0,
        placementPercentage: 0,
      })),
    }
  }

  // Get applications for these drives
  const applications = await Application.aggregate([
    { $match: { drive: { $in: driveIds } } },
    {
      $lookup: {
        from: 'studentprofiles',
        localField: 'student',
        foreignField: '_id',
        as: 'studentProfile',
      },
    },
    { $unwind: '$studentProfile' },
    ...(departmentScope ? [{ $match: { 'studentProfile.branch': departmentScope } }] : []),
    {
      $project: {
        overallStatus: 1,
        student: '$studentProfile._id',
        drive: 1,
      },
    },
  ])

  // Get unique students who applied in this season
  const appliedStudentIds = [...new Set(applications.map((a) => a.student.toString()))]

  // Get student profiles for these students
  const studentProfiles = await StudentProfile.find({
    _id: { $in: appliedStudentIds },
    ...(departmentScope ? { branch: departmentScope } : {}),
  }).lean()

  const totalStudents = studentProfiles.length

  // Get placed students
  const placedProfiles = studentProfiles.filter((p) => p.placementStatus === 'placed')
  const placedStudents = placedProfiles.length

  // Get CTC data from successful applications
  const successfulApps = applications.filter((a) =>
    ['offer_accepted', 'selected', 'offer_issued'].includes(a.overallStatus)
  )

  // Get CTC from drives for these applications
  const successfulAppDrives = await Drive.find({
    _id: { $in: successfulApps.map((a) => a.drive) },
  })
    .select('compensation.ctcLpa')
    .lean()

  const driveCtcMap = new Map(
    successfulAppDrives.map((d) => [d._id.toString(), d.compensation?.ctcLpa])
  )

  const ctcValues = successfulApps
    .map((a) => driveCtcMap.get(a.drive.toString()))
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
    {
      $match: {
        _id: { $in: appliedStudentIds.map((id) => new mongoose.Types.ObjectId(id)) },
        ...(departmentScope ? { branch: departmentScope } : {}),
      },
    },
    {
      $group: {
        _id: '$branch',
        total: { $sum: 1 },
        placed: {
          $sum: { $cond: [{ $eq: ['$placementStatus', 'placed'] }, 1, 0] },
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
    season,
    overview: {
      totalStudents,
      placedStudents,
      placementPercentage: parseFloat(placementPercentage),
      avgCtcLpa: avgCtc ? Number(avgCtc.toFixed(2)) : null,
      medianCtcLpa: medianCtc ? Number(medianCtc.toFixed(2)) : null,
      highestCtcLpa: highestCtc ? Number(highestCtc.toFixed(2)) : null,
      totalDrives: driveIds.length,
      totalApplications: applications.length,
    },
    departmentBreakdown: allDepts,
  }
}

/**
 * Compares multiple seasons
 * @param {string[]} seasons - Array of season strings
 * @param {string} [departmentScope] - Department scope for coordinators
 * @returns {Promise<Object>} Comparison data
 */
export async function compareSeasons(seasons, departmentScope) {
  if (!seasons || seasons.length === 0) {
    throw new ApiError(400, 'At least one season must be specified', 'VALIDATION_ERROR')
  }

  const seasonStats = await Promise.all(
    seasons.map((season) => getSeasonOverviewStats(season, departmentScope))
  )

  // Prepare trend data for charts
  const trendData = seasonStats.map((s) => ({
    season: s.season,
    placementPercentage: s.overview.placementPercentage,
    avgCtcLpa: s.overview.avgCtcLpa,
    medianCtcLpa: s.overview.medianCtcLpa,
    highestCtcLpa: s.overview.highestCtcLpa,
    placedStudents: s.overview.placedStudents,
    totalStudents: s.overview.totalStudents,
    totalDrives: s.overview.totalDrives,
    totalApplications: s.overview.totalApplications,
  }))

  // Sort by season ascending for chart display
  trendData.sort((a, b) => a.season.localeCompare(b.season))

  return {
    seasons: seasonStats,
    trends: trendData,
  }
}

export default {
  getAvailableSeasons,
  getSeasonOverviewStats,
  compareSeasons,
}
