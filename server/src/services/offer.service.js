// Offer service: handles offer creation, retrieval, and management.
// Traces to FR-OFR-01, FR-OFR-02, FR-OFR-03, FR-OFR-04.
import OfferLetter from '../models/OfferLetter.model.js'
import Application from '../models/Application.model.js'
import StudentProfile from '../models/StudentProfile.model.js'
import Drive from '../models/Drive.model.js'
import AuditLog from '../models/AuditLog.model.js'
import { ApiError } from '../utils/api-error.js'
import { ROLES } from '../constants/roles.js'

// Issue an offer against an application (coordinator/TPO)
export async function issueOffer(applicationId, documentData, responseDeadline, issuedBy, user) {
  // Verify application exists
  const application = await Application.findById(applicationId)
    .populate('student', 'user placementStatus currentTier')
    .populate('drive', 'title tier company')
    .lean()

  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND')
  }

  // Check if offer already exists (before checking status, so we return 409 not 400)
  const existingOffer = await OfferLetter.findOne({ application: applicationId }).lean()
  if (existingOffer) {
    throw new ApiError(409, 'Offer already exists for this application', 'OFFER_ALREADY_EXISTS')
  }

  // Verify application is in 'selected' status
  if (application.overallStatus !== 'selected') {
    throw new ApiError(
      400,
      'Offer can only be issued for applications with status: selected',
      'INVALID_APPLICATION_STATUS'
    )
  }

  // Verify user has access to this drive (department scoping for coordinators)
  if (user.role === ROLES.COORDINATOR) {
    const drive = await Drive.findById(application.drive._id).lean()
    if (!drive || drive.departmentScope !== user.department) {
      throw new ApiError(403, 'Access denied to this drive', 'FORBIDDEN')
    }
  }

  // Validate response deadline is in the future
  const deadline = new Date(responseDeadline)
  if (deadline <= new Date()) {
    throw new ApiError(400, 'Response deadline must be in the future', 'VALIDATION_ERROR')
  }

  // Create offer letter
  const offer = await OfferLetter.create({
    application: applicationId,
    document: documentData,
    responseDeadline: deadline,
    issuedBy,
  })

  // Update application status to offer_issued
  await Application.findByIdAndUpdate(applicationId, {
    $set: { overallStatus: 'offer_issued' },
  })

  // Create AuditLog entry
  await AuditLog.create({
    actor: issuedBy,
    action: 'offer_issue',
    target: {
      entityType: 'Application',
      entityId: applicationId,
    },
    reason: `Offer issued for ${application.drive?.title || 'drive'} to student ${application.student?.user || 'unknown'}`,
    metadata: {
      drive: application.drive?._id,
      student: application.student?._id,
      offerId: offer._id,
      responseDeadline: deadline,
    },
  })

  return offer.toObject({ virtuals: true })
}

// Get offer by application ID
export async function getOfferByApplicationId(applicationId, user) {
  const application = await Application.findById(applicationId).lean()
  if (!application) {
    throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND')
  }

  // Check access: student can only see their own, coordinators/TPO can see within scope
  if (user.role === ROLES.STUDENT) {
    const studentProfile = await StudentProfile.findOne({ user: user._id }).lean()
    if (!studentProfile || application.student.toString() !== studentProfile._id.toString()) {
      throw new ApiError(403, 'Access denied', 'FORBIDDEN')
    }
  } else if (user.role === ROLES.COORDINATOR) {
    const drive = await Drive.findById(application.drive).lean()
    if (!drive || drive.departmentScope !== user.department) {
      throw new ApiError(403, 'Access denied to this drive', 'FORBIDDEN')
    }
  }

  const offer = await OfferLetter.findOne({ application: applicationId })
    .populate('issuedBy', 'name email')
    .lean({ virtuals: true })

  if (!offer) {
    throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND')
  }

  return offer
}

// Get offer by ID
export async function getOfferById(offerId, user) {
  const offer = await OfferLetter.findById(offerId)
    .populate({
      path: 'application',
      populate: [
        { path: 'student', select: 'user placementStatus currentTier' },
        { path: 'drive', select: 'title tier company' },
      ],
    })
    .populate('issuedBy', 'name email')
    .lean({ virtuals: true })

  if (!offer) {
    throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND')
  }

  // Check access
  const application = offer.application
  if (user.role === ROLES.STUDENT) {
    const studentProfile = await StudentProfile.findOne({ user: user._id }).lean()
    if (!studentProfile || application.student._id.toString() !== studentProfile._id.toString()) {
      throw new ApiError(403, 'Access denied', 'FORBIDDEN')
    }
  } else if (user.role === ROLES.COORDINATOR) {
    const drive = await Drive.findById(application.drive._id).lean()
    if (!drive || drive.departmentScope !== user.department) {
      throw new ApiError(403, 'Access denied to this drive', 'FORBIDDEN')
    }
  }

  return offer
}

