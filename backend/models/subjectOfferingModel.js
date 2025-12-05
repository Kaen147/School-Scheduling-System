import mongoose from 'mongoose';

const assignedTeacherSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teacherName: { type: String },
  type: { type: String }
}, { _id: false });

const preferredRoomSchema = new mongoose.Schema({
  roomId: { type: String },
  roomName: { type: String },
  roomType: { type: String },
  capacity: { type: Number }
}, { _id: false });

const subjectOfferingSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  // Changed to array to support multi-course offerings (e.g., BSIT + BSTM combined class)
  courseId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }],
  yearLevel: { type: Number, required: true },
  semester: { type: String, required: true, enum: ['1', '2', 'summer'] },
  academicYear: { type: String, required: true }, // e.g., "2024-2025"
  
  assignedTeachers: [assignedTeacherSchema],
  preferredRooms: [preferredRoomSchema],
  capacity: { type: Number },
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Updated index to work with courseId array
subjectOfferingSchema.index({ subjectId: 1, yearLevel: 1, semester: 1, academicYear: 1 });
subjectOfferingSchema.index({ courseId: 1 });

export default mongoose.model('SubjectOffering', subjectOfferingSchema);
