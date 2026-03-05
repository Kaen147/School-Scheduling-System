import User from '../../models/userModel.js';

export const users = [
  // Admin
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@school.edu',
    password: 'admin123',
    role: 'admin',
    employeeId: 'EMP-001',
    status: 'active'
  },
  
  // Teachers
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@school.edu',
    password: 'teacher123',
    role: 'teacher',
    honorific: 'Prof.',
    employeeId: 'EMP-002',
    employmentType: 'full-time',
    status: 'active'
  },
  {
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@school.edu',
    password: 'teacher123',
    role: 'teacher',
    honorific: 'Ms.',
    employeeId: 'EMP-003',
    employmentType: 'full-time',
    status: 'active'
  },
  {
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert.johnson@school.edu',
    password: 'teacher123',
    role: 'teacher',
    honorific: 'Mr.',
    employeeId: 'EMP-004',
    employmentType: 'part-time',
    status: 'active'
  },
  {
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@school.edu',
    password: 'teacher123',
    role: 'teacher',
    honorific: 'Dr.',
    employeeId: 'EMP-005',
    employmentType: 'full-time',
    status: 'active'
  }
];

export async function seedUsers() {
  console.log('👥 Seeding Users...');
  for (const user of users) {
    const existing = await User.findOne({ email: user.email });
    if (!existing) {
      await User.create(user);
    }
  }
  console.log(`   ✅ ${users.length} users seeded\n`);
}
