import mongoose from 'mongoose';

const scheduleEventSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  subjectName: {
    type: String,
    trim: true
  },
  subjectCode: {
    type: String,
    trim: true
  },
  // NEW: Differentiate between lecture and lab
  sessionType: {
    type: String,
    required: true,
    enum: ['lecture', 'lab'],
    default: 'lecture'
  },
  room: {
    type: String,
    trim: true
  },
  // Optional: Track which teacher is assigned to this session
  assignedTeacher: {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    teacherName: String
  }
});

// Virtual to calculate duration in hours
scheduleEventSchema.virtual('durationHours').get(function() {
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return (endMinutes - startMinutes) / 60;
});

const scheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true,
    // Format: "2024-2025"
    match: /^\d{4}-\d{4}$/
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  courseAbbreviation: {
    type: String,
    required: true
  },
  yearLevel: {
    type: String,
    required: true,
    enum: ['1', '2', '3', '4']
  },
  semester: {
    type: String,
    required: true,
    enum: ['1', '2', 'summer']
  },
  events: [scheduleEventSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Update the updatedAt field before saving
scheduleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to validate subject hours in schedule
scheduleSchema.methods.validateSubjectHours = async function() {
  const Subject = mongoose.model('Subject');
  const subjectHours = {};

  // Calculate total hours per subject and session type
  for (const event of this.events) {
    const key = `${event.subjectId}_${event.sessionType}`;
    if (!subjectHours[key]) {
      subjectHours[key] = {
        subjectId: event.subjectId,
        sessionType: event.sessionType,
        totalHours: 0
      };
    }
    
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const [endHour, endMin] = event.endTime.split(':').map(Number);
    const duration = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;
    
    subjectHours[key].totalHours += duration;
  }

  // Validate against subject requirements
  const validationResults = [];
  for (const key in subjectHours) {
    const { subjectId, sessionType, totalHours } = subjectHours[key];
    const subject = await Subject.findById(subjectId);
    
    if (!subject) continue;

    const sessions = subject.getRequiredSessions();
    let requiredHours;
    
    if (sessionType === 'lecture') {
      requiredHours = sessions.lecture.hours;
    } else if (sessionType === 'lab' && sessions.lab) {
      requiredHours = sessions.lab.hours * sessions.lab.sessions;
    }

    validationResults.push({
      subjectId,
      subjectName: subject.name,
      sessionType,
      requiredHours,
      scheduledHours: totalHours,
      isValid: totalHours >= requiredHours
    });
  }

  return validationResults;
};

// Method to get schedule summary
scheduleSchema.methods.getScheduleSummary = function() {
  const summary = {
    totalEvents: this.events.length,
    lectureEvents: this.events.filter(e => e.sessionType === 'lecture').length,
    labEvents: this.events.filter(e => e.sessionType === 'lab').length,
    uniqueSubjects: [...new Set(this.events.map(e => e.subjectId.toString()))].length
  };

  return summary;
};

// Index for better query performance
scheduleSchema.index({ courseId: 1, yearLevel: 1, semester: 1, academicYear: 1 });
scheduleSchema.index({ academicYear: 1, semester: 1 });
scheduleSchema.index({ isActive: 1 });
scheduleSchema.index({ 'events.subjectId': 1 });
scheduleSchema.index({ 'events.sessionType': 1 });

export default mongoose.model('Schedule', scheduleSchema);