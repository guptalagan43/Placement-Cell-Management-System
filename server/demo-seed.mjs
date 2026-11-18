/**
 * demo-seed.mjs — Phase 67: Detailed Demo Seed Data
 *
 * Creates a fully-populated, detailed demo database for SKIT PCMS.
 * Covers all 8 departments, 20 companies, 15 drives at various lifecycle
 * stages, 50 students with rich profiles (certifications, projects, resumes,
 * semester CGPA), applications, offer letters, notifications, audit logs,
 * resume checks, announcements, FAQs, and contacts.
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
  OfferLetter,
  SeasonConfig,
  Announcement,
  FAQ,
  Contact,
  RulesPage,
  Notification,
  AuditLog,
  ResumeCheck,
] = await Promise.all([
  import('./src/models/User.model.js').then((m) => m.default),
  import('./src/models/StudentProfile.model.js').then((m) => m.default),
  import('./src/models/Company.model.js').then((m) => m.default),
  import('./src/models/Drive.model.js').then((m) => m.default),
  import('./src/models/Round.model.js').then((m) => m.default),
  import('./src/models/InfoSession.model.js').then((m) => m.default),
  import('./src/models/Application.model.js').then((m) => m.default),
  import('./src/models/OfferLetter.model.js').then((m) => m.default),
  import('./src/models/SeasonConfig.model.js').then((m) => m.default),
  import('./src/models/Announcement.model.js').then((m) => m.default),
  import('./src/models/FAQ.model.js').then((m) => m.default),
  import('./src/models/Contact.model.js').then((m) => m.default),
  import('./src/models/RulesPage.model.js').then((m) => m.default),
  import('./src/models/Notification.model.js').then((m) => m.default),
  import('./src/models/AuditLog.model.js').then((m) => m.default),
  import('./src/models/ResumeCheck.model.js').then((m) => m.default),
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
  OfferLetter.deleteMany({}),
  SeasonConfig.deleteMany({}),
  Announcement.deleteMany({}),
  FAQ.deleteMany({}),
  Contact.deleteMany({}),
  RulesPage.deleteMany({}),
  Notification.deleteMany({}),
  // AuditLog uses deleteMany protection — bypass via collection
  mongoose.connection.collection('auditlogs').deleteMany({}),
  ResumeCheck.deleteMany({}),
])
console.log('All collections cleared\n')

// ── 5. Helpers ────────────────────────────────────────────────────────────────
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

const daysAgo = (n) => daysFromNow(-n)

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
// B. USERS — 1 TPO + 8 Coordinators + 50 Students
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
const coordDefs = [
  { email: 'coord.cse@skit.ac.in',  name: 'Prof. Rajesh Sharma',   dept: DEPARTMENTS[0] },
  { email: 'coord.it@skit.ac.in',   name: 'Dr. Sunita Agarwal',    dept: DEPARTMENTS[1] },
  { email: 'coord.ece@skit.ac.in',  name: 'Prof. Vikram Singh',     dept: DEPARTMENTS[2] },
  { email: 'coord.ee@skit.ac.in',   name: 'Dr. Priya Meena',        dept: DEPARTMENTS[3] },
  { email: 'coord.me@skit.ac.in',   name: 'Prof. Ankit Joshi',      dept: DEPARTMENTS[4] },
  { email: 'coord.ce@skit.ac.in',   name: 'Dr. Kavita Sharma',      dept: DEPARTMENTS[5] },
  { email: 'coord.mba@skit.ac.in',  name: 'Prof. Deepak Mathur',    dept: DEPARTMENTS[6] },
  { email: 'coord.bsh@skit.ac.in',  name: 'Dr. Alka Gupta',         dept: DEPARTMENTS[7] },
]
const coordUsers = {}
for (const c of coordDefs) {
  const u = new User({ email: c.email, role: 'coordinator', department: c.dept, active: true, mustResetPassword: false })
  u.password = 'Coord@1234'
  await u.save()
  coordUsers[c.dept] = u
}
console.log('8 coordinator accounts created | Coord@1234')

// Students — 50 total (6-7 per dept) with rich academic profiles
const studentDefs = [
  // ── CSE (7 students) ──────────────────────────────────────────────────────
  {
    email: 'b221001@skit.ac.in', roll: 'B221001', name: 'Aarav Sharma',
    branch: DEPARTMENTS[0], batch: 2025, cgpa: 8.7, sem: [8.2,8.5,8.8,8.9,8.7,8.9,8.6,8.8],
    backlogs: 0, ten: 92, twelve: 88, gender: 'male', dob: '2002-03-15',
    phone: '9876543201', linkedin: 'linkedin.com/in/aarav-sharma-cse',
    github: 'github.com/aarav-sharma', placed: false, city: 'Jaipur',
    skills: ['Java', 'Spring Boot', 'React', 'SQL', 'Microservices', 'Docker'],
    certs: [
      { name: 'AWS Certified Developer Associate', issuer: 'Amazon Web Services', year: 2024, url: 'https://aws.amazon.com/verify/cert001' },
      { name: 'Oracle Certified Java SE 11 Developer', issuer: 'Oracle', year: 2023, url: 'https://oracle.com/verify/java001' },
    ],
    projects: [
      { title: 'Campus Placement Portal', description: 'Full-stack MERN web application for managing college placement activities including drives, applications, and analytics.', tech: ['React', 'Node.js', 'MongoDB', 'Express'], link: 'https://github.com/aarav-sharma/placement-portal' },
      { title: 'Smart Traffic Management System', description: 'IoT-based traffic management system using Raspberry Pi and Python to optimize signal timings based on real-time vehicle count.', tech: ['Python', 'Raspberry Pi', 'OpenCV', 'Flask'], link: 'https://github.com/aarav-sharma/smart-traffic' },
    ],
  },
  {
    email: 'b221002@skit.ac.in', roll: 'B221002', name: 'Priya Verma',
    branch: DEPARTMENTS[0], batch: 2025, cgpa: 7.2, sem: [6.8,7.0,7.2,7.5,7.1,7.3,7.4,7.2],
    backlogs: 1, ten: 78, twelve: 72, gender: 'female', dob: '2002-07-22',
    phone: '9876543202', linkedin: 'linkedin.com/in/priya-verma-cse',
    github: 'github.com/priya-verma-dev', placed: false, city: 'Jaipur',
    skills: ['Python', 'Django', 'MySQL', 'REST APIs', 'Git'],
    certs: [
      { name: 'Python for Data Science', issuer: 'Coursera / IBM', year: 2024, url: 'https://coursera.org/verify/pyds001' },
    ],
    projects: [
      { title: 'Library Management System', description: 'Web-based library system built with Django to manage book issuance, returns, and fine calculation.', tech: ['Python', 'Django', 'SQLite', 'Bootstrap'], link: 'https://github.com/priya-verma-dev/library-mgmt' },
    ],
  },
  {
    email: 'b221003@skit.ac.in', roll: 'B221003', name: 'Rohan Gupta',
    branch: DEPARTMENTS[0], batch: 2025, cgpa: 9.1, sem: [8.9,9.0,9.2,9.1,9.3,9.1,9.0,9.2],
    backlogs: 0, ten: 95, twelve: 93, gender: 'male', dob: '2002-01-10',
    phone: '9876543203', linkedin: 'linkedin.com/in/rohan-gupta-ml',
    github: 'github.com/rohan-gupta-ml', placed: true, city: 'Delhi',
    skills: ['C++', 'DSA', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Python', 'LeetCode 500+'],
    certs: [
      { name: 'Deep Learning Specialization', issuer: 'deeplearning.ai / Coursera', year: 2024, url: 'https://coursera.org/verify/dl001' },
      { name: 'Google Associate Cloud Engineer', issuer: 'Google Cloud', year: 2023, url: 'https://google.com/verify/ace001' },
    ],
    projects: [
      { title: 'Real-Time Object Detection System', description: 'Deployed YOLO-based real-time object detection pipeline on edge devices for retail analytics.', tech: ['Python', 'YOLOv8', 'TensorFlow', 'OpenCV', 'Flask'], link: 'https://github.com/rohan-gupta-ml/yolo-retail' },
      { title: 'Sentiment Analysis API', description: 'Production NLP API for multi-language sentiment analysis using transformer models, serving 10K+ requests/day.', tech: ['Python', 'HuggingFace', 'FastAPI', 'Docker', 'AWS'], link: 'https://github.com/rohan-gupta-ml/sentiment-api' },
    ],
  },
  {
    email: 'b221004@skit.ac.in', roll: 'B221004', name: 'Sneha Jain',
    branch: DEPARTMENTS[0], batch: 2025, cgpa: 6.8, sem: [6.5,6.7,6.8,7.0,6.6,6.9,6.8,6.9],
    backlogs: 2, ten: 70, twelve: 68, gender: 'female', dob: '2002-11-05',
    phone: '9876543204', linkedin: 'linkedin.com/in/sneha-jain-dev',
    github: 'github.com/sneha-jain', placed: false, city: 'Jaipur',
    skills: ['JavaScript', 'Node.js', 'MongoDB', 'Express', 'HTML', 'CSS'],
    certs: [],
    projects: [
      { title: 'E-Commerce Website', description: 'Basic e-commerce website with product listing, cart, and checkout built with MERN stack.', tech: ['React', 'Node.js', 'MongoDB'], link: 'https://github.com/sneha-jain/ecommerce' },
    ],
  },
  {
    email: 'b221005@skit.ac.in', roll: 'B221005', name: 'Arjun Meena',
    branch: DEPARTMENTS[0], batch: 2025, cgpa: 8.0, sem: [7.6,7.8,8.0,8.2,7.9,8.1,8.0,8.2],
    backlogs: 0, ten: 84, twelve: 82, gender: 'male', dob: '2002-05-18',
    phone: '9876543205', linkedin: 'linkedin.com/in/arjun-meena-devops',
    github: 'github.com/arjun-meena', placed: false, city: 'Ajmer',
    skills: ['Go', 'Microservices', 'Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Terraform'],
    certs: [
      { name: 'Certified Kubernetes Application Developer', issuer: 'CNCF', year: 2024, url: 'https://cncf.io/verify/ckad001' },
    ],
    projects: [
      { title: 'Microservices E-Commerce Platform', description: 'Fully containerized e-commerce platform with 8 microservices orchestrated via Kubernetes. Includes CI/CD pipeline.', tech: ['Go', 'Docker', 'Kubernetes', 'Istio', 'PostgreSQL', 'Kafka'], link: 'https://github.com/arjun-meena/micro-commerce' },
    ],
  },
  {
    email: 'b221006@skit.ac.in', roll: 'B221006', name: 'Kavya Patel',
    branch: DEPARTMENTS[0], batch: 2025, cgpa: 7.5, sem: [7.1,7.3,7.5,7.7,7.4,7.6,7.5,7.6],
    backlogs: 0, ten: 82, twelve: 79, gender: 'female', dob: '2002-09-28',
    phone: '9876543206', linkedin: 'linkedin.com/in/kavya-patel-fullstack',
    github: 'github.com/kavya-patel', placed: false, city: 'Jaipur',
    skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS', 'GraphQL', 'PostgreSQL'],
    certs: [
      { name: 'Meta Front-End Developer', issuer: 'Meta / Coursera', year: 2024, url: 'https://coursera.org/verify/meta001' },
    ],
    projects: [
      { title: 'Job Board Platform', description: 'Full-stack job board with real-time search, resume parser, and employer dashboard built with Next.js and GraphQL.', tech: ['Next.js', 'TypeScript', 'GraphQL', 'PostgreSQL', 'TailwindCSS'], link: 'https://github.com/kavya-patel/job-board' },
    ],
  },
  {
    email: 'b221007@skit.ac.in', roll: 'B221007', name: 'Dev Rathore',
    branch: DEPARTMENTS[0], batch: 2025, cgpa: 8.3, sem: [8.0,8.2,8.4,8.5,8.2,8.4,8.3,8.4],
    backlogs: 0, ten: 88, twelve: 85, gender: 'male', dob: '2002-04-02',
    phone: '9876543207', linkedin: 'linkedin.com/in/dev-rathore-android',
    github: 'github.com/dev-rathore', placed: false, city: 'Kota',
    skills: ['Android', 'Kotlin', 'Jetpack Compose', 'Firebase', 'REST APIs', 'Room DB'],
    certs: [
      { name: 'Associate Android Developer', issuer: 'Google', year: 2024, url: 'https://google.com/verify/aad001' },
    ],
    projects: [
      { title: 'Campus Connect App', description: 'Android app for campus resource sharing with 2000+ downloads on Play Store. Features real-time chat, file sharing, and event calendar.', tech: ['Kotlin', 'Jetpack Compose', 'Firebase', 'Room DB'], link: 'https://play.google.com/store/apps/campus-connect' },
    ],
  },

  // ── IT (6 students) ───────────────────────────────────────────────────────
  {
    email: 'b221101@skit.ac.in', roll: 'B221101', name: 'Riya Agarwal',
    branch: DEPARTMENTS[1], batch: 2025, cgpa: 8.4, sem: [8.0,8.2,8.4,8.6,8.3,8.5,8.4,8.6],
    backlogs: 0, ten: 89, twelve: 85, gender: 'female', dob: '2002-06-14',
    phone: '9876543211', linkedin: 'linkedin.com/in/riya-agarwal-it',
    github: 'github.com/riya-agarwal', placed: false, city: 'Jaipur',
    skills: ['React', 'Angular', 'TypeScript', 'AWS', 'Node.js', 'MongoDB'],
    certs: [
      { name: 'AWS Solutions Architect Associate', issuer: 'Amazon Web Services', year: 2024, url: 'https://aws.amazon.com/verify/saa001' },
    ],
    projects: [
      { title: 'CloudStore - File Management App', description: 'AWS S3-backed file management application with role-based access, versioning, and sharing. Deployed on EC2 with auto-scaling.', tech: ['React', 'Node.js', 'AWS S3', 'AWS EC2', 'DynamoDB'], link: 'https://github.com/riya-agarwal/cloudstore' },
    ],
  },
  {
    email: 'b221102@skit.ac.in', roll: 'B221102', name: 'Harsh Bansal',
    branch: DEPARTMENTS[1], batch: 2025, cgpa: 7.5, sem: [7.1,7.3,7.5,7.7,7.4,7.6,7.5,7.6],
    backlogs: 0, ten: 81, twelve: 77, gender: 'male', dob: '2002-10-30',
    phone: '9876543212', linkedin: 'linkedin.com/in/harsh-bansal-php',
    github: 'github.com/harsh-bansal', placed: false, city: 'Jaipur',
    skills: ['PHP', 'Laravel', 'Vue.js', 'MySQL', 'REST APIs'],
    certs: [],
    projects: [
      { title: 'Hotel Management System', description: 'Full-featured hotel management web app with booking, billing, staff management and reporting modules.', tech: ['PHP', 'Laravel', 'Vue.js', 'MySQL'], link: 'https://github.com/harsh-bansal/hotel-mgmt' },
    ],
  },
  {
    email: 'b221103@skit.ac.in', roll: 'B221103', name: 'Anjali Saxena',
    branch: DEPARTMENTS[1], batch: 2025, cgpa: 9.3, sem: [9.0,9.2,9.4,9.5,9.2,9.4,9.3,9.5],
    backlogs: 0, ten: 97, twelve: 95, gender: 'female', dob: '2002-02-08',
    phone: '9876543213', linkedin: 'linkedin.com/in/anjali-saxena-data',
    github: 'github.com/anjali-saxena-ds', placed: true, city: 'Jaipur',
    skills: ['Data Science', 'Python', 'Pandas', 'Power BI', 'SQL', 'Tableau', 'Machine Learning'],
    certs: [
      { name: 'IBM Data Science Professional Certificate', issuer: 'IBM / Coursera', year: 2023, url: 'https://coursera.org/verify/ibm-ds001' },
      { name: 'Microsoft Power BI Data Analyst', issuer: 'Microsoft', year: 2024, url: 'https://microsoft.com/verify/pbi001' },
    ],
    projects: [
      { title: 'Placement Analytics Dashboard', description: 'Interactive Power BI dashboard analyzing 5-year placement trends across SKIT departments. Used by T&P Cell for NAAC reporting.', tech: ['Power BI', 'Python', 'SQL Server', 'Excel'], link: 'https://github.com/anjali-saxena-ds/placement-analytics' },
      { title: 'Crop Disease Detection', description: 'CNN-based mobile app for detecting crop diseases from leaf images with 92% accuracy, deployed for 500+ farmers in Rajasthan.', tech: ['Python', 'TensorFlow', 'Flask', 'React Native'], link: 'https://github.com/anjali-saxena-ds/crop-disease' },
    ],
  },
  {
    email: 'b221104@skit.ac.in', roll: 'B221104', name: 'Nikhil Yadav',
    branch: DEPARTMENTS[1], batch: 2025, cgpa: 6.5, sem: [6.2,6.4,6.5,6.7,6.3,6.6,6.5,6.6],
    backlogs: 2, ten: 65, twelve: 61, gender: 'male', dob: '2002-08-19',
    phone: '9876543214', linkedin: 'linkedin.com/in/nikhil-yadav-web',
    github: 'github.com/nikhil-yadav', placed: false, city: 'Sikar',
    skills: ['HTML', 'CSS', 'JavaScript', 'Bootstrap', 'jQuery'],
    certs: [],
    projects: [
      { title: 'Portfolio Website', description: 'Personal portfolio website with animations and contact form.', tech: ['HTML', 'CSS', 'JavaScript'], link: 'https://nikhil-yadav.github.io' },
    ],
  },
  {
    email: 'b221105@skit.ac.in', roll: 'B221105', name: 'Tanvi Sharma',
    branch: DEPARTMENTS[1], batch: 2025, cgpa: 7.9, sem: [7.5,7.7,7.9,8.1,7.8,8.0,7.9,8.0],
    backlogs: 0, ten: 83, twelve: 80, gender: 'female', dob: '2002-12-25',
    phone: '9876543215', linkedin: 'linkedin.com/in/tanvi-sharma-security',
    github: 'github.com/tanvi-sharma', placed: false, city: 'Jaipur',
    skills: ['Cybersecurity', 'Linux', 'Networking', 'Wireshark', 'Ethical Hacking', 'Python'],
    certs: [
      { name: 'CompTIA Security+', issuer: 'CompTIA', year: 2024, url: 'https://comptia.org/verify/sec001' },
    ],
    projects: [
      { title: 'Network Intrusion Detection System', description: 'ML-based IDS that detects anomalous network traffic patterns with 95% accuracy using the KDD Cup dataset.', tech: ['Python', 'Scikit-learn', 'Wireshark', 'Scapy'], link: 'https://github.com/tanvi-sharma/nids' },
    ],
  },
  {
    email: 'b221106@skit.ac.in', roll: 'B221106', name: 'Kartik Gupta',
    branch: DEPARTMENTS[1], batch: 2025, cgpa: 8.1, sem: [7.8,8.0,8.1,8.3,8.0,8.2,8.1,8.2],
    backlogs: 0, ten: 86, twelve: 83, gender: 'male', dob: '2002-07-07',
    phone: '9876543216', linkedin: 'linkedin.com/in/kartik-gupta-blockchain',
    github: 'github.com/kartik-gupta', placed: false, city: 'Jaipur',
    skills: ['Blockchain', 'Solidity', 'Web3.js', 'React', 'Node.js', 'Ethereum'],
    certs: [
      { name: 'Certified Blockchain Developer', issuer: 'Blockchain Council', year: 2024, url: 'https://blockchain-council.org/verify/cbd001' },
    ],
    projects: [
      { title: 'DecentralVote — Blockchain Voting', description: 'Tamper-proof voting system on Ethereum blockchain with transparent result verification. Used in SKIT student elections.', tech: ['Solidity', 'Web3.js', 'React', 'Hardhat', 'IPFS'], link: 'https://github.com/kartik-gupta/decentral-vote' },
    ],
  },

  // ── ECE (6 students) ──────────────────────────────────────────────────────
  {
    email: 'b221201@skit.ac.in', roll: 'B221201', name: 'Rahul Verma',
    branch: DEPARTMENTS[2], batch: 2025, cgpa: 8.2, sem: [7.9,8.1,8.2,8.4,8.1,8.3,8.2,8.3],
    backlogs: 0, ten: 88, twelve: 84, gender: 'male', dob: '2002-04-20',
    phone: '9876543221', linkedin: 'linkedin.com/in/rahul-verma-vlsi',
    github: 'github.com/rahul-verma-vlsi', placed: false, city: 'Jaipur',
    skills: ['VLSI', 'Embedded C', 'MATLAB', 'Verilog', 'FPGA', 'Signal Processing'],
    certs: [
      { name: 'VLSI Design and Verification', issuer: 'NPTEL IIT Madras', year: 2024, url: 'https://nptel.ac.in/verify/vlsi001' },
    ],
    projects: [
      { title: '4-bit ALU on FPGA', description: 'Fully functional 4-bit ALU designed in Verilog and implemented on Xilinx Spartan 7 FPGA with comprehensive testbench.', tech: ['Verilog', 'FPGA', 'ModelSim', 'Xilinx Vivado'], link: 'https://github.com/rahul-verma-vlsi/alu-fpga' },
      { title: 'Smart Home Automation', description: 'IoT-based home automation system controlling 20 devices via mobile app. Uses ESP32 and MQTT protocol.', tech: ['Embedded C', 'ESP32', 'MQTT', 'React Native', 'Firebase'], link: 'https://github.com/rahul-verma-vlsi/smart-home' },
    ],
  },
  {
    email: 'b221202@skit.ac.in', roll: 'B221202', name: 'Pooja Singh',
    branch: DEPARTMENTS[2], batch: 2025, cgpa: 7.0, sem: [6.6,6.8,7.0,7.2,6.9,7.1,7.0,7.1],
    backlogs: 1, ten: 75, twelve: 70, gender: 'female', dob: '2002-09-15',
    phone: '9876543222', linkedin: 'linkedin.com/in/pooja-singh-iot',
    github: 'github.com/pooja-singh-ece', placed: false, city: 'Jaipur',
    skills: ['PCB Design', 'Arduino', 'Raspberry Pi', 'IoT', 'Python'],
    certs: [],
    projects: [
      { title: 'Air Quality Monitoring System', description: 'IoT device for monitoring PM2.5, CO2, and temperature in real time, sending alerts via SMS when levels exceed thresholds.', tech: ['Arduino', 'Python', 'Sensors', 'Raspberry Pi', 'Twilio API'], link: 'https://github.com/pooja-singh-ece/air-quality' },
    ],
  },
  {
    email: 'b221203@skit.ac.in', roll: 'B221203', name: 'Amit Sharma',
    branch: DEPARTMENTS[2], batch: 2025, cgpa: 8.8, sem: [8.5,8.7,8.8,9.0,8.7,8.9,8.8,9.0],
    backlogs: 0, ten: 91, twelve: 89, gender: 'male', dob: '2002-01-25',
    phone: '9876543223', linkedin: 'linkedin.com/in/amit-sharma-fpga',
    github: 'github.com/amit-sharma-ece', placed: true, city: 'Jaipur',
    skills: ['Signal Processing', 'FPGA', 'Verilog', 'MATLAB', 'DSP', '5G'],
    certs: [
      { name: 'Digital Signal Processing', issuer: 'NPTEL IIT Kharagpur', year: 2023, url: 'https://nptel.ac.in/verify/dsp001' },
    ],
    projects: [
      { title: 'Digital Communication System Simulation', description: 'Complete MATLAB simulation of OFDM-based 5G NR physical layer including channel coding, modulation, and MIMO.', tech: ['MATLAB', 'Simulink', 'OFDM', '5G NR'], link: 'https://github.com/amit-sharma-ece/ofdm-5g' },
    ],
  },
  {
    email: 'b221204@skit.ac.in', roll: 'B221204', name: 'Surbhi Jain',
    branch: DEPARTMENTS[2], batch: 2025, cgpa: 6.9, sem: [6.5,6.7,6.9,7.1,6.8,7.0,6.9,7.0],
    backlogs: 2, ten: 69, twelve: 64, gender: 'female', dob: '2002-11-11',
    phone: '9876543224', linkedin: 'linkedin.com/in/surbhi-jain-ece',
    github: 'github.com/surbhi-jain', placed: false, city: 'Alwar',
    skills: ['IoT', 'Python', 'Sensors', 'Arduino'],
    certs: [],
    projects: [
      { title: 'Temperature Logger', description: 'Simple IoT temperature logger using Arduino and DHT22 sensor with data stored on ThingSpeak.', tech: ['Arduino', 'DHT22', 'ThingSpeak'], link: 'https://github.com/surbhi-jain/temp-logger' },
    ],
  },
  {
    email: 'b221205@skit.ac.in', roll: 'B221205', name: 'Vishal Rawat',
    branch: DEPARTMENTS[2], batch: 2025, cgpa: 7.6, sem: [7.2,7.4,7.6,7.8,7.5,7.7,7.6,7.7],
    backlogs: 0, ten: 82, twelve: 78, gender: 'male', dob: '2002-06-06',
    phone: '9876543225', linkedin: 'linkedin.com/in/vishal-rawat-rf',
    github: 'github.com/vishal-rawat-rf', placed: false, city: 'Jaipur',
    skills: ['RF Design', 'Antenna Design', 'Communication Systems', 'ADS', 'HFSS'],
    certs: [
      { name: 'Antenna Design and RF Engineering', issuer: 'NPTEL', year: 2024, url: 'https://nptel.ac.in/verify/rf001' },
    ],
    projects: [
      { title: 'Microstrip Patch Antenna for 5G', description: 'Designed and simulated a dual-band microstrip patch antenna for 5G NR n78 (3.5 GHz) and n260 (39 GHz) bands.', tech: ['HFSS', 'ADS', 'CST Microwave Studio'], link: 'https://github.com/vishal-rawat-rf/5g-antenna' },
    ],
  },
  {
    email: 'b221206@skit.ac.in', roll: 'B221206', name: 'Neha Kulshrestha',
    branch: DEPARTMENTS[2], batch: 2025, cgpa: 8.0, sem: [7.6,7.8,8.0,8.2,7.9,8.1,8.0,8.1],
    backlogs: 0, ten: 85, twelve: 81, gender: 'female', dob: '2002-03-30',
    phone: '9876543226', linkedin: 'linkedin.com/in/neha-kulshrestha-embedded',
    github: 'github.com/neha-kulshrestha', placed: false, city: 'Jaipur',
    skills: ['Embedded C', 'ARM Cortex', 'RTOS', 'CAN Bus', 'Automotive ECU', 'SPI', 'I2C'],
    certs: [
      { name: 'Embedded Systems Design', issuer: 'NPTEL IIT Bombay', year: 2024, url: 'https://nptel.ac.in/verify/emb001' },
    ],
    projects: [
      { title: 'Automotive ADAS Prototype', description: 'Prototype ADAS system on STM32 MCU with ultrasonic proximity sensors, lane detection, and automatic braking.', tech: ['Embedded C', 'STM32', 'CAN Bus', 'FreeRTOS', 'OpenCV'], link: 'https://github.com/neha-kulshrestha/adas-prototype' },
    ],
  },

  // ── EE (5 students) ───────────────────────────────────────────────────────
  {
    email: 'b221301@skit.ac.in', roll: 'B221301', name: 'Suresh Kumar',
    branch: DEPARTMENTS[3], batch: 2025, cgpa: 8.1, sem: [7.7,7.9,8.1,8.3,8.0,8.2,8.1,8.2],
    backlogs: 0, ten: 87, twelve: 83, gender: 'male', dob: '2002-02-14',
    phone: '9876543231', linkedin: 'linkedin.com/in/suresh-kumar-power',
    github: 'github.com/suresh-kumar-ee', placed: false, city: 'Jaipur',
    skills: ['Power Systems', 'SCADA', 'PLC', 'MATLAB', 'AutoCAD Electrical', 'Simulink'],
    certs: [
      { name: 'PLC and SCADA Programming', issuer: 'NPTEL', year: 2024, url: 'https://nptel.ac.in/verify/plc001' },
    ],
    projects: [
      { title: 'Smart Grid Energy Monitor', description: 'SCADA-based real-time energy monitoring system for SKIT campus grid with anomaly detection and demand forecasting.', tech: ['MATLAB', 'Simulink', 'SCADA', 'Python'], link: 'https://github.com/suresh-kumar-ee/smart-grid' },
    ],
  },
  {
    email: 'b221302@skit.ac.in', roll: 'B221302', name: 'Deepika Meena',
    branch: DEPARTMENTS[3], batch: 2025, cgpa: 7.3, sem: [6.9,7.1,7.3,7.5,7.2,7.4,7.3,7.4],
    backlogs: 1, ten: 76, twelve: 72, gender: 'female', dob: '2002-10-01',
    phone: '9876543232', linkedin: 'linkedin.com/in/deepika-meena-ee',
    github: 'github.com/deepika-meena', placed: false, city: 'Dausa',
    skills: ['AutoCAD', 'Electrical Design', 'ETAP', 'Relay Protection'],
    certs: [],
    projects: [
      { title: 'Substation Protection Relay Design', description: 'Designed distance relay settings for a 220/33 kV substation using ETAP with coordination study.', tech: ['ETAP', 'AutoCAD Electrical'], link: 'https://github.com/deepika-meena/relay-design' },
    ],
  },
  {
    email: 'b221303@skit.ac.in', roll: 'B221303', name: 'Mohit Jangid',
    branch: DEPARTMENTS[3], batch: 2025, cgpa: 8.6, sem: [8.2,8.4,8.6,8.8,8.5,8.7,8.6,8.7],
    backlogs: 0, ten: 90, twelve: 87, gender: 'male', dob: '2002-05-25',
    phone: '9876543233', linkedin: 'linkedin.com/in/mohit-jangid-solar',
    github: 'github.com/mohit-jangid', placed: false, city: 'Jaipur',
    skills: ['Renewable Energy', 'Solar PV', 'MATLAB', 'Simulink', 'PVsyst', 'Grid Integration'],
    certs: [
      { name: 'Solar Energy Technology', issuer: 'MNRE / NPTEL', year: 2024, url: 'https://nptel.ac.in/verify/solar001' },
    ],
    projects: [
      { title: '1 MW Solar Plant Feasibility Study', description: 'Complete feasibility study and MATLAB simulation for a 1 MW grid-connected solar PV plant in Jodhpur including yield analysis.', tech: ['MATLAB', 'PVsyst', 'AutoCAD', 'Simulink'], link: 'https://github.com/mohit-jangid/solar-feasibility' },
    ],
  },
  {
    email: 'b221304@skit.ac.in', roll: 'B221304', name: 'Akanksha Singh',
    branch: DEPARTMENTS[3], batch: 2025, cgpa: 6.7, sem: [6.3,6.5,6.7,6.9,6.6,6.8,6.7,6.8],
    backlogs: 2, ten: 66, twelve: 63, gender: 'female', dob: '2002-08-08',
    phone: '9876543234', linkedin: 'linkedin.com/in/akanksha-singh-ee',
    github: 'github.com/akanksha-singh', placed: false, city: 'Jaipur',
    skills: ['Circuit Design', 'Multisim', 'Basic Electronics'],
    certs: [],
    projects: [
      { title: 'Digital Logic Circuit Design', description: 'Designed and simulated basic digital logic circuits (adder, multiplexer) using Multisim.', tech: ['Multisim', 'Digital Logic'], link: 'https://github.com/akanksha-singh/digital-circuits' },
    ],
  },
  {
    email: 'b221305@skit.ac.in', roll: 'B221305', name: 'Pankaj Yadav',
    branch: DEPARTMENTS[3], batch: 2025, cgpa: 7.8, sem: [7.4,7.6,7.8,8.0,7.7,7.9,7.8,7.9],
    backlogs: 0, ten: 84, twelve: 79, gender: 'male', dob: '2002-04-18',
    phone: '9876543235', linkedin: 'linkedin.com/in/pankaj-yadav-control',
    github: 'github.com/pankaj-yadav-ee', placed: false, city: 'Bharatpur',
    skills: ['Control Systems', 'Instrumentation', 'LabVIEW', 'PID Control', 'MATLAB'],
    certs: [
      { name: 'Control Systems with MATLAB', issuer: 'NPTEL', year: 2024, url: 'https://nptel.ac.in/verify/ctrl001' },
    ],
    projects: [
      { title: 'PID-Based Temperature Controller', description: 'Designed and implemented an auto-tuning PID temperature controller for industrial furnace simulation using LabVIEW.', tech: ['LabVIEW', 'MATLAB', 'PID', 'NI DAQ'], link: 'https://github.com/pankaj-yadav-ee/pid-controller' },
    ],
  },

  // ── ME (6 students) ───────────────────────────────────────────────────────
  {
    email: 'b221401@skit.ac.in', roll: 'B221401', name: 'Sumit Sharma',
    branch: DEPARTMENTS[4], batch: 2025, cgpa: 8.0, sem: [7.6,7.8,8.0,8.2,7.9,8.1,8.0,8.1],
    backlogs: 0, ten: 86, twelve: 82, gender: 'male', dob: '2002-07-12',
    phone: '9876543241', linkedin: 'linkedin.com/in/sumit-sharma-cad',
    github: 'github.com/sumit-sharma-me', placed: false, city: 'Jaipur',
    skills: ['SolidWorks', 'AutoCAD', 'CNC Machining', 'GD&T', 'CATIA'],
    certs: [
      { name: 'SolidWorks CSWA', issuer: 'Dassault Systèmes', year: 2024, url: 'https://solidworks.com/verify/cswa001' },
    ],
    projects: [
      { title: 'Exoskeleton Arm Design', description: 'CAD design and FEA analysis of a wearable exoskeleton arm for industrial workers to prevent repetitive strain injuries.', tech: ['SolidWorks', 'ANSYS', 'GD&T', 'CNC'], link: 'https://github.com/sumit-sharma-me/exoskeleton-arm' },
    ],
  },
  {
    email: 'b221402@skit.ac.in', roll: 'B221402', name: 'Rahul Meena',
    branch: DEPARTMENTS[4], batch: 2025, cgpa: 7.1, sem: [6.7,6.9,7.1,7.3,7.0,7.2,7.1,7.2],
    backlogs: 1, ten: 74, twelve: 69, gender: 'male', dob: '2002-11-28',
    phone: '9876543242', linkedin: 'linkedin.com/in/rahul-meena-fea',
    github: 'github.com/rahul-meena-me', placed: false, city: 'Alwar',
    skills: ['ANSYS', 'FEA', 'Thermal Analysis', 'SolidWorks', 'AutoCAD'],
    certs: [],
    projects: [
      { title: 'Thermal Analysis of Heat Exchanger', description: 'CFD and thermal FEA analysis of a shell-and-tube heat exchanger for a chemical plant using ANSYS Fluent.', tech: ['ANSYS Fluent', 'ANSYS Mechanical', 'SolidWorks'], link: 'https://github.com/rahul-meena-me/heat-exchanger' },
    ],
  },
  {
    email: 'b221403@skit.ac.in', roll: 'B221403', name: 'Pradeep Rathore',
    branch: DEPARTMENTS[4], batch: 2025, cgpa: 8.5, sem: [8.1,8.3,8.5,8.7,8.4,8.6,8.5,8.6],
    backlogs: 0, ten: 89, twelve: 85, gender: 'male', dob: '2002-03-05',
    phone: '9876543243', linkedin: 'linkedin.com/in/pradeep-rathore-catia',
    github: 'github.com/pradeep-rathore-me', placed: false, city: 'Jodhpur',
    skills: ['CATIA', '3D Printing', 'CAM', 'SolidWorks', 'Reverse Engineering'],
    certs: [
      { name: 'CATIA V5 Expert', issuer: 'Dassault Systèmes', year: 2024, url: 'https://ds.com/verify/catia001' },
    ],
    projects: [
      { title: 'Turbine Blade Optimization', description: 'Topology optimization of a gas turbine blade using CATIA Generative Shape Design, reducing weight by 23% with improved cooling.', tech: ['CATIA V5', 'ANSYS CFX', 'SolidWorks Simulation'], link: 'https://github.com/pradeep-rathore-me/turbine-blade' },
    ],
  },
  {
    email: 'b221404@skit.ac.in', roll: 'B221404', name: 'Gaurav Jangid',
    branch: DEPARTMENTS[4], batch: 2025, cgpa: 6.8, sem: [6.4,6.6,6.8,7.0,6.7,6.9,6.8,6.9],
    backlogs: 2, ten: 68, twelve: 65, gender: 'male', dob: '2002-09-09',
    phone: '9876543244', linkedin: 'linkedin.com/in/gaurav-jangid-me',
    github: 'github.com/gaurav-jangid', placed: false, city: 'Sikar',
    skills: ['Welding', 'Manufacturing Processes', 'Quality Control'],
    certs: [],
    projects: [
      { title: 'Welding Jig Design', description: 'Designed a fixture jig for automotive frame welding to improve repeatability and reduce cycle time.', tech: ['AutoCAD', 'Manual Machining'], link: '' },
    ],
  },
  {
    email: 'b221405@skit.ac.in', roll: 'B221405', name: 'Anjali Verma',
    branch: DEPARTMENTS[4], batch: 2025, cgpa: 7.7, sem: [7.3,7.5,7.7,7.9,7.6,7.8,7.7,7.8],
    backlogs: 0, ten: 83, twelve: 79, gender: 'female', dob: '2002-05-20',
    phone: '9876543245', linkedin: 'linkedin.com/in/anjali-verma-robotics',
    github: 'github.com/anjali-verma-me', placed: false, city: 'Jaipur',
    skills: ['Robotics', 'Pneumatics', 'Hydraulics', 'ROS', 'Arduino', 'SolidWorks'],
    certs: [
      { name: 'Industrial Robotics', issuer: 'NPTEL', year: 2024, url: 'https://nptel.ac.in/verify/rob001' },
    ],
    projects: [
      { title: '6-DOF Robotic Arm', description: 'Designed and built a 6-degree-of-freedom robotic arm for pick-and-place tasks with ROS control and inverse kinematics.', tech: ['ROS', 'SolidWorks', 'Arduino', 'Python', 'Servo Motors'], link: 'https://github.com/anjali-verma-me/robotic-arm' },
    ],
  },
  {
    email: 'b221406@skit.ac.in', roll: 'B221406', name: 'Vikas Choudhary',
    branch: DEPARTMENTS[4], batch: 2025, cgpa: 7.4, sem: [7.0,7.2,7.4,7.6,7.3,7.5,7.4,7.5],
    backlogs: 0, ten: 80, twelve: 76, gender: 'male', dob: '2002-01-17',
    phone: '9876543246', linkedin: 'linkedin.com/in/vikas-choudhary-lean',
    github: 'github.com/vikas-choudhary', placed: false, city: 'Jaipur',
    skills: ['Lean Manufacturing', 'Six Sigma', 'SolidWorks', 'Value Stream Mapping', 'Industry 4.0'],
    certs: [
      { name: 'Lean Six Sigma Green Belt', issuer: 'KPMG', year: 2024, url: 'https://kpmg.com/verify/lss001' },
    ],
    projects: [
      { title: 'Lean Implementation in Auto Workshop', description: 'Applied 5S and value stream mapping at a local automotive workshop, reducing changeover time by 40%.', tech: ['Value Stream Mapping', 'Lean Tools', 'Excel'], link: '' },
    ],
  },

  // ── CE (5 students) ───────────────────────────────────────────────────────
  {
    email: 'b221501@skit.ac.in', roll: 'B221501', name: 'Ramesh Nagar',
    branch: DEPARTMENTS[5], batch: 2025, cgpa: 7.9, sem: [7.5,7.7,7.9,8.1,7.8,8.0,7.9,8.0],
    backlogs: 0, ten: 85, twelve: 80, gender: 'male', dob: '2002-08-25',
    phone: '9876543251', linkedin: 'linkedin.com/in/ramesh-nagar-civil',
    github: 'github.com/ramesh-nagar-ce', placed: false, city: 'Jaipur',
    skills: ['AutoCAD Civil 3D', 'Staad Pro', 'Surveying', 'GIS', 'ArcGIS'],
    certs: [
      { name: 'AutoCAD Civil 3D', issuer: 'Autodesk', year: 2024, url: 'https://autodesk.com/verify/civ3d001' },
    ],
    projects: [
      { title: 'Smart City GIS Mapping', description: 'GIS-based mapping of Jaipur Smart City infrastructure including roads, utilities, and green spaces for urban planning.', tech: ['ArcGIS', 'AutoCAD Civil 3D', 'Remote Sensing', 'QGIS'], link: 'https://github.com/ramesh-nagar-ce/jaipur-gis' },
    ],
  },
  {
    email: 'b221502@skit.ac.in', roll: 'B221502', name: 'Priti Yadav',
    branch: DEPARTMENTS[5], batch: 2025, cgpa: 7.2, sem: [6.8,7.0,7.2,7.4,7.1,7.3,7.2,7.3],
    backlogs: 1, ten: 77, twelve: 71, gender: 'female', dob: '2002-12-12',
    phone: '9876543252', linkedin: 'linkedin.com/in/priti-yadav-structural',
    github: 'github.com/priti-yadav-ce', placed: false, city: 'Jaipur',
    skills: ['ETABS', 'Revit', 'Structural Design', 'IS Codes', 'Staad Pro'],
    certs: [],
    projects: [
      { title: 'G+5 RCC Building Design', description: 'Complete structural design of a G+5 RCC commercial building in Jaipur including slab, beam, column design as per IS 456.', tech: ['ETABS', 'AutoCAD', 'Revit'], link: '' },
    ],
  },
  {
    email: 'b221503@skit.ac.in', roll: 'B221503', name: 'Sahil Saxena',
    branch: DEPARTMENTS[5], batch: 2025, cgpa: 8.3, sem: [7.9,8.1,8.3,8.5,8.2,8.4,8.3,8.4],
    backlogs: 0, ten: 88, twelve: 84, gender: 'male', dob: '2002-04-10',
    phone: '9876543253', linkedin: 'linkedin.com/in/sahil-saxena-hydrology',
    github: 'github.com/sahil-saxena-ce', placed: false, city: 'Jaipur',
    skills: ['GIS', 'Remote Sensing', 'Hydrology', 'HEC-RAS', 'MIKE', 'Python'],
    certs: [
      { name: 'GIS and Remote Sensing Applications', issuer: 'NPTEL', year: 2024, url: 'https://nptel.ac.in/verify/gis001' },
    ],
    projects: [
      { title: 'Flood Risk Mapping for Chambal Basin', description: 'HEC-RAS based flood inundation mapping for the Chambal River basin for 100-year return period flood event.', tech: ['HEC-RAS', 'ArcGIS', 'Python', 'Remote Sensing'], link: 'https://github.com/sahil-saxena-ce/flood-mapping' },
    ],
  },
  {
    email: 'b221504@skit.ac.in', roll: 'B221504', name: 'Meena Kumari',
    branch: DEPARTMENTS[5], batch: 2025, cgpa: 6.6, sem: [6.2,6.4,6.6,6.8,6.5,6.7,6.6,6.7],
    backlogs: 2, ten: 67, twelve: 63, gender: 'female', dob: '2002-10-22',
    phone: '9876543254', linkedin: 'linkedin.com/in/meena-kumari-ce',
    github: '', placed: false, city: 'Ajmer',
    skills: ['Concrete Technology', 'Construction Management', 'AutoCAD'],
    certs: [],
    projects: [
      { title: 'Concrete Mix Design Study', description: 'M25 grade concrete mix design for a commercial building project following IS 10262 guidelines.', tech: ['Laboratory Testing', 'AutoCAD'], link: '' },
    ],
  },
  {
    email: 'b221505@skit.ac.in', roll: 'B221505', name: 'Aditya Gupta',
    branch: DEPARTMENTS[5], batch: 2025, cgpa: 7.5, sem: [7.1,7.3,7.5,7.7,7.4,7.6,7.5,7.6],
    backlogs: 0, ten: 80, twelve: 76, gender: 'male', dob: '2002-06-28',
    phone: '9876543255', linkedin: 'linkedin.com/in/aditya-gupta-env',
    github: 'github.com/aditya-gupta-ce', placed: false, city: 'Jaipur',
    skills: ['Environmental Engineering', 'Water Treatment', 'EIA', 'MATLAB', 'ArcGIS'],
    certs: [
      { name: 'Environmental Impact Assessment', issuer: 'NPTEL', year: 2024, url: 'https://nptel.ac.in/verify/eia001' },
    ],
    projects: [
      { title: 'Sewage Treatment Plant Design', description: 'Complete design of a 5 MLD capacity sewage treatment plant for a town of 50,000 population using activated sludge process.', tech: ['AutoCAD', 'MATLAB', 'Environmental Standards'], link: 'https://github.com/aditya-gupta-ce/stp-design' },
    ],
  },

  // ── MBA (5 students) ──────────────────────────────────────────────────────
  {
    email: 'b221601@skit.ac.in', roll: 'B221601', name: 'Shreya Kapoor',
    branch: DEPARTMENTS[6], batch: 2025, cgpa: 8.2, sem: [7.8,8.0,8.2,8.4,8.1,8.3,8.2,8.3],
    backlogs: 0, ten: 87, twelve: 83, gender: 'female', dob: '2002-03-19',
    phone: '9876543261', linkedin: 'linkedin.com/in/shreya-kapoor-analytics',
    github: 'github.com/shreya-kapoor', placed: false, city: 'Jaipur',
    skills: ['Business Analytics', 'Excel', 'Tableau', 'Marketing', 'SQL', 'R', 'Digital Marketing'],
    certs: [
      { name: 'Google Data Analytics', issuer: 'Google / Coursera', year: 2024, url: 'https://coursera.org/verify/gda001' },
    ],
    projects: [
      { title: 'Customer Churn Analysis — Telecom', description: 'Predictive model for customer churn in a telecom company using logistic regression and random forest with 87% accuracy.', tech: ['R', 'Tableau', 'SQL', 'Excel'], link: 'https://github.com/shreya-kapoor/churn-analysis' },
    ],
  },
  {
    email: 'b221602@skit.ac.in', roll: 'B221602', name: 'Rohit Agarwal',
    branch: DEPARTMENTS[6], batch: 2025, cgpa: 7.4, sem: [7.0,7.2,7.4,7.6,7.3,7.5,7.4,7.5],
    backlogs: 0, ten: 80, twelve: 75, gender: 'male', dob: '2002-11-03',
    phone: '9876543262', linkedin: 'linkedin.com/in/rohit-agarwal-finance',
    github: '', placed: false, city: 'Jaipur',
    skills: ['Finance', 'SAP FICO', 'Tally', 'Financial Modeling', 'Excel', 'Valuation'],
    certs: [
      { name: 'Financial Modeling & Valuation Analyst (FMVA)', issuer: 'CFI', year: 2024, url: 'https://cfi.com/verify/fmva001' },
    ],
    projects: [
      { title: 'DCF Valuation of Infosys', description: 'Detailed DCF valuation model for Infosys Ltd with 5-year revenue projection, WACC calculation, and sensitivity analysis.', tech: ['Excel', 'Bloomberg', 'Financial Modeling'], link: '' },
    ],
  },
  {
    email: 'b221603@skit.ac.in', roll: 'B221603', name: 'Nisha Mathur',
    branch: DEPARTMENTS[6], batch: 2025, cgpa: 8.7, sem: [8.3,8.5,8.7,8.9,8.6,8.8,8.7,8.9],
    backlogs: 0, ten: 92, twelve: 90, gender: 'female', dob: '2002-01-29',
    phone: '9876543263', linkedin: 'linkedin.com/in/nisha-mathur-hr',
    github: '', placed: true, city: 'Jaipur',
    skills: ['HR Management', 'Recruitment', 'MS Office', 'OD & L&D', 'Talent Analytics', 'SAP HCM'],
    certs: [
      { name: 'SHRM-CP', issuer: 'Society for Human Resource Management', year: 2024, url: 'https://shrm.org/verify/cp001' },
    ],
    projects: [
      { title: 'Campus Hiring Process Redesign', description: 'Redesigned SKIT campus placement process, reducing offer-to-join ratio from 65% to 85% through targeted pre-placement engagement.', tech: ['Excel', 'HR Analytics', 'Survey Tools'], link: '' },
    ],
  },
  {
    email: 'b221604@skit.ac.in', roll: 'B221604', name: 'Sanjay Sharma',
    branch: DEPARTMENTS[6], batch: 2025, cgpa: 7.0, sem: [6.6,6.8,7.0,7.2,6.9,7.1,7.0,7.1],
    backlogs: 0, ten: 74, twelve: 70, gender: 'male', dob: '2002-07-15',
    phone: '9876543264', linkedin: 'linkedin.com/in/sanjay-sharma-scm',
    github: '', placed: false, city: 'Ajmer',
    skills: ['Supply Chain', 'Operations', 'Logistics', 'SAP MM', 'Warehouse Management'],
    certs: [],
    projects: [
      { title: 'Warehouse Layout Optimization', description: 'Optimized warehouse layout for a FMCG distributor using slotting analysis and simulation, improving picking efficiency by 30%.', tech: ['Excel', 'AutoCAD', 'Warehouse Simulation'], link: '' },
    ],
  },
  {
    email: 'b221605@skit.ac.in', roll: 'B221605', name: 'Ritu Sharma',
    branch: DEPARTMENTS[6], batch: 2025, cgpa: 7.8, sem: [7.4,7.6,7.8,8.0,7.7,7.9,7.8,7.9],
    backlogs: 0, ten: 83, twelve: 79, gender: 'female', dob: '2002-04-14',
    phone: '9876543265', linkedin: 'linkedin.com/in/ritu-sharma-marketing',
    github: '', placed: false, city: 'Jaipur',
    skills: ['Digital Marketing', 'SEO', 'Social Media Marketing', 'Google Ads', 'Content Strategy', 'HubSpot'],
    certs: [
      { name: 'Google Digital Marketing', issuer: 'Google', year: 2024, url: 'https://google.com/verify/gdm001' },
      { name: 'HubSpot Inbound Marketing', issuer: 'HubSpot Academy', year: 2024, url: 'https://hubspot.com/verify/inbound001' },
    ],
    projects: [
      { title: 'Digital Marketing Campaign — SKIT Events', description: 'Managed social media and Google Ads campaign for SKIT Techfest 2024, achieving 15,000+ organic reach and 2x attendance growth.', tech: ['Google Ads', 'Meta Ads', 'Canva', 'Analytics'], link: '' },
    ],
  },

  // ── BSH (5 students) ──────────────────────────────────────────────────────
  {
    email: 'b221701@skit.ac.in', roll: 'B221701', name: 'Mohini Verma',
    branch: DEPARTMENTS[7], batch: 2025, cgpa: 7.5, sem: [7.1,7.3,7.5,7.7,7.4,7.6,7.5,7.6],
    backlogs: 0, ten: 80, twelve: 76, gender: 'female', dob: '2002-06-16',
    phone: '9876543271', linkedin: 'linkedin.com/in/mohini-verma-writing',
    github: '', placed: false, city: 'Jaipur',
    skills: ['Technical Writing', 'Communication', 'Research', 'Documentation', 'Editing'],
    certs: [
      { name: 'Technical Writing Fundamentals', issuer: 'Google / Coursera', year: 2024, url: 'https://coursera.org/verify/twf001' },
    ],
    projects: [
      { title: 'SKIT Department Documentation Portal', description: 'Authored comprehensive technical documentation for 8 SKIT departments including lab manuals, SOPs, and accreditation reports.', tech: ['MS Word', 'Confluence', 'Markdown', 'LaTeX'], link: '' },
    ],
  },
  {
    email: 'b221702@skit.ac.in', roll: 'B221702', name: 'Lokesh Kumar',
    branch: DEPARTMENTS[7], batch: 2025, cgpa: 6.9, sem: [6.5,6.7,6.9,7.1,6.8,7.0,6.9,7.0],
    backlogs: 1, ten: 72, twelve: 68, gender: 'male', dob: '2002-10-05',
    phone: '9876543272', linkedin: 'linkedin.com/in/lokesh-kumar-maths',
    github: 'github.com/lokesh-kumar', placed: false, city: 'Jaipur',
    skills: ['Physics', 'Mathematics', 'Statistics', 'MATLAB', 'SPSS'],
    certs: [],
    projects: [
      { title: 'Statistical Analysis of Placement Data', description: 'Applied descriptive and inferential statistics on 5-year SKIT placement data to identify trends and predictive factors.', tech: ['SPSS', 'Excel', 'R'], link: '' },
    ],
  },
  {
    email: 'b221703@skit.ac.in', roll: 'B221703', name: 'Alok Pandey',
    branch: DEPARTMENTS[7], batch: 2025, cgpa: 8.0, sem: [7.6,7.8,8.0,8.2,7.9,8.1,8.0,8.1],
    backlogs: 0, ten: 86, twelve: 82, gender: 'male', dob: '2002-02-20',
    phone: '9876543273', linkedin: 'linkedin.com/in/alok-pandey-data',
    github: 'github.com/alok-pandey-ds', placed: false, city: 'Jaipur',
    skills: ['Applied Mathematics', 'Data Analysis', 'R Programming', 'Python', 'Time Series'],
    certs: [
      { name: 'Statistics with R', issuer: 'Duke University / Coursera', year: 2024, url: 'https://coursera.org/verify/statR001' },
    ],
    projects: [
      { title: 'Time Series Forecasting for Retail', description: 'Sales forecasting model for a retail chain using ARIMA and Prophet, achieving 12% lower MAPE vs baseline model.', tech: ['R', 'Python', 'Prophet', 'ARIMA', 'Tableau'], link: 'https://github.com/alok-pandey-ds/ts-forecasting' },
    ],
  },
  {
    email: 'b221704@skit.ac.in', roll: 'B221704', name: 'Sunita Meena',
    branch: DEPARTMENTS[7], batch: 2025, cgpa: 7.2, sem: [6.8,7.0,7.2,7.4,7.1,7.3,7.2,7.3],
    backlogs: 0, ten: 76, twelve: 72, gender: 'female', dob: '2002-09-01',
    phone: '9876543274', linkedin: 'linkedin.com/in/sunita-meena-chemistry',
    github: '', placed: false, city: 'Tonk',
    skills: ['Chemistry', 'Lab Skills', 'Quality Control', 'GC-MS', 'HPLC'],
    certs: [],
    projects: [
      { title: 'Synthesis of Biodegradable Polymer', description: 'Synthesized PLA-based biodegradable polymer from corn starch and characterized using FTIR and GC-MS analysis.', tech: ['Laboratory Chemistry', 'FTIR', 'GC-MS'], link: '' },
    ],
  },
  {
    email: 'b221705@skit.ac.in', roll: 'B221705', name: 'Gaurav Sharma',
    branch: DEPARTMENTS[7], batch: 2025, cgpa: 7.7, sem: [7.3,7.5,7.7,7.9,7.6,7.8,7.7,7.8],
    backlogs: 0, ten: 83, twelve: 78, gender: 'male', dob: '2002-05-23',
    phone: '9876543275', linkedin: 'linkedin.com/in/gaurav-sharma-content',
    github: 'github.com/gaurav-sharma-content', placed: false, city: 'Jaipur',
    skills: ['English Communication', 'Content Writing', 'Editing', 'SEO Writing', 'Journalism'],
    certs: [
      { name: 'Content Marketing Certification', issuer: 'HubSpot Academy', year: 2024, url: 'https://hubspot.com/verify/cm001' },
    ],
    projects: [
      { title: 'SKIT Tech Blog', description: 'Founded and manages SKIT Tech Blog — a student-run publication with 5000+ monthly readers covering engineering, technology, and campus life.', tech: ['WordPress', 'SEO', 'Google Analytics', 'Canva'], link: 'https://skit-tech-blog.com' },
    ],
  },
]

const studentUserMap = {}
for (const def of studentDefs) {
  const u = new User({ email: def.email, role: 'student', active: true, mustResetPassword: false })
  u.password = 'Student@1234'
  await u.save()

  const dob = new Date(def.dob)
  const profile = await StudentProfile.create({
    user: u._id,
    rollNumber: def.roll,
    registrationNumber: 'RTU/' + def.roll,
    universityEnrollmentNumber: '24UNI' + def.roll.slice(-4),
    branch: def.branch,
    batch: def.batch,
    section: ['CSE','IT'].includes(def.roll.slice(1,4)) ? 'A' : 'B',
    dateOfBirth: dob,
    gender: def.gender,
    phone: def.phone,
    linkedinUrl: 'https://' + def.linkedin,
    githubUrl: def.github ? 'https://' + def.github : '',
    cgpaOverall: def.cgpa,
    cgpaSemesters: def.sem,
    backlogsActive: def.backlogs,
    backlogsHistory: def.backlogs > 0 ? [def.backlogs] : [],
    tenthPercent: def.ten,
    twelfthPercent: def.twelve,
    tenthDetails: { percentage: def.ten, year: 2017, board: 'RBSE', obtainedMarks: def.ten * 6, maxMarks: 600 },
    twelfthDetails: { percentage: def.twelve, year: 2019, board: 'RBSE', obtainedMarks: def.twelve * 5, maxMarks: 500 },
    skills: def.skills,
    certifications: def.certs,
    projects: def.projects,
    placementStatus: def.placed ? 'placed' : 'not_placed',
    currentTier: def.placed ? 2 : null,
    admissionYear: 2021,
    address: { street: '123 College Road', city: def.city, state: 'Rajasthan', pincode: '302017' },
    guardianInfo: {
      father: { name: def.name.split(' ')[1] + ' Sr.', mobile: '98' + def.phone.slice(2), occupation: 'Business' },
      mother: { name: 'Smt. ' + def.name.split(' ')[1], mobile: '97' + def.phone.slice(2), occupation: 'Homemaker' },
    },
    resumes: [{
      label: 'General Resume 2025',
      cloudinaryPublicId: 'pcms/resumes/' + def.roll + '_resume',
      cloudinarySecureUrl: 'https://res.cloudinary.com/pcms-skit/raw/upload/v1/resumes/' + def.roll + '_resume.pdf',
      originalFilename: 'Resume_' + def.roll + '_' + def.name.replace(' ', '_') + '.pdf',
      fileSize: 180000 + Math.floor(Math.random() * 80000),
      mimeType: 'application/pdf',
      isDefault: true,
      uploadedAt: daysAgo(30),
    }],
    policyAcknowledgment: { version: '1', acceptedAt: daysAgo(20) },
  })
  studentUserMap[def.roll] = { user: u, profile }
}
console.log(studentDefs.length + ' student accounts created | Student@1234')

// =============================================================================
// C. COMPANIES (20)
// =============================================================================
console.log('\nCreating companies...')
const companyDefs = [
  { name: 'Infosys Limited', sector: 'IT Services', about: 'Global leader in next-generation digital services and consulting with 300,000+ employees across 56 countries. Fortune 500 company.', hr: { name: 'Priya Kapoor', email: 'priya.kapoor@infosys.com', phone: '9980165432', designation: 'Campus Recruiter' }, website: 'https://www.infosys.com' },
  { name: 'Tata Consultancy Services', sector: 'IT Services', about: "World's largest IT services company by market cap, part of the Tata Group. Operations in 46 countries with 600,000+ associates.", hr: { name: 'Ramesh Iyer', email: 'ramesh.iyer@tcs.com', phone: '9987654321', designation: 'HR Manager - Campus' }, website: 'https://www.tcs.com' },
  { name: 'Wipro Technologies', sector: 'IT Services', about: 'Leading technology services and consulting company with 240,000+ employees and 900+ active global clients across 66 countries.', hr: { name: 'Sneha Patil', email: 'sneha.patil@wipro.com', phone: '9876543210', designation: 'Campus Talent Acquisition' }, website: 'https://www.wipro.com' },
  { name: 'L&T Technology Services', sector: 'Engineering & Technology', about: 'Pure-play engineering services company. Partner of choice to 57 Fortune 500 companies across embedded, mechanical and electrical engineering.', hr: { name: 'Arun Nair', email: 'arun.nair@ltts.com', phone: '9765432109', designation: 'Talent Acquisition Lead' }, website: 'https://www.ltts.com' },
  { name: 'Samsung R&D Institute', sector: 'Electronics & Semiconductors', about: "India's largest R&D centre of Samsung Electronics, focusing on mobile platform, SoC and multimedia technologies with 4000+ engineers.", hr: { name: 'Divya Krishnan', email: 'divya.k@samsung.com', phone: '9654321098', designation: 'University Relations Manager' }, website: 'https://research.samsung.com/sri-bangalore' },
  { name: 'BHEL (Bharat Heavy Electricals Ltd)', sector: 'Power & Energy', about: "India's largest engineering and manufacturing enterprise in the energy and infrastructure sector. Government of India entity with 180+ products.", hr: { name: 'Suresh Kumar', email: 's.kumar@bhel.in', phone: '9543210987', designation: 'Executive HR' }, website: 'https://www.bhel.com' },
  { name: 'Larsen & Toubro Construction', sector: 'Construction & Infrastructure', about: "India's largest construction company executing diverse civil infrastructure projects across 50+ countries with annual order book of ₹4 lakh crore.", hr: { name: 'Meena Joshi', email: 'meena.joshi@larsentoubro.com', phone: '9432109876', designation: 'HR Executive - Recruitment' }, website: 'https://www.larsentoubro.com' },
  { name: 'Deloitte India', sector: 'Management Consulting', about: "India's leading professional services firm with 80,000+ professionals offering audit, tax, consulting and financial advisory services.", hr: { name: 'Ritu Mehta', email: 'ritu.mehta@deloitte.com', phone: '9321098765', designation: 'Campus Recruitment Lead' }, website: 'https://www2.deloitte.com/in' },
  { name: 'Capgemini India', sector: 'IT Services', about: 'Global leader in consulting, technology services and digital transformation with 50,000+ India employees across 10 delivery centres.', hr: { name: 'Vikash Rao', email: 'vikash.rao@capgemini.com', phone: '9210987654', designation: 'Campus Recruiter' }, website: 'https://www.capgemini.com' },
  { name: 'Tech Mahindra', sector: 'IT Services', about: 'Leading provider of digital transformation, consulting and BPO services. Part of Mahindra Group with 145,000+ employees in 90+ countries.', hr: { name: 'Ananya Singh', email: 'ananya.singh@techmahindra.com', phone: '9109876543', designation: 'Talent Acquisition Manager' }, website: 'https://www.techmahindra.com' },
  { name: 'HCL Technologies', sector: 'IT Services', about: 'Global technology company helping enterprises reimagine their businesses through digital transformation at scale. 220,000+ employees in 60 countries.', hr: { name: 'Gaurav Verma', email: 'gaurav.verma@hcltech.com', phone: '9098765432', designation: 'Campus Relations Lead' }, website: 'https://www.hcltech.com' },
  { name: 'Rajasthan Electronics & Instruments Ltd', sector: 'Electronics & Government PSU', about: 'Government of India enterprise under Ministry of Agriculture with operations in 11 states. Largest solar pump manufacturer in Rajasthan.', hr: { name: 'Kamal Sharma', email: 'k.sharma@reil.co.in', phone: '9876541230', designation: 'DGM Human Resources' }, website: 'https://www.reil.co.in' },
  { name: 'Accenture India', sector: 'IT Services & Consulting', about: 'Global professional services company with leading capabilities in digital, cloud and security. 300,000+ employees in India alone.', hr: { name: 'Pooja Reddy', email: 'pooja.reddy@accenture.com', phone: '9876512340', designation: 'Campus Recruitment Manager' }, website: 'https://www.accenture.com/in' },
  { name: 'Microsoft India', sector: 'Technology', about: "World's largest software company. India is Microsoft's largest engineering hub outside the US with 10,000+ engineers in Hyderabad and Bangalore.", hr: { name: 'Rahul Bhat', email: 'rahul.bhat@microsoft.com', phone: '9876500001', designation: 'University Recruiter' }, website: 'https://www.microsoft.com/en-in' },
  { name: 'Amazon India (AWS)', sector: 'Technology & Cloud', about: "World's largest e-commerce and cloud computing company. India development centres in Bangalore, Hyderabad and Chennai with 70,000+ employees.", hr: { name: 'Swati Nair', email: 'swati.nair@amazon.com', phone: '9876500002', designation: 'University Programs Lead' }, website: 'https://www.amazon.jobs/en/locations/india' },
  { name: 'Siemens India', sector: 'Industrial Automation & Engineering', about: 'Technology powerhouse in electrification, automation and digitalization. 55,000+ employees in India across manufacturing and R&D.', hr: { name: 'Preethi Kumar', email: 'preethi.kumar@siemens.com', phone: '9876500003', designation: 'HR Business Partner - Campus' }, website: 'https://www.siemens.co.in' },
  { name: 'NTPC Limited', sector: 'Power Generation (PSU)', about: "India's largest power utility with installed capacity of 73 GW. Navratna PSU under Ministry of Power with presence across all major fuel types.", hr: { name: 'Virendra Pandey', email: 'v.pandey@ntpc.co.in', phone: '9876500004', designation: 'DGM HR - Recruitment' }, website: 'https://www.ntpc.co.in' },
  { name: 'Cognizant Technology Solutions', sector: 'IT Services', about: 'Leading provider of IT, consulting and business process services. 300,000+ associates serving Fortune 500 clients globally.', hr: { name: 'Lakshmi Subramaniam', email: 'lakshmi.s@cognizant.com', phone: '9876500005', designation: 'Campus Talent Program Manager' }, website: 'https://www.cognizant.com' },
  { name: 'Hero MotoCorp', sector: 'Automotive Manufacturing', about: "World's largest two-wheeler manufacturer by volume. 7 manufacturing plants, 10,000+ dealerships, and exports to 40+ countries.", hr: { name: 'Rohit Taneja', email: 'rohit.taneja@heromotocorp.com', phone: '9876500006', designation: 'Manager Talent Acquisition' }, website: 'https://www.heromotocorp.com' },
  { name: 'EY (Ernst & Young)', sector: 'Professional Services', about: 'Global leader in assurance, consulting, strategy & transactions and tax services. 300,000+ professionals in 150 countries.', hr: { name: 'Ritika Srivastava', email: 'ritika.srivastava@in.ey.com', phone: '9876500007', designation: 'Talent Acquisition Lead - Advisory' }, website: 'https://www.ey.com/en_in' },
]

const companies = {}
for (const c of companyDefs) {
  const company = await Company.create({ name: c.name, sector: c.sector, about: c.about, hrContact: c.hr, website: c.website, isActive: true })
  companies[c.name] = company
}
console.log(companyDefs.length + ' companies created')

// =============================================================================
// D. DRIVES (15 across full lifecycle)
// =============================================================================
console.log('\nCreating drives...')
const CSE_IT       = [DEPARTMENTS[0], DEPARTMENTS[1]]
const ALL_ENG      = [DEPARTMENTS[0], DEPARTMENTS[1], DEPARTMENTS[2], DEPARTMENTS[3], DEPARTMENTS[4]]
const CSE_IT_ECE   = [DEPARTMENTS[0], DEPARTMENTS[1], DEPARTMENTS[2]]
const ECE_EE       = [DEPARTMENTS[2], DEPARTMENTS[3]]
const ME_CE        = [DEPARTMENTS[4], DEPARTMENTS[5]]
const ECE_EE_ME    = [DEPARTMENTS[2], DEPARTMENTS[3], DEPARTMENTS[4]]
const MBA_ONLY     = [DEPARTMENTS[6]]
const ALL_DEPTS    = DEPARTMENTS.slice()

const driveDefs = [
  // 1 — TCS (results_declared)
  { co: 'Tata Consultancy Services', title: 'TCS NQT — Software Engineer 2025 Batch', jobType: 'full-time', ctc: 3.36, stipend: 0, compensationDetails: 'Fixed CTC ₹3.36 LPA + performance bonus up to ₹50,000. 6-month initial training at TCS Learning Centre, Trivandrum/Mysuru.', branches: ALL_ENG, minCgpa: 6.0, maxBacklogs: 0, min10: 60, min12: 60, tier: 3, vacancies: 20, status: 'results_declared', deadline: daysAgo(45), description: 'TCS National Qualifier Test for Software Engineer. Selected candidates join as Assistant System Engineers (ASE). NQT score + communication assessment + interview rounds.' },
  // 2 — Infosys (completed)
  { co: 'Infosys Limited', title: 'Infosys Systems Engineer — 2025 Batch', jobType: 'full-time', ctc: 3.6, stipend: 0, compensationDetails: 'Fixed CTC ₹3.6 LPA. Training at Infosys Mysuru campus for 5.5 months. Power Programmer track available for high scorers.', branches: ALL_ENG, minCgpa: 6.5, maxBacklogs: 0, min10: 60, min12: 60, tier: 3, vacancies: 15, status: 'completed', deadline: daysAgo(30), description: 'Infosys flagship campus recruitment for Systems Engineer. Assessment: Reasoning Ability + Quantitative Aptitude + English + Pseudo Code + Coding. Shortlisted candidates have Technical + HR interviews.' },
  // 3 — Wipro (in_progress)
  { co: 'Wipro Technologies', title: 'Wipro National Talent Hunt — Software Engineer', jobType: 'full-time', ctc: 3.5, stipend: 0, compensationDetails: 'Gross CTC ₹3.5 LPA. Allocated to Bangalore/Hyderabad/Pune development centres. Turbo programme available.', branches: CSE_IT_ECE, minCgpa: 6.5, maxBacklogs: 0, min10: 60, min12: 60, tier: 3, vacancies: 10, status: 'in_progress', deadline: daysAgo(15), description: 'Wipro National Talent Hunt (WNTH) for Software Engineer positions at delivery centers across India. Online aptitude test followed by technical and HR interviews.' },
  // 4 — Capgemini (registration_closed)
  { co: 'Capgemini India', title: 'Capgemini GET — Graduate Engineer Trainee 2025', jobType: 'full-time', ctc: 4.0, stipend: 0, compensationDetails: 'CTC ₹4.0 LPA. Hybrid work model post-training. Based at Pune/Bangalore. Analyst track after 6 months training.', branches: ALL_ENG, minCgpa: 7.0, maxBacklogs: 0, min10: 65, min12: 65, tier: 2, vacancies: 8, status: 'registration_closed', deadline: daysAgo(5), description: 'Capgemini Graduate Engineer Trainee program with structured technical and behavioral training. Game-based assessment + pseudocode test + communication test + group discussion + interview.' },
  // 5 — HCL (registration_open)
  { co: 'HCL Technologies', title: 'HCL TechBee — Fresh Graduate Engineer Programme', jobType: 'full-time', ctc: 3.0, stipend: 0, compensationDetails: 'Starting CTC ₹3.0 LPA with step-up after 1-year training. ESOPs after 3 years. Medical + term insurance included.', branches: ALL_ENG, minCgpa: 6.0, maxBacklogs: 2, min10: 55, min12: 55, tier: 4, vacancies: 25, status: 'registration_open', deadline: daysFromNow(5), description: 'HCL TechBee program for fresh engineering graduates. 1-year structured training across service lines. Assessment: Aptitude + Coding + Communication + Personality Questionnaire.' },
  // 6 — Samsung (published, premium)
  { co: 'Samsung R&D Institute', title: 'Samsung Research — Software Engineer (AI/ML)', jobType: 'full-time', ctc: 14.0, stipend: 0, compensationDetails: 'CTC ₹14 LPA. Joining bonus ₹1 LPA. ESOP grant after 2 years. Health insurance for family. Relocation allowance.', branches: CSE_IT, minCgpa: 8.0, maxBacklogs: 0, min10: 80, min12: 80, tier: 1, vacancies: 4, status: 'published', deadline: daysFromNow(12), description: 'Samsung R&D recruits top AI/ML engineers for cutting-edge research in mobile platform, computer vision, and NLP. Roles involve published research and patent filing. Assessment: Coding test (3 problems, 2h) + 2 technical rounds + HR.' },
  // 7 — LTTS (published)
  { co: 'L&T Technology Services', title: 'LTTS Graduate Engineer Trainee — 2025', jobType: 'full-time', ctc: 5.0, stipend: 0, compensationDetails: 'CTC ₹5 LPA. India and global exposure on product engineering projects. Travel allowance for site work.', branches: ECE_EE_ME, minCgpa: 7.0, maxBacklogs: 0, min10: 65, min12: 65, tier: 2, vacancies: 6, status: 'published', deadline: daysFromNow(18), description: 'LTTS recruits engineers for embedded, mechanical and electrical engineering service lines. Assessment: Aptitude + Domain test (Embedded/Mechanical/EE) + Interview.' },
  // 8 — BHEL (published, PSU)
  { co: 'BHEL (Bharat Heavy Electricals Ltd)', title: 'BHEL Engineer Trainee (ET) Recruitment 2025', jobType: 'full-time', ctc: 6.5, stipend: 0, compensationDetails: 'E1 pay scale ₹6.5 LPA. Government job with PF, gratuity, medical, HRA, LTC. Pension (NPS). Housing at project sites.', branches: ECE_EE, minCgpa: 6.5, maxBacklogs: 0, min10: 60, min12: 60, tier: 2, vacancies: 5, status: 'published', deadline: daysFromNow(25), description: 'BHEL ET campus recruitment drive. 1-year on-the-job training before posting at BHEL plants across India. Competitive written test + interview. Bonds apply.' },
  // 9 — L&T Construction (draft)
  { co: 'Larsen & Toubro Construction', title: 'L&T Construction GET — Civil Engineering 2025', jobType: 'full-time', ctc: 5.5, stipend: 0, compensationDetails: 'CTC ₹5.5 LPA. Site postings across India and international projects. Accommodation at project sites.', branches: ME_CE, minCgpa: 6.5, maxBacklogs: 1, min10: 60, min12: 60, tier: 2, vacancies: 8, status: 'draft', deadline: daysFromNow(40), description: 'L&T Construction GET program. Exposure to mega infrastructure projects in buildings, metro, highways, and smart cities. GATE score may be used for shortlisting.' },
  // 10 — Deloitte (published, MBA)
  { co: 'Deloitte India', title: 'Deloitte Consulting — Business Analyst 2025', jobType: 'full-time', ctc: 7.5, stipend: 0, compensationDetails: 'CTC ₹7.5 LPA + performance-linked variable pay up to 15%. Bangalore/Mumbai/Delhi office. Laptop + phone allowance.', branches: MBA_ONLY, minCgpa: 7.5, maxBacklogs: 0, min10: 70, min12: 70, tier: 1, vacancies: 3, status: 'published', deadline: daysFromNow(14), description: 'Deloitte Consulting Business Analyst for MBA graduates working on strategy and digital transformation. Assessment: Case study + group discussion + interview (2 rounds).' },
  // 11 — Tech Mahindra internship
  { co: 'Tech Mahindra', title: 'Tech Mahindra SMART Academy Internship 2025', jobType: 'internship', ctc: 0, stipend: 15000, compensationDetails: 'Stipend ₹15,000/month for 6 months. Pre-placement offer for top performers. Travel reimbursement.', branches: CSE_IT_ECE, minCgpa: 6.5, maxBacklogs: 1, min10: 60, min12: 60, tier: 3, vacancies: 12, status: 'registration_open', deadline: daysFromNow(8), description: 'Tech Mahindra SMART Academy summer internship. Hands-on project work in 5G, AI, Cloud, and digital technologies. Mentored by senior engineers.' },
  // 12 — Accenture (published)
  { co: 'Accenture India', title: 'Accenture Associate Software Engineer 2025', jobType: 'full-time', ctc: 4.5, stipend: 0, compensationDetails: 'Fixed CTC ₹4.5 LPA. Skill-based salary enhancement up to ₹1 LPA after certification. Hybrid work model.', branches: ALL_ENG, minCgpa: 6.5, maxBacklogs: 0, min10: 60, min12: 60, tier: 2, vacancies: 15, status: 'published', deadline: daysFromNow(10), description: 'Accenture Associate Software Engineer campus drive. Assessment: Cognitive + Technical + Coding. Shortlisted: Communication assessment + HR interview.' },
  // 13 — Microsoft (published, elite)
  { co: 'Microsoft India', title: 'Microsoft SDE Internship + Full-time 2025', jobType: 'full-time+internship', ctc: 45.0, stipend: 100000, compensationDetails: 'Full-time CTC ₹45 LPA (base + RSU + bonus). Internship stipend ₹1,00,000/month. Joining bonus ₹5 LPA. Comprehensive benefits.', branches: CSE_IT, minCgpa: 8.5, maxBacklogs: 0, min10: 85, min12: 85, tier: 1, vacancies: 2, status: 'published', deadline: daysFromNow(20), description: 'Microsoft SDE roles for top CS/IT students. Focus on data structures, algorithms, system design. 4–5 rounds of technical interviews including coding + system design + behavioural.' },
  // 14 — Siemens (registration_open)
  { co: 'Siemens India', title: 'Siemens Graduate Engineer Trainee — 2025', jobType: 'full-time', ctc: 6.0, stipend: 0, compensationDetails: 'CTC ₹6.0 LPA + variable pay. Work with global Siemens teams. Relocation support. International project exposure.', branches: ECE_EE_ME, minCgpa: 7.0, maxBacklogs: 0, min10: 65, min12: 65, tier: 2, vacancies: 7, status: 'registration_open', deadline: daysFromNow(15), description: 'Siemens recruits for Automation, Drive Technology, and Smart Infrastructure divisions. Online test + group exercise + technical interview + HR interview.' },
  // 15 — NTPC (published, PSU)
  { co: 'NTPC Limited', title: 'NTPC Engineer Trainee (ET) 2025 — Electrical/ECE', jobType: 'full-time', ctc: 7.5, stipend: 0, compensationDetails: 'E2 pay scale ₹7.5 LPA. NTPC provides township housing, free electricity (200 units), LTC, PF, gratuity, and comprehensive medical.', branches: ECE_EE, minCgpa: 7.0, maxBacklogs: 0, min10: 65, min12: 65, tier: 1, vacancies: 4, status: 'published', deadline: daysFromNow(30), description: 'NTPC Engineer Trainee via campus. GATE score mandatory for shortlisting (minimum GATE score 50). Interview at NTPC HQ, Delhi. Bond period: 3 years.' },
]

const drives = {}
for (const d of driveDefs) {
  const drive = new Drive({
    company: companies[d.co]._id,
    title: d.title, jobType: d.jobType,
    compensation: { ctcLpa: d.ctc, stipend: d.stipend, details: d.compensationDetails },
    eligibilityCriteria: { branches: d.branches, batches: [2025], minCgpa: d.minCgpa, maxBacklogs: d.maxBacklogs, min10th: d.min10, min12th: d.min12 },
    tier: d.tier, vacancies: d.vacancies, season: SEASON,
    status: d.status, registrationDeadline: d.deadline, description: d.description,
  })
  await drive.save({ validateBeforeSave: false })
  drives[d.title] = drive
}
console.log(driveDefs.length + ' drives created')

// =============================================================================
// E. ROUNDS & INFO SESSIONS (detailed per drive)
// =============================================================================
console.log('\nCreating rounds and info sessions...')

const tcsDrive   = drives['TCS NQT — Software Engineer 2025 Batch']
const tcsRounds  = await Round.insertMany([
  { drive: tcsDrive._id, roundNumber: 1, name: 'TCS NQT Online Test', dateTime: daysAgo(50), mode: 'online', instructions: 'Aptitude test on TCS iON platform. 3 hours. Sections: Verbal Ability (25 min), Reasoning Ability (50 min), Numerical Ability (40 min), Programming Logic (30 min), Coding (60 min, 2 problems in C/C++/Java/Python).' },
  { drive: tcsDrive._id, roundNumber: 2, name: 'Technical Interview', dateTime: daysAgo(42), mode: 'online', meetingLink: 'https://meet.tcs.com/skit/round2', instructions: 'Core CS fundamentals: DSA (linked lists, trees, graphs, sorting), DBMS (normalization, SQL queries), OS (process scheduling, memory management), OOPs (polymorphism, inheritance). Keep your IDE ready.' },
  { drive: tcsDrive._id, roundNumber: 3, name: 'HR Interview', dateTime: daysAgo(38), mode: 'online', meetingLink: 'https://meet.tcs.com/skit/hr', instructions: 'Career goals (5-year plan), strengths & weaknesses, situational questions, relocation preference, bond acceptance. Formal attire mandatory.' },
])

const infyDrive   = drives['Infosys Systems Engineer — 2025 Batch']
const infyRounds  = await Round.insertMany([
  { drive: infyDrive._id, roundNumber: 1, name: 'Infosys Online Assessment', dateTime: daysAgo(35), mode: 'online', instructions: 'On InfyTQ platform. Pseudo Code (5 questions, 25 min), Reasoning (10 questions, 25 min), Maths (10 questions, 35 min), Verbal (20 questions, 20 min), English Writing Skill (1 essay, 15 min).' },
  { drive: infyDrive._id, roundNumber: 2, name: 'Technical Interview', dateTime: daysAgo(28), mode: 'online', instructions: 'Resume walk-through, 1–2 coding problems on shared editor, CS fundamentals based on resume projects. Project demo may be requested.' },
  { drive: infyDrive._id, roundNumber: 3, name: 'HR Interview', dateTime: daysAgo(25), mode: 'online', instructions: 'Standard HR: Tell me about yourself, Why Infosys, teamwork examples, salary discussion, relocation. 20–30 min.' },
])

const wiproDrive  = drives['Wipro National Talent Hunt — Software Engineer']
const wipro       = await Round.insertMany([
  { drive: wiproDrive._id, roundNumber: 1, name: 'AMCAT + Coding Test', dateTime: daysAgo(18), mode: 'online', instructions: 'Adaptive test on AMCAT platform (60 min) + 2 coding problems on HackerEarth (60 min). Coding: 1 easy + 1 medium DS/Algo problem. Minimum 50th percentile on AMCAT required.' },
  { drive: wiproDrive._id, roundNumber: 2, name: 'Technical Interview (Panel)', dateTime: daysAgo(3), mode: 'offline', venue: 'SKIT Seminar Hall 1, Main Block', instructions: 'Face-to-face panel: 2 interviewers. Java/Python OOPs, data structures (arrays, trees, graphs), DBMS queries, OS concepts. Resume projects discussion. Code on whiteboard.' },
  { drive: wiproDrive._id, roundNumber: 3, name: 'HR Interview', dateTime: daysFromNow(3), mode: 'offline', venue: 'SKIT Interview Room 2, Admin Block', instructions: 'Final HR round. Bond signing (1 year), offer discussion. Bring original certificates + 3 sets of photocopies.' },
])

const capgDrive   = drives['Capgemini GET — Graduate Engineer Trainee 2025']
const capgRounds  = await Round.insertMany([
  { drive: capgDrive._id, roundNumber: 1, name: 'Game-Based Assessment + Pseudocode Test', dateTime: daysFromNow(2), mode: 'online', instructions: '90 min. Part 1: Game-based cognitive assessment (30 min, 7 mini-games). Part 2: Pseudocode test (60 min, 5 questions on logic without actual coding).' },
  { drive: capgDrive._id, roundNumber: 2, name: 'Communication Assessment', dateTime: daysFromNow(5), mode: 'online', instructions: 'Spoken English assessment via AI platform. Read paragraphs, describe images, repeat sentences. No preparation needed — natural speech evaluated.' },
  { drive: capgDrive._id, roundNumber: 3, name: 'Technical + HR Interview (Merged)', dateTime: daysFromNow(7), mode: 'online', instructions: 'Single 45-min merged panel. Technical: OOPs concepts, 1 coding problem (easy), project discussion. HR: Why Capgemini, relocation, strengths.' },
])

const hclDrive    = drives['HCL TechBee — Fresh Graduate Engineer Programme']
const hclRounds   = await Round.insertMany([
  { drive: hclDrive._id, roundNumber: 1, name: 'Online Written Test', dateTime: daysFromNow(10), mode: 'online', instructions: 'HCL iSelectPro platform. 90 min. Quantitative Aptitude + Logical Reasoning + Verbal Ability + Technical MCQs (CS/Engineering fundamentals). No negative marking.' },
  { drive: hclDrive._id, roundNumber: 2, name: 'Technical Interview', dateTime: daysFromNow(16), mode: 'online', instructions: 'Resume review + CS/Engineering fundamentals based on branch. 30 min. 1 simple coding/logic question. Project discussion.' },
  { drive: hclDrive._id, roundNumber: 3, name: 'HR Interview', dateTime: daysFromNow(18), mode: 'online', instructions: 'Short 15-min HR discussion. Relocation preference, joining date, bond acceptance (1 year), career goals.' },
])

// Samsung PPT (mandatory info session)
const samsungDrive = drives['Samsung Research — Software Engineer (AI/ML)']
await InfoSession.create({
  drive: samsungDrive._id,
  title: 'Samsung R&D — Pre-Placement Talk & Campus Orientation',
  dateTime: daysFromNow(5),
  mode: 'offline',
  venue: 'SKIT Auditorium, Main Block',
  presenter: 'Dr. Rajesh Srivastava, Principal Researcher & Dr. Meenakshi Sundaram, Sr. Director HR, Samsung R&D',
  description: 'Mandatory PPT for all CSE/IT students applying for Samsung Research roles. Covers: Samsung global R&D ecosystem, project types (Exynos, Camera AI, Bixby), selection process walkthrough, life at Samsung Bangalore, compensation breakdown. Q&A session at end.',
  isMandatory: true,
})
await Round.insertMany([
  { drive: samsungDrive._id, roundNumber: 1, name: 'Samsung Online Coding Test', dateTime: daysFromNow(14), mode: 'online', instructions: 'HackerRank platform. 3 hours. 3 problems: 1 DS (easy–medium), 1 Algorithm (medium–hard), 1 System Design (theoretical). Languages: C++, Java, Python. Only top ~20% advance.' },
  { drive: samsungDrive._id, roundNumber: 2, name: 'Technical Interview Round 1 — DSA', dateTime: daysFromNow(21), mode: 'online', meetingLink: 'https://teams.microsoft.com/samsung/r1', instructions: 'Deep DSA: Trees, Graphs, Dynamic Programming. 2–3 problems on HackerRank shared screen. Must explain approach before coding. 60–90 min.' },
  { drive: samsungDrive._id, roundNumber: 3, name: 'Technical Interview Round 2 — System Design & Projects', dateTime: daysFromNow(23), mode: 'online', meetingLink: 'https://teams.microsoft.com/samsung/r2', instructions: 'System design question (design WhatsApp/Uber/etc.), deep dive into resume projects (ML projects preferred), AI/ML fundamentals if applicable.' },
  { drive: samsungDrive._id, roundNumber: 4, name: 'HR + Fitment Interview', dateTime: daysFromNow(25), mode: 'online', meetingLink: 'https://teams.microsoft.com/samsung/hr', instructions: 'Culture fit, research aptitude, 5-year vision, relocation to Bangalore (mandatory). Offer discussion if selected.' },
])

const microsoftDrive = drives['Microsoft SDE Internship + Full-time 2025']
await InfoSession.create({
  drive: microsoftDrive._id,
  title: 'Microsoft Campus Connect Session — SDE Roles',
  dateTime: daysFromNow(3),
  mode: 'online',
  meetingLink: 'https://teams.microsoft.com/microsoft/campus-connect',
  presenter: 'Rahul Bhat, University Recruiter & Ananya Krishnan, Senior SDE, Microsoft India',
  description: 'Information session on Microsoft SDE roles, interview process, life at Microsoft, and tips from recent campus hires. RSVP mandatory for eligibility confirmation.',
  isMandatory: true,
})
await Round.insertMany([
  { drive: microsoftDrive._id, roundNumber: 1, name: 'Online Assessment — Coding + Problem Solving', dateTime: daysFromNow(22), mode: 'online', instructions: 'HackerRank. 3 coding problems in 90 minutes. Difficulty: Medium–Hard (Leetcode scale). Topics: Dynamic programming, graphs, strings, trees. No IDE shortcuts — use raw editor.' },
  { drive: microsoftDrive._id, roundNumber: 2, name: 'Technical Interview 1 — Coding', dateTime: daysFromNow(28), mode: 'online', meetingLink: 'https://teams.microsoft.com/ms/t1', instructions: '2 DS/Algo problems. Must optimize from brute force → optimal. Code on CoderPad. Explain time & space complexity for every approach.' },
  { drive: microsoftDrive._id, roundNumber: 3, name: 'Technical Interview 2 — Coding + CS Fundamentals', dateTime: daysFromNow(29), mode: 'online', meetingLink: 'https://teams.microsoft.com/ms/t2', instructions: '1 coding problem + CS fundamentals (OS, DBMS, networking basics). Project deep-dive likely.' },
  { drive: microsoftDrive._id, roundNumber: 4, name: 'Technical Interview 3 — System Design', dateTime: daysFromNow(30), mode: 'online', meetingLink: 'https://teams.microsoft.com/ms/t3', instructions: 'Design a scalable system (URL shortener / notification service / search engine). Use whiteboard tool. Focus on scalability, reliability, trade-offs.' },
  { drive: microsoftDrive._id, roundNumber: 5, name: 'As-Appropriate (AA) Round — Bar Raiser', dateTime: daysFromNow(31), mode: 'online', meetingLink: 'https://teams.microsoft.com/ms/aa', instructions: 'Conducted by As-Appropriate interviewer from a different team. Mix of coding, design, and behavioral. Hiring bar evaluation.' },
])

const accentureDrive = drives['Accenture Associate Software Engineer 2025']
await Round.insertMany([
  { drive: accentureDrive._id, roundNumber: 1, name: 'Cognitive & Technical Online Assessment', dateTime: daysFromNow(12), mode: 'online', instructions: 'Mettl platform. 90 min. Cognitive Assessment: Logical Reasoning + Numerical Reasoning (25 min). Technical Assessment: Java/Python MCQs + 1 coding problem (45 min). Communication: AI-based spoken test (20 min).' },
  { drive: accentureDrive._id, roundNumber: 2, name: 'HR Interview', dateTime: daysFromNow(17), mode: 'online', instructions: 'Screening interview. Resume walkthrough, strengths/weaknesses, work mode preferences (hybrid/onsite), availability. 20–30 min.' },
])

const siemensDrive = drives['Siemens Graduate Engineer Trainee — 2025']
await Round.insertMany([
  { drive: siemensDrive._id, roundNumber: 1, name: 'Siemens Online Engineering Test', dateTime: daysFromNow(17), mode: 'online', instructions: '75 min. Domain-specific MCQs (Electrical/Electronics/Mechanical as applicable), Aptitude (Numerical Reasoning), English. Minimum 60% required to advance.' },
  { drive: siemensDrive._id, roundNumber: 2, name: 'Group Exercise & Case Presentation', dateTime: daysFromNow(22), mode: 'offline', venue: 'SKIT Seminar Hall 2, Tech Block', instructions: 'Group of 6–8 students. Engineering case problem given (30 min to analyze), then 10-min group presentation + Q&A. Evaluates teamwork, communication, problem-solving.' },
  { drive: siemensDrive._id, roundNumber: 3, name: 'Technical + HR Interview', dateTime: daysFromNow(25), mode: 'offline', venue: 'SKIT Interview Rooms, Admin Block', instructions: 'Single panel interview. Technical: Domain questions, project discussion, problem-solving scenario. HR: Siemens culture fit, relocation (Pune/Bangalore/Gurgaon), career path.' },
])

// LTTS PPT
const lttsDrive = drives['LTTS Graduate Engineer Trainee — 2025']
await InfoSession.create({
  drive: lttsDrive._id,
  title: 'LTTS Pre-Placement Orientation',
  dateTime: daysFromNow(10),
  mode: 'online',
  meetingLink: 'https://teams.microsoft.com/ltts/ppt',
  presenter: 'Arun Nair, Talent Acquisition Lead, LTTS',
  description: 'Introduction to LTTS: company overview, service lines (Embedded & Telecom, Industrial Products, Medical Devices, Plant Engineering), career growth path for GET, compensation details, and Q&A.',
  isMandatory: false,
})
await Round.insertMany([
  { drive: lttsDrive._id, roundNumber: 1, name: 'LTTS Online Aptitude + Domain Test', dateTime: daysFromNow(20), mode: 'online', instructions: '90 min. Aptitude: Verbal + Logical + Numerical (45 min). Domain Test: Engineering domain MCQs specific to your branch (ECE/EE/ME, 45 min). Minimum 60% in both sections required.' },
  { drive: lttsDrive._id, roundNumber: 2, name: 'Technical Interview', dateTime: daysFromNow(26), mode: 'online', instructions: 'Core domain + project deep-dive. ECE: Embedded C, Microcontrollers, communication protocols. EE: Power electronics, control systems. ME: Manufacturing, design principles. 45–60 min.' },
  { drive: lttsDrive._id, roundNumber: 3, name: 'HR Interview', dateTime: daysFromNow(28), mode: 'online', instructions: 'Motivation, relocation flexibility, project timelines, career goals. Offer discussion and joining date.' },
])

console.log('Rounds and info sessions created')

// =============================================================================
// F. APPLICATIONS (rich, varied statuses)
// =============================================================================
console.log('\nCreating applications...')

const getProfile = (roll) => studentUserMap[roll]?.profile
const getUser    = (roll) => studentUserMap[roll]?.user

async function applyStudent(roll, drive, overallStatus, roundStatuses) {
  const profile = getProfile(roll)
  if (!profile) return null
  return Application.create({
    student: profile._id,
    drive: drive._id,
    resumeSnapshot: {
      label: 'General Resume 2025',
      cloudinaryPublicId: 'pcms/resumes/' + roll + '_resume',
      cloudinarySecureUrl: 'https://res.cloudinary.com/pcms-skit/raw/upload/v1/resumes/' + roll + '_resume.pdf',
      originalFilename: 'Resume_' + roll + '.pdf',
      fileSize: 185000,
      mimeType: 'application/pdf',
    },
    overallStatus,
    roundStatuses: roundStatuses || [],
  })
}

// TCS (results_declared) — 10 applicants
const tcsApps = await Promise.all([
  applyStudent('B221001', tcsDrive, 'selected',       [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'cleared' }, { round: tcsRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221002', tcsDrive, 'rejected',       [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'not_cleared' }]),
  applyStudent('B221003', tcsDrive, 'offer_accepted', [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'cleared' }, { round: tcsRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221005', tcsDrive, 'selected',       [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'cleared' }, { round: tcsRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221101', tcsDrive, 'selected',       [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'cleared' }, { round: tcsRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221102', tcsDrive, 'rejected',       [{ round: tcsRounds[0]._id, status: 'not_cleared' }]),
  applyStudent('B221201', tcsDrive, 'selected',       [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'cleared' }, { round: tcsRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221301', tcsDrive, 'withdrawn',      []),
  applyStudent('B221401', tcsDrive, 'selected',       [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'cleared' }, { round: tcsRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221501', tcsDrive, 'rejected',       [{ round: tcsRounds[0]._id, status: 'cleared' }, { round: tcsRounds[1]._id, status: 'not_cleared' }]),
])

// Infosys (completed)
const infyApps = await Promise.all([
  applyStudent('B221001', infyDrive, 'offer_issued',  [{ round: infyRounds[0]._id, status: 'cleared' }, { round: infyRounds[1]._id, status: 'cleared' }, { round: infyRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221004', infyDrive, 'rejected',      [{ round: infyRounds[0]._id, status: 'not_cleared' }]),
  applyStudent('B221101', infyDrive, 'offer_accepted',[{ round: infyRounds[0]._id, status: 'cleared' }, { round: infyRounds[1]._id, status: 'cleared' }, { round: infyRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221105', infyDrive, 'selected',      [{ round: infyRounds[0]._id, status: 'cleared' }, { round: infyRounds[1]._id, status: 'cleared' }, { round: infyRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221201', infyDrive, 'selected',      [{ round: infyRounds[0]._id, status: 'cleared' }, { round: infyRounds[1]._id, status: 'cleared' }, { round: infyRounds[2]._id, status: 'cleared' }]),
  applyStudent('B221302', infyDrive, 'rejected',      [{ round: infyRounds[0]._id, status: 'cleared' }, { round: infyRounds[1]._id, status: 'not_cleared' }]),
  applyStudent('B221006', infyDrive, 'selected',      [{ round: infyRounds[0]._id, status: 'cleared' }, { round: infyRounds[1]._id, status: 'cleared' }, { round: infyRounds[2]._id, status: 'cleared' }]),
])

// Wipro (in_progress)
await Promise.all([
  applyStudent('B221001', wiproDrive, 'shortlisted',  [{ round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'cleared' }, { round: wipro[2]._id, status: 'pending' }]),
  applyStudent('B221002', wiproDrive, 'shortlisted',  [{ round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'cleared' }, { round: wipro[2]._id, status: 'pending' }]),
  applyStudent('B221005', wiproDrive, 'applied',      [{ round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' }]),
  applyStudent('B221101', wiproDrive, 'applied',      [{ round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' }]),
  applyStudent('B221102', wiproDrive, 'rejected',     [{ round: wipro[0]._id, status: 'not_cleared' }]),
  applyStudent('B221202', wiproDrive, 'applied',      [{ round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' }]),
  applyStudent('B221301', wiproDrive, 'applied',      [{ round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'pending' }]),
  applyStudent('B221106', wiproDrive, 'shortlisted',  [{ round: wipro[0]._id, status: 'cleared' }, { round: wipro[1]._id, status: 'cleared' }, { round: wipro[2]._id, status: 'pending' }]),
])

// Capgemini (registration_closed)
await Promise.all([
  applyStudent('B221001', capgDrive, 'applied', []),
  applyStudent('B221005', capgDrive, 'applied', []),
  applyStudent('B221006', capgDrive, 'applied', []),
  applyStudent('B221101', capgDrive, 'applied', []),
  applyStudent('B221105', capgDrive, 'applied', []),
  applyStudent('B221201', capgDrive, 'applied', []),
  applyStudent('B221203', capgDrive, 'applied', []),
  applyStudent('B221301', capgDrive, 'applied', []),
  applyStudent('B221401', capgDrive, 'applied', []),
])

// HCL (registration_open)
await Promise.all([
  applyStudent('B221004', hclDrive, 'applied', []),
  applyStudent('B221104', hclDrive, 'applied', []),
  applyStudent('B221204', hclDrive, 'applied', []),
  applyStudent('B221302', hclDrive, 'applied', []),
  applyStudent('B221402', hclDrive, 'applied', []),
  applyStudent('B221404', hclDrive, 'applied', []),
])

// Tech Mahindra internship
const tmDrive = drives['Tech Mahindra SMART Academy Internship 2025']
await Promise.all([
  applyStudent('B221004', tmDrive, 'applied', []),
  applyStudent('B221104', tmDrive, 'applied', []),
  applyStudent('B221202', tmDrive, 'applied', []),
  applyStudent('B221204', tmDrive, 'applied', []),
  applyStudent('B221005', tmDrive, 'applied', []),
  applyStudent('B221106', tmDrive, 'applied', []),
])

// Accenture (published)
await Promise.all([
  applyStudent('B221001', accentureDrive, 'applied', []),
  applyStudent('B221005', accentureDrive, 'applied', []),
  applyStudent('B221006', accentureDrive, 'applied', []),
  applyStudent('B221007', accentureDrive, 'applied', []),
  applyStudent('B221101', accentureDrive, 'applied', []),
  applyStudent('B221105', accentureDrive, 'applied', []),
  applyStudent('B221106', accentureDrive, 'applied', []),
])

// Samsung (published — only high CGPA CSE/IT)
await Promise.all([
  applyStudent('B221003', samsungDrive, 'applied', []),
  applyStudent('B221001', samsungDrive, 'applied', []),
  applyStudent('B221103', samsungDrive, 'applied', []),
  applyStudent('B221007', samsungDrive, 'applied', []),
])

// Microsoft (published — elite)
await Promise.all([
  applyStudent('B221003', microsoftDrive, 'applied', []),
  applyStudent('B221001', microsoftDrive, 'applied', []),
])

console.log('Applications created')

// =============================================================================
// G. OFFER LETTERS
// =============================================================================
console.log('\nCreating offer letters...')

// Find specific applications
const infyOfferApp = infyApps[0] // B221001 — offer_issued
if (infyOfferApp) {
  await OfferLetter.create({
    application: infyOfferApp._id,
    document: {
      cloudinaryPublicId: 'pcms/offers/B221001_infosys_offer',
      cloudinarySecureUrl: 'https://res.cloudinary.com/pcms-skit/raw/upload/v1/offers/B221001_infosys_offer.pdf',
      originalFilename: 'Infosys_OfferLetter_Aarav_Sharma_B221001.pdf',
      fileSize: 450000,
      mimeType: 'application/pdf',
    },
    issuedDate: daysAgo(10),
    responseDeadline: daysFromNow(5),
    status: 'pending',
    issuedBy: tpoUser._id,
  })
}

// TCS accepted offers for the placed students
const tcsAcceptedApp = tcsApps[2] // B221003 — offer_accepted
if (tcsAcceptedApp) {
  await OfferLetter.create({
    application: tcsAcceptedApp._id,
    document: {
      cloudinaryPublicId: 'pcms/offers/B221003_tcs_offer',
      cloudinarySecureUrl: 'https://res.cloudinary.com/pcms-skit/raw/upload/v1/offers/B221003_tcs_offer.pdf',
      originalFilename: 'TCS_OfferLetter_Rohan_Gupta_B221003.pdf',
      fileSize: 420000,
      mimeType: 'application/pdf',
    },
    issuedDate: daysAgo(30),
    responseDeadline: daysAgo(27),
    status: 'accepted',
    respondedAt: daysAgo(28),
    issuedBy: tpoUser._id,
  })
}

const infyAcceptedApp = infyApps[2] // B221101 — offer_accepted
if (infyAcceptedApp) {
  await OfferLetter.create({
    application: infyAcceptedApp._id,
    document: {
      cloudinaryPublicId: 'pcms/offers/B221101_infosys_offer',
      cloudinarySecureUrl: 'https://res.cloudinary.com/pcms-skit/raw/upload/v1/offers/B221101_infosys_offer.pdf',
      originalFilename: 'Infosys_OfferLetter_Riya_Agarwal_B221101.pdf',
      fileSize: 440000,
      mimeType: 'application/pdf',
    },
    issuedDate: daysAgo(15),
    responseDeadline: daysAgo(12),
    status: 'accepted',
    respondedAt: daysAgo(13),
    issuedBy: tpoUser._id,
  })
}

console.log('Offer letters created')

// =============================================================================
// H. NOTIFICATIONS (rich, per-user)
// =============================================================================
console.log('\nCreating notifications...')

const notifDefs = [
  // Student B221001 (Aarav)
  { roll: 'B221001', type: 'drive_published',      msg: 'New drive published: Samsung Research — Software Engineer (AI/ML). Check your eligibility and apply before the deadline.',                link: '/drives/' + samsungDrive._id,          read: false },
  { roll: 'B221001', type: 'application_confirmed', msg: 'Your application to TCS NQT — Software Engineer 2025 has been confirmed. Track your status in My Applications.',                      link: '/applications/my',                      read: true  },
  { roll: 'B221001', type: 'shortlisted',           msg: 'Congratulations! You have been shortlisted for Wipro National Talent Hunt — Technical Interview round. Venue: SKIT Seminar Hall 1.', link: '/applications/my',                      read: true  },
  { roll: 'B221001', type: 'drive_published',       msg: 'New drive published: Microsoft SDE Internship + Full-time 2025. CTC ₹45 LPA. Check your eligibility now.',                           link: '/drives/' + microsoftDrive._id,         read: false },
  { roll: 'B221001', type: 'deadline_approaching',  msg: 'Reminder: Capgemini GET registration closes in 24 hours. Apply now if eligible.',                                                     link: '/drives/' + capgDrive._id,              read: false },
  // Student B221003 (Rohan — placed)
  { roll: 'B221003', type: 'results_declared',      msg: 'TCS NQT results have been declared. You have been selected! Offer letter will be shared by TCS HR within 2 business days.',          link: '/applications/my',                      read: true  },
  { roll: 'B221003', type: 'offer_issued',          msg: 'Your TCS offer letter has been uploaded. Please review and accept/decline within 72 hours.',                                           link: '/applications/my',                      read: true  },
  { roll: 'B221003', type: 'drive_published',       msg: 'New drive published: Samsung Research — Software Engineer (AI/ML). CTC ₹14 LPA. Register now.',                                      link: '/drives/' + samsungDrive._id,           read: false },
  // Student B221101 (Riya — placed)
  { roll: 'B221101', type: 'application_confirmed', msg: 'Your application to Infosys Systems Engineer has been confirmed.',                                                                     link: '/applications/my',                      read: true  },
  { roll: 'B221101', type: 'results_declared',      msg: 'Infosys Systems Engineer results declared. Congratulations — you have been selected!',                                                link: '/applications/my',                      read: true  },
  { roll: 'B221101', type: 'offer_issued',          msg: 'Your Infosys offer letter is ready. Review and respond before the deadline.',                                                         link: '/applications/my',                      read: true  },
  { roll: 'B221101', type: 'general',               msg: 'Samsung R&D Pre-Placement Talk is scheduled on ' + daysFromNow(5).toDateString() + ' at SKIT Auditorium. Mandatory attendance.', link: '/drives/' + samsungDrive._id,          read: false },
  // Student B221004 (Sneha — struggling, low CGPA)
  { roll: 'B221004', type: 'application_confirmed', msg: 'Your application to HCL TechBee Programme has been confirmed.',                                                                        link: '/applications/my',                      read: true  },
  { roll: 'B221004', type: 'deadline_approaching',  msg: 'HCL TechBee written test is on ' + daysFromNow(10).toDateString() + '. Prepare your aptitude skills.',                              link: '/applications/my',                      read: false },
  { roll: 'B221004', type: 'general',               msg: 'Your profile completeness is 65%. Complete certifications and projects sections to improve your profile score.',                       link: '/profile',                              read: false },
]

for (const n of notifDefs) {
  const u = getUser(n.roll)
  if (!u) continue
  await Notification.create({ user: u._id, type: n.type, message: n.msg, link: n.link, read: n.read, emailSent: n.read })
}
console.log(notifDefs.length + ' notifications created')

// =============================================================================
// I. AUDIT LOGS (detailed admin actions)
// =============================================================================
console.log('\nCreating audit log entries...')

// Use insertMany directly (bypasses immutability hooks)
const auditDocs = [
  {
    actor: tpoUser._id,
    action: 'drive_status_change',
    target: { entityType: 'Drive', entityId: tcsDrive._id },
    reason: 'TCS confirmed final results via email. All selected candidates communicated. Moving drive to results_declared status.',
    metadata: { previousStatus: 'completed', newStatus: 'results_declared', driveTitle: 'TCS NQT — Software Engineer 2025 Batch' },
    timestamp: daysAgo(38),
  },
  {
    actor: tpoUser._id,
    action: 'drive_status_change',
    target: { entityType: 'Drive', entityId: infyDrive._id },
    reason: 'All interview rounds completed. Results communicated to students. Closing drive as completed.',
    metadata: { previousStatus: 'in_progress', newStatus: 'completed', driveTitle: 'Infosys Systems Engineer — 2025 Batch' },
    timestamp: daysAgo(25),
  },
  {
    actor: tpoUser._id,
    action: 'offer_issue',
    target: { entityType: 'Offer', entityId: new mongoose.Types.ObjectId() },
    reason: 'Issuing Infosys offer letter to Aarav Sharma (B221001) as per company instructions. Offer document received from Infosys HR on ' + daysAgo(12).toDateString() + '.',
    metadata: { studentRoll: 'B221001', studentName: 'Aarav Sharma', company: 'Infosys Limited', ctc: '3.6 LPA', responseDeadline: daysFromNow(5).toDateString() },
    timestamp: daysAgo(10),
  },
  {
    actor: coordUsers[DEPARTMENTS[0]]._id,
    action: 'bulk_shortlist_upload',
    target: { entityType: 'Drive', entityId: wiproDrive._id },
    reason: 'Wipro HR shared shortlist for Technical Interview round via email. Uploading bulk status update for 8 students who cleared AMCAT + Coding round.',
    metadata: { totalRows: 8, updated: 8, failed: 0, round: 'Technical Interview', driveTitle: 'Wipro National Talent Hunt' },
    timestamp: daysAgo(3),
  },
  {
    actor: tpoUser._id,
    action: 'rules_edit',
    target: { entityType: 'RulesPage', entityId: new mongoose.Types.ObjectId() },
    reason: 'Updated placement rules for Season 2024-25: Added clause 7.3 on digital offer acceptance deadline (72 hours), updated tier boundary table, added blacklisting procedure under clause 8.',
    metadata: { previousVersion: '0', newVersion: '1', changesSummary: 'Added offer acceptance deadline clause, updated tier table, added blacklist procedure' },
    timestamp: daysAgo(20),
  },
  {
    actor: tpoUser._id,
    action: 'company_create',
    target: { entityType: 'Company', entityId: companies['Microsoft India']._id },
    reason: 'Microsoft India confirmed campus participation for Season 2024-25. Adding company profile as received from Microsoft University Programs team.',
    metadata: { companyName: 'Microsoft India', sector: 'Technology', addedBy: 'TPO via Microsoft UR team email' },
    timestamp: daysAgo(25),
  },
  {
    actor: coordUsers[DEPARTMENTS[0]]._id,
    action: 'round_status_update',
    target: { entityType: 'Round', entityId: tcsRounds[1]._id },
    reason: 'TCS interviewer feedback received for Technical Interview. Updating individual candidate statuses as per TCS HR communication.',
    metadata: { round: 'Technical Interview', studentsUpdated: 7, cleared: 5, notCleared: 2 },
    timestamp: daysAgo(42),
  },
  {
    actor: tpoUser._id,
    action: 'student_profile_edit',
    target: { entityType: 'StudentProfile', entityId: studentUserMap['B221003']?.profile?._id ?? new mongoose.Types.ObjectId() },
    reason: 'Updated placement status of B221003 (Rohan Gupta) to Placed after TCS offer acceptance confirmation. Updated currentTier to 3.',
    metadata: { studentRoll: 'B221003', previousStatus: 'not_placed', newStatus: 'placed', currentTier: 3, company: 'TCS' },
    timestamp: daysAgo(28),
  },
]

await mongoose.connection.collection('auditlogs').insertMany(auditDocs)
console.log(auditDocs.length + ' audit log entries created')

// =============================================================================
// J. RESUME CHECKS (for 5 students)
// =============================================================================
console.log('\nCreating resume checks...')

function makeResumeCheck(roll, score, overrides = {}) {
  const p = getProfile(roll)
  const u = getUser(roll)
  if (!p || !u) return null

  const passed = Math.round(score * 13 / 100)
  const checks = [
    { id: 'email', name: 'Email Address', category: 'contact_info', passed: score > 50, description: 'Resume contains a valid email address', details: score > 50 ? 'Email found: ' + u.email : 'No email detected' },
    { id: 'phone', name: 'Phone Number', category: 'contact_info', passed: score > 40, description: 'Resume contains a phone number', details: score > 40 ? 'Phone number detected' : 'No phone number found' },
    { id: 'linkedin', name: 'LinkedIn Profile', category: 'contact_info', passed: score > 60, description: 'LinkedIn profile URL present', details: score > 60 ? 'LinkedIn URL found' : 'LinkedIn URL missing — add your LinkedIn profile' },
    { id: 'github', name: 'GitHub Profile', category: 'contact_info', passed: score > 70, description: 'GitHub profile URL present', details: score > 70 ? 'GitHub URL found' : 'GitHub URL missing — add your GitHub profile' },
    { id: 'education', name: 'Education Section', category: 'key_sections', passed: score > 30, description: 'Education section present', details: score > 30 ? 'Education section found' : 'Add your educational qualifications' },
    { id: 'skills', name: 'Skills Section', category: 'key_sections', passed: score > 40, description: 'Skills section present', details: score > 40 ? 'Skills section found' : 'Add a dedicated skills section' },
    { id: 'experience', name: 'Experience / Internship', category: 'key_sections', passed: score > 65, description: 'Work experience or internship listed', details: score > 65 ? 'Experience section found' : 'No experience listed — add internships, part-time work, or college positions' },
    { id: 'projects', name: 'Projects Section', category: 'key_sections', passed: score > 55, description: 'At least 2 projects listed', details: score > 55 ? 'Projects section found' : 'Add at least 2 academic or personal projects' },
    { id: 'certifications', name: 'Certifications', category: 'key_sections', passed: score > 70, description: 'Certifications listed', details: score > 70 ? 'Certifications found' : 'Add relevant certifications' },
    { id: 'achievements', name: 'Achievements / Awards', category: 'key_sections', passed: score > 75, description: 'Achievements or awards present', details: score > 75 ? 'Achievements section found' : 'Consider adding academic achievements, hackathon wins, etc.' },
    { id: 'pdf', name: 'PDF Format', category: 'formatting', passed: true, description: 'Resume is in PDF format', details: 'PDF format detected — correct format for ATS' },
    { id: 'length', name: 'Page Length (1–2 pages)', category: 'formatting', passed: score > 45, description: 'Resume is between 1 and 2 pages', details: score > 45 ? 'Resume length is appropriate (1–2 pages)' : 'Resume appears too long — condense to 1–2 pages' },
    { id: 'filename', name: 'Professional Filename', category: 'formatting', passed: score > 50, description: 'Resume filename follows professional naming convention', details: score > 50 ? 'Professional filename detected' : 'Rename file to format: Resume_Name_RollNumber.pdf' },
  ]

  const passedCount = checks.filter(c => c.passed).length
  const actualScore = Math.round((passedCount / 13) * 100)

  return {
    student: u._id,
    studentProfile: p._id,
    resume: {
      label: 'General Resume 2025',
      cloudinaryPublicId: 'pcms/resumes/' + roll + '_resume',
      cloudinarySecureUrl: 'https://res.cloudinary.com/pcms-skit/raw/upload/v1/resumes/' + roll + '_resume.pdf',
      originalFilename: 'Resume_' + roll + '.pdf',
    },
    checklistItems: checks,
    score: actualScore,
    totalChecks: 13,
    passedChecks: passedCount,
    completedAt: daysAgo(15),
  }
}

const resumeCheckDocs = [
  makeResumeCheck('B221001', 92),  // Aarav — excellent
  makeResumeCheck('B221003', 100), // Rohan — perfect
  makeResumeCheck('B221101', 85),  // Riya — good
  makeResumeCheck('B221004', 46),  // Sneha — below average
  makeResumeCheck('B221104', 38),  // Nikhil — poor
  makeResumeCheck('B221005', 77),  // Arjun — good
  makeResumeCheck('B221106', 85),  // Kartik — good
  makeResumeCheck('B221203', 92),  // Amit — excellent
]

for (const doc of resumeCheckDocs) {
  if (doc) await ResumeCheck.create(doc)
}
console.log('Resume checks created')

// =============================================================================
// K. CONTACTS DIRECTORY (20 entries)
// =============================================================================
console.log('\nCreating contacts directory...')
await Contact.insertMany([
  { name: 'Prof. Arvind Kumar Sharma',   role: 'Training & Placement Officer (TPO)',           department: 'T&P Cell',                              email: 'tpo@skit.ac.in',              phone: '0141-2785000' },
  { name: 'Ms. Reema Mathur',            role: 'Assistant Placement Coordinator',               department: 'T&P Cell',                              email: 'placement@skit.ac.in',        phone: '0141-2785001' },
  { name: 'Ms. Jyoti Singh',             role: 'Placement Executive',                           department: 'T&P Cell',                              email: 'jyoti.placement@skit.ac.in',  phone: '0141-2785002' },
  { name: 'Prof. Rajesh Sharma',         role: 'Department Placement Coordinator',              department: DEPARTMENTS[0],                           email: 'coord.cse@skit.ac.in',        phone: '9876543201' },
  { name: 'Dr. Sunita Agarwal',          role: 'Department Placement Coordinator',              department: DEPARTMENTS[1],                           email: 'coord.it@skit.ac.in',         phone: '9876543202' },
  { name: 'Prof. Vikram Singh',          role: 'Department Placement Coordinator',              department: DEPARTMENTS[2],                           email: 'coord.ece@skit.ac.in',        phone: '9876543203' },
  { name: 'Dr. Priya Meena',             role: 'Department Placement Coordinator',              department: DEPARTMENTS[3],                           email: 'coord.ee@skit.ac.in',         phone: '9876543204' },
  { name: 'Prof. Ankit Joshi',           role: 'Department Placement Coordinator',              department: DEPARTMENTS[4],                           email: 'coord.me@skit.ac.in',         phone: '9876543205' },
  { name: 'Dr. Kavita Sharma',           role: 'Department Placement Coordinator',              department: DEPARTMENTS[5],                           email: 'coord.ce@skit.ac.in',         phone: '9876543206' },
  { name: 'Prof. Deepak Mathur',         role: 'Department Placement Coordinator',              department: DEPARTMENTS[6],                           email: 'coord.mba@skit.ac.in',        phone: '9876543207' },
  { name: 'Dr. Alka Gupta',             role: 'Department Placement Coordinator',              department: DEPARTMENTS[7],                           email: 'coord.bsh@skit.ac.in',        phone: '9876543208' },
  { name: 'Priya Kapoor',               role: 'Campus Recruiter',                              department: 'Infosys Limited',                        email: 'priya.kapoor@infosys.com',    phone: '9980165432' },
  { name: 'Ramesh Iyer',                role: 'HR Manager - Campus',                           department: 'Tata Consultancy Services',              email: 'ramesh.iyer@tcs.com',         phone: '9987654321' },
  { name: 'Divya Krishnan',             role: 'University Relations Manager',                  department: 'Samsung R&D Institute',                  email: 'divya.k@samsung.com',         phone: '9654321098' },
  { name: 'Ritu Mehta',                 role: 'Campus Recruitment Lead',                       department: 'Deloitte India',                         email: 'ritu.mehta@deloitte.com',     phone: '9321098765' },
  { name: 'Rahul Bhat',                 role: 'University Recruiter',                          department: 'Microsoft India',                        email: 'rahul.bhat@microsoft.com',    phone: '9876500001' },
  { name: 'Swati Nair',                 role: 'University Programs Lead',                      department: 'Amazon India',                           email: 'swati.nair@amazon.com',       phone: '9876500002' },
  { name: 'Arun Nair',                  role: 'Talent Acquisition Lead',                       department: 'L&T Technology Services',                email: 'arun.nair@ltts.com',          phone: '9765432109' },
  { name: 'Pooja Reddy',                role: 'Campus Recruitment Manager',                    department: 'Accenture India',                        email: 'pooja.reddy@accenture.com',   phone: '9876512340' },
  { name: 'Preethi Kumar',              role: 'HR Business Partner - Campus',                  department: 'Siemens India',                          email: 'preethi.kumar@siemens.com',   phone: '9876500003' },
])
console.log('20 contacts created')

// =============================================================================
// L. ANNOUNCEMENTS (10 detailed entries)
// =============================================================================
console.log('\nCreating announcements...')
await Announcement.insertMany([
  {
    title: '🎉 Placement Season 2024-25 Officially Open — Welcome!',
    body: `Dear Students,\n\nThe T&P Cell is delighted to announce the commencement of Placement Season 2024-25 at SKIT, Jaipur.\n\nThis season, we have already received expressions of interest from 40+ companies across IT, Core Engineering, PSU, Consulting, and Management sectors.\n\n📋 Mandatory Actions for All Eligible Students:\n1. Complete your PCMS portal profile (100% completeness required before applying)\n2. Upload your latest resume in PDF format\n3. Run the ATS Resume Checklist and achieve a minimum score of 70%\n4. Read and digitally acknowledge the Placement Rules & Regulations\n5. Attend your department coordinator's orientation session\n\n📅 Key Dates:\n• Profile completion deadline: October 31, 2024\n• Resume upload deadline: November 1, 2024\n• Policy acknowledgment deadline: November 5, 2024\n\nFull placement calendar will be shared weekly via portal announcements and department coordinators.\n\nBest wishes for a successful placement season!\n\n— Prof. Arvind Kumar Sharma, TPO\n   T&P Cell, SKIT, Jaipur`,
    category: 'urgent', isPinned: true, postedBy: tpoUser._id, expiresAt: null,
  },
  {
    title: 'TCS NQT — 5 Students Selected! 🎊 Congratulations!',
    body: `Dear SKIT Family,\n\nWe are proud to announce that TCS has extended offers to 5 students from SKIT in the NQT drive for the Software Engineer role (CTC: ₹3.36 LPA).\n\n🏆 Selected Students:\n• Aarav Sharma (B221001) — CSE\n• Arjun Meena (B221005) — CSE\n• Riya Agarwal (B221101) — IT\n• Rahul Verma (B221201) — ECE\n• Sumit Sharma (B221401) — ME\n\nOffer letters will be received by the students directly on their registered email from TCS HR within 2 business days.\n\nReminder: Per placement policy, once you accept an offer, you are bound by the One-Offer Rule (see Rules & Regulations).\n\n🎉 Heartiest congratulations to all selected candidates!\n\n— T&P Cell, SKIT`,
    category: 'drive_specific', isPinned: true, postedBy: tpoUser._id, expiresAt: null,
  },
  {
    title: '⚠️ Mandatory: Policy Acknowledgment Before Any Application',
    body: `All students must read and digitally acknowledge the Placement Rules & Regulations before applying to ANY drive on the PCMS portal.\n\n📜 Key Policy Points to Note:\n• One-Offer Rule: Accept one offer per season (upgrades allowed)\n• Tier-Lock: Post offer acceptance, only higher-tier drives permitted\n• Offer Response Deadline: 72 hours from offer issuance (auto-expires after)\n• Blacklisting triggers: Reneging on accepted offer, 3+ no-shows, misrepresentation\n• Policy acknowledgment is mandatory — Apply button is disabled until acknowledged\n\n📍 How to Acknowledge:\nLogin → Left sidebar → "Rules & Regulations" → Read fully → Click "I Acknowledge"\n\nThis is a one-time action but must be re-done if the policy is updated.\n\n— T&P Cell, SKIT`,
    category: 'urgent', isPinned: true, postedBy: tpoUser._id, expiresAt: daysFromNow(60),
  },
  {
    title: '🏢 Samsung R&D Pre-Placement Talk — Mandatory for CSE/IT',
    body: `Samsung R&D Institute Bangalore will conduct a Pre-Placement Talk at SKIT.\n\n📅 Date: ${daysFromNow(5).toDateString()}\n🕙 Time: 10:00 AM — 12:30 PM\n📍 Venue: SKIT Auditorium, Main Block\n👔 Presenters: Dr. Rajesh Srivastava (Principal Researcher) & Dr. Meenakshi Sundaram (Sr. Director HR)\n\n✅ Attendance is MANDATORY for all CSE and IT students planning to apply for the Samsung Software Engineer (AI/ML) role (CTC: ₹14 LPA).\n\nStudents who do not attend the PPT will NOT be permitted to apply for the drive.\n\n📋 Carry your ID Card. Formal dress code.\n\nRegister your attendance by clicking "Interested" on the drive listing in PCMS.\n\n— T&P Cell, SKIT`,
    category: 'drive_specific', departmentScope: DEPARTMENTS[0], isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(5),
  },
  {
    title: 'Microsoft SDE Drive — Mandatory Campus Connect Session',
    body: `Microsoft India will host a Campus Connect online session for all shortlisted applicants.\n\n📅 Date: ${daysFromNow(3).toDateString()}\n🕙 Time: 3:00 PM — 5:00 PM\n💻 Platform: Microsoft Teams (link shared via PCMS notifications)\n🎤 Speakers: Rahul Bhat (University Recruiter) + Ananya Krishnan (Senior SDE)\n\nThis session is MANDATORY for all CSE/IT students who have applied or intend to apply for the Microsoft SDE role (CTC: ₹45 LPA).\n\nTopics covered: Interview process deep-dive, preparation tips, life at Microsoft, Q&A with current SDEs.\n\n— T&P Cell, SKIT`,
    category: 'drive_specific', departmentScope: DEPARTMENTS[1], isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(3),
  },
  {
    title: 'BHEL & NTPC PSU Drives Open — ECE & EE Students Apply Now',
    body: `Two prestigious Government PSU drives are now open for ECE and EE students:\n\n1️⃣ BHEL Engineer Trainee (ET) 2025\n• CTC: ₹6.5 LPA + Government benefits\n• Eligibility: ECE/EE, CGPA ≥ 6.5, No backlogs\n• Deadline: ${daysFromNow(25).toDateString()}\n\n2️⃣ NTPC Engineer Trainee 2025\n• CTC: ₹7.5 LPA + Township + Free electricity\n• Eligibility: ECE/EE, CGPA ≥ 7.0, GATE score mandatory\n• Deadline: ${daysFromNow(30).toDateString()}\n\n📌 Note on NTPC: Minimum GATE score of 50 required for shortlisting. Students who have appeared in GATE 2024 or earlier are eligible.\n\nLog into PCMS to check your eligibility and apply.\n\n— T&P Cell, SKIT`,
    category: 'drive_specific', isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(30),
  },
  {
    title: '📊 Mid-Season Placement Update — Season 2024-25',
    body: `Dear All,\n\nHere is the mid-season placement statistics update for Season 2024-25:\n\n📈 Summary (as of today):\n• Total Drives Completed/In Progress: 4\n• Total Offers Extended: 12\n• Total Offers Accepted: 8\n• Highest CTC: ₹14 LPA (Samsung R&D — ongoing)\n• Average CTC (accepted offers): ₹4.2 LPA\n\n🏆 Department-wise Placements:\n• CSE: 3 placed | IT: 2 placed | ECE: 1 placed\n• EE: 0 | ME: 1 placed | CE: 0 | MBA: 1 placed\n\n📅 Upcoming Drives:\n• Samsung R&D (₹14 LPA) — CSE/IT — ${daysFromNow(12).toDateString()}\n• Microsoft SDE (₹45 LPA) — CSE/IT — ${daysFromNow(20).toDateString()}\n• NTPC ET (₹7.5 LPA) — ECE/EE — ${daysFromNow(30).toDateString()}\n• L&T Civil GET (₹5.5 LPA) — ME/CE — Coming soon\n\n— Prof. Arvind Kumar Sharma, TPO`,
    category: 'general', isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(30),
  },
  {
    title: '📄 Resume Upload & ATS Checklist — Final Reminder',
    body: `This is the final reminder for all students who have not yet uploaded their resume on PCMS.\n\n⏰ Deadline: ${daysFromNow(3).toDateString()} (after this date, students cannot apply to any active drive until resume is uploaded)\n\n📋 Resume Requirements:\n• Format: PDF only\n• Size: Under 2 MB\n• Pages: 1–2 pages only\n• Filename: Resume_YourName_RollNumber.pdf\n• ATS Score: Minimum 70/100 (run via Resume Checklist in your profile)\n\n🔑 Resume Tips for SKIT Students:\n1. Lead with your strongest project (not education)\n2. Quantify achievements (e.g., "Improved efficiency by 30%")\n3. Include GitHub/LinkedIn links\n4. Remove photos, QR codes, and graphics (ATS unfriendly)\n5. Use standard fonts: Calibri, Arial, Times New Roman\n\nAccess Resume Checklist: Profile → Resume Checklist tab\n\n— T&P Cell, SKIT`,
    category: 'general', isPinned: false, postedBy: tpoUser._id, expiresAt: daysFromNow(5),
  },
  {
    title: 'Wipro WNTH — HR Round Scheduled on Campus (All Shortlisted Students)',
    body: `All students shortlisted for the Wipro National Talent Hunt HR Interview round must report as follows:\n\n📅 Date: ${daysFromNow(3).toDateString()}\n🕙 Time: 10:00 AM onwards (slot-based, check PCMS for your slot time)\n📍 Venue: SKIT Interview Room 2, Admin Block, Ground Floor\n\n📋 Documents Required (Original + 3 sets of photocopies):\n1. College ID Card\n2. All semester mark sheets\n3. 10th and 12th certificates\n4. Aadhaar Card\n5. 5 passport-size photographs\n6. Printed copy of offer letter (download from PCMS if not received)\n\n⚠️ Bond Signing: Wipro requires a 1-year bond. Read the bond document carefully before signing.\n\nShortlisted students (B221001, B221002, B221106): Please check your PCMS notifications for the exact slot timing.\n\n— Prof. Rajesh Sharma, CSE Dept. Placement Coordinator`,
    category: 'drive_specific', departmentScope: DEPARTMENTS[0], isPinned: false, postedBy: coordUsers[DEPARTMENTS[0]]._id, expiresAt: daysFromNow(4),
  },
  {
    title: 'Deloitte Consulting Drive — MBA Students (Last Few Spots)',
    body: `The Deloitte Consulting Business Analyst drive has only 3 seats remaining for SKIT students.\n\n📌 Drive Details:\n• Role: Business Analyst (Strategy & Consulting)\n• CTC: ₹7.5 LPA + Variable Pay\n• Location: Bangalore / Mumbai / Delhi\n• Eligibility: MBA students, CGPA ≥ 7.5, No backlogs, 10th & 12th ≥ 70%\n• Deadline: ${daysFromNow(14).toDateString()}\n\n📋 Selection Process:\n1. Resume Screening (by Deloitte team)\n2. Case Study Round (45 min, business case analysis)\n3. Group Discussion (15 min on current affairs / business topic)\n4. Personal Interview (2 rounds, focus on case methodology and leadership)\n\n📚 Preparation Resources (from T&P Cell library):\n• Case in Point by Marc Cosentino\n• Consulting Case Interview Prep guide (available in T&P room)\n\nInterested MBA students — apply now on PCMS before the deadline!\n\n— Prof. Deepak Mathur, MBA Dept. Placement Coordinator`,
    category: 'drive_specific', departmentScope: DEPARTMENTS[6], isPinned: false, postedBy: coordUsers[DEPARTMENTS[6]]._id, expiresAt: daysFromNow(14),
  },
])
console.log('10 announcements created')

// =============================================================================
// M. FAQ (15 detailed entries)
// =============================================================================
console.log('\nCreating FAQ entries...')
await FAQ.insertMany([
  {
    question: 'What is the One-Offer Rule and how does it work?',
    answer: 'Once you accept an offer from any company during the current placement season, you are considered "placed." After this:\n• You can ONLY apply to drives at a strictly higher tier than your accepted offer (lower tier number = better offer)\n• You CANNOT apply to same-tier or lower-tier drives\n• Example: You accepted a Tier 3 offer (TCS ₹3.36 LPA). You can apply to Tier 2 (₹6-10 LPA) or Tier 1 (₹10+ LPA) drives, but NOT to other Tier 3 or Tier 4 companies.\n\nThis rule is enforced automatically by the PCMS portal — the Apply button will be disabled for ineligible drives.',
    category: 'Placement Policy', tags: ['one-offer', 'policy', 'tier', 'placed'], isPublished: true,
  },
  {
    question: 'What are the tier classifications for drives?',
    answer: 'SKIT uses a 5-tier classification for placement drives based on CTC offered:\n\n• Tier 1: CTC > ₹10 LPA (Dream Companies — Microsoft, Google, Samsung R&D, etc.)\n• Tier 2: CTC ₹6–10 LPA (Premium Companies — NTPC, BHEL, L&T, Deloitte, etc.)\n• Tier 3: CTC ₹3.5–6 LPA (Core Companies — TCS, Infosys, Wipro, Accenture, etc.)\n• Tier 4: CTC ₹2.5–3.5 LPA (Mass Recruiters — HCL TechBee, etc.)\n• Tier 5: Below ₹2.5 LPA or Internship Stipend\n\nTier-Lock Rule: Once placed at a tier, you can only upgrade to a strictly better (lower-numbered) tier.',
    category: 'Placement Policy', tags: ['tier', 'ctc', 'classification', 'policy'], isPublished: true,
  },
  {
    question: 'How is my eligibility for a drive calculated?',
    answer: 'The PCMS portal automatically evaluates your eligibility for every drive based on:\n\n1. CGPA: Your current CGPA must meet or exceed the drive\'s minimum CGPA cutoff\n2. Active Backlogs: Your active backlogs must not exceed the drive\'s maximum allowed backlogs (0 means no backlogs)\n3. 10th %: Your 10th board percentage must meet the cutoff\n4. 12th %: Your 12th board percentage must meet the cutoff\n5. Branch: Your department must be in the drive\'s allowed branches list\n6. Batch Year: Your graduation batch must match (usually 2025)\n7. Blacklist: Blacklisted students are automatically ineligible\n8. One-Offer/Tier-Lock: Placed students follow tier upgrade rules\n\nYou can see your eligibility status (with specific reasons if ineligible) on the Drive List page.',
    category: 'Eligibility', tags: ['eligibility', 'cgpa', 'backlogs', 'criteria', 'calculation'], isPublished: true,
  },
  {
    question: 'What happens if my CGPA drops between applying and the interview?',
    answer: 'Eligibility is evaluated at the TIME OF APPLICATION SUBMISSION. If your CGPA drops after successfully submitting your application:\n\n• Your existing application is NOT retroactively invalidated\n• You continue to be eligible for rounds you\'ve already cleared\n• However, if you have NOT yet applied and your CGPA drops, you will be shown as ineligible for that drive\n\nNote: If a drive\'s criteria specifies "No active backlogs at time of joining" (some companies verify before offer release), and you incur a backlog after applying, the company may verify during pre-employment background check. Always maintain your academic performance.',
    category: 'Eligibility', tags: ['cgpa', 'backlogs', 'eligibility', 'applied'], isPublished: true,
  },
  {
    question: 'How do I accept or decline an offer letter?',
    answer: 'When an offer letter is issued:\n1. You receive an in-app notification and email notification\n2. Go to "My Applications" in the left sidebar\n3. Find the drive with status "Offer Issued" — click "View Offer"\n4. Review the offer document carefully (check joining date, location, compensation, bond)\n5. Click "Accept Offer" or "Decline Offer"\n6. Confirm your decision in the popup — this action is FINAL\n\n⚠️ Important:\n• You have exactly 72 hours from the time the offer is issued to respond\n• After 72 hours, the offer automatically EXPIRES and you cannot respond\n• Once you accept, your placement status is updated and One-Offer Rule applies\n• Reneging on an accepted offer (later declining after accepting) may lead to blacklisting',
    category: 'Applications', tags: ['offer', 'accept', 'decline', 'deadline', '72 hours'], isPublished: true,
  },
  {
    question: 'Can I withdraw my application? What are the conditions?',
    answer: 'Yes, you can withdraw your application, but only before the drive\'s registration deadline.\n\n✅ Withdrawal Allowed:\n• Application submitted but registration deadline has NOT passed\n• Go to "My Applications" → Find the drive → Click "Withdraw Application"\n• Confirm in the popup\n\n❌ Withdrawal NOT Allowed:\n• After the registration deadline has passed\n• If your application is in "Shortlisted," "Selected," or "Offer Issued" status (contact T&P Cell directly for special cases)\n\n📌 Important: Withdrawing an application does NOT affect your placement status. It simply removes you from that drive\'s applicant list. It does NOT count as a "no-show" for the purpose of blacklisting.',
    category: 'Applications', tags: ['withdraw', 'application', 'deadline', 'cancel'], isPublished: true,
  },
  {
    question: 'How does first-time login work for newly imported students?',
    answer: 'If you are a newly provisioned student (added by T&P Cell via CSV import):\n\n1. You receive an email from noreply@pcms.skit.ac.in with a temporary password\n2. Go to: http://localhost:5173/activate (or the PCMS portal URL)\n3. Enter your registered institute email\n4. Enter the temporary password from the email\n5. Set a new password of your choice (minimum 8 characters, must include uppercase, number, special character)\n6. You are automatically logged in and redirected to your dashboard\n\n⚠️ Note: In development mode, the temporary password is also printed in the server console (visible to your IT admin). In production, only the email delivery is used.\n\n🔑 If you lose the temporary password: Contact your department placement coordinator or the T&P Cell.',
    category: 'Account & Login', tags: ['activation', 'login', 'password', 'new student', 'temporary password'], isPublished: true,
  },
  {
    question: 'I did not receive my OTP for login. What should I do?',
    answer: 'If you are not receiving the OTP email:\n\n1. Check your spam/junk folder for emails from noreply@pcms.skit.ac.in or the configured SMTP sender\n2. Wait at least 60 seconds — OTP delivery can take up to 1 minute\n3. Click "Resend OTP" (available after 60 seconds on the login page)\n4. Ensure you are entering the correct registered institute email\n5. Try a different browser or disable browser extensions (some ad-blockers interfere)\n\nIf the problem persists after 3 attempts:\n• Contact your department placement coordinator\n• Email: placement@skit.ac.in with your roll number and registered email\n• Visit the T&P Cell room (Admin Block, Room 102) during working hours (9 AM – 5 PM)\n\n⚠️ Note for developers: In development mode, OTPs are logged in the server console — check the terminal where the server is running.',
    category: 'Account & Login', tags: ['otp', 'login', 'email', 'not received', 'spam'], isPublished: true,
  },
  {
    question: 'How does the Resume ATS Checklist work? What is a good score?',
    answer: 'The Resume ATS Checklist automatically analyzes your uploaded resume PDF against 13 checks across 3 categories:\n\n📞 Contact Info (4 checks):\n• Email address present\n• Phone number present\n• LinkedIn profile URL present\n• GitHub profile URL present\n\n📄 Key Sections (6 checks):\n• Education section\n• Skills section\n• Experience/Internship section\n• Projects section (at least 2)\n• Certifications section\n• Achievements/Awards section\n\n📐 Formatting (3 checks):\n• PDF format\n• Page length 1–2 pages\n• Professional filename (Resume_Name_Roll.pdf)\n\n🎯 Score Interpretation:\n• 90–100: Excellent — Ready to apply to any drive\n• 70–89: Good — Apply, but improve flagged items\n• 50–69: Average — Improve before applying to premium companies\n• Below 50: Poor — Significant improvements needed\n\nAccess via: Profile → Resume Checklist tab → Select resume → Run Checklist',
    category: 'Resume', tags: ['resume', 'ats', 'checklist', 'score', '13 checks'], isPublished: true,
  },
  {
    question: 'What happens if I miss a scheduled interview round?',
    answer: 'If you are shortlisted for a round but do not attend:\n\n✅ Excused Absence (acceptable):\n• You notify your department placement coordinator at least 24 hours in advance in writing\n• You have a valid reason (medical emergency, family crisis)\n• The coordinator communicates with the company HR on your behalf\n\n❌ Unexcused Absence (no-show):\n• Your application status is marked "Absent" for that round\n• Application is typically moved to "Rejected" unless the company allows re-scheduling\n• This is recorded in your PCMS profile\n\n⚠️ Blacklisting Risk:\n• 3 or more unexcused no-shows in a single placement season may result in TEMPORARY suspension from further drives\n• Extreme cases (impersonation, deliberate avoidance) may result in permanent blacklisting\n\n📱 Always check your PCMS notifications and registered email for round schedule updates.',
    category: 'Placement Policy', tags: ['absent', 'no-show', 'interview', 'missed', 'blacklist'], isPublished: true,
  },
  {
    question: 'Can a coordinator from one department see my profile?',
    answer: 'No. PCMS enforces strict department-level data scoping:\n\n• A CSE Department Coordinator can ONLY see CSE students, CSE-scoped drives, and CSE student applications\n• An ECE Coordinator has zero visibility into CSE, IT, or ME student data\n• Cross-department data is accessible ONLY to the TPO (Training & Placement Officer / Super Admin)\n\nThis is enforced at the database query level — it is not just a UI restriction. Even if a coordinator tried to access another department\'s data via the API, the backend rejects the request.\n\nYour personal data (profile, applications, offer status) is visible to:\n• You (always)\n• Your department coordinator\n• The TPO\n• No one else',
    category: 'Privacy & Security', tags: ['coordinator', 'department', 'privacy', 'scope', 'data access'], isPublished: true,
  },
  {
    question: 'How do I update my CGPA or academic details on my profile?',
    answer: 'You can update your academic profile at any time before applying to a drive:\n\n1. Login → Left sidebar → "My Profile"\n2. Click on the "Academic" tab\n3. Update your CGPA, active backlogs, 10th %, 12th %, semester-wise CGPA\n4. Click "Save Changes"\n\n⚠️ Important Notes:\n• Your CGPA update immediately affects your eligibility for all drives on the portal\n• Misrepresentation of academic data is a serious violation and can result in disqualification + blacklisting\n• The T&P Cell may cross-verify your academic data with the examination cell\n• If you incur a new backlog, update your "Active Backlogs" count immediately\n\n📌 Semester CGPA: You can enter semester-wise CGPA (1st sem to 8th sem) for a detailed academic profile that companies may request.',
    category: 'Profile', tags: ['cgpa', 'profile', 'academic', 'update', 'backlogs'], isPublished: true,
  },
  {
    question: 'What is the GATE score requirement for PSU drives?',
    answer: 'Some Government PSU drives on PCMS (like NTPC) mandate a GATE score for shortlisting. Here\'s what you need to know:\n\n📌 GATE Score Requirement (Drive-specific):\n• NTPC ET 2025: Minimum GATE score of 50 (normalized) in EE or ECE paper\n• BHEL ET 2025: Does NOT require GATE — has its own written test\n• Other PSUs (REIL, state-level): Varies — check each drive\'s eligibility section\n\n🔑 GATE Eligibility Check:\n• Your GATE score is not stored in PCMS — the eligibility check for GATE drives is based on the drive\'s stated criteria\n• You must self-declare your GATE score during the application, and original scorecard verification happens at the interview stage\n\n📅 GATE Eligibility Window:\n• GATE scores are typically valid for 3 years\n• GATE 2022, 2023, and 2024 scores are all valid for 2025 recruitment drives\n\nContact your department coordinator or the T&P Cell for GATE-specific guidance.',
    category: 'Eligibility', tags: ['gate', 'psu', 'ntpc', 'bhel', 'score', 'requirement'], isPublished: true,
  },
  {
    question: 'How does the placement calendar and round scheduling work?',
    answer: 'PCMS provides a unified placement calendar that aggregates all your upcoming events:\n\n📅 What appears in your calendar:\n• Interview Rounds for drives you have APPLIED to (and not been rejected)\n• Pre-Placement Talks (Info Sessions) for drives you are eligible for\n• Registration deadlines for drives with open registration\n\n📍 Accessing Your Calendar:\n• Left sidebar → "My Calendar"\n• View by agenda (default) or switch to date view\n• Events are color-coded: Rounds (blue), Info Sessions (purple), Deadlines (red)\n\n⚡ Conflict Detection:\n• If two rounds overlap in time, both events are flagged with a warning badge\n• Contact your coordinator IMMEDIATELY if you have a confirmed time conflict\n\n📲 ICS Export:\n• Click "Export Calendar" on the Calendar page\n• Import the .ics file into Google Calendar, Outlook, or Apple Calendar\n• Events update in PCMS but the exported file is a snapshot',
    category: 'General', tags: ['calendar', 'rounds', 'schedule', 'ics', 'conflict'], isPublished: true,
  },
  {
    question: 'How do I contact the T&P Cell for urgent placement matters?',
    answer: 'For urgent placement-related queries:\n\n📞 T&P Cell Contact Information:\n• TPO: Prof. Arvind Kumar Sharma — tpo@skit.ac.in | 0141-2785000\n• Placement Executive: Ms. Reema Mathur — placement@skit.ac.in | 0141-2785001\n• T&P Cell Room: Admin Block, 1st Floor, Room 102\n• Working Hours: Monday–Saturday, 9:00 AM – 5:00 PM\n\n🏢 Department Coordinators:\n• CSE: Prof. Rajesh Sharma — coord.cse@skit.ac.in | 9876543201\n• IT: Dr. Sunita Agarwal — coord.it@skit.ac.in\n• ECE: Prof. Vikram Singh — coord.ece@skit.ac.in\n• EE: Dr. Priya Meena — coord.ee@skit.ac.in\n• ME: Prof. Ankit Joshi — coord.me@skit.ac.in\n• CE: Dr. Kavita Sharma — coord.ce@skit.ac.in\n• MBA: Prof. Deepak Mathur — coord.mba@skit.ac.in\n• BSH: Dr. Alka Gupta — coord.bsh@skit.ac.in\n\n📱 For company HR contacts, visit: PCMS → Contacts Directory\n\nDO NOT contact company HRs directly without prior approval from the T&P Cell.',
    category: 'General', tags: ['contact', 'tp cell', 'coordinator', 'help', 'urgent'], isPublished: true,
  },
])
console.log('15 FAQ entries created')

// =============================================================================
// N. PLACEMENT RULES PAGE
// =============================================================================
console.log('\nCreating placement rules page...')
await RulesPage.create({
  content: `# SKIT Placement Rules & Regulations — Season 2024-25

*Swami Keshvanand Institute of Technology, Management & Gramothan, Jaipur*
*Training & Placement (T&P) Cell*

These rules are binding for ALL students participating in campus placement activities organized by the T&P Cell, SKIT for Season 2024-25.

---

## 1. General Eligibility

**1.1** Only final-year students (Batch 2025) are eligible for full-time placement drives unless otherwise stated.

**1.2** Students must have NO active backlogs at the time of applying to any drive (unless the specific drive allows backlogs — check drive eligibility criteria).

**1.3** Students on academic probation or with pending disciplinary actions are not eligible.

**1.4** CGPA, 10th, and 12th percentages must meet or exceed each drive's minimum criteria. The PCMS portal computes eligibility automatically.

**1.5** All academic data on your PCMS profile must be accurate and up to date. Misrepresentation is a serious violation (see Section 7).

---

## 2. One-Offer Rule

**2.1** Once a student formally ACCEPTS an offer from any company during Season 2024-25, they are considered **"placed"** for this season.

**2.2** A placed student may ONLY apply to drives at a **strictly higher tier** than their current accepted offer (lower tier number = better offer).

**2.3** A placed student CANNOT apply to drives at the same tier or a lower tier.

**2.4** The PCMS portal enforces this rule automatically — the Apply button is disabled for ineligible drives.

**2.5** The One-Offer Rule resets at the start of each new placement season.

---

## 3. Tier Classification

| Tier | CTC Range | Examples |
|------|-----------|---------|
| Tier 1 | > ₹10 LPA | Microsoft, Google, Samsung R&D, NTPC |
| Tier 2 | ₹6–10 LPA | BHEL, L&T, Deloitte, Siemens, Capgemini |
| Tier 3 | ₹3.5–6 LPA | TCS, Infosys, Wipro, Accenture |
| Tier 4 | ₹2.5–3.5 LPA | HCL TechBee, mass recruiters |
| Tier 5 | Below ₹2.5 LPA | Entry-level / Internship stipend |

---

## 4. Offer Acceptance & Response

**4.1** Students must accept or decline offers within **72 hours** of issuance. The timer begins from the timestamp on the PCMS offer notification.

**4.2** Offers not responded to within the deadline are automatically **expired** by the system. Expired offers cannot be accepted.

**4.3** Accepting an offer and subsequently reneging (declining after accepting, or not joining) **without prior written approval** from the TPO may result in blacklisting and may damage SKIT's relationship with the company.

**4.4** Offer acceptance is a FINAL action. Contact the TPO BEFORE accepting if you have concerns about the offer terms.

---

## 5. Interview Conduct & Attendance

**5.1** Shortlisted students MUST attend all scheduled interview rounds (aptitude test, technical interview, HR interview, etc.) for every drive they have applied to.

**5.2** Non-attendance without prior written notice (minimum 24 hours in advance to your department coordinator) will be marked as **"Absent"** for that round.

**5.3** Absent marks are recorded in the PCMS system against your profile.

**5.4** **Three (3) or more absent marks** in Season 2024-25 will result in temporary suspension from further placement drives for the remainder of the season.

**5.5** Impersonation, plagiarism during aptitude tests, misrepresentation of credentials, or any form of academic dishonesty during the placement process is grounds for **immediate and permanent disqualification**.

**5.6** Professional dress code is mandatory for all in-person rounds (formal business attire). Follow company-specific dress codes if communicated.

---

## 6. Communication & Information

**6.1** All official placement communications are posted on the PCMS portal (Announcements section) and sent to your registered institute email.

**6.2** Students are responsible for regularly checking their institute email and PCMS portal notifications. "I didn't see the notification" is NOT an accepted excuse.

**6.3** All queries must be directed to your **department placement coordinator first**, then to the T&P Cell. Do NOT contact company HR representatives directly without explicit permission.

**6.4** Sharing placement-related communications (drive details, shortlists, offer details) on social media or with students from other institutions before official announcement is prohibited.

---

## 7. Data Accuracy & Integrity

**7.1** Students are solely responsible for maintaining accurate and current academic data (CGPA, backlogs, 10th/12th %) on their PCMS profile.

**7.2** Submitting a resume to a company drive that overstates your CGPA, understates your backlogs, or misrepresents your credentials is a **serious violation** that will result in immediate disqualification from all drives and potential blacklisting.

**7.3** The T&P Cell may verify academic data with the examination cell at any time. Discrepancies will be investigated.

---

## 8. Blacklisting

**8.1** Blacklisting may result from any of the following:
- Accepting and subsequently reneging on a job offer without TPO approval
- 3 or more unexcused no-shows in one placement season
- Misrepresentation of academic credentials or project experience
- Impersonation or academic dishonesty during any placement activity
- Sharing confidential placement information externally
- Serious misconduct during interviews that damages SKIT's reputation

**8.2** Blacklisting decisions are made by the **TPO** after proper inquiry. All blacklisting actions are recorded in the PCMS audit log with reasons.

**8.3** A blacklisted student may appeal to the Institute's grievance committee within 15 days of the blacklisting decision.

**8.4** Blacklisting is recorded in the student's PCMS profile and cannot be removed without the committee's approval.

---

## 9. Policy Acknowledgment

**9.1** All students must read these Rules & Regulations in full and digitally acknowledge them on the PCMS portal before submitting their first application.

**9.2** The acknowledgment is versioned — if the policy is updated, students must re-acknowledge before applying again.

**9.3** The "Apply" button is disabled until a valid, current-version acknowledgment is recorded.

---

## 10. Amendments

The T&P Cell reserves the right to amend these rules at any time. Students will be notified of significant amendments via PCMS announcements and are required to re-acknowledge the updated policy.

---

*Document Version: 1 | Effective: October 2024 | Season: 2024-25*
*T&P Cell, SKIT, Jaipur — tpo@skit.ac.in | 0141-2785000*`,
  version: 1,
  editor: tpoUser._id,
  editedAt: daysAgo(20),
})
console.log('Placement rules page created')

// =============================================================================
// DISCONNECT & SUMMARY
// =============================================================================
await mongoose.disconnect()

console.log(`
=================================================================
  SKIT PCMS Detailed Demo Seed Complete — Season ${SEASON}
=================================================================

 ACCOUNTS CREATED
 ----------------
 Role         Email                     Password
 TPO          tpo@skit.ac.in            Tpo@1234
 Coordinator  coord.cse@skit.ac.in      Coord@1234 (all 8 depts)
 Student      b221001@skit.ac.in        Student@1234 (all 50)

 DETAILED DEMO DATA
 ------------------
   20  companies (IT, Engineering, PSU, Consulting, Tech)
   15  drives (draft → results_declared, all lifecycle stages)
   50  students across 8 SKIT departments (rich profiles)
    8  coordinators (one per department)
   Certifications, projects, skills, semester CGPA for each student
   Rich applications with round statuses (TCS, Infosys, Wipro, HCL, TM, Samsung, Microsoft, Accenture)
   Detailed rounds (3–5 per drive with full instructions)
    3  offer letters (pending, accepted × 2)
   ${notifDefs.length}  notifications across students
    8  audit log entries (drive status, offer issue, bulk upload, etc.)
    8  resume check results with 13-point checklist
   10  announcements (pinned + dept-specific + general)
   15  FAQ entries (detailed answers)
   20  contacts directory entries
    1  Placement Rules & Regulations (detailed 10-section document)
    1  Season config 2024-25

 HOW TO EXPLORE
 --------------
  1. TPO        → tpo@skit.ac.in           | Full stats, all drives, audit log, rules edit
  2. Coordinator → coord.cse@skit.ac.in    | CSE-only scoped view, applicant management
  3. High CGPA Student → b221001@skit.ac.in (8.7 CGPA) | Multiple applications, offer pending
  4. Placed Student    → b221003@skit.ac.in (9.1 CGPA) | Accepted TCS offer
  5. Low CGPA Student  → b221004@skit.ac.in (6.8 CGPA) | Limited eligibility scenario
  6. MBA Student       → b221601@skit.ac.in (8.2 CGPA) | Deloitte eligible

  URL: http://localhost:5173/login
=================================================================
`)
