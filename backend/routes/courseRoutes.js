// backend/routes/courseRoutes.js
import express from "express";
import {
  addCourse,
  getCourses,
  getCoursesWithSubjects,
  updateCourse,
  deleteCourse,
  checkCourseUsage,
} from "../controllers/courseController.js";

const router = express.Router();

router.get("/with-subjects", getCoursesWithSubjects);
router.get("/:id/usage", checkCourseUsage);
router.get("/", getCourses);
router.post("/", addCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);

export default router;
