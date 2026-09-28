// Offer expiry sweep job.
// Finds pending offers past their response deadline and marks them as expired.
// Traces to FR-OFR-03, NFR-REL-01.
import OfferLetter from '../models/OfferLetter.model.js'
import { createNotifications } from '../services/notification.service.js'

const EXPIRED_STATUS = 'expired'
const PENDING_STATUS = 'pending'

export async function runOfferExpiryJob() {
  const now = new Date()

  console.log(`[OfferExpiryJob] Checking for expired offers as of ${now.toISOString()}`)

  const expiredOffers = await OfferLetter.find({
    status: PENDING_STATUS,
    responseDeadline: { $lt: now },
  })
    .populate({
      path: 'application',
      populate: {
        path: 'student',
        select: 'user',
      },
    })
    .lean()

  if (!expiredOffers.length) {
    console.log('[OfferExpiryJob] No expired offers found')
    return { offersChecked: 0, offersExpired: 0, notificationsSent: 0 }
  }

  let offersExpired = 0
  let notificationsSent = 0

  for (const offer of expiredOffers) {
    try {
      await OfferLetter.findByIdAndUpdate(offer._id, {
        $set: { status: EXPIRED_STATUS },
      })

      offersExpired++

      if (offer.application?.student?.user) {
        const notifications = [
          {
            user: offer.application.student.user,
            type: 'deadline_approaching',
            message: `Your offer for "${offer.application.driveTitle ?? 'a drive'}" has expired as the response deadline (${offer.responseDeadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' })}) has passed without a response.`,
            link: `/offers/${offer._id}/respond`,
          },
        ]

        const result = await createNotifications(notifications)
        notificationsSent += result.insertedCount
      }
    } catch (err) {
      console.error(`[OfferExpiryJob] Failed to expire offer ${offer._id}:`, err)
    }
  }

  return {
    offersChecked: expiredOffers.length,
    offersExpired,
    notificationsSent,
  }
}

export default { runOfferExpiryJob }
