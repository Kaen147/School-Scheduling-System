import SubjectOffering from '../../models/subjectOfferingModel.js';
import Subject from '../../models/subjectModel.js';
import Course from '../../models/courseModel.js';
import User from '../../models/userModel.js';
import Room from '../../models/roomModel.js';

export async function seedSubjectOfferings() {
  console.log('📋 Seeding Subject Offerings...');
  
  const bsit = await Course.findOne({ abbreviation: 'BSIT' });
  const bscs = await Course.findOne({ abbreviation: 'BSCS' });
  const bsba = await Course.findOne({ abbreviation: 'BSBA' });
  const bstm = await Course.findOne({ abbreviation: 'BSTM' });
  const allSubjects = await Subject.find({});
  const teachers = await User.find({ role: 'teacher' });
  const allRooms = await Room.find({});

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
    { code: 'MATH PREP', courses: ['BSIT'], year: 1, sem: '1' },
    
    // First Year - 2nd Semester
    { code: 'FIL 2', courses: ['BSIT'], year: 1, sem: '2' },
    { code: 'IT 120', courses: ['BSIT'], year: 1, sem: '2' },
    { code: 'IT 121', courses: ['BSIT'], year: 1, sem: '2' },
    { code: 'HIST', courses: ['BSIT'], year: 1, sem: '2' },
    { code: 'PURCOM', courses: ['BSIT'], year: 1, sem: '2' },
    { code: 'NSTP 2', courses: ['BSIT'], year: 1, sem: '2' },
    { code: 'PATHFIT 2', courses: ['BSIT'], year: 1, sem: '2' },
    
    // Second Year - 1st Semester
    { code: 'IT 211', courses: ['BSIT'], year: 2, sem: '1' },
    { code: 'IT 213', courses: ['BSIT'], year: 2, sem: '1' },
    { code: 'CW', courses: ['BSIT'], year: 2, sem: '1' },
    { code: 'ARTAPP', courses: ['BSIT'], year: 2, sem: '1' },
    { code: 'IT 212', courses: ['BSIT'], year: 2, sem: '1' },
    { code: 'PATHFIT 3', courses: ['BSIT'], year: 2, sem: '1' },
    { code: 'IT 210', courses: ['BSIT'], year: 2, sem: '1' },
    
    // Second Year - 2nd Semester
    { code: 'IT 222', courses: ['BSIT'], year: 2, sem: '2' },
    { code: 'ACCTG', courses: ['BSIT'], year: 2, sem: '2' },
    { code: 'STS', courses: ['BSIT'], year: 2, sem: '2' },
    { code: 'Ethics', courses: ['BSIT'], year: 2, sem: '2' },
    { code: 'PATHFIT 4', courses: ['BSIT'], year: 2, sem: '2' },
    { code: 'IT 220', courses: ['BSIT'], year: 2, sem: '2' },
    { code: 'IT 221', courses: ['BSIT'], year: 2, sem: '2' }
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
      // Assign appropriate rooms based on subject type
      const preferredRooms = [];
      
      if (subject.hasLab) {
        // Lab subjects get computer labs
        const labs = allRooms.filter(r => r.type === 'laboratory');
        if (labs.length > 0) {
          const lab = labs[offeringCount % labs.length];
          preferredRooms.push({
            roomId: lab._id.toString(),
            roomName: lab.name,
            roomType: lab.type,
            capacity: lab.capacity
          });
        }
      } else {
        // Regular subjects get classrooms
        const classrooms = allRooms.filter(r => r.type === 'classroom');
        if (classrooms.length > 0) {
          const classroom = classrooms[offeringCount % classrooms.length];
          preferredRooms.push({
            roomId: classroom._id.toString(),
            roomName: classroom.name,
            roomType: classroom.type,
            capacity: classroom.capacity
          });
        }
      }

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
        preferredRooms: preferredRooms,
        isActive: true
      });
      offeringCount++;
    }
  }
  
  console.log(`   ✅ ${offeringCount} subject offerings seeded\n`);
}
