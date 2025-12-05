// backend/controllers/courseController.js
import Course from "../models/courseModel.js";
import Subject from "../models/subjectModel.js";

/**
 * Add a course
 */
export const addCourse = async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      abbreviation: req.body.abbreviation,
      description: req.body.description || "",
    };
    const course = new Course(payload);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        message: `Course ${field} already exists.`,
        field 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get all courses (basic list)
 */
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ name: 1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get courses with subjects grouped by year & semester.
 * This endpoint returns only courses that have subjects (if you want all courses, use getCourses).
 */
export const getCoursesWithSubjects = async (req, res) => {
  try {
    const courses = await Course.find().sort({ name: 1 });

    const coursesWithSubjects = await Promise.all(
      courses.map(async (course) => {
        const subjects = await Subject.find({ courses: course._id }).lean();

        // Organize into years 1..4 and semesters first(1), second(2), summer
        const years = [1, 2, 3, 4]
          .map((yearLevel) => {
            const yStr = String(yearLevel);
            const yearSubjects = subjects.filter(
              (s) => String(s.yearLevel) === yStr
            );

            return {
              yearLevel,
              semesters: {
                first: yearSubjects.filter((s) => String(s.semester) === "1"),
                second: yearSubjects.filter((s) => String(s.semester) === "2"),
                summer: yearSubjects.filter(
                  (s) => String(s.semester) === "summer"
                ),
              },
            };
          })
          // include only years that have subjects to keep response compact
          .filter((y) => {
            return (
              y.semesters.first.length > 0 ||
              y.semesters.second.length > 0 ||
              y.semesters.summer.length > 0
            );
          });

        return {
          _id: course._id,
          name: course.name,
          abbreviation: course.abbreviation,
          description: course.description || "",
          years,
        };
      })
    );

    res.json(coursesWithSubjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update a course
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {
      name: req.body.name,
      abbreviation: req.body.abbreviation,
      description: req.body.description || "",
    };

    const updated = await Course.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ 
        message: `Course ${field} already exists.`,
        field 
      });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * Check if a course has subjects (usage)
 * returns { hasSubjects: boolean, subjectCount: number }
 */
export const checkCourseUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const subjectCount = await Subject.countDocuments({ courses: id });
    res.json({ hasSubjects: subjectCount > 0, subjectCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete a course.
 * - removes the course document
 * - pulls the course id from Subject.courses arrays (so subjects remain but no longer reference the deleted course)
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Remove the course id from subjects' courses arrays (does not delete the subject)
    await Subject.updateMany({ courses: id }, { $pull: { courses: id } });

    // Optionally: if you want to delete subjects that are orphaned (no courses left), do another query.
    // For now we only pull the ref per your earlier behavior.
    await Course.findByIdAndDelete(id);

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
