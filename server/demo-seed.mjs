/**
 * demo-seed.mjs — Phase 67: Demo Seed Data
 *
 * Creates a fully-populated, believable demo database for SKIT PCMS.
 * Covers all 8 departments, realistic companies, drives at various lifecycle
 * stages, students with varied academic profiles, and supporting data.
 *
 * Usage:  node demo-seed.mjs          (from server/ directory)
 * Prereq: server/.env must exist with MONGODB_URI set.
 *
 * WARNING: This script CLEARS ALL existing data before seeding.
 *          Do NOT run against a production database with real data.
 */

import { readFileSync } from 'fs'
import mongoose from 'mongoose'

// ── 1. Load .env ──────────────────────────────────────────────────────────────
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#') || !line.includes('=')) continue
  const i = line.indexOf('=')
  process.env[line.slice(0, i).trim()] = line
    .slice(i + 1)
    .trim()
    .replace(/^"(.*)"$/, '$1')
}

// ── 2. Connect ────────────────────────────────────────────────────────────────
await mongoose.connect(process.env.MONGODB_URI)
console.log('Connected to MongoDB:', process.env.MONGODB_URI)

// ── 3. Import models ──────────────────────────────────────────────────────────
const [
  User,
  StudentProfile,
  Company,
  Drive,
  Round,
  InfoSession,
  Application,
  SeasonConfig,
  Announcement,
  FAQ,
  Contact,
  RulesPage,
  Notification,
] = await Promise.all([
  import('./src/models/User.model.js').then((m) => m.default),
  import('./src/models/StudentProfile.model.js').then((m) => m.default),
  import('./src/models/Company.model.js').then((m) => m.default),
  import('./src/models/Drive.model.js').then((m) => m.default),
  import('./src/models/Round.model.js').then((m) => m.default),
  import('./src/models/InfoSession.model.js').then((m) => m.default),
  import('./src/models/Application.model.js').then((m) => m.default),
  import('./src/models/SeasonConfig.model.js').then((m) => m.default),
  import('./src/models/Announcement.model.js').then((m) => m.default),
  import('./src/models/FAQ.model.js').then((m) => m.default),
  import('./src/models/Contact.model.js').then((m) => m.default),
  import('./src/models/RulesPage.model.js').then((m) => m.default),
  import('./src/models/Notification.model.js').then((m) => m.default),
])

// ── 4. Wipe existing data ─────────────────────────────────────────────────────
console.log('\nClearing existing data...')
await Promise.all([
  User.deleteMany({}),
  StudentProfile.deleteMany({}),
  Company.deleteMany({}),
  Drive.deleteMany({}),
  Round.deleteMany({}),
  InfoSession.deleteMany({}),
  Application.deleteMany({}),
  SeasonConfig.deleteMany({}),
  Announcement.deleteMany({}),
  FAQ.deleteMany({}),
  Contact.deleteMany({}),
  RulesPage.deleteMany({}),
  Notification.deleteMany({}),
])
console.log('All collections cleared\n')

// ── 5. Constants ──────────────────────────────────────────────────────────────
const SEASON = '2024-25'
const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management Studies',
  'Basic Sciences & Humanities',
]

const daysFromNow = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// =============================================================================
// A. SEASON CONFIG
// =============================================================================
console.log('Creating season config...')
await SeasonConfig.create({
  season: SEASON,
  isActive: true,
  tierConfig: { lowerIsBetter: true, maxTier: 5 },
  oneOfferRule: { enabled: true, allowTierUpgrade: true },
  blacklistOverride: { enabled: true },
  defaultThresholds: { minCgpa: 6.5, maxBacklogs: 2, min10th: 60, min12th: 60 },
})
console.log('Season config created: ' + SEASON)

// =============================================================================
// B. USERS — TPO + 8 Coordinators + 40 Students
// =============================================================================
console.log('\nCreating users...')

// TPO
const tpoUser = new User({
  email: 'tpo@skit.ac.in',
  role: 'tpo',
  active: true,
  mustResetPassword: false,
})
tpoUser.password = 'Tpo@1234'
await tpoUser.save()
console.log('TPO: ' + tpoUser.email)

// Coordinators (one per department)
const coordData = [
  { email: 'coord.cse@skit.ac.in', dept: DEPARTMENTS[0] },
  { email: 'coord.it@skit.ac.in',  dept: DEPARTMENTS[1] },
  { email: 'coord.ece@skit.ac.in', dept: DEPARTMENTS[2] },
  { email: 'coord.ee@skit.ac.in',  dept: DEPARTMENTS[3] },
  { email: 'coord.me@skit.ac.in',  dept: DEPARTMENTS[4] },
  { email: 'coord.ce@skit.ac.in',  dept: DEPARTMENTS[5] },
  { email: 'coord.mba@skit.ac.in', dept: DEPARTMENTS[6] },
  { email: 'coord.bsh@skit.ac.in', dept: DEPARTMENTS[7] },
]
for (const c of coordData) {
  const u = new User({ email: c.email, role: 'coordinator', department: c.dept, active: true, mustResetPassword: false })
  u.password = 'Coord@1234'
  await u.save()
}
console.log('8 coordinator accounts created | Coord@1234')

