/**
 * Database Seed Script
 * Populates the database with sample data
 * 
 * Usage: node scripts/seed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Import seeders
import { seedCourses } from './seeders/courseSeeder.js';
import { seedRooms } from './seeders/roomSeeder.js';
import { seedSubjects } from './seeders/subjectSeeder.js';
import { seedUsers } from './seeders/userSeeder.js';
import { seedSubjectOfferings } from './seeders/offeringSeeder.js';
import { seedSchedules } from './seeders/scheduleSeeder.js';

// Import models for counting
import Course from '../models/courseModel.js';
import Room from '../models/roomModel.js';
import Subject from '../models/subjectModel.js';
import User from '../models/userModel.js';
import SubjectOffering from '../models/subjectOfferingModel.js';
import Schedule from '../models/scheduleModel.js';

// Use URL (local) first, then MONGODB_URI (cloud) as fallback
const MONGODB_URI = process.env.URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/schooldb';

async function seedDatabase() {
  console.log('🌱 Database Seed Script');
  console.log('=======================\n');

  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Run all seeders in order
    await seedCourses();
    await seedRooms();
    await seedSubjects();
    await seedUsers();
    await seedSubjectOfferings();
    await seedSchedules();

    // Summary
    console.log('📊 Seed Summary:');
    console.log(`   Courses: ${await Course.countDocuments()}`);
    console.log(`   Rooms: ${await Room.countDocuments()}`);
    console.log(`   Subjects: ${await Subject.countDocuments()}`);
    console.log(`   Subject Offerings: ${await SubjectOffering.countDocuments()}`);
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Schedules: ${await Schedule.countDocuments()}`);

    console.log('\n✅ Database seeded successfully!');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

seedDatabase();
