import express from 'express';
import mongoose from 'mongoose';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Wipe database endpoint - admin only
router.post('/wipe-db', authenticate, isAdmin, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      return res.json({ message: 'Database is already empty' });
    }

    for (const collection of collections) {
      await db.dropCollection(collection.name);
    }

    res.json({ 
      message: 'Database wiped successfully',
      collectionsDropped: collections.length
    });
  } catch (error) {
    console.error('Wipe error:', error);
    res.status(500).json({ message: 'Error wiping database', error: error.message });
  }
});

// Seed database endpoint - admin only
router.post('/seed-db', authenticate, isAdmin, async (req, res) => {
  try {
    const User = (await import('../models/userModel.js')).default;
    const userCount = await User.countDocuments();
    
    if (userCount > 0) {
      return res.status(400).json({ 
        message: 'Database already has data. Wipe first.',
        userCount 
      });
    }

    const { seedCourses } = await import('../scripts/seeders/courseSeeder.js');
    const { seedRooms } = await import('../scripts/seeders/roomSeeder.js');
    const { seedSubjects } = await import('../scripts/seeders/subjectSeeder.js');
    const { seedUsers } = await import('../scripts/seeders/userSeeder.js');
    const { seedSubjectOfferings } = await import('../scripts/seeders/offeringSeeder.js');
    const { seedSchedules } = await import('../scripts/seeders/scheduleSeeder.js');
    
    await seedCourses();
    await seedRooms();
    await seedSubjects();
    await seedUsers();
    await seedSubjectOfferings();
    await seedSchedules();

    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Error seeding database', error: error.message });
  }
});

export default router;
