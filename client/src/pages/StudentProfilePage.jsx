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

// Validation schemas for each section
const academicSchema = z.object({
  cgpaOverall: z.number().min(0).max(10).nullable().optional(),
  cgpaSemesters: z.array(z.number().min(0).max(10)).optional(),
  backlogsActive: z.number().int().min(0).nullable().optional(),
  backlogsHistory: z.array(z.number().int().min(0)).optional(),
  tenthPercent: z.number().min(0).max(100).nullable().optional(),
  twelfthPercent: z.number().min(0).max(100).nullable().optional(),
  section: z.string().optional(),
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
  academic: academicSchema,
  skills: z.array(skillSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  projects: z.array(projectSchema).optional(),
})

// Helper to generate semester CGPA fields
const SEMESTER_COUNT = 8

// Compute profile completeness percentage
function computeCompleteness(profile) {
  if (!profile) return 0

  const weights = {
    academic: 30,
    skills: 15,
    certifications: 15,
    projects: 15,
    resumes: 25,
  }

  let score = 0

  // Academic (30%)
  if (profile.cgpaOverall != null) score += weights.academic * 0.3
  if (profile.tenthPercent != null) score += weights.academic * 0.2
  if (profile.twelfthPercent != null) score += weights.academic * 0.2
  if (profile.section) score += weights.academic * 0.15
  if (profile.cgpaSemesters?.some((v) => v != null)) score += weights.academic * 0.15

  // Skills (15%)
  // Handle both string array (from server) and object array (from form)
  if (profile.skills?.some((s) => (typeof s === 'string' ? s.trim() : s?.name?.trim())))
    score += weights.skills

  // Certifications (15%)
  if (profile.certifications?.some((c) => c?.name?.trim())) score += weights.certifications

  // Projects (15%)
  if (profile.projects?.some((p) => p?.title?.trim())) score += weights.projects

  // Resumes (25%)
  if (profile.resumes?.length > 0) score += weights.resumes

  return Math.round(score)
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('academic')
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
      academic: {
        cgpaOverall: null,
        cgpaSemesters: Array(SEMESTER_COUNT).fill(null),
        backlogsActive: null,
        backlogsHistory: [],
        tenthPercent: null,
        twelfthPercent: null,
        section: '',
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
      methods.reset({
        academic: {
          cgpaOverall: p.cgpaOverall ?? null,
          cgpaSemesters: p.cgpaSemesters?.length
            ? p.cgpaSemesters
            : Array(SEMESTER_COUNT).fill(null),
          backlogsActive: p.backlogsActive ?? null,
          backlogsHistory: p.backlogsHistory ?? [],
          tenthPercent: p.tenthPercent ?? null,
          twelfthPercent: p.twelfthPercent ?? null,
          section: p.section ?? '',
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
      await updateSelfProfile(formData)
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
    { id: 'academic', label: 'Academic', icon: '🎓' },
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

        {/* Academic Section */}
        {activeSection === 'academic' && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                Academic Information
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                label="10th Percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g., 92.5"
                error={errors.academic?.tenthPercent?.message}
                {...register('academic.tenthPercent', { valueAsNumber: true })}
              />

              <Input
                label="12th Percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g., 88.0"
                error={errors.academic?.twelfthPercent?.message}
                {...register('academic.twelfthPercent', { valueAsNumber: true })}
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
              <div className="flex items-center justify-between">
                <h3 className="font-body text-sm font-semibold text-ink-900">
                  Backlogs History (per semester)
                </h3>
              </div>
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
