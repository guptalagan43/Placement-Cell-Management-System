import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getSelfProfile, updateSelfProfile } from '../api/studentProfile.api.js'
import {
  getResumes,
  getUploadParams,
  addResume,
  deleteResume,
  setDefaultResume,
} from '../api/resume.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Progress from '../components/ui/Progress.jsx'

// --- Zod sub-schemas --------------------------------------------------------

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
})

const personalSchema = z.object({
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  phone2: z.string().optional(),
  address: addressSchema.optional(),
  country: z.string().optional(),
})

const academicDetailSchema = z.object({
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  rollNumber: z.string().optional(),
  board: z.string().optional(),
  obtainedMarks: z.number().min(0).nullable().optional(),
  maxMarks: z.number().min(1).nullable().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
})

const academicSchema = z.object({
  cgpaOverall: z.number().min(0).max(10).nullable().optional(),
  cgpaSemesters: z.array(z.number().min(0).max(10)).optional(),
  backlogsActive: z.number().int().min(0).nullable().optional(),
  backlogsHistory: z.array(z.number().int().min(0)).optional(),
  tenthPercent: z.number().min(0).max(100).nullable().optional(),
  twelfthPercent: z.number().min(0).max(100).nullable().optional(),
  tenthDetails: academicDetailSchema.optional(),
  twelfthDetails: academicDetailSchema.optional(),
  section: z.string().optional(),
})

const guardianSubSchema = z.object({
  name: z.string().optional(),
  mobile: z.string().optional(),
  mobile2: z.string().optional(),
  email: z.string().optional().or(z.literal('')),
  occupation: z.string().optional(),
})

const guardianInfoSchema = z.object({
  father: guardianSubSchema.optional(),
  mother: guardianSubSchema.optional(),
  localGuardianName: z.string().optional(),
})

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
})

const certificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .nullable()
    .optional(),
  proofUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

const projectSchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  description: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

