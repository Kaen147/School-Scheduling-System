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
  process.env.URL ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/yourdb";

app.use(cors());
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

// Connect DB and start server
mongoose
  .connect(MONGODBURL)
  .then(() => {
    console.log("database connection successful");
    app.listen(PORT, () => {
      console.log(`server is running on ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB connection error:", error);
  });
