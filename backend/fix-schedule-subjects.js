import mongoose from 'mongoose';
const ObjectId = mongoose.Types.ObjectId;

mongoose.connect('mongodb://localhost:27017/schooldb').then(async () => {
  const db = mongoose.connection.db;
  
  console.log('🔧 Starting database fix...\n');
  
  const schedules = await db.collection('schedules').find({}).toArray();
  console.log(`Found ${schedules.length} schedules to process\n`);
  
  let totalFixed = 0;
  let totalSkipped = 0;
  
  for (const schedule of schedules) {
    console.log(`\n📅 Processing: ${schedule.name} (ID: ${schedule._id})`);
    console.log(`   Events: ${schedule.events?.length || 0}`);
    
    if (!schedule.events || schedule.events.length === 0) {
      console.log('   ⏭️  No events, skipping');
      continue;
    }
    
    let needsUpdate = false;
    const updatedEvents = [];
    
    for (let i = 0; i < schedule.events.length; i++) {
      const event = schedule.events[i];
      console.log(`\n   Event ${i + 1}: ${event.day} ${event.startTime}-${event.endTime}`);
      console.log(`   Subject: ${event.subjectCode} - ${event.subjectName}`);
      console.log(`   Current subjectId: ${event.subjectId}`);
      
      if (!event.subjectId) {
        console.log('   ⚠️  Event has null subjectId, skipping');
        updatedEvents.push(event);
        totalSkipped++;
        continue;
      }
      
      // Check if this is an offering ID
      const offering = await db.collection('subjectofferings').findOne({ _id: event.subjectId });
      
      if (offering && offering.subjectId) {
        // It's an offering! Replace with actual subject ID
        const oldId = event.subjectId;
        event.subjectId = offering.subjectId;
        console.log(`   ✅ FIXED: Offering ${oldId} → Subject ${event.subjectId}`);
        needsUpdate = true;
        totalFixed++;
      } else {
        // Check if it's already a subject ID
        const subject = await db.collection('subjects').findOne({ _id: event.subjectId });
        if (subject) {
          console.log(`   ✓ Already correct Subject ID`);
        } else {
          console.log(`   ❌ WARNING: Cannot resolve ID ${event.subjectId}`);
          totalSkipped++;
        }
      }
      
      updatedEvents.push(event);
    }
    
    if (needsUpdate) {
      await db.collection('schedules').updateOne(
        { _id: schedule._id },
        { $set: { events: updatedEvents } }
      );
      console.log(`\n   💾 Updated schedule in database`);
    } else {
      console.log(`\n   ⏭️  No changes needed`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✨ Database fix completed!`);
  console.log(`   Fixed events: ${totalFixed}`);
  console.log(`   Skipped events: ${totalSkipped}`);
  console.log('='.repeat(60));
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
