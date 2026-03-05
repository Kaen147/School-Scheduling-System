import Course from '../../models/courseModel.js';

export const courses = [
  { name: 'Bachelor of Science in Information Technology', abbreviation: 'BSIT', description: 'IT program focusing on software development and systems' },
  { name: 'Bachelor of Science in Computer Science', abbreviation: 'BSCS', description: 'CS program focusing on algorithms and computing theory' },
  { name: 'Bachelor of Science in Tourism Management', abbreviation: 'BSTM', description: 'Tourism and hospitality management program' },
  { name: 'Bachelor of Science in Business Administration', abbreviation: 'BSBA', description: 'Business administration and management program' }
];

export async function seedCourses() {
  console.log('📚 Seeding Courses...');
  for (const course of courses) {
    await Course.findOneAndUpdate(
      { abbreviation: course.abbreviation },
      course,
      { upsert: true, new: true }
    );
  }
  console.log(`   ✅ ${courses.length} courses seeded\n`);
}
