// routes/userRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import {
  getAllUsers,
  updateUser,
  deleteUser,
  registerUser,
  loginUser,
} from "../controllers/userController.js";

const router = express.Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// User management routes
router.get("/", getAllUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Role-specific routes for getting users
router.get("/admin", async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/teachers", async (req, res) => {
  try {
    // Return a safe subset of fields to avoid exposing passwords or causing serialization issues
    const teachers = await User.find({ role: "teacher" }).select('-password -__v');
    console.log(`GET /api/users/teachers -> found ${teachers.length} teachers`);

    // Convert to plain objects (including virtuals) to avoid any problematic getters during JSON serialization
    let payload;
    try {
      payload = teachers.map((t) => {
        try {
          return t.toObject({ virtuals: true });
        } catch (innerErr) {
          console.error(`toObject error for teacher ${t._id}:`, innerErr);
          // Fallback to a minimal representation
          return {
            _id: t._id,
            firstName: t.firstName,
            lastName: t.lastName,
            email: t.email,
            role: t.role,
          };
        }
      });
    } catch (err) {
      console.error('Error converting teachers to objects:', err);
      return res.status(500).json({ message: 'Error processing teachers data' });
    }

    // Final stringify check (will throw if payload contains circular refs)
    try {
      JSON.stringify(payload);
    } catch (err) {
      console.error('JSON.stringify failed for teachers payload:', err);
      return res.status(500).json({ message: 'Serialization error for teachers data' });
    }

    res.json(payload);
  } catch (err) {
    console.error("Error in GET /api/users/teachers:", err);
    res.status(500).json({ message: err.message });
  }
});

// Note: student-specific listing removed per product decision (student functionality disabled)

// Specific user fetch by ID (placed after role-specific static routes to avoid param collisions)
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/fix-password/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { newPassword } = req.body;

    console.log("Fixing password for:", email);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Current password:", user.password);
    console.log("Is already hashed:", user.password.startsWith("$2"));

    // Hash the password manually
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log(
      "New hashed password:",
      hashedPassword.substring(0, 20) + "..."
    );

    // Update directly in database (bypass pre-save middleware)
    await User.findByIdAndUpdate(
      user._id,
      {
        password: hashedPassword,
      },
      { new: true }
    );

    res.json({
      message: "Password updated successfully",
      passwordHashed: true,
    });
  } catch (error) {
    console.error("Error fixing password:", error);
    res.status(500).json({ message: "Error fixing password" });
  }
});

// Or use this in your MongoDB console/Compass:
/*
// MongoDB shell command to hash the existing password:
db.users.updateOne(
  { email: "dagatandextir@gmail.com" },
  { 
    $set: { 
      password: "$2b$12$hashOfYourPasswordHere" 
    } 
  }
)
*/

export default router;
