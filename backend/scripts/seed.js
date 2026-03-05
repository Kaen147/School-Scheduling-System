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

// Import all models
import User from '../models/userModel.js';
import Course from '../models/courseModel.js';
import Subject from '../models/subjectModel.js';
import Room from '../models/roomModel.js';
import SubjectOffering from '../models/subjectOfferingModel.js';
import Schedule from '../models/scheduleModel.js';

// Use URL (local) first, then MONGODB_URI (cloud) as fallback
const MONGODB_URI = process.env.URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/schooldb';

// ============ SEED DATA ============

const courses = [
  { name: 'Bachelor of Science in Information Technology', abbreviation: 'BSIT', description: 'IT program focusing on software development and systems' },
  { name: 'Bachelor of Science in Computer Science', abbreviation: 'BSCS', description: 'CS program focusing on algorithms and computing theory' },
  { name: 'Bachelor of Science in Tourism Management', abbreviation: 'BSTM', description: 'Tourism and hospitality management program' },
  { name: 'Bachelor of Science in Business Administration', abbreviation: 'BSBA', description: 'Business administration and management program' }
];

const rooms = [
  { name: 'Room 101', code: 'R101', type: 'classroom', capacity: 40, location: 'Building A, 1st Floor' },
  { name: 'Room 102', code: 'R102', type: 'classroom', capacity: 40, location: 'Building A, 1st Floor' },
  { name: 'Room 201', code: 'R201', type: 'classroom', capacity: 35, location: 'Building A, 2nd Floor' },
  { name: 'Computer Lab 1', code: 'CL1', type: 'laboratory', capacity: 30, location: 'Building B, 1st Floor' },
  { name: 'Computer Lab 2', code: 'CL2', type: 'laboratory', capacity: 30, location: 'Building B, 1st Floor' },
  { name: 'Science Lab', code: 'SL1', type: 'laboratory', capacity: 25, location: 'Building B, 2nd Floor' },
  { name: 'Lecture Hall A', code: 'LHA', type: 'classroom', capacity: 100, location: 'Main Building' }
];

const subjects = [
  // First Year - 1st Semester
  { name: 'Introduction to Computing', code: 'IT 110', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Computer Programming I', code: 'IT 111', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Understanding the Self', code: 'UTS', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Math. in the Modern World', code: 'MATHWORLD', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Movement Competency', code: 'PATHFIT 1', department: 'BSIT', hasLab: false, lectureUnits: 2, labUnits: 0 },
  { name: 'Retorika', code: 'FIL 1', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'National Service Training Program 1', code: 'NSTP 1', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Pre Calculus for Non-STEM', code: 'MATH PREP', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 }
];


const users = [
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
  },
  
  // // Students
  // {
  //   firstName: 'Alice',
  //   lastName: 'Brown',
  //   email: 'alice.brown@student.edu',
  //   password: 'student123',
  //   role: 'student',
  //   studentId: 'STU-2024-001',
  //   course: 'BSIT',
  //   yearLevel: '1',
  //   status: 'active'
  // },
  // {
  //   firstName: 'Bob',
  //   lastName: 'Davis',
  //   email: 'bob.davis@student.edu',
  //   password: 'student123',
  //   role: 'student',
  //   studentId: 'STU-2024-002',
  //   course: 'BSIT',
  //   yearLevel: '2',
  //   status: 'active'
  // },
  // {
  //   firstName: 'Carol',
  //   lastName: 'Miller',
  //   email: 'carol.miller@student.edu',
  //   password: 'student123',
  //   role: 'student',
  //   studentId: 'STU-2024-003',
  //   course: 'BSCS',
  //   yearLevel: '3',
  //   status: 'active'
  // }
];

// ============ SEED FUNCTION ============

