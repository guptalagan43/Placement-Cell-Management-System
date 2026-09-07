import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getSelfProfile, updateSelfProfile } from '../api/studentProfile.api.js'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'

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

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('academic')
  const [message, setMessage] = useState({ type: '', text: '' })

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
    formState: { errors },
  } = methods

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
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
      } catch (err) {
        setMessage({ type: 'error', text: err.message ?? 'Failed to load profile' })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [methods])

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
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">My Profile</h1>
          <p className="mt-1 font-body text-sm text-ink-600">
            Manage your academic and professional information
          </p>
        </div>
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

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" variant="primary" disabled={saving} size="lg">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
