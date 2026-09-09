// StudentProfile model. Basic academic/placement profile linked to User (DR-02).
// Extended in Phase 15 with full CRUD API.
// Amended 2026-09-08 to match institutional student record format.
import mongoose from 'mongoose'
import { DEPARTMENTS } from '../constants/departments.js'

const resumeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    cloudinarySecureUrl: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
)

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

const academicDetailsSchema = new mongoose.Schema(
  {
    year: { type: Number, min: 1900, max: 2100 },
    rollNumber: { type: String, trim: true, default: '' },
    board: { type: String, trim: true, default: '' },
    obtainedMarks: { type: Number, min: 0 },
    maxMarks: { type: Number, min: 1 },
    percentage: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
)

const guardianSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    mobile: { type: String, trim: true, default: '' },
    mobile2: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    occupation: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

const guardianInfoSchema = new mongoose.Schema(
  {
    father: { type: guardianSchema, default: () => ({}) },
    mother: { type: guardianSchema, default: () => ({}) },
    localGuardianName: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Identity numbers
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    universityEnrollmentNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    // Department & batch
    branch: {
      type: String,
      enum: DEPARTMENTS,
      required: true,
    },
    batch: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    classGroup: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    alternateClassGroup: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    // Personal details
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: null,
    },
    phone2: { type: String, trim: true, default: '' },
    address: { type: addressSchema, default: () => ({}) },
    country: { type: String, trim: true, default: 'India' },
    // Admission details
    admissionYear: { type: Number, min: 2000, max: 2100 },
    dateOfAdmission: { type: Date },
    // Academic fields
    cgpaOverall: { type: Number, min: 0, max: 10, default: null },
    cgpaSemesters: { type: [Number], default: [] },
    backlogsActive: { type: Number, min: 0, default: 0 },
    backlogsHistory: { type: [Number], default: [] },
    // Expanded 10th/12th details
    tenthDetails: { type: academicDetailsSchema, default: () => ({}) },
    twelfthDetails: { type: academicDetailsSchema, default: () => ({}) },
    // Legacy flat fields (kept for backward compatibility during migration)
    tenthPercent: { type: Number, min: 0, max: 100, default: null },
    twelfthPercent: { type: Number, min: 0, max: 100, default: null },
    // Placement status
    placementStatus: {
      type: String,
      enum: ['not_placed', 'placed', 'opted_out'],
      default: 'not_placed',
    },
    currentTier: { type: Number, default: null },
    // Resume and other fields
    resumes: { type: [resumeSchema], default: [] },
    skills: { type: [String], default: [] },
    certifications: { type: [mongoose.Schema.Types.Mixed], default: [] },
    projects: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Guardian information
    guardianInfo: { type: guardianInfoSchema, default: () => ({}) },
    // Policy acknowledgment
    policyAcknowledgment: {
      version: { type: String, default: null },
      acceptedAt: { type: Date, default: null },
    },
    // Blacklist flag
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indexes for common queries
studentProfileSchema.index({ branch: 1, batch: 1 })
studentProfileSchema.index({ placementStatus: 1 })
studentProfileSchema.index({ registrationNumber: 1 })
studentProfileSchema.index({ universityEnrollmentNumber: 1 })

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema)
export default StudentProfile