// Email service: centralized email sending with templates for notification types.
// Traces to FR-NOT-01, FR-NOT-02.
import nodemailer from 'nodemailer'
import { ApiError } from '../utils/api-error.js'

let emailTransporter = null

function getTransporter() {
  if (!emailTransporter) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new ApiError(500, 'SMTP not configured', 'SMTP_NOT_CONFIGURED')
    }
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return emailTransporter
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const FROM_EMAIL = process.env.SMTP_FROM ?? '"PCMS" <noreply@pcms.skit.ac.in>'

const EMAIL_TEMPLATES = {
  drive_published: (data) => ({
    subject: `New Drive: ${data.driveTitle} at ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #15803D;">New Placement Drive Announced</h2>
        <p>Dear ${data.studentName},</p>
        <p>A new placement drive has been published that matches your profile:</p>
        <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #15803D;">${data.driveTitle}</h3>
          <p style="margin: 4px 0;"><strong>Company:</strong> ${data.companyName}</p>
          <p style="margin: 4px 0;"><strong>Job Type:</strong> ${data.jobType}</p>
          <p style="margin: 4px 0;"><strong>CTC:</strong> ${data.ctc}</p>
          <p style="margin: 4px 0;"><strong>Registration Deadline:</strong> ${data.deadline}</p>
        </div>
        <p style="text-align: center;">
          <a href="${FRONTEND_URL}/drives/${data.driveId}" style="background: #15803D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Drive Details</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `New Placement Drive: ${data.driveTitle} at ${data.companyName}\n\nDear ${data.studentName},\n\nA new drive has been published:\n- Company: ${data.companyName}\n- Job Type: ${data.jobType}\n- CTC: ${data.ctc}\n- Deadline: ${data.deadline}\n\nView details: ${FRONTEND_URL}/drives/${data.driveId}`,
  }),

  application_confirmed: (data) => ({
    subject: `Application Confirmed: ${data.driveTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #15803D;">Application Confirmed</h2>
        <p>Dear ${data.studentName},</p>
        <p>Your application for the following drive has been confirmed:</p>
        <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #15803D;">${data.driveTitle}</h3>
          <p style="margin: 4px 0;"><strong>Company:</strong> ${data.companyName}</p>
          <p style="margin: 4px 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
          <p style="margin: 4px 0;"><strong>Applied On:</strong> ${data.appliedDate}</p>
        </div>
        <p style="text-align: center;">
          <a href="${FRONTEND_URL}/applications/my" style="background: #15803D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View My Applications</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `Application Confirmed: ${data.driveTitle}\n\nDear ${data.studentName},\n\nYour application has been confirmed:\n- Company: ${data.companyName}\n- Application ID: ${data.applicationId}\n- Applied On: ${data.appliedDate}\n\nView applications: ${FRONTEND_URL}/applications/my`,
  }),

  shortlisted: (data) => ({
    subject: `Shortlisted for ${data.roundName} - ${data.driveTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #D97706;">Congratulations! You've Been Shortlisted</h2>
        <p>Dear ${data.studentName},</p>
        <p>You have been shortlisted for the next round:</p>
        <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #D97706;">${data.roundName}</h3>
          <p style="margin: 4px 0;"><strong>Drive:</strong> ${data.driveTitle}</p>
          <p style="margin: 4px 0;"><strong>Company:</strong> ${data.companyName}</p>
          <p style="margin: 4px 0;"><strong>Round Date/Time:</strong> ${data.roundDateTime}</p>
          <p style="margin: 4px 0;"><strong>Venue/Mode:</strong> ${data.venue}</p>
        </div>
        <p style="text-align: center;">
          <a href="${FRONTEND_URL}/applications/my" style="background: #D97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Details</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `Shortlisted for ${data.roundName} - ${data.driveTitle}\n\nDear ${data.studentName},\n\nYou have been shortlisted:\n- Drive: ${data.driveTitle}\n- Company: ${data.companyName}\n- Round: ${data.roundName}\n- Date/Time: ${data.roundDateTime}\n- Venue: ${data.venue}\n\nView details: ${FRONTEND_URL}/applications/my`,
  }),

  round_rescheduled: (data) => ({
    subject: `Round Rescheduled: ${data.roundName} - ${data.driveTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #15803D;">Round Rescheduled</h2>
        <p>Dear ${data.studentName},</p>
        <p>The following round has been rescheduled:</p>
        <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #15803D;">${data.roundName}</h3>
          <p style="margin: 4px 0;"><strong>Drive:</strong> ${data.driveTitle}</p>
          <p style="margin: 4px 0;"><strong>Company:</strong> ${data.companyName}</p>
          <p style="margin: 4px 0;"><strong>New Date/Time:</strong> ${data.newDateTime}</p>
          <p style="margin: 4px 0;"><strong>Venue/Mode:</strong> ${data.venue}</p>
          ${data.oldDateTime ? `<p style="margin: 4px 0;"><strong>Previous Date/Time:</strong> ${data.oldDateTime}</p>` : ''}
        </div>
        <p style="text-align: center;">
          <a href="${FRONTEND_URL}/applications/my" style="background: #15803D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Details</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `Round Rescheduled: ${data.roundName} - ${data.driveTitle}\n\nDear ${data.studentName},\n\nA round has been rescheduled:\n- Drive: ${data.driveTitle}\n- Company: ${data.companyName}\n- Round: ${data.roundName}\n- New Date/Time: ${data.newDateTime}\n- Venue: ${data.venue}\n${data.oldDateTime ? `- Previous Date/Time: ${data.oldDateTime}` : ''}\n\nView details: ${FRONTEND_URL}/applications/my`,
  }),

  results_declared: (data) => ({
    subject: `Results Declared: ${data.driveTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #15803D;">Results Declared</h2>
        <p>Dear ${data.studentName},</p>
        <p>Results have been declared for the following drive:</p>
        <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #15803D;">${data.driveTitle}</h3>
          <p style="margin: 4px 0;"><strong>Company:</strong> ${data.companyName}</p>
          <p style="margin: 4px 0;"><strong>Your Status:</strong> ${data.status}</p>
          <p style="margin: 4px 0;"><strong>Round:</strong> ${data.roundName}</p>
        </div>
        <p style="text-align: center;">
          <a href="${FRONTEND_URL}/applications/my" style="background: #15803D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Results</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `Results Declared: ${data.driveTitle}\n\nDear ${data.studentName},\n\nResults have been declared:\n- Company: ${data.companyName}\n- Your Status: ${data.status}\n- Round: ${data.roundName}\n\nView results: ${FRONTEND_URL}/applications/my`,
  }),

  offer_issued: (data) => ({
    subject: `Offer Issued: ${data.driveTitle} at ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #15803D;">Congratulations! Offer Issued</h2>
        <p>Dear ${data.studentName},</p>
        <p>You have received a job offer:</p>
        <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #15803D;">${data.driveTitle}</h3>
          <p style="margin: 4px 0;"><strong>Company:</strong> ${data.companyName}</p>
          <p style="margin: 4px 0;"><strong>CTC:</strong> ${data.ctc}</p>
          <p style="margin: 4px 0;"><strong>Response Deadline:</strong> ${data.deadline}</p>
          <p style="margin: 4px 0;"><strong>Offer ID:</strong> ${data.offerId}</p>
        </div>
        <p style="text-align: center;">
          <a href="${FRONTEND_URL}/offers/${data.offerId}/respond" style="background: #15803D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Respond to Offer</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `Offer Issued: ${data.driveTitle} at ${data.companyName}\n\nDear ${data.studentName},\n\nYou have received a job offer:\n- Company: ${data.companyName}\n- CTC: ${data.ctc}\n- Response Deadline: ${data.deadline}\n- Offer ID: ${data.offerId}\n\nRespond: ${FRONTEND_URL}/offers/${data.offerId}/respond`,
  }),

  deadline_approaching: (data) => ({
    subject: `Reminder: ${data.title} Deadline Approaching`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #D97706;">Deadline Approaching</h2>
        <p>Dear ${data.studentName},</p>
        <p>This is a reminder about an upcoming deadline:</p>
        <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #D97706;">${data.title}</h3>
          <p style="margin: 4px 0;"><strong>Deadline:</strong> ${data.deadline}</p>
          <p style="margin: 4px 0;"><strong>Days Remaining:</strong> ${data.daysRemaining}</p>
        </div>
        <p style="text-align: center;">
          <a href="${data.link ?? FRONTEND_URL}" style="background: #D97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Take Action</a>
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `Deadline Approaching: ${data.title}\n\nDear ${data.studentName},\n\nReminder:\n- Deadline: ${data.deadline}\n- Days Remaining: ${data.daysRemaining}\n\nTake action: ${data.link ?? FRONTEND_URL}`,
  }),

  general: (data) => ({
    subject: data.subject ?? 'PCMS Notification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6B7280;">${data.title ?? 'Notification'}</h2>
        <p>Dear ${data.studentName},</p>
        <p>${data.message}</p>
        ${data.link ? `<p style="text-align: center;"><a href="${data.link}" style="background: #6B7280; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Details</a></p>` : ''}
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #6B7280; font-size: 12px;">This is an automated email from SKIT T&P Cell. Please do not reply.</p>
      </div>
    `,
    text: `${data.title ?? 'Notification'}\n\nDear ${data.studentName},\n\n${data.message}\n${data.link ? `\nView details: ${data.link}` : ''}`,
  }),
}

export async function sendNotificationEmail(userEmail, userName, type, data) {
  const template = EMAIL_TEMPLATES[type]
  if (!template) {
    console.warn(`No email template for notification type: ${type}`)
    return { sent: false, reason: 'NO_TEMPLATE' }
  }

  try {
    const transporter = getTransporter()
    const { subject, html, text } = template({ ...data, studentName: userName })

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: userEmail,
      subject,
      html,
      text,
    })

    return { sent: true }
  } catch (err) {
    console.error(`Failed to send ${type} email to ${userEmail}:`, err.message)
    return { sent: false, reason: err.message }
  }
}

export function isEmailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export default {
  sendNotificationEmail,
  isEmailConfigured,
}