// Students (5 per department = 40 total)
const studentDefs = [
  // CSE
  { email: 'b221001@skit.ac.in', roll: 'B221001', branch: DEPARTMENTS[0], batch: 2025, cgpa: 8.7, backlogs: 0, ten: 92, twelve: 88, skills: ['Java', 'Spring Boot', 'React', 'SQL'], placed: false },
  { email: 'b221002@skit.ac.in', roll: 'B221002', branch: DEPARTMENTS[0], batch: 2025, cgpa: 7.2, backlogs: 1, ten: 78, twelve: 72, skills: ['Python', 'Django', 'MySQL'], placed: false },
  { email: 'b221003@skit.ac.in', roll: 'B221003', branch: DEPARTMENTS[0], batch: 2025, cgpa: 9.1, backlogs: 0, ten: 95, twelve: 93, skills: ['C++', 'DSA', 'Machine Learning', 'TensorFlow'], placed: true },
  { email: 'b221004@skit.ac.in', roll: 'B221004', branch: DEPARTMENTS[0], batch: 2025, cgpa: 6.8, backlogs: 2, ten: 70, twelve: 68, skills: ['JavaScript', 'Node.js', 'MongoDB'], placed: false },
  { email: 'b221005@skit.ac.in', roll: 'B221005', branch: DEPARTMENTS[0], batch: 2025, cgpa: 8.0, backlogs: 0, ten: 84, twelve: 82, skills: ['Go', 'Microservices', 'Docker', 'Kubernetes'], placed: false },
  // IT
  { email: 'b221101@skit.ac.in', roll: 'B221101', branch: DEPARTMENTS[1], batch: 2025, cgpa: 8.4, backlogs: 0, ten: 89, twelve: 85, skills: ['React', 'Angular', 'TypeScript', 'AWS'], placed: false },
  { email: 'b221102@skit.ac.in', roll: 'B221102', branch: DEPARTMENTS[1], batch: 2025, cgpa: 7.5, backlogs: 0, ten: 81, twelve: 77, skills: ['PHP', 'Laravel', 'Vue.js'], placed: false },
  { email: 'b221103@skit.ac.in', roll: 'B221103', branch: DEPARTMENTS[1], batch: 2025, cgpa: 9.3, backlogs: 0, ten: 97, twelve: 95, skills: ['Data Science', 'Python', 'Pandas', 'Power BI'], placed: true },
  { email: 'b221104@skit.ac.in', roll: 'B221104', branch: DEPARTMENTS[1], batch: 2025, cgpa: 6.5, backlogs: 2, ten: 65, twelve: 61, skills: ['HTML', 'CSS', 'JavaScript'], placed: false },
  { email: 'b221105@skit.ac.in', roll: 'B221105', branch: DEPARTMENTS[1], batch: 2025, cgpa: 7.9, backlogs: 0, ten: 83, twelve: 80, skills: ['Cybersecurity', 'Linux', 'Networking'], placed: false },
  // ECE
  { email: 'b221201@skit.ac.in', roll: 'B221201', branch: DEPARTMENTS[2], batch: 2025, cgpa: 8.2, backlogs: 0, ten: 88, twelve: 84, skills: ['VLSI', 'Embedded C', 'MATLAB'], placed: false },
  { email: 'b221202@skit.ac.in', roll: 'B221202', branch: DEPARTMENTS[2], batch: 2025, cgpa: 7.0, backlogs: 1, ten: 75, twelve: 70, skills: ['PCB Design', 'Arduino', 'Raspberry Pi'], placed: false },
  { email: 'b221203@skit.ac.in', roll: 'B221203', branch: DEPARTMENTS[2], batch: 2025, cgpa: 8.8, backlogs: 0, ten: 91, twelve: 89, skills: ['Signal Processing', 'FPGA', 'Verilog'], placed: true },
  { email: 'b221204@skit.ac.in', roll: 'B221204', branch: DEPARTMENTS[2], batch: 2025, cgpa: 6.9, backlogs: 2, ten: 69, twelve: 64, skills: ['IoT', 'Python', 'Sensors'], placed: false },
  { email: 'b221205@skit.ac.in', roll: 'B221205', branch: DEPARTMENTS[2], batch: 2025, cgpa: 7.6, backlogs: 0, ten: 82, twelve: 78, skills: ['RF Design', 'Antenna', 'Communication Systems'], placed: false },
  // EE
  { email: 'b221301@skit.ac.in', roll: 'B221301', branch: DEPARTMENTS[3], batch: 2025, cgpa: 8.1, backlogs: 0, ten: 87, twelve: 83, skills: ['Power Systems', 'SCADA', 'PLC'], placed: false },
  { email: 'b221302@skit.ac.in', roll: 'B221302', branch: DEPARTMENTS[3], batch: 2025, cgpa: 7.3, backlogs: 1, ten: 76, twelve: 72, skills: ['AutoCAD', 'Electrical Design', 'ETAP'], placed: false },
  { email: 'b221303@skit.ac.in', roll: 'B221303', branch: DEPARTMENTS[3], batch: 2025, cgpa: 8.6, backlogs: 0, ten: 90, twelve: 87, skills: ['Renewable Energy', 'Solar', 'MATLAB', 'Simulink'], placed: false },
  { email: 'b221304@skit.ac.in', roll: 'B221304', branch: DEPARTMENTS[3], batch: 2025, cgpa: 6.7, backlogs: 2, ten: 66, twelve: 63, skills: ['Circuit Design', 'Multisim'], placed: false },
  { email: 'b221305@skit.ac.in', roll: 'B221305', branch: DEPARTMENTS[3], batch: 2025, cgpa: 7.8, backlogs: 0, ten: 84, twelve: 79, skills: ['Control Systems', 'Instrumentation', 'LabVIEW'], placed: false },
  // ME
  { email: 'b221401@skit.ac.in', roll: 'B221401', branch: DEPARTMENTS[4], batch: 2025, cgpa: 8.0, backlogs: 0, ten: 86, twelve: 82, skills: ['SolidWorks', 'AutoCAD', 'CNC Machining'], placed: false },
  { email: 'b221402@skit.ac.in', roll: 'B221402', branch: DEPARTMENTS[4], batch: 2025, cgpa: 7.1, backlogs: 1, ten: 74, twelve: 69, skills: ['ANSYS', 'FEA', 'Thermal Analysis'], placed: false },
  { email: 'b221403@skit.ac.in', roll: 'B221403', branch: DEPARTMENTS[4], batch: 2025, cgpa: 8.5, backlogs: 0, ten: 89, twelve: 85, skills: ['CATIA', '3D Printing', 'CAM'], placed: false },
  { email: 'b221404@skit.ac.in', roll: 'B221404', branch: DEPARTMENTS[4], batch: 2025, cgpa: 6.8, backlogs: 2, ten: 68, twelve: 65, skills: ['Welding', 'Manufacturing Processes'], placed: false },
  { email: 'b221405@skit.ac.in', roll: 'B221405', branch: DEPARTMENTS[4], batch: 2025, cgpa: 7.7, backlogs: 0, ten: 83, twelve: 79, skills: ['Robotics', 'Pneumatics', 'Hydraulics'], placed: false },
  // CE
  { email: 'b221501@skit.ac.in', roll: 'B221501', branch: DEPARTMENTS[5], batch: 2025, cgpa: 7.9, backlogs: 0, ten: 85, twelve: 80, skills: ['AutoCAD Civil', 'Staad Pro', 'Surveying'], placed: false },
  { email: 'b221502@skit.ac.in', roll: 'B221502', branch: DEPARTMENTS[5], batch: 2025, cgpa: 7.2, backlogs: 1, ten: 77, twelve: 71, skills: ['ETABS', 'Revit', 'Structural Design'], placed: false },
  { email: 'b221503@skit.ac.in', roll: 'B221503', branch: DEPARTMENTS[5], batch: 2025, cgpa: 8.3, backlogs: 0, ten: 88, twelve: 84, skills: ['GIS', 'Remote Sensing', 'Hydrology'], placed: false },
  { email: 'b221504@skit.ac.in', roll: 'B221504', branch: DEPARTMENTS[5], batch: 2025, cgpa: 6.6, backlogs: 2, ten: 67, twelve: 63, skills: ['Concrete Technology', 'Construction Management'], placed: false },
  { email: 'b221505@skit.ac.in', roll: 'B221505', branch: DEPARTMENTS[5], batch: 2025, cgpa: 7.5, backlogs: 0, ten: 80, twelve: 76, skills: ['Environmental Engineering', 'Water Treatment'], placed: false },
  // MBA
  { email: 'b221601@skit.ac.in', roll: 'B221601', branch: DEPARTMENTS[6], batch: 2025, cgpa: 8.2, backlogs: 0, ten: 87, twelve: 83, skills: ['Business Analytics', 'Excel', 'Tableau', 'Marketing'], placed: false },
  { email: 'b221602@skit.ac.in', roll: 'B221602', branch: DEPARTMENTS[6], batch: 2025, cgpa: 7.4, backlogs: 0, ten: 80, twelve: 75, skills: ['Finance', 'SAP', 'Tally', 'Financial Modeling'], placed: false },
  { email: 'b221603@skit.ac.in', roll: 'B221603', branch: DEPARTMENTS[6], batch: 2025, cgpa: 8.7, backlogs: 0, ten: 92, twelve: 90, skills: ['HR Management', 'Recruitment', 'MS Office'], placed: true },
  { email: 'b221604@skit.ac.in', roll: 'B221604', branch: DEPARTMENTS[6], batch: 2025, cgpa: 7.0, backlogs: 0, ten: 74, twelve: 70, skills: ['Supply Chain', 'Operations', 'Logistics'], placed: false },
  { email: 'b221605@skit.ac.in', roll: 'B221605', branch: DEPARTMENTS[6], batch: 2025, cgpa: 7.8, backlogs: 0, ten: 83, twelve: 79, skills: ['Digital Marketing', 'SEO', 'Social Media'], placed: false },
  // BSH
  { email: 'b221701@skit.ac.in', roll: 'B221701', branch: DEPARTMENTS[7], batch: 2025, cgpa: 7.5, backlogs: 0, ten: 80, twelve: 76, skills: ['Technical Writing', 'Communication', 'Research'], placed: false },
  { email: 'b221702@skit.ac.in', roll: 'B221702', branch: DEPARTMENTS[7], batch: 2025, cgpa: 6.9, backlogs: 1, ten: 72, twelve: 68, skills: ['Physics', 'Mathematics', 'Statistics'], placed: false },
  { email: 'b221703@skit.ac.in', roll: 'B221703', branch: DEPARTMENTS[7], batch: 2025, cgpa: 8.0, backlogs: 0, ten: 86, twelve: 82, skills: ['Applied Mathematics', 'Data Analysis', 'R Programming'], placed: false },
  { email: 'b221704@skit.ac.in', roll: 'B221704', branch: DEPARTMENTS[7], batch: 2025, cgpa: 7.2, backlogs: 0, ten: 76, twelve: 72, skills: ['Chemistry', 'Lab Skills', 'Quality Control'], placed: false },
  { email: 'b221705@skit.ac.in', roll: 'B221705', branch: DEPARTMENTS[7], batch: 2025, cgpa: 7.7, backlogs: 0, ten: 83, twelve: 78, skills: ['English Communication', 'Content Writing', 'Editing'], placed: false },
]

