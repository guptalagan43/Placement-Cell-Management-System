// Seed script to create dummy contacts for the Contacts Directory.
// Run with: node src/scripts/seed-contacts.js
import { loadEnv } from '../config/env.js'
import { connectDB } from '../db/connect.js'
import Contact from '../models/Contact.model.js'

// Load .env file if present (development) - from server directory
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const serverRoot = join(__dirname, '..', '..')

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(join(serverRoot, '.env'))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
}

async function run() {
  let env
  try {
    env = loadEnv()
  } catch (err) {
    console.error(`[fatal] ${err.message}`)
    process.exit(1)
  }

  try {
    await connectDB(env.MONGODB_URI)
    console.log('[db] connected to MongoDB')
  } catch (err) {
    console.error('[fatal] could not connect to MongoDB:', err.message)
    process.exit(1)
  }

  // Dummy contacts data
  const dummyContacts = [
    // TPO Office
    {
      name: 'Dr. Rajesh Kumar',
      role: 'Training & Placement Officer (TPO)',
      department: 'T&P Cell',
      email: 'tpo@skit.ac.in',
      phone: '+91-141-2770001',
    },
    {
      name: 'Ms. Priya Sharma',
      role: 'Assistant TPO',
      department: 'T&P Cell',
      email: 'asst.tpo@skit.ac.in',
      phone: '+91-141-2770002',
    },
    {
      name: 'Mr. Amit Verma',
      role: 'Placement Coordinator',
      department: 'T&P Cell',
      email: 'placements@skit.ac.in',
      phone: '+91-141-2770003',
    },

    // Department Coordinators
    {
      name: 'Dr. Sunita Mehta',
      role: 'Placement Coordinator',
      department: 'Computer Science & Engineering',
      email: 'cse.coordinator@skit.ac.in',
      phone: '+91-141-2770101',
    },
    {
      name: 'Prof. Rakesh Gupta',
      role: 'Placement Coordinator',
      department: 'Information Technology',
      email: 'it.coordinator@skit.ac.in',
      phone: '+91-141-2770102',
    },
    {
      name: 'Dr. Anjali Singh',
      role: 'Placement Coordinator',
      department: 'Electronics & Communication Engineering',
      email: 'ece.coordinator@skit.ac.in',
      phone: '+91-141-2770103',
    },
    {
      name: 'Prof. Manoj Kumar',
      role: 'Placement Coordinator',
      department: 'Electrical Engineering',
      email: 'ee.coordinator@skit.ac.in',
      phone: '+91-141-2770104',
    },
    {
      name: 'Dr. Vikas Jain',
      role: 'Placement Coordinator',
      department: 'Mechanical Engineering',
      email: 'me.coordinator@skit.ac.in',
      phone: '+91-141-2770105',
    },
    {
      name: 'Prof. Neha Agarwal',
      role: 'Placement Coordinator',
      department: 'Civil Engineering',
      email: 'ce.coordinator@skit.ac.in',
      phone: '+91-141-2770106',
    },
    {
      name: 'Dr. Poonam Sharma',
      role: 'Placement Coordinator',
      department: 'Management Studies',
      email: 'ms.coordinator@skit.ac.in',
      phone: '+91-141-2770107',
    },
    {
      name: 'Prof. Alok Tiwari',
      role: 'Placement Coordinator',
      department: 'Basic Sciences & Humanities',
      email: 'bsh.coordinator@skit.ac.in',
      phone: '+91-141-2770108',
    },

    // Company Representatives (sample)
    {
      name: 'Ms. Kavya Nair',
      role: 'HR Representative',
      department: 'TCS',
      email: 'kavya.nair@tcs.com',
      phone: '+91-9876543210',
    },
    {
      name: 'Mr. Rohit Malhotra',
      role: 'Talent Acquisition Lead',
      department: 'Infosys',
      email: 'rohit.malhotra@infosys.com',
      phone: '+91-9876543211',
    },
    {
      name: 'Ms. Sneha Patel',
      role: 'Campus Hiring Manager',
      department: 'Wipro',
      email: 'sneha.patel@wipro.com',
      phone: '+91-9876543212',
    },
    {
      name: 'Mr. Arjun Desai',
      role: 'HR Business Partner',
      department: 'Accenture',
      email: 'arjun.desai@accenture.com',
      phone: '+91-9876543213',
    },
    {
      name: 'Ms. Divya Krishnan',
      role: 'University Relations Lead',
      department: 'Capgemini',
      email: 'divya.krishnan@capgemini.com',
      phone: '+91-9876543214',
    },
    {
      name: 'Mr. Karthik Iyer',
      role: 'Senior Recruiter',
      department: 'HCL Technologies',
      email: 'karthik.iyer@hcl.com',
      phone: '+91-9876543215',
    },
    {
      name: 'Ms. Meera Reddy',
      role: 'Talent Acquisition Specialist',
      department: 'Tech Mahindra',
      email: 'meera.reddy@techmahindra.com',
      phone: '+91-9876543216',
    },
    {
      name: 'Mr. Suresh Babu',
      role: 'Campus Recruitment Head',
      department: 'Cognizant',
      email: 'suresh.babu@cognizant.com',
      phone: '+91-9876543217',
    },
    {
      name: 'Ms. Anjali Menon',
      role: 'HR Manager',
      department: 'IBM',
      email: 'anjali.menon@ibm.com',
      phone: '+91-9876543218',
    },
    {
      name: 'Mr. Rajesh Khanna',
      role: 'University Relations Manager',
      department: 'L&T Technology Services',
      email: 'rajesh.khanna@ltts.com',
      phone: '+91-9876543219',
    },
  ]

  // Clean up existing contacts (optional - comment out to preserve)
  await Contact.deleteMany({})
  console.log('[seed] Existing contacts cleared')

  // Insert dummy contacts
  const inserted = await Contact.insertMany(dummyContacts)
  console.log(`[seed] ${inserted.length} contacts created`)

  // Print summary
  const tpoCount = inserted.filter(
    (c) => c.role.includes('TPO') || c.role.includes('Assistant TPO')
  ).length
  const coordCount = inserted.filter(
    (c) => c.role.includes('Placement Coordinator') && c.department !== 'T&P Cell'
  ).length
  const companyCount = inserted.filter(
    (c) =>
      c.role.includes('HR') ||
      c.role.includes('Talent') ||
      c.role.includes('Campus') ||
      c.role.includes('University') ||
      c.role.includes('Recruiter')
  ).length

  console.log('[seed] Summary:')
  console.log(`  - TPO Office: ${tpoCount}`)
  console.log(`  - Department Coordinators: ${coordCount}`)
  console.log(`  - Company Representatives: ${companyCount}`)

  await mongoose.connection.close()
  console.log('[seed] Done')
}

import mongoose from 'mongoose'
run().catch((err) => {
  console.error('[seed] Fatal error:', err)
  process.exit(1)
})
