/**
 * Script to create an admin user
 * Run with: pnpm tsx scripts/create-admin.ts
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import config from '../src/payload.config'

// Load environment variables
dotenv.config()

async function createAdmin() {
  console.log('🔧 Creating admin user...')
  
  const payload = await getPayload({ config })

  try {
    // Check if admin already exists
    const existingAdmin = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: 'admin@codehub.com',
        },
      },
    })

    if (existingAdmin.docs.length > 0) {
      console.log('⚠️  Admin user already exists with email: admin@codehub.com')
      process.exit(0)
    }

    // Create admin user
    const admin = await payload.create({
      collection: 'users',
      data: {
        name: 'Admin',
        email: 'admin@codehub.com',
        password: 'Admin@123',
        role: 'admin',
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email: admin@codehub.com')
    console.log('🔑 Password: Admin@123')
    console.log('\n⚠️  Please change the password after first login!')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  }

  process.exit(0)
}

createAdmin()