async function seedDatabase() {
  console.log('🌱 Database Seed Script');
  console.log('=======================\n');

  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Seed Courses
    console.log('📚 Seeding Courses...');
    for (const course of courses) {
      await Course.findOneAndUpdate(
        { abbreviation: course.abbreviation },
        course,
        { upsert: true, new: true }
      );
    }
    console.log(`   ✅ ${courses.length} courses seeded\n`);

    // Seed Rooms
    console.log('🏫 Seeding Rooms...');
    for (const room of rooms) {
      await Room.findOneAndUpdate(
        { name: room.name },
        room,
        { upsert: true, new: true }
      );
    }
    console.log(`   ✅ ${rooms.length} rooms seeded\n`);

    // Seed Subjects
    console.log('📖 Seeding Subjects...');
    for (const subject of subjects) {
      // Calculate requiredHours based on units
      const requiredHours = subject.lectureUnits + (subject.labUnits * 3);
      const existing = await Subject.findOne({ code: subject.code });
      if (existing) {
        await Subject.updateOne({ code: subject.code }, { ...subject, requiredHours });
      } else {
        await Subject.create({ ...subject, requiredHours });
      }
    }
    console.log(`   ✅ ${subjects.length} subjects seeded\n`);

    // Seed Users
    console.log('👥 Seeding Users...');
    for (const user of users) {
      const existing = await User.findOne({ email: user.email });
      if (!existing) {
        await User.create(user);
      }
    }
    console.log(`   ✅ ${users.length} users seeded\n`);

    // Seed Subject Offerings (link subjects to courses)
    console.log('📋 Seeding Subject Offerings...');
    const bsit = await Course.findOne({ abbreviation: 'BSIT' });
    const bscs = await Course.findOne({ abbreviation: 'BSCS' });
    const bsba = await Course.findOne({ abbreviation: 'BSBA' });
    const bstm = await Course.findOne({ abbreviation: 'BSTM' });
    const allSubjects = await Subject.find({});
    const teachers = await User.find({ role: 'teacher' });

    // Subject to course/year mapping
    const offeringMap = [
      // First Year - 1st Semester
      { code: 'IT 110', courses: ['BSIT'], year: 1, sem: '1' },
      { code: 'IT 111', courses: ['BSIT'], year: 1, sem: '1' },
      { code: 'UTS', courses: ['BSIT'], year: 1, sem: '1' },
      { code: 'MATHWORLD', courses: ['BSIT'], year: 1, sem: '1' },
      { code: 'PATHFIT 1', courses: ['BSIT'], year: 1, sem: '1' },
      { code: 'FIL 1', courses: ['BSIT'], year: 1, sem: '1' },
      { code: 'NSTP 1', courses: ['BSIT'], year: 1, sem: '1' },
      { code: 'MATH PREP', courses: ['BSIT'], year: 1, sem: '1' }
    ];

    const courseMap = { BSIT: bsit, BSCS: bscs, BSBA: bsba, BSTM: bstm };
    let offeringCount = 0;

    for (const mapping of offeringMap) {
      const subject = allSubjects.find(s => s.code === mapping.code);
      if (!subject) continue;

      const courseIds = mapping.courses.map(c => courseMap[c]?._id).filter(Boolean);
      if (courseIds.length === 0) continue;

      const existing = await SubjectOffering.findOne({
        subjectId: subject._id,
        yearLevel: mapping.year,
        semester: mapping.sem,
        academicYear: '2025-2026'
      });

      if (!existing) {
        await SubjectOffering.create({
          subjectId: subject._id,
          courseId: courseIds,
          yearLevel: mapping.year,
          semester: mapping.sem,
          academicYear: '2025-2026',
          assignedTeachers: teachers.length > 0 ? [{
            teacherId: teachers[offeringCount % teachers.length]._id,
            teacherName: teachers[offeringCount % teachers.length].getDisplayName(),
            type: 'lecture'
          }] : [],
          isActive: true
        });
        offeringCount++;
      }
    }
    console.log(`   ✅ ${offeringCount} subject offerings seeded\n`);

    // Seed Schedule
    console.log('📅 Seeding Schedule...');
    const existingSchedule = await Schedule.findOne({
      courseId: bsit._id,
      yearLevel: '1',
      semester: '1',
      academicYear: '2025-2026'
    });

    if (!existingSchedule) {
      // Get subjects for the schedule
      const introComputing = allSubjects.find(s => s.code === 'IT 110');
      const compProg1 = allSubjects.find(s => s.code === 'IT 111');
      const uts = allSubjects.find(s => s.code === 'UTS');
      const mathWorld = allSubjects.find(s => s.code === 'MATHWORLD');
      const pathfit = allSubjects.find(s => s.code === 'PATHFIT 1');
      const fil1 = allSubjects.find(s => s.code === 'FIL 1');
      const nstp = allSubjects.find(s => s.code === 'NSTP 1');
      const mathPrep = allSubjects.find(s => s.code === 'MATH PREP');

      // Get rooms
      const room101 = await Room.findOne({ code: 'R101' });
      const room102 = await Room.findOne({ code: 'R102' });
      const compLab1 = await Room.findOne({ code: 'CL1' });
      const compLab2 = await Room.findOne({ code: 'CL2' });

      // Assign teachers to subjects
      const teacher1 = teachers[0]; // Prof. John Smith
      const teacher2 = teachers[1]; // Ms. Maria Garcia
      const teacher3 = teachers[2]; // Mr. Robert Johnson
      const teacher4 = teachers[3]; // Dr. Sarah Williams

      const scheduleEvents = [
        // Monday
        {
          day: 'Monday',
          startTime: '07:30',
          endTime: '09:30',
          subjectId: introComputing._id,
          subjectName: introComputing.name,
          subjectCode: introComputing.code,
          sessionType: 'lecture',
          room: room101.name,
          assignedTeacher: {
            teacherId: teacher1._id,
            teacherName: teacher1.getDisplayName()
          }
        },
        {
          day: 'Monday',
          startTime: '09:30',
          endTime: '12:30',
          subjectId: introComputing._id,
          subjectName: introComputing.name,
          subjectCode: introComputing.code,
          sessionType: 'lab',
          room: compLab1.name,
          assignedTeacher: {
            teacherId: teacher1._id,
            teacherName: teacher1.getDisplayName()
          }
        },
        {
          day: 'Monday',
          startTime: '13:00',
          endTime: '16:00',
          subjectId: compProg1._id,
          subjectName: compProg1.name,
          subjectCode: compProg1.code,
          sessionType: 'lab',
          room: compLab1.name,
          assignedTeacher: {
            teacherId: teacher2._id,
            teacherName: teacher2.getDisplayName()
          }
        },

        // Tuesday
        {
          day: 'Tuesday',
          startTime: '07:30',
          endTime: '09:30',
          subjectId: compProg1._id,
          subjectName: compProg1.name,
          subjectCode: compProg1.code,
          sessionType: 'lecture',
          room: room101.name,
          assignedTeacher: {
            teacherId: teacher2._id,
            teacherName: teacher2.getDisplayName()
          }
        },
        {
          day: 'Tuesday',
          startTime: '09:30',
          endTime: '12:30',
          subjectId: uts._id,
          subjectName: uts.name,
          subjectCode: uts.code,
          sessionType: 'lecture',
          room: room101.name,
          assignedTeacher: {
            teacherId: teacher3._id,
            teacherName: teacher3.getDisplayName()
          }
        },
        {
          day: 'Tuesday',
          startTime: '13:00',
          endTime: '16:00',
          subjectId: mathWorld._id,
          subjectName: mathWorld.name,
          subjectCode: mathWorld.code,
          sessionType: 'lecture',
          room: room102.name,
          assignedTeacher: {
            teacherId: teacher4._id,
            teacherName: teacher4.getDisplayName()
          }
        },

        // Wednesday
        {
          day: 'Wednesday',
          startTime: '07:30',
          endTime: '09:30',
          subjectId: pathfit._id,
          subjectName: pathfit.name,
          subjectCode: pathfit.code,
          sessionType: 'lecture',
          room: room101.name,
          assignedTeacher: {
            teacherId: teacher1._id,
            teacherName: teacher1.getDisplayName()
          }
        },
        {
          day: 'Wednesday',
          startTime: '09:30',
          endTime: '12:30',
          subjectId: fil1._id,
          subjectName: fil1.name,
          subjectCode: fil1.code,
          sessionType: 'lecture',
          room: room101.name,
          assignedTeacher: {
            teacherId: teacher2._id,
            teacherName: teacher2.getDisplayName()
          }
        },
        {
          day: 'Wednesday',
          startTime: '13:00',
          endTime: '16:00',
          subjectId: nstp._id,
          subjectName: nstp.name,
          subjectCode: nstp.code,
          sessionType: 'lecture',
          room: room102.name,
          assignedTeacher: {
            teacherId: teacher3._id,
            teacherName: teacher3.getDisplayName()
          }
        },

        // Thursday
        {
          day: 'Thursday',
          startTime: '07:30',
          endTime: '10:30',
          subjectId: mathPrep._id,
          subjectName: mathPrep.name,
          subjectCode: mathPrep.code,
          sessionType: 'lecture',
          room: room102.name,
          assignedTeacher: {
            teacherId: teacher4._id,
            teacherName: teacher4.getDisplayName()
          }
        },

        // Friday - No classes (common in many schools)
      ];

      const newSchedule = await Schedule.create({
        name: 'BSIT Year 1 - 2025-2026 Semester 1',
        courseId: bsit._id,
        courseName: bsit.name,
        courseAbbreviation: bsit.abbreviation,
        yearLevel: '1',
        semester: '1',
        academicYear: '2025-2026',
        events: scheduleEvents,
        isActive: true
      });

      console.log(`   ✅ Schedule created with ${scheduleEvents.length} events\n`);
    } else {
      console.log(`   ℹ️  Schedule already exists, skipping\n`);
    }

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
