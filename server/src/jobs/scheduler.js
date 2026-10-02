// Cron job scheduler. Initializes and manages all scheduled jobs.
// Traces to FR-NOT-01, FR-OFR-03, NFR-REL-01.
import cron from 'node-cron'
import { loadEnv } from '../config/env.js'
import { runRegistrationDeadlineJob } from './registrationDeadlineJob.js'
import { runRoundApproachingJob } from './roundApproachingJob.js'
import { runOfferExpiryJob } from './offerExpiryJob.js'

let scheduledTasks = []

export function startScheduler() {
  if (scheduledTasks.length > 0) {
    console.warn('Scheduler already started; skipping duplicate initialization')
    return
  }

  // Load config here (after dotenv has populated process.env in server.js)
  const config = loadEnv()
  const { CRON_SCHEDULE, CRON_TIMEZONE } = config
  // Per-job overrides — fall back to shared CRON_SCHEDULE when not set
  const registrationSchedule = CRON_SCHEDULE
  const roundSchedule = config.CRON_SCHEDULE_ROUND || CRON_SCHEDULE
  const offerExpirySchedule = config.CRON_SCHEDULE_OFFER_EXPIRY || CRON_SCHEDULE

  console.log(`Starting cron scheduler (timezone: ${CRON_TIMEZONE})`)
  console.log(`  registration deadline: ${registrationSchedule}`)
  console.log(`  round approaching:     ${roundSchedule}`)
  console.log(`  offer expiry sweep:    ${offerExpirySchedule}`)

  // Job 1: Registration deadline approaching reminders
  const registrationTask = cron.schedule(
    registrationSchedule,
    async () => {
      console.log('[CRON] Running registration deadline approaching job...')
      try {
        const result = await runRegistrationDeadlineJob()
        console.log(`[CRON] Registration deadline job completed: ${JSON.stringify(result)}`)
      } catch (err) {
        console.error('[CRON] Registration deadline job failed:', err)
      }
    },
    {
      scheduled: true,
      timezone: CRON_TIMEZONE,
    }
  )

  // Job 2: Round approaching reminders
  const roundTask = cron.schedule(
    roundSchedule,
    async () => {
      console.log('[CRON] Running round approaching job...')
      try {
        const result = await runRoundApproachingJob()
        console.log(`[CRON] Round approaching job completed: ${JSON.stringify(result)}`)
      } catch (err) {
        console.error('[CRON] Round approaching job failed:', err)
      }
    },
    {
      scheduled: true,
      timezone: CRON_TIMEZONE,
    }
  )

  // Job 3: Offer expiry sweep (can run more frequently than daily, e.g. hourly)
  const offerTask = cron.schedule(
    offerExpirySchedule,
    async () => {
      console.log('[CRON] Running offer expiry sweep job...')
      try {
        const result = await runOfferExpiryJob()
        console.log(`[CRON] Offer expiry job completed: ${JSON.stringify(result)}`)
      } catch (err) {
        console.error('[CRON] Offer expiry job failed:', err)
      }
    },
    {
      scheduled: true,
      timezone: CRON_TIMEZONE,
    }
  )

  scheduledTasks = [registrationTask, roundTask, offerTask]
  console.log('All cron jobs scheduled successfully')
}

export function stopScheduler() {
  for (const task of scheduledTasks) {
    task.stop()
  }
  scheduledTasks = []
  console.log('All cron jobs stopped')
}

export function getSchedulerStatus() {
  return {
    running: scheduledTasks.length > 0,
    jobCount: scheduledTasks.length,
  }
}

export default {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
}