const studentUserMap = {}
for (const def of studentDefs) {
  const u = new User({ email: def.email, role: 'student', active: true, mustResetPassword: false })
  u.password = 'Student@1234'
  await u.save()

  const profile = await StudentProfile.create({
    user: u._id,
    rollNumber: def.roll,
    registrationNumber: 'RTU/' + def.roll,
    branch: def.branch,
    batch: def.batch,
    section: 'A',
    cgpaOverall: def.cgpa,
    backlogsActive: def.backlogs,
    tenthPercent: def.ten,
    twelfthPercent: def.twelve,
    tenthDetails: { percentage: def.ten, year: 2017 },
    twelfthDetails: { percentage: def.twelve, year: 2019 },
    skills: def.skills,
    placementStatus: def.placed ? 'placed' : 'not_placed',
    currentTier: def.placed ? 2 : null,
    phone: '98001' + def.roll.slice(-5),
    linkedinUrl: 'https://linkedin.com/in/' + def.roll.toLowerCase(),
    policyAcknowledgment: { version: '1', acceptedAt: daysFromNow(-10) },
  })

  studentUserMap[def.roll] = { user: u, profile }
}
console.log(studentDefs.length + ' student accounts created | Student@1234')

// =============================================================================
// C. COMPANIES (12)
// =============================================================================
console.log('\nCreating companies...')
const companyDefs = [
  {
    name: 'Infosys Limited',
    sector: 'IT Services',
    about: 'Global leader in next-generation digital services and consulting with 300,000+ employees across 56 countries.',
    hr: { name: 'Priya Kapoor', email: 'priya.kapoor@infosys.com', phone: '9980165432', designation: 'Campus Recruiter' },
    website: 'https://www.infosys.com',
  },
  {
    name: 'Tata Consultancy Services',
    sector: 'IT Services',
    about: "World's largest IT services company by market cap, part of the Tata Group. Operations in 46 countries.",
    hr: { name: 'Ramesh Iyer', email: 'ramesh.iyer@tcs.com', phone: '9987654321', designation: 'HR Manager - Campus' },
    website: 'https://www.tcs.com',
  },
  {
    name: 'Wipro Technologies',
    sector: 'IT Services',
    about: 'Leading technology services and consulting company with 240,000+ employees and 900+ active global clients.',
    hr: { name: 'Sneha Patil', email: 'sneha.patil@wipro.com', phone: '9876543210', designation: 'Campus Talent Acquisition' },
    website: 'https://www.wipro.com',
  },
  {
    name: 'L&T Technology Services',
    sector: 'Engineering & Technology',
    about: 'Pure-play engineering services company. Partner of choice to 57 Fortune 500 companies across embedded, mechanical and electrical engineering.',
    hr: { name: 'Arun Nair', email: 'arun.nair@ltts.com', phone: '9765432109', designation: 'Talent Acquisition Lead' },
    website: 'https://www.ltts.com',
  },
  {
    name: 'Samsung R&D Institute',
    sector: 'Electronics & Semiconductors',
    about: "India's largest R&D centre of Samsung Electronics, focusing on mobile platform, SoC and multimedia technologies.",
    hr: { name: 'Divya Krishnan', email: 'divya.k@samsung.com', phone: '9654321098', designation: 'University Relations Manager' },
    website: 'https://research.samsung.com/sri-bangalore',
  },
  {
    name: 'BHEL (Bharat Heavy Electricals Ltd)',
    sector: 'Power & Energy',
    about: "India's largest engineering and manufacturing enterprise in the energy and infrastructure sector. Government of India entity.",
    hr: { name: 'Suresh Kumar', email: 's.kumar@bhel.in', phone: '9543210987', designation: 'Executive HR' },
    website: 'https://www.bhel.com',
  },
  {
    name: 'Larsen & Toubro Construction',
    sector: 'Construction & Infrastructure',
    about: "India's largest construction company executing diverse civil infrastructure projects across 50+ countries.",
    hr: { name: 'Meena Joshi', email: 'meena.joshi@larsentoubro.com', phone: '9432109876', designation: 'HR Executive - Recruitment' },
    website: 'https://www.larsentoubro.com',
  },
  {
    name: 'Deloitte India',
    sector: 'Management Consulting',
    about: "India's leading professional services firm offering audit, tax, consulting and financial advisory services.",
    hr: { name: 'Ritu Mehta', email: 'ritu.mehta@deloitte.com', phone: '9321098765', designation: 'Campus Recruitment Lead' },
    website: 'https://www2.deloitte.com/in',
  },
  {
    name: 'Capgemini India',
    sector: 'IT Services',
    about: 'Global leader in consulting, technology services and digital transformation with 50,000+ India employees.',
    hr: { name: 'Vikash Rao', email: 'vikash.rao@capgemini.com', phone: '9210987654', designation: 'Campus Recruiter' },
    website: 'https://www.capgemini.com',
  },
  {
    name: 'Tech Mahindra',
    sector: 'IT Services',
    about: 'Leading provider of digital transformation, consulting and BPO services. Part of Mahindra Group. 145,000+ employees.',
    hr: { name: 'Ananya Singh', email: 'ananya.singh@techmahindra.com', phone: '9109876543', designation: 'Talent Acquisition Manager' },
    website: 'https://www.techmahindra.com',
  },
  {
    name: 'HCL Technologies',
    sector: 'IT Services',
    about: 'Global technology company helping enterprises reimagine their businesses through digital transformation at scale.',
    hr: { name: 'Gaurav Verma', email: 'gaurav.verma@hcltech.com', phone: '9098765432', designation: 'Campus Relations Lead' },
    website: 'https://www.hcltech.com',
  },
  {
    name: 'Rajasthan Electronics & Instruments Ltd',
    sector: 'Electronics & Government PSU',
    about: 'Government of India enterprise under Ministry of Agriculture with operations in 11 states. Major electronics manufacturer in Rajasthan.',
    hr: { name: 'Kamal Sharma', email: 'k.sharma@reil.co.in', phone: '9876541230', designation: 'DGM Human Resources' },
    website: 'https://www.reil.co.in',
  },
]