const profileSchema = z.object({
  personal: personalSchema.optional(),
  academic: academicSchema,
  guardianInfo: guardianInfoSchema.optional(),
  skills: z.array(skillSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  projects: z.array(projectSchema).optional(),
})

// Empty-object defaults for nested structures
const EMPTY_GUARDIAN = { name: '', mobile: '', mobile2: '', email: '', occupation: '' }
const EMPTY_ACADEMIC_DETAIL = {
  year: null,
  rollNumber: '',
  board: '',
  obtainedMarks: null,
  maxMarks: null,
  percentage: null,
}

// Helper to generate semester CGPA fields
const SEMESTER_COUNT = 8

// Compute profile completeness percentage
function computeCompleteness(profile) {
  if (!profile) return 0

  const weights = {
    personal: 10,
    academic: 25,
    guardian: 5,
    skills: 15,
    certifications: 10,
    projects: 10,
    resumes: 25,
  }

  let score = 0

  // Personal (10%)
  if (profile.dateOfBirth) score += weights.personal * 0.3
  if (profile.gender) score += weights.personal * 0.2
  if (profile.address?.city) score += weights.personal * 0.3
  if (profile.phone2) score += weights.personal * 0.2

  // Academic (25%)
  if (profile.cgpaOverall != null) score += weights.academic * 0.25
  const tenth = profile.tenthDetails ?? {}
  const twelfth = profile.twelfthDetails ?? {}
  if (tenth.percentage != null || profile.tenthPercent != null) score += weights.academic * 0.2
  if (twelfth.percentage != null || profile.twelfthPercent != null) score += weights.academic * 0.2
  if (profile.section) score += weights.academic * 0.1
  if (profile.cgpaSemesters?.some((v) => v != null)) score += weights.academic * 0.15
  if (profile.backlogsActive != null) score += weights.academic * 0.1

  // Guardian (5%)
  if (profile.guardianInfo?.father?.name) score += weights.guardian * 0.4
  if (profile.guardianInfo?.mother?.name) score += weights.guardian * 0.4
  if (profile.guardianInfo?.localGuardianName) score += weights.guardian * 0.2

  // Skills (15%)
  if (profile.skills?.some((s) => (typeof s === 'string' ? s.trim() : s?.name?.trim())))
    score += weights.skills

  // Certifications (10%)
  if (profile.certifications?.some((c) => c?.name?.trim())) score += weights.certifications

  // Projects (10%)
  if (profile.projects?.some((p) => p?.title?.trim())) score += weights.projects

  // Resumes (25%)
  if (profile.resumes?.length > 0) score += weights.resumes

  return Math.round(score)
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')
  const [message, setMessage] = useState({ type: '', text: '' })

  // Resume state
  const [resumes, setResumes] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [settingDefault, setSettingDefault] = useState(null)
  const [deleting, setDeleting] = useState(null)

  // Initialize form with nested field arrays
  const methods = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personal: {
        dateOfBirth: '',
        gender: '',
        phone2: '',
        address: { street: '', city: '', state: '', pincode: '' },
        country: 'India',
      },
      academic: {
        cgpaOverall: null,
        cgpaSemesters: Array(SEMESTER_COUNT).fill(null),
        backlogsActive: null,
        backlogsHistory: [],
        tenthPercent: null,
        twelfthPercent: null,
        tenthDetails: { ...EMPTY_ACADEMIC_DETAIL },
        twelfthDetails: { ...EMPTY_ACADEMIC_DETAIL },
        section: '',
      },
      guardianInfo: {
        father: { ...EMPTY_GUARDIAN },
        mother: { ...EMPTY_GUARDIAN },
        localGuardianName: '',
      },
      skills: [{ name: '' }],
      certifications: [{ name: '', issuer: '', year: null, proofUrl: '' }],
      projects: [{ title: '', description: '', techStack: [], link: '' }],
    },
    mode: 'onChange',
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = methods

  const fetchResumes = async () => {
    try {
      const data = await getResumes()
      setResumes(data.resumes)
    } catch (err) {
      console.error('Failed to fetch resumes:', err)
    }
  }

  const handleUploadSubmit = async (uploadData) => {
    if (!uploadData.file) return
    setUploading(true)
    try {
      // Get signed upload params
      const params = await getUploadParams()

      // Upload to Cloudinary
      const formData = new FormData()
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('file', uploadData.file)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${params.cloud_name}/raw/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const uploadResult = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadResult.error?.message || 'Upload failed')

      // Add resume metadata to profile
      await addResume({
        label: uploadData.label,
        cloudinaryPublicId: uploadResult.public_id,
        cloudinarySecureUrl: uploadResult.secure_url,
        originalFilename: uploadData.file.name,
        fileSize: uploadData.file.size,
        mimeType: uploadData.file.type,
        isDefault: uploadData.isDefault,
      })

      setShowUpload(false)
      setValue('upload.label', '', { shouldValidate: true })
      setValue('upload.file', null, { shouldValidate: true })
      setValue('upload.isDefault', false, { shouldValidate: true })
      await fetchResumes()
      await fetchProfile()
    } catch (err) {
      setMessage({ type: 'error', text: err.message ?? 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const handleUploadFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setValue('upload.file', file, { shouldValidate: true })
    }
  }

  const handleDelete = async (resumeId) => {
    if (!confirm('Are you sure you want to delete this resume?')) return
    setDeleting(resumeId)
    try {
      await deleteResume(resumeId)
      await fetchResumes()
      await fetchProfile()
    } catch (err) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to delete resume' })
    } finally {
      setDeleting(null)
    }
  }

  const handleSetDefault = async (resumeId) => {
    setSettingDefault(resumeId)
    try {
      await setDefaultResume(resumeId)
      await fetchResumes()
    } catch (err) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to set default' })
    } finally {
      setSettingDefault(null)
    }
  }

  const fetchProfile = useCallback(async () => {
    try {
      const profileData = await getSelfProfile()
      setProfile(profileData.profile)

      // Populate form with fetched data
      const p = profileData.profile
      const g = p.guardianInfo ?? {}
      methods.reset({
        personal: {
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : '',
          gender: p.gender ?? '',
          phone2: p.phone2 ?? '',
          address: {
            street: p.address?.street ?? '',
            city: p.address?.city ?? '',
            state: p.address?.state ?? '',
            pincode: p.address?.pincode ?? '',
          },
          country: p.country ?? 'India',
        },
        academic: {
          cgpaOverall: p.cgpaOverall ?? null,
          cgpaSemesters: p.cgpaSemesters?.length
            ? p.cgpaSemesters
            : Array(SEMESTER_COUNT).fill(null),
          backlogsActive: p.backlogsActive ?? null,
          backlogsHistory: p.backlogsHistory ?? [],
          tenthPercent: p.tenthPercent ?? null,
          twelfthPercent: p.twelfthPercent ?? null,
          tenthDetails: {
            year: p.tenthDetails?.year ?? null,
            rollNumber: p.tenthDetails?.rollNumber ?? '',
            board: p.tenthDetails?.board ?? '',
            obtainedMarks: p.tenthDetails?.obtainedMarks ?? null,
            maxMarks: p.tenthDetails?.maxMarks ?? null,
            percentage: p.tenthDetails?.percentage ?? null,
          },
          twelfthDetails: {
            year: p.twelfthDetails?.year ?? null,
            rollNumber: p.twelfthDetails?.rollNumber ?? '',
            board: p.twelfthDetails?.board ?? '',
            obtainedMarks: p.twelfthDetails?.obtainedMarks ?? null,
            maxMarks: p.twelfthDetails?.maxMarks ?? null,
            percentage: p.twelfthDetails?.percentage ?? null,
          },
          section: p.section ?? '',
        },
        guardianInfo: {
          father: {
            name: g.father?.name ?? '',
            mobile: g.father?.mobile ?? '',
            mobile2: g.father?.mobile2 ?? '',
            email: g.father?.email ?? '',
            occupation: g.father?.occupation ?? '',
          },
          mother: {
            name: g.mother?.name ?? '',
            mobile: g.mother?.mobile ?? '',
            mobile2: g.mother?.mobile2 ?? '',
            email: g.mother?.email ?? '',
            occupation: g.mother?.occupation ?? '',
          },
          localGuardianName: g.localGuardianName ?? '',
        },
        skills: p.skills?.length ? p.skills.map((s) => ({ name: s })) : [{ name: '' }],
        certifications: p.certifications?.length
          ? p.certifications.map((c) => ({
              name: c.name,
              issuer: c.issuer ?? '',
              year: c.year ?? null,
              proofUrl: c.proofUrl ?? '',
            }))
          : [{ name: '', issuer: '', year: null, proofUrl: '' }],
        projects: p.projects?.length
          ? p.projects.map((pr) => ({
              title: pr.title,
              description: pr.description ?? '',
              techStack: pr.techStack ?? [],
              link: pr.link ?? '',
            }))
          : [{ title: '', description: '', techStack: [], link: '' }],
      })
      await fetchResumes()
    } catch (err) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }, [methods])

  // Fetch profile and resumes on mount
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile, methods])

  const onSubmit = async (formData) => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      // Flatten the form's nested grouping into the flat structure the API expects
      const { personal, academic, guardianInfo, skills, certifications, projects } = formData

      const payload = {
        // Personal (top-level API keys)
        dateOfBirth: personal?.dateOfBirth ? new Date(personal.dateOfBirth).toISOString() : null,
        gender: personal?.gender || null,
        phone2: personal?.phone2 ?? '',
        address: personal?.address,
        country: personal?.country ?? 'India',
        // Academic (top-level API keys)
        cgpaOverall: academic?.cgpaOverall,
        cgpaSemesters: academic?.cgpaSemesters,
        backlogsActive: academic?.backlogsActive,
        backlogsHistory: academic?.backlogsHistory,
        tenthPercent: academic?.tenthPercent,
        twelfthPercent: academic?.twelfthPercent,
        tenthDetails: academic?.tenthDetails,
        twelfthDetails: academic?.twelfthDetails,
        section: academic?.section,
        // Guardian (nested object at top level)
        guardianInfo,
        // Arrays
        skills: skills?.map((s) => s.name).filter(Boolean),
        certifications: certifications?.filter((c) => c.name?.trim()),
        projects: projects?.filter((p) => p.title?.trim()),
      }

      await updateSelfProfile(payload)
      setMessage({ type: 'success', text: 'Profile saved successfully!' })
      // Refresh profile to get server-validated data
      const profileData = await getSelfProfile()
      setProfile(profileData.profile)
    } catch (err) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  // Field array operations
  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({ control, name: 'skills' })
  const {
    fields: certFields,
    append: appendCert,
    remove: removeCert,
  } = useFieldArray({ control, name: 'certifications' })
  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({ control, name: 'projects' })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-700 border-t-transparent" />
      </div>
    )
  }

  const sections = [
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'academic', label: 'Academic', icon: '🎓' },
    { id: 'guardian', label: 'Guardian', icon: '👨‍👩‍👧' },
    { id: 'skills', label: 'Skills', icon: '🛠️' },
    { id: 'certifications', label: 'Certifications', icon: '📜' },
    { id: 'projects', label: 'Projects', icon: '💼' },
    { id: 'resumes', label: 'Resumes', icon: '📄' },
  ]

  const completeness = profile ? computeCompleteness(profile) : 0

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header with Completeness Meter */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">My Profile</h1>
          <p className="mt-1 font-body text-sm text-ink-600">
            Manage your academic and professional information
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {profile && (
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  profile.placementStatus === 'placed'
                    ? 'success'
                    : profile.placementStatus === 'opted_out'
                      ? 'neutral'
                      : 'neutral'
                }
              >
                {profile.placementStatus === 'placed'
                  ? 'Placed'
                  : profile.placementStatus === 'opted_out'
                    ? 'Opted Out'
                    : 'Not Placed'}
              </Badge>
              {profile.isBlacklisted && <Badge variant="danger">Blacklisted</Badge>}
            </div>
          )}
          {/* Completeness Meter */}
          <div className="w-48">
            <div className="flex items-center justify-between text-xs font-body text-ink-600 mb-1">
              <span>Profile Complete</span>
              <span className="font-semibold text-ink-900">{completeness}%</span>
            </div>
            <Progress value={completeness} max={100} className="h-2" />
          </div>
        </div>
      </div>

      {message.text && (
        <div
          className={`rounded-md p-3 text-sm font-body ${
            message.type === 'success' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-2 border-b border-border mb-6" role="tablist">
        {sections.map((section) => (
          <button
            key={section.id}
            role="tab"
            aria-selected={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 font-body text-sm font-medium transition-colors border-b-2 ${
              activeSection === section.id
                ? 'text-primary-700 border-primary-700'
                : 'text-ink-500 border-transparent hover:text-ink-700'
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {message.type === 'error' && (
          <div className="rounded-md bg-danger-bg p-3 text-sm font-body text-danger" role="alert">
            {message.text}
          </div>
        )}

        {/* ── Personal Information ────────────────────────────────────── */}
        {activeSection === 'personal' && (
          <Card className="space-y-6">
            <h2 className="font-heading text-lg font-semibold text-ink-900">
              Personal Information
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Date of Birth"
                type="date"
                error={errors.personal?.dateOfBirth?.message}
                {...register('personal.dateOfBirth')}
              />

              <div className="flex flex-col gap-1">
                <label className="font-body text-sm font-semibold text-ink-900">Gender</label>
                <select
                  className="w-full border border-border bg-surface px-3 py-2 rounded-md font-body text-sm text-ink-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                  {...register('personal.gender')}
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.personal?.gender?.message && (
                  <p className="font-body text-xs font-medium text-danger-text">
                    {errors.personal.gender.message}
                  </p>
                )}
              </div>

              <Input
                label="Alternate Phone"
                placeholder="e.g., +91 98765 43210"
                error={errors.personal?.phone2?.message}
                {...register('personal.phone2')}
              />

              <Input
                label="Country"
                placeholder="e.g., India"
                error={errors.personal?.country?.message}
                {...register('personal.country')}
              />
            </div>

            {/* Address sub-card */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-body text-sm font-semibold text-ink-900">Address</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Street"
                  placeholder="Street / locality"
                  {...register('personal.address.street')}
                />
                <Input label="City" placeholder="City" {...register('personal.address.city')} />
                <Input
                  label="State"
                  placeholder="State / province"
                  {...register('personal.address.state')}
                />
                <Input
                  label="Pincode"
                  placeholder="e.g., 302017"
                  {...register('personal.address.pincode')}
                />
              </div>
            </div>
          </Card>
        )}

        {/* ── Academic History ──────────────────────────────────────────── */}
        {activeSection === 'academic' && (
          <Card className="space-y-6">
            <h2 className="font-heading text-lg font-semibold text-ink-900">Academic History</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Overall CGPA"
                type="number"
                step="0.01"
                min="0"
                max="10"
                placeholder="e.g., 8.5"
                error={errors.academic?.cgpaOverall?.message}
                {...register('academic.cgpaOverall', { valueAsNumber: true })}
              />

              <Input
                label="Active Backlogs"
                type="number"
                min="0"
                placeholder="e.g., 0"
                error={errors.academic?.backlogsActive?.message}
                {...register('academic.backlogsActive', { valueAsNumber: true })}
              />

              <Input
                label="Section"
                placeholder="e.g., A, B, C"
                error={errors.academic?.section?.message}
                {...register('academic.section')}
              />
            </div>

            {/* 10th Details sub-card */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-body text-sm font-semibold text-ink-900">
                10th (Secondary) Details
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Year"
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="e.g., 2018"
                  {...register('academic.tenthDetails.year', { valueAsNumber: true })}
                />
                <Input
                  label="Roll Number"
                  placeholder="Board roll no."
                  {...register('academic.tenthDetails.rollNumber')}
                />
                <Input
                  label="Board"
                  placeholder="e.g., CBSE, RBSE"
                  {...register('academic.tenthDetails.board')}
                />
                <Input
                  label="Obtained Marks"
                  type="number"
                  min="0"
                  placeholder="e.g., 462"
                  {...register('academic.tenthDetails.obtainedMarks', { valueAsNumber: true })}
                />
                <Input
                  label="Max Marks"
                  type="number"
                  min="1"
                  placeholder="e.g., 500"
                  {...register('academic.tenthDetails.maxMarks', { valueAsNumber: true })}
                />
                <Input
                  label="Percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g., 92.4"
                  error={errors.academic?.tenthDetails?.percentage?.message}
                  {...register('academic.tenthDetails.percentage', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* 12th Details sub-card */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-body text-sm font-semibold text-ink-900">
                12th (Senior Secondary) Details
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Year"
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="e.g., 2020"
                  {...register('academic.twelfthDetails.year', { valueAsNumber: true })}
                />
                <Input
                  label="Roll Number"
                  placeholder="Board roll no."
                  {...register('academic.twelfthDetails.rollNumber')}
                />
                <Input
                  label="Board"
                  placeholder="e.g., CBSE, RBSE"
                  {...register('academic.twelfthDetails.board')}
                />
                <Input
                  label="Obtained Marks"
                  type="number"
                  min="0"
                  placeholder="e.g., 438"
                  {...register('academic.twelfthDetails.obtainedMarks', { valueAsNumber: true })}
                />
                <Input
                  label="Max Marks"
                  type="number"
                  min="1"
                  placeholder="e.g., 500"
                  {...register('academic.twelfthDetails.maxMarks', { valueAsNumber: true })}
                />
                <Input
                  label="Percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g., 87.6"
                  error={errors.academic?.twelfthDetails?.percentage?.message}
                  {...register('academic.twelfthDetails.percentage', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Semester-wise CGPA */}
            <div className="space-y-4">
              <h3 className="font-body text-sm font-semibold text-ink-900">Semester-wise CGPA</h3>
              <div className="grid gap-3 md:grid-cols-4">
                {Array.from({ length: SEMESTER_COUNT }, (_, i) => (
                  <Input
                    key={i}
                    label={`Sem ${i + 1}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="CGPA"
                    error={errors.academic?.cgpaSemesters?.[i]?.message}
                    {...register(`academic.cgpaSemesters.${i}`, { valueAsNumber: true })}
                  />
                ))}
              </div>
            </div>

            {/* Backlogs History */}
            <div className="space-y-4">
              <h3 className="font-body text-sm font-semibold text-ink-900">
                Backlogs History (per semester)
              </h3>
              <div className="grid gap-3 md:grid-cols-4">
                {Array.from({ length: SEMESTER_COUNT }, (_, i) => (
                  <Input
                    key={i}
                    label={`Sem ${i + 1}`}
                    type="number"
                    min="0"
                    placeholder="Count"
                    {...register(`academic.backlogsHistory.${i}`, { valueAsNumber: true })}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ── Guardian Information ──────────────────────────────────────── */}
        {activeSection === 'guardian' && (
          <Card className="space-y-6">
            <h2 className="font-heading text-lg font-semibold text-ink-900">
              Guardian Information
            </h2>

            {/* Father */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-body text-sm font-semibold text-ink-900">Father</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Name"
                  placeholder="Father's full name"
                  {...register('guardianInfo.father.name')}
                />
                <Input
                  label="Occupation"
                  placeholder="e.g., Business, Govt. Service"
                  {...register('guardianInfo.father.occupation')}
                />
                <Input
                  label="Mobile"
                  placeholder="Primary mobile"
                  {...register('guardianInfo.father.mobile')}
                />
                <Input
                  label="Alt. Mobile"
                  placeholder="Secondary mobile"
                  {...register('guardianInfo.father.mobile2')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="Email address"
                  {...register('guardianInfo.father.email')}
                />
              </div>
            </div>

            {/* Mother */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-body text-sm font-semibold text-ink-900">Mother</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Name"
                  placeholder="Mother's full name"
                  {...register('guardianInfo.mother.name')}
                />
                <Input
                  label="Occupation"
                  placeholder="e.g., Homemaker, Teacher"
                  {...register('guardianInfo.mother.occupation')}
                />
                <Input
                  label="Mobile"
                  placeholder="Primary mobile"
                  {...register('guardianInfo.mother.mobile')}
                />
                <Input
                  label="Alt. Mobile"
                  placeholder="Secondary mobile"
                  {...register('guardianInfo.mother.mobile2')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="Email address"
                  {...register('guardianInfo.mother.email')}
                />
              </div>
            </div>

            {/* Local Guardian */}
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Local Guardian Name"
                placeholder="Name of local guardian (if applicable)"
                {...register('guardianInfo.localGuardianName')}
              />
            </div>
          </Card>
        )}

        {/* Skills Section */}
        {activeSection === 'skills' && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-ink-900">Technical Skills</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSkill({ name: '' })}
              >
                + Add Skill
              </Button>
            </div>

            <div className="space-y-3">
              {skillFields.map((field, index) => (
                <div key={field.id} className="flex gap-3">
                  <Input
                    label={index === 0 ? 'Skill Name' : ''}
                    placeholder="e.g., JavaScript, React, Python"
                    error={errors.skills?.[index]?.name?.message}
                    {...register(`skills.${index}.name`)}
                    className="flex-1"
                  />
                  {skillFields.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="mt-10"
                      onClick={() => removeSkill(index)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Certifications Section */}
        {activeSection === 'certifications' && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-ink-900">Certifications</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendCert({ name: '', issuer: '', year: null, proofUrl: '' })}
              >
                + Add Certification
              </Button>
            </div>

            <div className="space-y-4">
              {certFields.map((field, index) => (
                <div key={field.id} className="space-y-3 border-t border-border pt-4">
                  <div className="flex gap-3">
                    <Input
                      label="Certification Name"
                      placeholder="e.g., AWS Certified Solutions Architect"
                      error={errors.certifications?.[index]?.name?.message}
                      {...register(`certifications.${index}.name`)}
                      className="flex-1"
                    />
                    {certFields.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="mt-10"
                        onClick={() => removeCert(index)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      label="Issuer"
                      placeholder="e.g., Amazon Web Services"
                      {...register(`certifications.${index}.issuer`)}
                    />
                    <Input
                      label="Year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      placeholder="2024"
                      error={errors.certifications?.[index]?.year?.message}
                      {...register(`certifications.${index}.year`, { valueAsNumber: true })}
                    />
                    <Input
                      label="Proof URL"
                      type="url"
                      placeholder="https://..."
                      error={errors.certifications?.[index]?.proofUrl?.message}
                      {...register(`certifications.${index}.proofUrl`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Projects Section */}
        {activeSection === 'projects' && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-ink-900">Projects</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendProject({ title: '', description: '', techStack: [], link: '' })
                }
              >
                + Add Project
              </Button>
            </div>

            <div className="space-y-4">
              {projectFields.map((field, index) => (
                <div key={field.id} className="space-y-3 border-t border-border pt-4">
                  <div className="flex gap-3">
                    <Input
                      label="Project Title"
                      placeholder="e.g., E-commerce Platform"
                      error={errors.projects?.[index]?.title?.message}
                      {...register(`projects.${index}.title`)}
                      className="flex-1"
                    />
                    {projectFields.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="mt-10"
                        onClick={() => removeProject(index)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>

                  <Input
                    label="Description"
                    placeholder="Brief description of the project..."
                    {...register(`projects.${index}.description`)}
                    className="min-h-[80px]"
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      label="Tech Stack (comma-separated)"
                      placeholder="React, Node.js, MongoDB, Tailwind"
                      {...register(`projects.${index}.techStack`, {
                        setValueAs: (v) =>
                          v
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                      })}
                    />
                    <Input
                      label="Project Link"
                      type="url"
                      placeholder="https://github.com/... or https://demo.com"
                      error={errors.projects?.[index]?.link?.message}
                      {...register(`projects.${index}.link`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Resumes Section */}
        {activeSection === 'resumes' && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-ink-900">Resumes</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
                disabled={uploading}
              >
                + Upload Resume
              </Button>
            </div>

            {/* Upload Modal (rendered via portal to avoid nested forms) */}
            {showUpload &&
              createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-surface rounded-xl p-6 w-full max-w-md shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading text-lg font-semibold text-ink-900">
                        Upload Resume
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                        ✕
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <Input
                        label="Label"
                        placeholder="e.g., Main Resume, Internship Resume"
                        {...register('upload.label', { required: 'Label is required' })}
                      />
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        label="Resume File"
                        onChange={handleUploadFileChange}
                      />
                      <label className="flex items-center gap-2 text-sm font-body text-ink-600">
                        <input type="checkbox" {...register('upload.isDefault')} />
                        <span>Set as default resume</span>
                      </label>
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowUpload(false)}
                          disabled={uploading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          disabled={uploading}
                          onClick={() => handleUploadSubmit(methods.getValues().upload)}
                        >
                          {uploading ? 'Uploading…' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>,
                document.body
              )}

            {/* Resume List */}
            {resumes.length === 0 && (
              <div className="text-center py-12">
                <p className="font-body text-ink-500 mb-4">No resumes uploaded yet</p>
                <Button variant="outline" onClick={() => setShowUpload(true)}>
                  Upload Your First Resume
                </Button>
              </div>
            )}

            {resumes.length > 0 && (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div
                    key={resume._id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-primary-100 rounded-lg text-primary-700">📄</div>
                      <div className="min-w-0">
                        <p className="font-body font-semibold text-ink-900 truncate">
                          {resume.label}
                        </p>
                        <p className="font-body text-sm text-ink-500 truncate">
                          {resume.originalFilename}
                        </p>
                        <p className="font-body text-xs text-ink-400">
                          {(resume.fileSize / 1024).toFixed(1)} KB • {resume.mimeType}
                        </p>
                      </div>
                      {resume.isDefault && (
                        <Badge variant="success" className="ml-2">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!resume.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(resume._id)}
                          disabled={settingDefault === resume._id}
                        >
                          {settingDefault === resume._id ? 'Setting…' : 'Set Default'}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(resume._id)}
                        disabled={deleting === resume._id}
                      >
                        {deleting === resume._id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" variant="primary" disabled={saving} size="lg">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
