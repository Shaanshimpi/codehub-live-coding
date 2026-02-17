/**
 * Seed data helper for tests
 * This file contains test data constants that should match seeded database data
 */

export const SEED_DATA = {
  // Test users (should be created by seed script)
  users: {
    admin: {
      email: 'admin@codehub.com',
      password: 'Admin@123',
      name: 'Admin User',
    },
    trainer: {
      email: 'trainer@test.com',
      password: 'Trainer@123',
      name: 'Test Trainer',
    },
    student: {
      email: 'student@test.com',
      password: 'Student@123',
      name: 'Test Student',
    },
    manager: {
      email: 'manager@test.com',
      password: 'Manager@123',
      name: 'Test Manager',
    },
  },
  
  // Demo session code (should be created by seed script)
  // This will be a real session code from seeded data
  sessionCode: 'VXF-MG7-C4H', // Update this with actual seeded session code
  
  // Demo folder names (should exist in seeded data)
  demoFolders: [
    'Demo Folder 1',
    'Demo Folder 2',
    'Nested Folder',
  ],
  
  // Demo file names (should exist in seeded data)
  demoFiles: [
    'demo.js',
    'test.js',
    'example.js',
  ],
} as const