const companies = {}
for (const c of companyDefs) {
  const company = await Company.create({
    name: c.name,
    sector: c.sector,
    about: c.about,
    hrContact: c.hr,
    website: c.website,
    isActive: true,
  })
  companies[c.name] = company
}
console.log(companyDefs.length + ' companies created')

// =============================================================================
// D. DRIVES (11 across full lifecycle)
// =============================================================================
console.log('\nCreating drives...')

const CSE_IT = [DEPARTMENTS[0], DEPARTMENTS[1]]
const ALL_ENG = [DEPARTMENTS[0], DEPARTMENTS[1], DEPARTMENTS[2], DEPARTMENTS[3], DEPARTMENTS[4]]
const CSE_IT_ECE = [DEPARTMENTS[0], DEPARTMENTS[1], DEPARTMENTS[2]]
const ECE_EE = [DEPARTMENTS[2], DEPARTMENTS[3]]
const ME_CE = [DEPARTMENTS[4], DEPARTMENTS[5]]
const MBA_ONLY = [DEPARTMENTS[6]]

const driveDefs = [
  // 1 — TCS: results_declared (fully complete)
  {
    co: 'Tata Consultancy Services', title: 'TCS NQT — Software Engineer 2025 Batch',
    jobType: 'full-time', ctc: 3.36, stipend: 0,
    compensationDetails: 'Fixed CTC 3.36 LPA + performance bonus. 6-month initial training at TCS Learning Centre.',
    branches: ALL_ENG, minCgpa: 6.0, maxBacklogs: 0, min10: 60, min12: 60,
    tier: 3, vacancies: 20, status: 'results_declared', deadline: daysFromNow(-45),
    description: 'TCS National Qualifier Test for Software Engineer. Selected candidates join as Assistant System Engineers.',
  },
  // 2 — Infosys: completed
  {
    co: 'Infosys Limited', title: 'Infosys Systems Engineer — 2025 Batch',
    jobType: 'full-time', ctc: 3.6, stipend: 0,
    compensationDetails: 'Fixed CTC 3.6 LPA. Training at Infosys Mysuru campus for 5.5 months.',
    branches: ALL_ENG, minCgpa: 6.5, maxBacklogs: 0, min10: 60, min12: 60,
    tier: 3, vacancies: 15, status: 'completed', deadline: daysFromNow(-30),
    description: 'Infosys flagship campus recruitment for Systems Engineer. Power Programmer or Specialist track.',
  },
  // 3 — Wipro: in_progress
  {
    co: 'Wipro Technologies', title: 'Wipro National Talent Hunt — Software Engineer',
    jobType: 'full-time', ctc: 3.5, stipend: 0,
    compensationDetails: 'Gross CTC 3.5 LPA. Allocated to Bangalore/Hyderabad/Pune development centres.',
    branches: CSE_IT_ECE, minCgpa: 6.5, maxBacklogs: 0, min10: 60, min12: 60,
    tier: 3, vacancies: 10, status: 'in_progress', deadline: daysFromNow(-15),
    description: 'Wipro National Talent Hunt for Software Engineer positions at delivery centers across India.',
  },
  // 4 — Capgemini: registration_closed
  {
    co: 'Capgemini India', title: 'Capgemini GET — Graduate Engineer Trainee 2025',
    jobType: 'full-time', ctc: 4.0, stipend: 0,
    compensationDetails: 'CTC 4.0 LPA. Hybrid work model post-training. Based at Pune/Bangalore.',
    branches: ALL_ENG, minCgpa: 7.0, maxBacklogs: 0, min10: 65, min12: 65,
    tier: 2, vacancies: 8, status: 'registration_closed', deadline: daysFromNow(-5),
    description: 'Capgemini Graduate Engineer Trainee program with structured technical and soft-skills training.',
  },
  // 5 — HCL: registration_open
  {
    co: 'HCL Technologies', title: 'HCL TechBee Fresh Graduate Programme',
    jobType: 'full-time', ctc: 3.0, stipend: 0,
    compensationDetails: 'Starting CTC 3.0 LPA with step-up after training completion.',
    branches: ALL_ENG, minCgpa: 6.0, maxBacklogs: 2, min10: 55, min12: 55,
    tier: 4, vacancies: 25, status: 'registration_open', deadline: daysFromNow(5),
    description: 'HCL TechBee program for fresh engineering graduates. 1-year structured training across technical domains.',
  },
  // 6 — Samsung: published
  {
    co: 'Samsung R&D Institute', title: 'Samsung Research — Software Engineer (AI/ML)',
    jobType: 'full-time', ctc: 14.0, stipend: 0,
    compensationDetails: 'CTC 14 LPA. Joining bonus of 1 LPA.',
    branches: CSE_IT, minCgpa: 8.0, maxBacklogs: 0, min10: 80, min12: 80,
    tier: 1, vacancies: 4, status: 'published', deadline: daysFromNow(12),
    description: 'Samsung R&D recruits top AI/ML engineers. Role involves cutting-edge mobile platform and CV technologies.',
  },
  // 7 — LTTS: published
  {
    co: 'L&T Technology Services', title: 'LTTS Graduate Engineer Trainee — 2025',
    jobType: 'full-time', ctc: 5.0, stipend: 0,
    compensationDetails: 'CTC 5 LPA. India and global exposure on product engineering projects.',
    branches: [DEPARTMENTS[2], DEPARTMENTS[3], DEPARTMENTS[4]], minCgpa: 7.0, maxBacklogs: 0, min10: 65, min12: 65,
    tier: 2, vacancies: 6, status: 'published', deadline: daysFromNow(18),
    description: 'LTTS recruits engineers for embedded, mechanical and electrical engineering service lines.',
  },
  // 8 — BHEL: published
  {
    co: 'BHEL (Bharat Heavy Electricals Ltd)', title: 'BHEL Engineer Trainee (ET) Recruitment 2025',
    jobType: 'full-time', ctc: 6.5, stipend: 0,
    compensationDetails: 'E1 pay scale. Government job with PF, gratuity, medical, HRA benefits.',
    branches: ECE_EE, minCgpa: 6.5, maxBacklogs: 0, min10: 60, min12: 60,
    tier: 2, vacancies: 5, status: 'published', deadline: daysFromNow(25),
    description: 'BHEL ET campus drive. 1-year training before posting at BHEL plants across India.',
  },
  // 9 — L&T Construction: draft
  {
    co: 'Larsen & Toubro Construction', title: 'L&T Construction GET — Civil Engineering 2025',
    jobType: 'full-time', ctc: 5.5, stipend: 0,
    compensationDetails: 'CTC 5.5 LPA. Site postings across India and international projects.',
    branches: ME_CE, minCgpa: 6.5, maxBacklogs: 1, min10: 60, min12: 60,
    tier: 2, vacancies: 8, status: 'draft', deadline: daysFromNow(40),
    description: 'L&T Construction GET program. Exposure to mega infrastructure projects in buildings, metro and highways.',
  },
  // 10 — Deloitte: published (MBA)
  {
    co: 'Deloitte India', title: 'Deloitte Consulting — Business Analyst 2025',
    jobType: 'full-time', ctc: 7.5, stipend: 0,
    compensationDetails: 'CTC 7.5 LPA + performance-linked variable pay. Bangalore/Mumbai/Delhi office.',
    branches: MBA_ONLY, minCgpa: 7.5, maxBacklogs: 0, min10: 70, min12: 70,
    tier: 1, vacancies: 3, status: 'published', deadline: daysFromNow(14),
    description: 'Deloitte Consulting Business Analyst for MBA graduates working on strategy and transformation projects.',
  },
  // 11 — Tech Mahindra: internship, registration_open
  {
    co: 'Tech Mahindra', title: 'Tech Mahindra SMART Academy Internship 2025',
    jobType: 'internship', ctc: 0, stipend: 15000,
    compensationDetails: 'Stipend 15,000/month for 6 months. Pre-placement offer for top performers.',
    branches: CSE_IT_ECE, minCgpa: 6.5, maxBacklogs: 1, min10: 60, min12: 60,
    tier: 3, vacancies: 12, status: 'registration_open', deadline: daysFromNow(8),
    description: 'Tech Mahindra SMART Academy summer internship. Hands-on project work in digital technologies.',
  },
]

