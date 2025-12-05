import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true // Ensure subject codes are unique
    },
    
    // Department/Category (optional)
    department: {
        type: String,
        trim: true
    },
    
    // Unit and Lab Information
    hasLab: {
        type: Boolean,
        default: false
    },
    lectureUnits: {
        type: Number,
        default: function() {
            return this.hasLab ? 2 : 3;
        }
    },
    labUnits: {
        type: Number,
        default: function() {
            return this.hasLab ? 1 : 0;
        }
    },
    
    // Time Requirements (in hours per week)
    requiredHours: {
        type: Number,
        default: function() {
            // Default required hours: 1 lecture unit = 1 hour, 1 lab unit = 3 hours total
            const lu = Number(this.lectureUnits || 0);
            const lab = Number(this.labUnits || 0);
            return lu + (lab * 3);
        }
    },
    
    description: {
        type: String,
        trim: true
    },
    
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual for total units
subjectSchema.virtual('totalUnits').get(function() {
    return this.lectureUnits + this.labUnits;
});

// Method to calculate required sessions
subjectSchema.methods.getRequiredSessions = function() {
    // 1 lecture unit = 1 hour per week
    // 1 lab unit = 3 hours total per week
    const lectureHours = Number(this.lectureUnits || 0);
    const labUnits = Number(this.labUnits || 0);

    return {
        lecture: { hours: lectureHours, sessions: 1 },
        lab: labUnits > 0 ? { hours: labUnits * 3, sessions: 2 } : null
    };
};

// Method to validate schedule hours
subjectSchema.methods.validateScheduleHours = function(scheduledHours) {
    // ensure scheduledHours equals requiredHours or at least does not exceed
    // keep existing behavior: valid when scheduledHours >= requiredHours is allowed,
    // but for stricter equality requirement we will return scheduledHours === this.requiredHours
    return scheduledHours === Number(this.requiredHours);
};

// Index for better query performance
// Note: code field already has unique: true index, no need to duplicate
subjectSchema.index({ courses: 1, yearLevel: 1, semester: 1 });
subjectSchema.index({ 'assignedTeachers.teacherId': 1 });

export default mongoose.model('Subject', subjectSchema);