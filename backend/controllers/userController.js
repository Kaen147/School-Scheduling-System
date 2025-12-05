import bcrypt from "bcryptjs";
import User from '../models/userModel.js';

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const role = req.query.role;
    const query = role ? {role} : {};

    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Error getting users', error });
  }
};


// Backend userController.js - updateUser function fix
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove empty string values that should not be saved
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === null) {
        delete updateData[key];
      }
    });

    // Hash password if it's being updated
    if (updateData.password) {
      // Check if password is already hashed (starts with bcrypt hash format)
      if (!updateData.password.startsWith('$2')) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }
    }

    // Clean up role-specific fields if role is changing
    if (updateData.role) {
      if (updateData.role === 'teacher' || updateData.role === 'admin') {
        // Remove student-only fields
        delete updateData.studentId;
        delete updateData.course;
        delete updateData.yearLevel;
      }
      // For non-employee roles, remove employee-specific fields
      if (updateData.role !== 'teacher' && updateData.role !== 'admin') {
        delete updateData.employeeId;
        delete updateData.department;
        delete updateData.honorific;
        delete updateData.employmentType;
      }
    }

    // Validate employment type if being updated for teacher
    if (updateData.employmentType) {
      if (!['full-time', 'part-time'].includes(updateData.employmentType)) {
        return res.status(400).json({ 
          message: "Employment type must be either 'full-time' or 'part-time'" 
        });
      }
    }

    // Use findByIdAndUpdate with runValidators option
    const updatedUser = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation Error', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user by ID
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
  }
};
  
// Register a user - Complete version with all fields
export const registerUser = async (req, res) => {
  try {
    const {
      honorific,
      firstName,
      lastName,
      email,
      password,
      role,
      // Student fields
      studentId,
      course,
      yearLevel,
      // Teacher/Admin fields
      employeeId,
      department,
      // Teacher employment type
      employmentType = 'full-time',
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ 
        message: "First name, last name, email, password, and role are required" 
      });
    }

    // Role-specific validation
    if (role === 'teacher') {
      if (!honorific || !employeeId) {
        return res.status(400).json({ 
          message: "Honorific and employee ID are required for teachers" 
        });
      }
      // Validate employment type for teachers
      if (!['full-time', 'part-time'].includes(employmentType)) {
        return res.status(400).json({ 
          message: "Employment type must be either 'full-time' or 'part-time'" 
        });
      }
    } else if (role === 'admin') {
      if (!employeeId) {
        return res.status(400).json({ 
          message: "Employee ID is required for admins" 
        });
      }
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Check for duplicate IDs (only enforce for employees)
    if ((role === 'teacher' || role === 'admin') && employeeId) {
      const existingEmployee = await User.findOne({ 
        employeeId: employeeId.trim(), 
        role: { $in: ['teacher', 'admin'] } 
      });
      if (existingEmployee) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }
    }

    // Create user data object
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Let model's pre-save middleware handle hashing if it exists
      role,
      status
    };

    // Add role-specific fields
    if (role === 'teacher') {
      userData.honorific = honorific;
      userData.employeeId = employeeId.trim();
      userData.employmentType = employmentType; // Add employment type for teachers
    } else if (role === 'admin') {
      userData.employeeId = employeeId.trim();
    }

    // If no pre-save middleware exists, hash password here
    if (!userData.password.startsWith('$2')) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    // Create user
    const newUser = await User.create(userData);

    // Prepare response
    const responseUser = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status
    };

    // Add role-specific data to response (only employee roles)
    if (role === 'teacher') {
      responseUser.honorific = newUser.honorific;
      responseUser.employeeId = newUser.employeeId;
      responseUser.employmentType = newUser.employmentType; // Include in response
    } else if (role === 'admin') {
      responseUser.employeeId = newUser.employeeId;
    }

    res.status(201).json({
      message: "User registered successfully",
      user: responseUser
    });

  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field} already exists` 
      });
    }
    
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Login a user
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(400).json({ message: "Account is not active" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Prepare response
    const responseUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status
    };

    // Add role-specific data for employee roles
    if (user.role === 'teacher') {
      responseUser.honorific = user.honorific;
      responseUser.employeeId = user.employeeId;
      responseUser.employmentType = user.employmentType;
    } else if (user.role === 'admin') {
      responseUser.employeeId = user.employeeId;
    }

    res.status(200).json({
      message: "Login successful",
      user: responseUser
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};