const drives = {}
for (const d of driveDefs) {
  const drive = await Drive.create({
    company: companies[d.co]._id,
    title: d.title,
    jobType: d.jobType,
    compensation: { ctcLpa: d.ctc, stipend: d.stipend, details: d.compensationDetails },
    eligibilityCriteria: { branches: d.branches, batches: [2025], minCgpa: d.minCgpa, maxBacklogs: d.maxBacklogs, min10th: d.min10, min12th: d.min12 },
    tier: d.tier,
    vacancies: d.vacancies,
    season: SEASON,
    status: d.status,
    registrationDeadline: d.deadline,
    description: d.description,
  })
  drives[d.title] = drive
}
console.log(driveDefs.length + ' drives created')

// =============================================================================
// E. ROUNDS & INFO SESSIONS
// =============================================================================
console.log('\nCreating rounds and info sessions...')

const tcsDrive = drives['TCS NQT — Software Engineer 2025 Batch']
const tcsR = await Round.insertMany([
  { drive: tcsDrive._id, roundNumber: 1, name: 'National Qualifier Test (NQT)', dateTime: daysFromNow(-50), mode: 'online', instructions: 'Aptitude test on TCS iON platform. 3 hours. Verbal, Reasoning, Quantitative, Coding.' },
  { drive: tcsDrive._id, roundNumber: 2, name: 'Technical Interview', dateTime: daysFromNow(-42), mode: 'online', meetingLink: 'https://meet.tcs.com/interview', instructions: 'Core CS fundamentals: DSA, DBMS, OS, OOPs.' },
  { drive: tcsDrive._id, roundNumber: 3, name: 'HR Interview', dateTime: daysFromNow(-38), mode: 'online', meetingLink: 'https://meet.tcs.com/hr', instructions: 'Career goals, situational questions. Formal dress code.' },
])

const infyDrive = drives['Infosys Systems Engineer — 2025 Batch']
const infyR = await Round.insertMany([
  { drive: infyDrive._id, roundNumber: 1, name: 'Online Aptitude Test', dateTime: daysFromNow(-35), mode: 'online', instructions: 'Pseudo code, Math, Reasoning — 2h 20m on InfyTQ platform.' },
  { drive: infyDrive._id, roundNumber: 2, name: 'HR Interview', dateTime: daysFromNow(-28), mode: 'online', instructions: 'Standard HR round focusing on communication and teamwork examples.' },
])

const wiproDrive = drives['Wipro National Talent Hunt — Software Engineer']
const wipro = await Round.insertMany([
  { drive: wiproDrive._id, roundNumber: 1, name: 'AMCAT + Coding Test', dateTime: daysFromNow(-18), mode: 'online', instructions: 'Adaptive test on AMCAT platform + 2 coding questions.' },
  { drive: wiproDrive._id, roundNumber: 2, name: 'Technical Interview', dateTime: daysFromNow(-3), mode: 'offline', venue: 'SKIT Seminar Hall 1', instructions: 'Face-to-face: Java/Python, DSA, DBMS.' },
  { drive: wiproDrive._id, roundNumber: 3, name: 'HR Interview', dateTime: daysFromNow(3), mode: 'offline', venue: 'SKIT Interview Room 2', instructions: 'Final HR round scheduled in 3 days.' },
])

