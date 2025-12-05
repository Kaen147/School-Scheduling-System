import mongoose from 'mongoose';

const scheduleEventModelSchema = new mongoose.Schema({
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  scheduleName: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseName: { type: String },
  courseAbbreviation: { type: String },
  yearLevel: { type: String },
  semester: { type: String },
  day: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  subjectName: { type: String },
  subjectCode: { type: String },
  sessionType: { type: String, enum: ['lecture','lab'], default: 'lecture' },
  room: { type: String },
  assignedTeacher: {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teacherName: String
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

scheduleEventModelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster lookups
scheduleEventModelSchema.index({ courseId: 1, yearLevel: 1, semester: 1, day: 1, startTime: 1 });
scheduleEventModelSchema.index({ scheduleId: 1 });

export default mongoose.model('ScheduleEvent', scheduleEventModelSchema);
