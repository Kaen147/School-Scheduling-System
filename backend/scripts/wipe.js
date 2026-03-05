/**
 * Database Wipe Script
 * Drops all collections from the database
 * 
 * Usage: node scripts/wipe.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Use URL (local) first, then MONGODB_URI (cloud) as fallback
const MONGODB_URI = process.env.URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/schooldb';

async function wipeDatabase() {
  console.log('🗑️  Database Wipe Script');
  console.log('========================\n');

  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('ℹ️  No collections found. Database is already empty.');
    } else {
      console.log(`Found ${collections.length} collection(s) to drop:\n`);
      
      for (const collection of collections) {
        console.log(`  Dropping: ${collection.name}...`);
        await db.dropCollection(collection.name);
        console.log(`  ✅ Dropped: ${collection.name}`);
      }
    }

    console.log('\n✅ Database wiped successfully!');
  } catch (error) {
    console.error('\n❌ Error wiping database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

wipeDatabase();