const capgDrive = drives['Capgemini GET — Graduate Engineer Trainee 2025']
await Round.insertMany([
  { drive: capgDrive._id, roundNumber: 1, name: 'Aptitude + Technical Written', dateTime: daysFromNow(2), mode: 'online', instructions: '90 minutes. Verbal, quant, basic programming MCQs.' },
  { drive: capgDrive._id, roundNumber: 2, name: 'Technical + HR Interview', dateTime: daysFromNow(7), mode: 'online', instructions: 'Merged panel. 30 minutes per candidate.' },
])

const hclDrive = drives['HCL TechBee Fresh Graduate Programme']
await Round.insertMany([
  { drive: hclDrive._id, roundNumber: 1, name: 'Online Written Test', dateTime: daysFromNow(10), mode: 'online', instructions: 'HCL aptitude test. 1 hour 30 minutes.' },
  { drive: hclDrive._id, roundNumber: 2, name: 'HR Interview', dateTime: daysFromNow(18), mode: 'online', instructions: '15-minute HR discussion about background and aspirations.' },
])

// Info Session for Samsung drive
const samsungDrive = drives['Samsung Research — Software Engineer (AI/ML)']
await InfoSession.create({
  drive: samsungDrive._id,
  title: 'Samsung R&D Campus Orientation & PPT',
  dateTime: daysFromNow(5),
  mode: 'offline',
  venue: 'SKIT Auditorium, Main Block',
  presenter: 'Dr. Rajesh Srivastava, Principal Researcher, Samsung R&D',
  description: 'Pre-placement talk covering company culture, tech stacks, life at Samsung, and the selection process walkthrough.',
  isMandatory: true,
})

console.log('Rounds and info sessions created')

// =============================================================================
// F. APPLICATIONS
// =============================================================================
console.log('\nCreating applications...')

const getProfile = (roll) => studentUserMap[roll]?.profile

async function applyStudent(roll, drive, overallStatus, roundStatuses) {
  const profile = getProfile(roll)
  if (!profile) return null
  return Application.create({
    student: profile._id,
    drive: drive._id,
    resumeSnapshot: {
      label: 'General Resume',
      cloudinaryPublicId: 'demo/resume-' + roll,
      cloudinarySecureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/resumes/resume-' + roll + '.pdf',
      originalFilename: 'Resume_' + roll + '.pdf',
      fileSize: 180000,
      mimeType: 'application/pdf',
    },
    overallStatus,
    roundStatuses: roundStatuses || [],
  })
}

// TCS (results_declared) — 8 applicants
await Promise.all([
  applyStudent('B221001', tcsDrive, 'selected', [
    { round: tcsR[0]._id, status: 'cleared' }, { round: tcsR[1]._id, status: 'cleared' }, { round: tcsR[2]._id, status: 'cleared' },
  ]),
  applyStudent('B221002', tcsDrive, 'rejected', [
    { round: tcsR[0]._id, status: 'cleared' }, { round: tcsR[1]._id, status: 'not_cleared' },
  ]),
  applyStudent('B221003', tcsDrive, 'offer_accepted', [
    { round: tcsR[0]._id, status: 'cleared' }, { round: tcsR[1]._id, status: 'cleared' }, { round: tcsR[2]._id, status: 'cleared' },
  ]),
  applyStudent('B221005', tcsDrive, 'selected', [
    { round: tcsR[0]._id, status: 'cleared' }, { round: tcsR[1]._id, status: 'cleared' }, { round: tcsR[2]._id, status: 'cleared' },
  ]),
  applyStudent('B221101', tcsDrive, 'selected', [
    { round: tcsR[0]._id, status: 'cleared' }, { round: tcsR[1]._id, status: 'cleared' }, { round: tcsR[2]._id, status: 'cleared' },
  ]),
  applyStudent('B221102', tcsDrive, 'rejected', [{ round: tcsR[0]._id, status: 'not_cleared' }]),
  applyStudent('B221201', tcsDrive, 'selected', [
    { round: tcsR[0]._id, status: 'cleared' }, { round: tcsR[1]._id, status: 'cleared' }, { round: tcsR[2]._id, status: 'cleared' },
  ]),
  applyStudent('B221301', tcsDrive, 'withdrawn', []),
])

// Infosys (completed)
await Promise.all([
  applyStudent('B221001', infyDrive, 'selected', [
    { round: infyR[0]._id, status: 'cleared' }, { round: infyR[1]._id, status: 'cleared' },
  ]),
  applyStudent('B221004', infyDrive, 'rejected', [{ round: infyR[0]._id, status: 'not_cleared' }]),
  applyStudent('B221101', infyDrive, 'offer_accepted', [
    { round: infyR[0]._id, status: 'cleared' }, { round: infyR[1]._id, status: 'cleared' },
  ]),
  applyStudent('B221105', infyDrive, 'selected', [
    { round: infyR[0]._id, status: 'cleared' }, { round: infyR[1]._id, status: 'cleared' },
  ]),
  applyStudent('B221201', infyDrive, 'selected', [
    { round: infyR[0]._id, status: 'cleared' }, { round: infyR[1]._id, status: 'cleared' },
  ]),
  applyStudent('B221302', infyDrive, 'rejected', [
    { round: infyR[0]._id, status: 'cleared' }, { round: infyR[1]._id, status: 'not_cleared' },
  ]),
])

