// ResumeCheck service: rule-based resume completeness checker.
// Traces to FR-RES-01, FR-RES-02.
import StudentProfile from '../models/StudentProfile.model.js'
import User from '../models/User.model.js'
import ResumeCheck from '../models/ResumeCheck.model.js'
import { ApiError } from '../utils/api-error.js'

// Checklist item definitions
const CHECKLIST_ITEMS = [
  // Contact Info Category
  {
    id: 'contact_email',
    name: 'Email Address',
    description: 'Professional email address is present',
    category: 'contact_info',
  },
  {
    id: 'contact_phone',
    name: 'Phone Number',
    description: 'Contact phone number is present',
    category: 'contact_info',
  },
  {
    id: 'contact_linkedin',
    name: 'LinkedIn Profile',
    description: 'LinkedIn profile URL is present',
    category: 'contact_info',
  },
  {
    id: 'contact_github',
    name: 'GitHub/Portfolio',
    description: 'GitHub or portfolio URL is present',
    category: 'contact_info',
  },

  // Key Sections Category
  {
    id: 'section_education',
    name: 'Education Details',
    description: 'Education section with degree, institution, graduation year',
    category: 'key_sections',
  },
  {
    id: 'section_skills',
    name: 'Technical Skills',
    description: 'At least 3 technical skills listed',
    category: 'key_sections',
  },
  {
    id: 'section_experience',
    name: 'Work Experience/Internships',
    description: 'At least one work experience or internship entry',
    category: 'key_sections',
  },
  {
    id: 'section_projects',
    name: 'Projects',
    description: 'At least 2 projects with descriptions',
    category: 'key_sections',
  },
  {
    id: 'section_certifications',
    name: 'Certifications',
    description: 'At least 1 certification with issuer and year',
    category: 'key_sections',
  },
  {
    id: 'section_achievements',
    name: 'Achievements/Awards',
    description: 'Academic or extracurricular achievements listed',
    category: 'key_sections',
  },

  // Formatting Category
  {
    id: 'format_pdf',
    name: 'PDF Format',
    description: 'Resume is uploaded as a PDF file',
    category: 'formatting',
  },
  {
    id: 'format_length',
    name: 'Appropriate Length',
    description: 'Resume is 1-2 pages long (estimated from file size)',
    category: 'formatting',
  },
  {
    id: 'format_filename',
    name: 'Professional Filename',
    description: 'Filename is professional (not "resume.pdf", "final.pdf", etc.)',
    category: 'formatting',
  },
]

// Run checklist against a student's profile and selected resume
export async function runResumeCheck(userId, resumeId) {
  // Get student profile with user info
  const profile = await StudentProfile.findOne({ user: userId }).lean()
  if (!profile) {
    throw new ApiError(404, 'Student profile not found', 'PROFILE_NOT_FOUND')
  }

  const user = await User.findById(userId).lean()
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND')
  }

  // Find the selected resume
  const resume = profile.resumes.find((r) => r._id.toString() === resumeId)
  if (!resume) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND')
  }

  // Run all checks
  const results = await Promise.all(
    CHECKLIST_ITEMS.map(async (item) => {
      const checkResult = await runCheck(item, profile, user, resume)
      return {
        ...item,
        passed: checkResult.passed,
        details: checkResult.details,
      }
    })
  )

  // Calculate score
  const totalChecks = results.length
  const passedChecks = results.filter((r) => r.passed).length
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0

  // Create ResumeCheck record
  const resumeCheck = await ResumeCheck.create({
    student: userId,
    studentProfile: profile._id,
    resume: {
      label: resume.label,
      cloudinaryPublicId: resume.cloudinaryPublicId,
      cloudinarySecureUrl: resume.cloudinarySecureUrl,
      originalFilename: resume.originalFilename,
    },
    checklistItems: results,
    score,
    totalChecks,
    passedChecks,
    completedAt: new Date(),
  })

  return resumeCheck.toObject()
}

