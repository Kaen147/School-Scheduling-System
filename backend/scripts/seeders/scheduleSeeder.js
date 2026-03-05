import Schedule from '../../models/scheduleModel.js';
import Subject from '../../models/subjectModel.js';
import Course from '../../models/courseModel.js';
import Room from '../../models/roomModel.js';
import User from '../../models/userModel.js';

export async function seedSchedules() {
  console.log('📅 Seeding Schedules...');
  
  const bsit = await Course.findOne({ abbreviation: 'BSIT' });
  const allSubjects = await Subject.find({});
  const teachers = await User.find({ role: 'teacher' });
  
  // Seed Year 1 Semester 1 Schedule
  await seedYear1Semester1(bsit, allSubjects, teachers);
  
  // Seed Year 2 Semester 1 Schedule (4 subjects for testing)
  await seedYear2Semester1(bsit, allSubjects, teachers);
}

async function seedYear1Semester1(bsit, allSubjects, teachers) {
  const existingSchedule = await Schedule.findOne({
    courseId: bsit._id,
    yearLevel: '1',
    semester: '1',
    academicYear: '2025-2026'
  });

  if (existingSchedule) {
    console.log(`   ℹ️  Year 1 Semester 1 schedule already exists, skipping`);
    return;
  }

  // Get subjects
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

  // Teachers
  const teacher1 = teachers[0];
  const teacher2 = teachers[1];
  const teacher3 = teachers[2];
  const teacher4 = teachers[3];

  const scheduleEvents = [
    // Monday
    {
      day: 'Monday', startTime: '07:30', endTime: '09:30',
      subjectId: introComputing._id, subjectName: introComputing.name,
      subjectCode: introComputing.code, sessionType: 'lecture',
      room: room101.name,
      assignedTeacher: { teacherId: teacher1._id, teacherName: teacher1.getDisplayName() }
    },
    {
      day: 'Monday', startTime: '09:30', endTime: '12:30',
      subjectId: introComputing._id, subjectName: introComputing.name,
      subjectCode: introComputing.code, sessionType: 'lab',
      room: compLab1.name,
      assignedTeacher: { teacherId: teacher1._id, teacherName: teacher1.getDisplayName() }
    },
    {
      day: 'Monday', startTime: '13:00', endTime: '16:00',
      subjectId: compProg1._id, subjectName: compProg1.name,
      subjectCode: compProg1.code, sessionType: 'lab',
      room: compLab1.name,
      assignedTeacher: { teacherId: teacher2._id, teacherName: teacher2.getDisplayName() }
    },
    // Tuesday
    {
      day: 'Tuesday', startTime: '07:30', endTime: '09:30',
      subjectId: compProg1._id, subjectName: compProg1.name,
      subjectCode: compProg1.code, sessionType: 'lecture',
      room: room101.name,
      assignedTeacher: { teacherId: teacher2._id, teacherName: teacher2.getDisplayName() }
    },
    {
      day: 'Tuesday', startTime: '09:30', endTime: '12:30',
      subjectId: uts._id, subjectName: uts.name,
      subjectCode: uts.code, sessionType: 'lecture',
      room: room101.name,
      assignedTeacher: { teacherId: teacher3._id, teacherName: teacher3.getDisplayName() }
    },
    {
      day: 'Tuesday', startTime: '13:00', endTime: '16:00',
      subjectId: mathWorld._id, subjectName: mathWorld.name,
      subjectCode: mathWorld.code, sessionType: 'lecture',
      room: room102.name,
      assignedTeacher: { teacherId: teacher4._id, teacherName: teacher4.getDisplayName() }
    },
    // Wednesday
    {
      day: 'Wednesday', startTime: '07:30', endTime: '09:30',
      subjectId: pathfit._id, subjectName: pathfit.name,
      subjectCode: pathfit.code, sessionType: 'lecture',
      room: room101.name,
      assignedTeacher: { teacherId: teacher1._id, teacherName: teacher1.getDisplayName() }
    },
    {
      day: 'Wednesday', startTime: '09:30', endTime: '12:30',
      subjectId: fil1._id, subjectName: fil1.name,
      subjectCode: fil1.code, sessionType: 'lecture',
      room: room101.name,
      assignedTeacher: { teacherId: teacher2._id, teacherName: teacher2.getDisplayName() }
    },
    {
      day: 'Wednesday', startTime: '13:00', endTime: '16:00',
      subjectId: nstp._id, subjectName: nstp.name,
      subjectCode: nstp.code, sessionType: 'lecture',
      room: room102.name,
      assignedTeacher: { teacherId: teacher3._id, teacherName: teacher3.getDisplayName() }
    },
    // Thursday
    {
      day: 'Thursday', startTime: '07:30', endTime: '10:30',
      subjectId: mathPrep._id, subjectName: mathPrep.name,
      subjectCode: mathPrep.code, sessionType: 'lecture',
      room: room102.name,
      assignedTeacher: { teacherId: teacher4._id, teacherName: teacher4.getDisplayName() }
    }
  ];

  await Schedule.create({
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

  console.log(`   ✅ Year 1 Semester 1 schedule created with ${scheduleEvents.length} events`);
}

async function seedYear2Semester1(bsit, allSubjects, teachers) {
  const existingSchedule = await Schedule.findOne({
    courseId: bsit._id,
    yearLevel: '2',
    semester: '1',
    academicYear: '2025-2026'
  });

  if (existingSchedule) {
    console.log(`   ℹ️  Year 2 Semester 1 schedule already exists, skipping`);
    return;
  }

  // Get subjects (only 4 for testing)
  const webDesign = allSubjects.find(s => s.code === 'IT 211');
  const pcAssembly = allSubjects.find(s => s.code === 'IT 213');
  const artApp = allSubjects.find(s => s.code === 'ARTAPP');
  const dataStructures = allSubjects.find(s => s.code === 'IT 210');

  // Get rooms
  const room201 = await Room.findOne({ code: 'R201' });
  const compLab2 = await Room.findOne({ code: 'CL2' });
  const lectureHall = await Room.findOne({ code: 'LHA' });

  // Teachers
  const teacher1 = teachers[0];
  const teacher2 = teachers[1];
  const teacher3 = teachers[2];
  const teacher4 = teachers[3];

  const scheduleEvents = [
    // Monday
    {
      day: 'Monday', startTime: '07:30', endTime: '09:30',
      subjectId: webDesign._id, subjectName: webDesign.name,
      subjectCode: webDesign.code, sessionType: 'lecture',
      room: room201.name,
      assignedTeacher: { teacherId: teacher3._id, teacherName: teacher3.getDisplayName() }
    },
    {
      day: 'Monday', startTime: '09:30', endTime: '12:30',
      subjectId: webDesign._id, subjectName: webDesign.name,
      subjectCode: webDesign.code, sessionType: 'lab',
      room: compLab2.name,
      assignedTeacher: { teacherId: teacher3._id, teacherName: teacher3.getDisplayName() }
    },
    // Tuesday
    {
      day: 'Tuesday', startTime: '07:30', endTime: '09:30',
      subjectId: pcAssembly._id, subjectName: pcAssembly.name,
      subjectCode: pcAssembly.code, sessionType: 'lecture',
      room: room201.name,
      assignedTeacher: { teacherId: teacher1._id, teacherName: teacher1.getDisplayName() }
    },
    {
      day: 'Tuesday', startTime: '09:30', endTime: '12:30',
      subjectId: pcAssembly._id, subjectName: pcAssembly.name,
      subjectCode: pcAssembly.code, sessionType: 'lab',
      room: compLab2.name,
      assignedTeacher: { teacherId: teacher1._id, teacherName: teacher1.getDisplayName() }
    },
    // Thursday
    {
      day: 'Thursday', startTime: '10:30', endTime: '13:30',
      subjectId: artApp._id, subjectName: artApp.name,
      subjectCode: artApp.code, sessionType: 'lecture',
      room: lectureHall.name,
      assignedTeacher: { teacherId: teacher2._id, teacherName: teacher2.getDisplayName() }
    },
    // Friday
    {
      day: 'Friday', startTime: '07:30', endTime: '09:30',
      subjectId: dataStructures._id, subjectName: dataStructures.name,
      subjectCode: dataStructures.code, sessionType: 'lecture',
      room: room201.name,
      assignedTeacher: { teacherId: teacher4._id, teacherName: teacher4.getDisplayName() }
    },
    {
      day: 'Friday', startTime: '09:30', endTime: '12:30',
      subjectId: dataStructures._id, subjectName: dataStructures.name,
      subjectCode: dataStructures.code, sessionType: 'lab',
      room: compLab2.name,
      assignedTeacher: { teacherId: teacher4._id, teacherName: teacher4.getDisplayName() }
    }
  ];

  await Schedule.create({
    name: 'BSIT Year 2 - 2025-2026 Semester 1',
    courseId: bsit._id,
    courseName: bsit.name,
    courseAbbreviation: bsit.abbreviation,
    yearLevel: '2',
    semester: '1',
    academicYear: '2025-2026',
    events: scheduleEvents,
    isActive: true
  });

  console.log(`   ✅ Year 2 Semester 1 schedule created with ${scheduleEvents.length} events (4 subjects for testing)`);
}