// Wipro (in_progress)
await Promise.all([
  applyStudent('B221001', wiproDrive, 'shortlisted', [
    { round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'cleared' }, { round: wipro[2]._id, status: 'pending' },
  ]),
  applyStudent('B221002', wiproDrive, 'shortlisted', [
    { round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'cleared' }, { round: wipro[2]._id, status: 'pending' },
  ]),
  applyStudent('B221005', wiproDrive, 'applied', [
    { round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' },
  ]),
  applyStudent('B221101', wiproDrive, 'applied', [
    { round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' },
  ]),
  applyStudent('B221102', wiproDrive, 'rejected', [{ round: wipro[0]._id, status: 'not_cleared' }]),
  applyStudent('B221202', wiproDrive, 'applied', [
    { round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' },
  ]),
  applyStudent('B221301', wiproDrive, 'applied', [
    { round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' },
  ]),
])

// HCL (registration_open) — a few applied
await Promise.all([
  applyStudent('B221004', hclDrive, 'applied', []),
  applyStudent('B221104', hclDrive, 'applied', []),
  applyStudent('B221204', hclDrive, 'applied', []),
  applyStudent('B221302', hclDrive, 'applied', []),
  applyStudent('B221402', hclDrive, 'applied', []),
])

// Tech Mahindra internship
const tmDrive = drives['Tech Mahindra SMART Academy Internship 2025']
await Promise.all([
  applyStudent('B221004', tmDrive, 'applied', []),
  applyStudent('B221104', tmDrive, 'applied', []),
  applyStudent('B221202', tmDrive, 'applied', []),
  applyStudent('B221204', tmDrive, 'applied', []),
])

console.log('Applications created')

// =============================================================================
// G. CONTACTS DIRECTORY (14 entries)
// =============================================================================
console.log('\nCreating contacts directory...')
await Contact.insertMany([
  { name: 'Prof. Arvind Kumar Sharma', role: 'Training & Placement Officer (TPO)', department: 'T&P Cell', email: 'tpo@skit.ac.in', phone: '0141-2785000' },
  { name: 'Ms. Reema Mathur', role: 'Assistant Placement Coordinator', department: 'T&P Cell', email: 'placement@skit.ac.in', phone: '0141-2785001' },
  { name: 'Prof. Rajesh Sharma', role: 'Department Placement Coordinator', department: 'Computer Science & Engineering', email: 'coord.cse@skit.ac.in', phone: '9876543201' },
  { name: 'Dr. Sunita Agarwal', role: 'Department Placement Coordinator', department: 'Information Technology', email: 'coord.it@skit.ac.in', phone: '9876543202' },
  { name: 'Prof. Vikram Singh', role: 'Department Placement Coordinator', department: 'Electronics & Communication Engineering', email: 'coord.ece@skit.ac.in', phone: '9876543203' },
  { name: 'Dr. Priya Meena', role: 'Department Placement Coordinator', department: 'Electrical Engineering', email: 'coord.ee@skit.ac.in', phone: '9876543204' },
  { name: 'Prof. Ankit Joshi', role: 'Department Placement Coordinator', department: 'Mechanical Engineering', email: 'coord.me@skit.ac.in', phone: '9876543205' },
  { name: 'Dr. Kavita Sharma', role: 'Department Placement Coordinator', department: 'Civil Engineering', email: 'coord.ce@skit.ac.in', phone: '9876543206' },
  { name: 'Prof. Deepak Mathur', role: 'Department Placement Coordinator', department: 'Management Studies', email: 'coord.mba@skit.ac.in', phone: '9876543207' },
  { name: 'Dr. Alka Gupta', role: 'Department Placement Coordinator', department: 'Basic Sciences & Humanities', email: 'coord.bsh@skit.ac.in', phone: '9876543208' },
  { name: 'Priya Kapoor', role: 'Campus Recruiter', department: 'Infosys Limited', email: 'priya.kapoor@infosys.com', phone: '9980165432' },
  { name: 'Ramesh Iyer', role: 'HR Manager - Campus', department: 'Tata Consultancy Services', email: 'ramesh.iyer@tcs.com', phone: '9987654321' },
  { name: 'Divya Krishnan', role: 'University Relations Manager', department: 'Samsung R&D Institute', email: 'divya.k@samsung.com', phone: '9654321098' },
  { name: 'Ritu Mehta', role: 'Campus Recruitment Lead', department: 'Deloitte India', email: 'ritu.mehta@deloitte.com', phone: '9321098765' },
])
console.log('14 contacts created')

// =============================================================================
// H. ANNOUNCEMENTS (6)
// =============================================================================
console.log('\nCreating announcements...')
await Announcement.insertMany([
  {
    title: 'Placement Season 2024-25 Officially Open',
    body: 'Dear Students,\n\nThe T&P Cell is pleased to announce the commencement of Placement Season 2024-25. We have received expressions of interest from 40+ companies this season.\n\nAll eligible students must:\n1. Complete their profile on the PCMS portal by October 15, 2024.\n2. Upload a current resume and run the ATS checklist.\n3. Read and acknowledge the Placement Rules & Regulations.\n\nFull placement calendar and drive schedule will be published weekly.\n\n— T&P Cell, SKIT',
    category: 'urgent', isPinned: true, postedBy: tpoUser._id, expiresAt: null,
  },
  {
    title: 'TCS NQT Results Declared — Congratulations!',
    body: 'TCS has shared the final results for the NQT drive. 5 students from SKIT have been selected for the Systems Engineer role.\n\nSelected students will receive offer letters via email within 2 business days. Please check your registered email.',
    category: 'drive_specific', isPinned: false, postedBy: tpoUser._id, expiresAt: null,
  },
  {
    title: 'Mandatory: Policy Acknowledgment Before Applying',
    body: 'All students must read and digitally acknowledge the Placement Rules & Regulations before applying to any drive. This includes the One-Offer policy, Tier upgrade rules, Offer acceptance deadline (72 hours), and Blacklisting conditions.\n\nGo to Rules & Regulations in the portal menu to acknowledge.',
    category: 'urgent', isPinned: true, postedBy: tpoUser._id, expiresAt: daysFromNow(60),
  },
  {
    title: 'Samsung R&D PPT — Mandatory Attendance (CSE/IT Students)',
    body: 'Samsung R&D Institute will conduct a Pre-Placement Talk at SKIT Auditorium. Attendance is mandatory for CSE and IT students wishing to apply for the Samsung Software Engineer (AI/ML) role.\n\nDate: ' + daysFromNow(5).toDateString() + '\nVenue: SKIT Auditorium, Main Block\nTime: 10:00 AM — 12:00 PM',
    category: 'drive_specific', departmentScope: 'Computer Science & Engineering', isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(5),
  },
  {
    title: 'BHEL Engineer Trainee Drive Open — ECE & EE Students',
    body: 'BHEL will be conducting a campus drive for Engineer Trainee positions (Government PSU with excellent benefits). Eligible: ECE and EE students with CGPA >= 6.5 and no backlogs.\n\nRegistration deadline: ' + daysFromNow(25).toDateString(),
    category: 'drive_specific', isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(25),
  },
  {
    title: 'Resume Upload Deadline — November 1, 2024',
    body: 'All students must upload their latest resume on the PCMS portal by November 1, 2024. Ensure your resume is in PDF format, under 2MB, scores >= 70 on the ATS Checklist, and is clearly labelled. Use the Resume Checklist tool in your profile to self-evaluate.',
    category: 'general', isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(30),
  },
])
console.log('6 announcements created')

// =============================================================================
// I. FAQ (10 entries)
// =============================================================================
console.log('\nCreating FAQ entries...')
await FAQ.insertMany([
  {
    question: 'How does the One-Offer Rule work?',
    answer: 'Once you accept an offer, you are "placed" for the current season. You can only apply to drives at a strictly higher tier than your accepted offer (lower tier number = better). You cannot apply to same-tier or lower-tier drives after being placed.',
    category: 'Placement Policy', tags: ['one-offer', 'policy', 'tier'], isPublished: true,
  },
  {
    question: 'What is the Tier system for drives?',
    answer: 'Tier 1: CTC > 10 LPA. Tier 2: 6-10 LPA. Tier 3: 3.5-6 LPA. Tier 4: 2.5-3.5 LPA. Tier 5: Below 2.5 LPA or stipend-based internships. Tier-Lock ensures placed students can only upgrade their offer.',
    category: 'Placement Policy', tags: ['tier', 'ctc', 'policy'], isPublished: true,
  },
  {
    question: 'I applied to a drive but my CGPA dropped — what happens?',
    answer: 'Eligibility is evaluated at the time of application. If your CGPA drops after submitting, your existing application is not retroactively invalidated. However, if you have not yet applied and your CGPA falls below minimum criteria, you will be shown as ineligible.',
    category: 'Eligibility', tags: ['cgpa', 'eligibility', 'application'], isPublished: true,
  },
  {
    question: 'Can I withdraw my application from a drive?',
    answer: 'Yes, before the drive\'s registration deadline. After the deadline, withdrawals are not permitted. Withdrawing does not affect your placed/unplaced status. Go to My Applications and click "Withdraw."',
    category: 'Applications', tags: ['withdraw', 'application', 'deadline'], isPublished: true,
  },
  {
    question: 'How do I get my activation link for first-time login?',
    answer: 'The T&P Cell provisions your account via the student import process. You will receive a temporary password on your registered institute email. Go to /activate, enter your email and the temporary password, then set a new password.',
    category: 'Account & Login', tags: ['activation', 'login', 'password', 'new student'], isPublished: true,
  },
  {
    question: 'I did not receive the OTP for login. What should I do?',
    answer: 'Check your spam/junk folder for emails from noreply@pcms.skit.ac.in. Wait 60 seconds and use "Resend OTP." Ensure the email matches your registered institute email. If the problem persists, contact your department coordinator.',
    category: 'Account & Login', tags: ['otp', 'login', 'email'], isPublished: true,
  },
  {
    question: 'How does the Resume ATS Checker work?',
    answer: 'The Resume Checklist analyzes your PDF against 13 automated checks: (1) Contact Info — email, phone, LinkedIn, GitHub; (2) Key Sections — Education, Skills, Experience, Projects, Certifications, Achievements; (3) Formatting — PDF, 1-2 pages, professional filename. Score 0-100. Aim for 80+ before applying.',
    category: 'Resume', tags: ['resume', 'ats', 'checklist', 'score'], isPublished: true,
  },
  {
    question: 'What happens if I miss an interview round?',
    answer: 'If shortlisted but absent without prior notice (24+ hours in advance), your application is marked "Absent." Three absent marks in a season may result in blacklisting. Always communicate unavailability to the T&P Cell.',
    category: 'Placement Policy', tags: ['absent', 'interview', 'blacklist', 'no-show'], isPublished: true,
  },
  {
    question: 'How do I accept or decline an offer?',
    answer: 'When an offer is issued, you receive an in-app notification and email. Go to My Applications, find the "Offer Issued" drive, and click "View Offer." Review carefully, then click Accept or Decline. You have 72 hours from issuance to respond — after that, the offer expires automatically.',
    category: 'Applications', tags: ['offer', 'accept', 'decline', 'deadline'], isPublished: true,
  },
  {
    question: 'Can a coordinator see my profile from another department?',
    answer: 'No. Department coordinators are strictly scoped to their own department. A CSE coordinator can only see CSE students and drives. Cross-department data is only visible to the TPO (Super Admin).',
    category: 'Privacy & Security', tags: ['coordinator', 'department', 'privacy', 'scope'], isPublished: true,
  },
])
console.log('10 FAQ entries created')

// =============================================================================
// J. PLACEMENT RULES PAGE
// =============================================================================
console.log('\nCreating placement rules page...')
await RulesPage.create({
  content: `# SKIT Placement Rules & Regulations — Season 2024-25

These rules are binding for all students participating in campus placement activities organized by the Training & Placement (T&P) Cell, SKIT.

## 1. Eligibility

1.1 Students must have no active backlogs at the time of applying for any drive.
1.2 Students on academic probation are not eligible for placement drives.
1.3 Only Batch 2025 students are eligible for full-time placement drives in Season 2024-25.

## 2. One-Offer Rule

2.1 Once a student has accepted an offer from any company, they are considered "placed" for the current placement season.
2.2 A placed student may only apply to drives from a strictly higher tier than their current accepted offer.
2.3 A placed student cannot apply to drives at the same tier or a lower tier.

## 3. Offer Acceptance

3.1 Students must accept or decline offers within 72 hours of issuance.
3.2 Offers not responded to within the deadline are automatically expired.
3.3 Accepting an offer and subsequently reneging without prior T&P Cell approval may result in blacklisting.

## 4. Interview Conduct & Attendance

4.1 Shortlisted students must attend all scheduled interview rounds.
4.2 Non-attendance without prior written notice (at least 24 hours in advance) will be marked "Absent."
4.3 Three absent marks in a single placement season will result in temporary suspension.
4.4 Impersonation, plagiarism in aptitude tests, or misrepresentation of credentials is grounds for immediate disqualification.

## 5. Communication

5.1 All official placement communications are posted on this portal and sent to registered institute emails.
5.2 Students are responsible for regularly checking their institute email and portal notifications.
5.3 Queries must be directed to the department coordinator or T&P Cell — not directly to company HR contacts.

## 6. Data Accuracy

6.1 Students are responsible for maintaining accurate academic data (CGPA, backlogs, 10th/12th %) on their profile.
6.2 Misrepresentation of academic data is a serious violation and will result in disqualification.

## 7. Blacklisting

7.1 Blacklisting may result from: offer reneging, three or more no-shows, misrepresentation of credentials, or misconduct during interviews.
7.2 Blacklisting decisions are made by the TPO and are subject to institutional appeal procedures.

---

*Last updated: October 2024 | Version 1 | T&P Cell, SKIT, Jaipur*`,
  version: 1,
  editor: tpoUser._id,
  editedAt: daysFromNow(-20),
})
console.log('Placement rules page created')

// =============================================================================
// DISCONNECT & SUMMARY
// =============================================================================
await mongoose.disconnect()

console.log(`
=================================================================
  SKIT PCMS Demo Seed Complete — Season ${SEASON}
=================================================================

 ACCOUNTS CREATED
 ----------------
 Role         Email                     Password
 TPO          tpo@skit.ac.in            Tpo@1234
 Coordinator  coord.cse@skit.ac.in      Coord@1234 (all 8 depts)
 Student      b221001@skit.ac.in        Student@1234 (all 40)

 DEMO DATA
 ---------
   12  companies (IT, Engineering, PSU, Consulting)
   11  drives (draft → results_declared)
   40  students across all 8 SKIT departments
    8  coordinators (one per department)
   Realistic applications with round statuses (TCS, Infosys, Wipro, HCL, TM)
    6  announcements (pinned urgent + drive-specific)
   10  FAQ entries
   14  contacts directory entries
    1  Placement Rules & Regulations (Version 1)
    1  Season config 2024-25

 HOW TO EXPLORE
 --------------
  1. TPO        → tpo@skit.ac.in         | Full stats, all drives, audit log
  2. Coordinator → coord.cse@skit.ac.in  | CSE-only scoped view
  3. Student     → b221001@skit.ac.in    | Browse drives, my applications

  URL: http://localhost:5173/login
=================================================================
`)

