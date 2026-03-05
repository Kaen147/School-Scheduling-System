import Subject from '../../models/subjectModel.js';

export const subjects = [
  // First Year - 1st Semester
  { name: 'Introduction to Computing', code: 'IT 110', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Computer Programming I', code: 'IT 111', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Understanding the Self', code: 'UTS', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Math. in the Modern World', code: 'MATHWORLD', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Movement Competency', code: 'PATHFIT 1', department: 'BSIT', hasLab: false, lectureUnits: 2, labUnits: 0 },
  { name: 'Retorika', code: 'FIL 1', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'National Service Training Program 1', code: 'NSTP 1', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Pre Calculus for Non-STEM', code: 'MATH PREP', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  
  // First Year - 2nd Semester
  { name: 'Panitikan ng Pilipinas', code: 'FIL 2', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Discrete Structures', code: 'IT 120', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Computer Programming II', code: 'IT 121', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Readings in Philippine History', code: 'HIST', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Purposive Communication', code: 'PURCOM', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'National Service Training Program 2', code: 'NSTP 2', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Exercise-based Fitness Activities', code: 'PATHFIT 2', department: 'BSIT', hasLab: false, lectureUnits: 2, labUnits: 0 },
  
  // Second Year - 1st Semester
  { name: 'Web Design & Development', code: 'IT 211', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'PC Assembly & Troubleshooting', code: 'IT 213', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'The Contemporary World', code: 'CW', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Art Appreciation', code: 'ARTAPP', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Digital Logic Design', code: 'IT 212', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Sports', code: 'PATHFIT 3', department: 'BSIT', hasLab: false, lectureUnits: 2, labUnits: 0 },
  { name: 'Data Structures & Algorithm', code: 'IT 210', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  
  // Second Year - 2nd Semester
  { name: 'Database Management', code: 'IT 222', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Fundamentals of Accounting', code: 'ACCTG', department: 'BSIT', hasLab: false, lectureUnits: 6, labUnits: 0 },
  { name: 'Science, Technology and Society', code: 'STS', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Ethics', code: 'Ethics', department: 'BSIT', hasLab: false, lectureUnits: 3, labUnits: 0 },
  { name: 'Dancing', code: 'PATHFIT 4', department: 'BSIT', hasLab: false, lectureUnits: 2, labUnits: 0 },
  { name: 'Object-Oriented Programming', code: 'IT 220', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 },
  { name: 'Networking', code: 'IT 221', department: 'BSIT', hasLab: true, lectureUnits: 2, labUnits: 1 }
];

export async function seedSubjects() {
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
}
