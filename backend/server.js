// backend/index.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/userRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import subjectOfferingRoutes from "./routes/subjectOfferingRoutes.js";
import workloadRoutes from "./routes/workloadRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODBURL =
  process.env.MONGODB_URI ||
  process.env.URL ||
  "mongodb://localhost:27017/yourdb";

// Configure CORS for production
const allowedOrigins = [
  'http://localhost:5173',      // Local development (Vite default port)
  'http://localhost:3000',      // Alternative local port
  process.env.FRONTEND_URL      // Production frontend from env variable
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development or if origin is in allowed list
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, allow any origin for now (you can restrict later)
      callback(null, true);
    }
  },
  credentials: true,              // Allow cookies/auth headers
  optionsSuccessStatus: 200       // For legacy browsers
};

app.use(cors(corsOptions));
app.use(express.json());

// Mount routes
app.use("/api/users", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/offerings", subjectOfferingRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/workload", workloadRoutes);

// optional: basic health check
app.get("/", (req, res) => res.send("API running"));

// Auto-seed function
async function autoSeed() {
  try {
    const User = (await import('./models/userModel.js')).default;
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('🌱 Database is empty. Running auto-seed...');
      const { seedCourses } = await import('./scripts/seeders/courseSeeder.js');
      const { seedRooms } = await import('./scripts/seeders/roomSeeder.js');
      const { seedSubjects } = await import('./scripts/seeders/subjectSeeder.js');
      const { seedUsers } = await import('./scripts/seeders/userSeeder.js');
      const { seedSubjectOfferings } = await import('./scripts/seeders/offeringSeeder.js');
      const { seedSchedules } = await import('./scripts/seeders/scheduleSeeder.js');
      
      await seedCourses();
      await seedRooms();
      await seedSubjects();
      await seedUsers();
      await seedSubjectOfferings();
      await seedSchedules();
      
      console.log('✅ Auto-seed completed successfully!');
    } else {
      console.log(`✓ Database already seeded (${userCount} users found)`);
    }
  } catch (error) {
    console.error('❌ Auto-seed error:', error);
  }
}

// Connect DB and start server
mongoose
  .connect(MONGODBURL)
  .then(async () => {
    console.log("database connection successful");
    
    // Run auto-seed if database is empty
    await autoSeed();
    
    app.listen(PORT, () => {
      console.log(`server is running on ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB connection error:", error);
    console.error("MONGODB_URI:", MONGODBURL ? "Set" : "Not set");
    // Start server anyway for debugging
    app.listen(PORT, () => {
      console.log(`server is running on ${PORT} (without database)`);
    });
  });
