import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    
    // Role Information
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        required: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    
    // Teacher/Admin specific fields
    honorific: {
        type: String,
        required: function() {
            return this.role === 'teacher';
        },
        enum: ['Mr.', 'Ms.', 'Mrs.', 'Prof.', 'Dr.'],
        validate: {
            validator: function(value) {
                // Allow undefined/null for non-teachers
                if (this.role !== 'teacher') return true;
                return value && value.length > 0;
            },
            message: 'Honorific is required for teachers'
        }
    },
    employeeId: {
        type: String,
        required: function() {
            return this.role === 'teacher' || this.role === 'admin';
        },
        unique: true,
        sparse: true,
        validate: {
            validator: function(value) {
                // Allow undefined/null for students
                if (this.role === 'student') return true;
                return value && value.length > 0;
            },
            message: 'Employee ID is required for teachers and admins'
        }
    },
    
    // Teacher employment type
    employmentType: {
        type: String,
        enum: ['full-time', 'part-time'],
        required: function() {
            return this.role === 'teacher';
        },
        default: 'full-time',
        validate: {
            validator: function(value) {
                // Allow undefined/null for non-teachers
                if (this.role !== 'teacher') return true;
                return value && ['full-time', 'part-time'].includes(value);
            },
            message: 'Employment type must be either full-time or part-time for teachers'
        }
    },
    
    // Teacher overload status (only for full-time teachers)
    isOverloaded: {
        type: Boolean,
        default: false,
        validate: {
            validator: function(value) {
                // Only full-time teachers can be overloaded
                if (this.role !== 'teacher' || this.employmentType !== 'full-time') {
                    return value === false;
                }
                return true;
            },
            message: 'Only full-time teachers can be overloaded'
        }
    },
    
    // Student specific fields
    studentId: {
        type: String,
        required: function() {
            return this.role === 'student';
        },
        unique: true,
        sparse: true,
        validate: {
            validator: function(value) {
                // Allow undefined/null for non-students
                if (this.role !== 'student') return true;
                return value && value.length > 0;
            },
            message: 'Student ID is required for students'
        }
    },
    course: {
        type: String,
        required: function() {
            return this.role === 'student';
        },
        validate: {
            validator: function(value) {
                // Allow undefined/null for non-students
                if (this.role !== 'student') return true;
                return value && value.length > 0;
            },
            message: 'Course is required for students'
        }
    },
    yearLevel: {
        type: String,
        enum: {
            values: ['1', '2', '3', '4'],
            message: 'Year level must be 1, 2, 3, or 4'
        },
        required: function() {
            return this.role === 'student';
        },
        validate: {
            validator: function(value) {
                // Allow undefined/null for non-students
                if (this.role !== 'student') return true;
                // For students, require a valid year level
                return value && ['1', '2', '3', '4'].includes(value);
            },
            message: 'Year level is required for students and must be 1, 2, 3, or 4'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },      // ← ADD THIS
    toObject: { virtuals: true }     // ← ADD THIS
});

// Index for better query performance
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// ← ADD THIS NEW VIRTUAL FOR 'name' FIELD
// This is what will be used in the schedule display
userSchema.virtual('name').get(function() {
    if (this.role === 'teacher' && this.honorific) {
        return `${this.honorific} ${this.firstName} ${this.lastName}`;
    }
    return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware for password hashing AND role-specific field cleanup
userSchema.pre('save', async function(next) {
    try {
        // Hash password only if it's modified and not already hashed
        if (this.isModified('password') && !this.password.startsWith('$2')) {
            console.log('Hashing password in pre-save middleware');
            this.password = await bcrypt.hash(this.password, 12);
        }

        // Clear fields that don't apply to the current role
        if (this.role === 'student') {
            this.employeeId = undefined;
            this.honorific = undefined;
            this.employmentType = undefined;
            this.isOverloaded = undefined;
        } else if (this.role === 'teacher' || this.role === 'admin') {
            this.studentId = undefined;
            this.course = undefined;
            this.yearLevel = undefined;
            
            // Clear overload status for non-teachers or part-time teachers
            if (this.role !== 'teacher' || this.employmentType !== 'full-time') {
                this.isOverloaded = false;
            }
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user's display name with honorific
userSchema.methods.getDisplayName = function() {
    if (this.role === 'teacher' && this.honorific) {
        return `${this.honorific} ${this.firstName} ${this.lastName}`;
    }
    return `${this.firstName} ${this.lastName}`;
};

// Method to get user's identifier (student ID or employee ID)
userSchema.methods.getIdentifier = function() {
    if (this.role === 'student') {
        return this.studentId;
    } else if (this.role === 'teacher' || this.role === 'admin') {
        return this.employeeId;
    }
    return null;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
    return this.find({ role: role });
};

// Static method to find active users
userSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

export default mongoose.model('User', userSchema);