// Respond to an offer (student)
export async function respondToOffer(offerId, response, user) {
  const studentProfile = await StudentProfile.findOne({ user: user._id }).lean()
  if (!studentProfile) {
    throw new ApiError(404, 'Student profile not found', 'STUDENT_PROFILE_NOT_FOUND')
  }

  const offer = await OfferLetter.findById(offerId).populate('application').lean()
  if (!offer) {
    throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND')
  }

  // Verify student owns the application
  if (offer.application.student.toString() !== studentProfile._id.toString()) {
    throw new ApiError(403, 'Access denied', 'FORBIDDEN')
  }

  // Check if offer is still pending
  if (offer.status !== 'pending') {
    throw new ApiError(400, `Offer is no longer pending (current status: ${offer.status})`, 'INVALID_OFFER_STATUS')
  }

  // Check if deadline has passed
  if (new Date(offer.responseDeadline) <= new Date()) {
    throw new ApiError(400, 'Offer response deadline has passed', 'DEADLINE_PASSED')
  }

  const newStatus = response === 'accept' ? 'accepted' : 'declined'
  const respondedAt = new Date()

  // Update offer
  const updatedOffer = await OfferLetter.findByIdAndUpdate(
    offerId,
    {
      $set: {
        status: newStatus,
        respondedAt,
      },
    },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('issuedBy', 'name email')
    .lean({ virtuals: true })

  // If accepted, update student placement status and current tier
  if (response === 'accept') {
    const application = await Application.findById(offer.application._id).populate('drive').lean()
    if (application) {
      await StudentProfile.findByIdAndUpdate(application.student, {
        $set: {
          placementStatus: 'placed',
          currentTier: application.drive?.tier || 1,
        },
      })

      // Update application status
      await Application.findByIdAndUpdate(application._id, {
        $set: { overallStatus: 'offer_accepted' },
      })

      // Create AuditLog entry for offer acceptance
      await AuditLog.create({
        actor: user._id,
        action: 'offer_response',
        target: {
          entityType: 'Offer',
          entityId: offer._id,
        },
        reason: 'Offer accepted by student',
        metadata: {
          drive: application.drive?._id,
          student: application.student,
          offerId: offer._id,
          previousStatus: 'pending',
          newStatus: 'accepted',
        },
      })
    }
  } else {
    // If declined, update application status
    await Application.findByIdAndUpdate(offer.application._id, {
      $set: { overallStatus: 'offer_declined' },
    })

    // Create AuditLog entry for offer decline
    await AuditLog.create({
      actor: user._id,
      action: 'offer_response',
      target: {
        entityType: 'Offer',
        entityId: offer._id,
      },
      reason: 'Offer declined by student',
      metadata: {
        drive: offer.application.drive?._id,
        student: offer.application.student,
        offerId: offer._id,
        previousStatus: 'pending',
        newStatus: 'declined',
      },
    })
  }

  return updatedOffer
}

// Expire offers that have passed their deadline (for scheduled job)
export async function expireOffers() {
  const now = new Date()
  const expiredOffers = await OfferLetter.find({
    status: 'pending',
    responseDeadline: { $lt: now },
  }).populate('application').lean()

  const results = { expired: 0, errors: [] }

  for (const offer of expiredOffers) {
    try {
      await OfferLetter.findByIdAndUpdate(offer._id, {
        $set: { status: 'expired' },
      })

      // Update application status
      await Application.findByIdAndUpdate(offer.application._id, {
        $set: { overallStatus: 'offer_declined' }, // or could be a separate 'offer_expired' status
      })

      // Create AuditLog entry
      await AuditLog.create({
        actor: offer.issuedBy,
        action: 'offer_response',
        target: {
          entityType: 'Offer',
          entityId: offer._id,
        },
        reason: 'Offer expired (no response before deadline)',
        metadata: {
          drive: offer.application.drive?._id,
          student: offer.application.student,
          offerId: offer._id,
          previousStatus: 'pending',
          newStatus: 'expired',
        },
      })

      results.expired++
    } catch (err) {
      results.errors.push({ offerId: offer._id, error: err.message })
    }
  }

  return results
}

export default {
  issueOffer,
  getOfferByApplicationId,
  getOfferById,
  respondToOffer,
  expireOffers,
}