import mongoose from 'mongoose';

const teacherUnitDetailSchema = new mongoose.Schema({
  offeringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectOffering',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  subjectCode: String,
  subjectName: String,
  courseName: String,
  courseAbbreviation: String,
  creditHours: {
    type: Number,
    required: true
  },
  eventCount: {
    type: Number,
    required: true,
    default: 1
  },
  unitCount: {
    type: Number,
    required: true
    // Calculated as: creditHours × eventCount
  },
  yearLevel: String,
  semester: String,
  academicYear: String,
  events: [
    {
      day: String,
      startTime: String,
      endTime: String,
      room: String
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const teacherWorkloadSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherName: String,
  firstName: String,
  lastName: String,
  email: String,
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time'],
    default: 'full-time'
  },
  isOverloaded: {
    type: Boolean,
    default: false
  },
  maxUnitLimit: {
    type: Number,
    default: 24
  },
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true,
    enum: ['1', '2', 'summer']
  },
  teachingAssignments: [teacherUnitDetailSchema],
  totalUnits: {
    type: Number,
    default: 0
    // Sum of all unitCount in teachingAssignments
  },
  totalCourses: {
    type: Number,
    default: 0
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  summary: {
    lectureUnits: {
      type: Number,
      default: 0
    },
    labUnits: {
      type: Number,
      default: 0
    },
    averageUnitsPerCourse: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual to check if workload exceeds limit
teacherWorkloadSchema.virtual('exceedsLimit').get(function() {
  return this.totalUnits > this.maxUnitLimit;
});

// Virtual to get remaining available units
teacherWorkloadSchema.virtual('remainingUnits').get(function() {
  return Math.max(0, this.maxUnitLimit - this.totalUnits);
});

// Pre-save hook to calculate totals
teacherWorkloadSchema.pre('save', function(next) {
  if (this.teachingAssignments && this.teachingAssignments.length > 0) {
    this.totalUnits = this.teachingAssignments.reduce((sum, a) => sum + (a.unitCount || 0), 0);
    this.totalCourses = this.teachingAssignments.length;
    this.updatedAt = Date.now();
  }
  next();
});

// Method to calculate workload summary
teacherWorkloadSchema.methods.calculateSummary = function() {
  const summary = {
    lectureUnits: 0,
    labUnits: 0,
    totalUnits: this.totalUnits,
    assignmentCount: this.teachingAssignments.length
  };

  if (this.teachingAssignments && this.teachingAssignments.length > 0) {
    summary.averageUnitsPerCourse = this.totalUnits / this.teachingAssignments.length;
  }

  this.summary = summary;
  return summary;
};

// Method to add teaching assignment
teacherWorkloadSchema.methods.addAssignment = function(assignment) {
  this.teachingAssignments.push(assignment);
  this.totalCourses = this.teachingAssignments.length;
  this.totalUnits = this.teachingAssignments.reduce((sum, a) => sum + (a.unitCount || 0), 0);
};

// Static method to get teacher workload by teacher
teacherWorkloadSchema.statics.getTeacherWorkload = async function(teacherId, academicYear, semester) {
  return await this.findOne({
    teacherId,
    academicYear,
    semester,
    isActive: true
  }).populate('teachingAssignments.offeringId')
    .populate('teachingAssignments.courseId')
    .populate('teachingAssignments.scheduleId')
    .populate('teachingAssignments.subjectId');
};

// Static method to get all teacher workloads
teacherWorkloadSchema.statics.getAllTeacherWorkloads = async function(academicYear, semester) {
  return await this.find({
    academicYear,
    semester,
    isActive: true
  }).populate('teacherId', 'firstName lastName email')
    .populate('teachingAssignments.offeringId')
    .populate('teachingAssignments.courseId')
    .sort({ teacherName: 1 });
};

export default mongoose.model('TeacherWorkload', teacherWorkloadSchema);
