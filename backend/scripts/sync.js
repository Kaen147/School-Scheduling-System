/**
 * Schema Sync Script
 * Creates collections and indexes based on Mongoose models
 * 
 * Usage: node scripts/sync.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Import all models
import User from '../models/userModel.js';
import Course from '../models/courseModel.js';
import Subject from '../models/subjectModel.js';
import Room from '../models/roomModel.js';
import Schedule from '../models/scheduleModel.js';
import ScheduleEvent from '../models/scheduleEventModel.js';
import SubjectOffering from '../models/subjectOfferingModel.js';
import TeacherWorkload from '../models/teacherWorkloadModel.js';

// Use URL (local) first, then MONGODB_URI (cloud) as fallback
const MONGODB_URI = process.env.URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/schooldb';

const models = [
  { name: 'User', model: User },
  { name: 'Course', model: Course },
  { name: 'Subject', model: Subject },
  { name: 'Room', model: Room },
  { name: 'Schedule', model: Schedule },
  { name: 'ScheduleEvent', model: ScheduleEvent },
  { name: 'SubjectOffering', model: SubjectOffering },
  { name: 'TeacherWorkload', model: TeacherWorkload }
];

async function syncSchema() {
  console.log('🔄 Schema Sync Script');
  console.log('=====================\n');

  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('Syncing collections and indexes...\n');

    for (const { name, model } of models) {
      console.log(`📦 ${name}:`);
      
      // Create collection if it doesn't exist
      try {
        await model.createCollection();
        console.log(`   ✅ Collection created/verified`);
      } catch (err) {
        if (err.code === 48) {
          console.log(`   ℹ️  Collection already exists`);
        } else {
          throw err;
        }
      }

      // Sync indexes
      await model.syncIndexes();
      const indexes = await model.collection.indexes();
      console.log(`   ✅ Indexes synced (${indexes.length} indexes)`);
    }

    console.log('\n✅ Schema sync completed successfully!');
  } catch (error) {
    console.error('\n❌ Error syncing schema:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

syncSchema();