// Run a single checklist item
async function runCheck(item, profile, user, resume) {
  switch (item.id) {
    // Contact Info Checks
    case 'contact_email': {
      return {
        passed: !!user.email,
        details: user.email ? `Email: ${user.email}` : 'No email found in user profile',
      }
    }

    case 'contact_phone': {
      // Prefer dedicated phone field; fall back to guardian mobiles
      const phone =
        profile.phone ||
        profile.phone2 ||
        profile.guardianInfo?.father?.mobile ||
        profile.guardianInfo?.mother?.mobile
      return {
        passed: !!phone,
        details: phone ? `Phone: ${phone}` : 'No phone number found in profile',
      }
    }

    case 'contact_linkedin': {
      // Use dedicated linkedinUrl field; fall back to heuristic on project/cert links
      const hasLinkedIn =
        !!profile.linkedinUrl ||
        profile.projects?.some((p) => p.link?.includes('linkedin.com')) ||
        profile.certifications?.some((c) => c.proofUrl?.includes('linkedin.com'))
      return {
        passed: hasLinkedIn,
        details: profile.linkedinUrl
          ? `LinkedIn: ${profile.linkedinUrl}`
          : hasLinkedIn
            ? 'LinkedIn profile found in projects/certifications'
            : 'No LinkedIn profile URL found — add it to your profile',
      }
    }

    case 'contact_github': {
      // Use dedicated githubUrl field; fall back to heuristic on project links
      const hasGithub =
        !!profile.githubUrl ||
        profile.projects?.some((p) => p.link?.includes('github.com')) ||
        profile.certifications?.some((c) => c.proofUrl?.includes('github.com'))
      return {
        passed: hasGithub,
        details: profile.githubUrl
          ? `GitHub: ${profile.githubUrl}`
          : hasGithub
            ? 'GitHub profile found in project links'
            : 'No GitHub/portfolio URL found — add it to your profile',
      }
    }

    // Key Sections Checks
    case 'section_education': {
      const hasEducation = !!(
        profile.tenthDetails?.board ||
        profile.twelfthDetails?.board ||
        profile.cgpaOverall ||
        profile.rollNumber
      )
      return {
        passed: hasEducation,
        details: hasEducation
          ? 'Education details present in profile'
          : 'No education details found',
      }
    }

    case 'section_skills': {
      const skillsCount = profile.skills?.length || 0
      return {
        passed: skillsCount >= 3,
        details: skillsCount > 0 ? `${skillsCount} skills listed` : 'No skills listed',
      }
    }

    case 'section_experience': {
      // Check projects for experience-like entries or certifications
      const hasExperience =
        profile.projects?.some(
          (p) =>
            p.title?.toLowerCase().includes('intern') ||
            p.title?.toLowerCase().includes('experience')
        ) || profile.certifications?.length > 0
      return {
        passed: hasExperience,
        details: hasExperience
          ? 'Experience/Internship entries found'
          : 'No work experience or internships found',
      }
    }

    case 'section_projects': {
      const projectsCount = profile.projects?.length || 0
      return {
        passed: projectsCount >= 2,
        details: projectsCount > 0 ? `${projectsCount} project(s) listed` : 'No projects listed',
      }
    }

    case 'section_certifications': {
      const certCount = profile.certifications?.length || 0
      return {
        passed: certCount >= 1,
        details:
          certCount > 0 ? `${certCount} certification(s) listed` : 'No certifications listed',
      }
    }

    case 'section_achievements': {
      // Check for achievements in projects or certifications
      const hasAchievements =
        profile.projects?.some(
          (p) =>
            p.title?.toLowerCase().includes('award') ||
            p.title?.toLowerCase().includes('achievement')
        ) ||
        profile.certifications?.some(
          (c) =>
            c.name?.toLowerCase().includes('award') || c.name?.toLowerCase().includes('achievement')
        )
      return {
        passed: hasAchievements,
        details: hasAchievements ? 'Achievements/awards found' : 'No achievements or awards listed',
      }
    }

    // Formatting Checks
    case 'format_pdf': {
      const isPdf = resume.mimeType === 'application/pdf'
      return {
        passed: isPdf,
        details: isPdf
          ? 'Resume is in PDF format'
          : `Resume is ${resume.mimeType}, PDF recommended`,
      }
    }

    case 'format_length': {
      // Estimate pages from file size (rough heuristic: ~50KB per page for text PDF)
      // This is a rough estimate - real page count would require PDF parsing
      const estimatedPages = Math.max(1, Math.round(resume.fileSize / 50000))
      const appropriateLength = estimatedPages >= 1 && estimatedPages <= 2
      return {
        passed: appropriateLength,
        details: `Estimated ${estimatedPages} page(s) (file size: ${Math.round(resume.fileSize / 1024)}KB)`,
      }
    }

    case 'format_filename': {
      const genericNames = [
        'resume',
        'cv',
        'curriculum vitae',
        'final',
        'updated',
        'new',
        'latest',
        'draft',
      ]
      const filename = resume.originalFilename.toLowerCase().replace(/\.[^.]+$/, '')
      const isGeneric = genericNames.some((n) => filename.includes(n))
      return {
        passed: !isGeneric,
        details: isGeneric
          ? `Filename "${resume.originalFilename}" appears generic`
          : `Filename "${resume.originalFilename}" is descriptive`,
      }
    }

    default: {
      return {
        passed: false,
        details: 'Unknown check',
      }
    }
  }
}

// Get checklist history for a student
export async function getResumeCheckHistory(userId, limit = 20) {
  const checks = await ResumeCheck.find({ student: userId })
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean()
  return checks
}

// Get single resume check by ID
export async function getResumeCheckById(checkId, userId) {
  const check = await ResumeCheck.findOne({ _id: checkId, student: userId }).lean()
  if (!check) {
    throw new ApiError(404, 'Resume check not found', 'RESUME_CHECK_NOT_FOUND')
  }
  return check
}

// Get checklist items definition (for UI)
export function getChecklistItems() {
  return CHECKLIST_ITEMS
}

export default {
  runResumeCheck,
  getResumeCheckHistory,
  getResumeCheckById,
  getChecklistItems,
}
