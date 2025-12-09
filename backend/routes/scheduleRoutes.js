import express from "express";
import Schedule from "../models/scheduleModel.js";
import Subject from "../models/subjectModel.js";
import SubjectOffering from "../models/subjectOfferingModel.js";
import Course from "../models/courseModel.js";
import ScheduleEvent from "../models/scheduleEventModel.js";

const router = express.Router();

// GET all schedules
router.get("/", async (req, res) => {
  try {
    const schedules = await Schedule.find({ isActive: true })
      .populate("courseId", "name abbreviation")
      .populate("events.subjectId", "name code requiredHours hasLab")
      .sort({ createdAt: -1 });

    res.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res
      .status(500)
      .json({ message: "Error fetching schedules", error: error.message });
  }
});

// GET schedules filtered by assigned teacher
router.get("/by-teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log('Backend: Fetching schedules for teacherId:', teacherId);
    
    if (!teacherId)
      return res.status(400).json({ message: "teacherId is required" });

    const schedules = await Schedule.find({ isActive: true })
      .populate("courseId", "name abbreviation")
      .populate("events.subjectId", "name code requiredHours hasLab")
      .populate("events.assignedTeacher.teacherId", "firstName lastName name")
      .sort({ createdAt: -1 });

    console.log('Backend: Found schedules:', schedules.length);

    const filtered = schedules
      .map((s) => {
        const events = (s.events || []).filter((ev) => {
          const assigned = ev?.assignedTeacher?.teacherId;
          // Handle both populated (object) and unpopulated (string) cases
          const assignedId = assigned ? (assigned._id || assigned) : null;
          const assignedStr = assignedId ? String(assignedId) : null;
          const teacherIdStr = String(teacherId);
          const matches = assignedStr === teacherIdStr;
          
          // Debug log removed for cleaner output
          return matches;
        });
        console.log('Backend: Schedule', s.name, 'has', events.length, 'filtered events');
        return { ...s.toObject(), events };
      })
      .filter((s) => s.events && s.events.length > 0);

    console.log('Backend: Returning', filtered.length, 'schedules with teacher events');
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching schedules by teacher:", error);
    res
      .status(500)
      .json({
        message: "Error fetching schedules by teacher",
        error: error.message,
      });
  }
});

// CHECK CONFLICTS - Returns ALL active schedules for comprehensive conflict checking
// Frontend will check: student (same course/year/sem), teacher, and room conflicts
router.get(
  "/check-conflicts/:courseId/:yearLevel/:semester",
  async (req, res) => {
    try {
      const { courseId, yearLevel, semester } = req.params;
      const { excludeScheduleId } = req.query; // Get from query params

      const query = {
        isActive: true,
      };

      // Exclude the current schedule being edited
      if (excludeScheduleId) {
        query._id = { $ne: excludeScheduleId };
      }

      // FIXED: Return ALL schedules, not just same course/year/semester
      // This allows frontend to check teacher/room conflicts across all schedules
      const existingSchedules = await Schedule.find(query)
        .populate("courseId", "name abbreviation")
        .populate("events.subjectId", "name code");

      // Debug: log summary of existing schedules and events
      console.debug(`check-conflicts: found ${existingSchedules.length} total active schedules (requested context: course=${courseId} year=${yearLevel} sem=${semester})`);
      existingSchedules.forEach(es => {
        console.debug(` - ${es.name}: ${es.events.length} events (${es.courseAbbreviation || 'N/A'} Y${es.yearLevel} S${es.semester})`);
      });

      res.json(existingSchedules);
    } catch (error) {
      console.error("Error checking conflicts:", error);
      res
        .status(500)
        .json({ message: "Error checking conflicts", error: error.message });
    }
  }
);

// ADMIN: Sync all schedule events into ScheduleEvent collection
router.get('/sync-events', async (req, res) => {
  try {
    const schedules = await Schedule.find({ isActive: true }).lean();
    const docs = [];
    for (const s of schedules) {
      (s.events || []).forEach(ev => {
        docs.push({
          scheduleId: s._id,
          scheduleName: s.name,
          courseId: s.courseId,
          courseName: s.courseName,
          courseAbbreviation: s.courseAbbreviation,
          yearLevel: s.yearLevel,
          semester: s.semester,
          day: ev.day,
          startTime: ev.startTime,
          endTime: ev.endTime,
          subjectId: ev.subjectId,
          subjectName: ev.subjectName || '',
          subjectCode: ev.subjectCode || '',
          sessionType: ev.sessionType || 'lecture',
          room: ev.room || '',
          assignedTeacher: ev.assignedTeacher || null,
          isActive: true
        });
      });
    }

    // Replace the collection (simple approach)
    await ScheduleEvent.deleteMany({});
    if (docs.length > 0) await ScheduleEvent.insertMany(docs);

    res.json({ message: 'Sync complete', inserted: docs.length });
  } catch (err) {
    console.error('Error syncing schedule events:', err);
    res.status(500).json({ message: 'Sync failed', error: err.message });
  }
});

// GET schedule by ID
router.get("/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate("courseId", "name abbreviation")
      .populate("events.subjectId", "name code");

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res
      .status(500)
      .json({ message: "Error fetching schedule", error: error.message });
  }
});

// POST create new schedule
router.post("/", async (req, res) => {
  try {
    const {
      name,
      courseId,
      courseName,
      courseAbbreviation,
      yearLevel,
      semester,
      academicYear,
      events,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !courseId ||
      !courseName ||
      !courseAbbreviation ||
      !yearLevel ||
      !semester ||
      !academicYear ||
      !events
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: name, courseId, courseName, courseAbbreviation, yearLevel, semester, academicYear, events",
      });
    }

    // Validate events array
    if (!Array.isArray(events) || events.length === 0) {
      return res
        .status(400)
        .json({ message: "Events must be a non-empty array" });
    }

    // Validate each event
    for (const event of events) {
      if (
        !event.day ||
        !event.startTime ||
        !event.endTime ||
        !event.subjectId
      ) {
        return res.status(400).json({
          message:
            "Each event must have day, startTime, endTime, and subjectId",
        });
      }

      if (
        event.sessionType &&
        !["lecture", "lab"].includes(event.sessionType)
      ) {
        return res.status(400).json({
          message: 'Session type must be either "lecture" or "lab"',
        });
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(event.startTime) || !timeRegex.test(event.endTime)) {
        return res.status(400).json({
          message: "Invalid time format. Use HH:MM format (e.g., 08:30)",
        });
      }

      const startMinutes = timeToMinutes(event.startTime);
      const endMinutes = timeToMinutes(event.endTime);
      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          message: "End time must be after start time",
        });
      }

      // Check if subjectId is an offering or a subject
      let subject = await Subject.findById(event.subjectId);
      let offering = null;
      
      if (!subject) {
        // Try to find it as an offering
        offering = await SubjectOffering.findById(event.subjectId).populate('subjectId');
        if (offering && offering.subjectId) {
          subject = offering.subjectId; // Use the populated subject from the offering
        }
      }
      
      if (!subject) {
        return res.status(404).json({
          message: `Subject or offering not found: ${event.subjectId}`,
        });
      }

      if (event.sessionType === "lab" && !subject.hasLab) {
        return res.status(400).json({
          message: `Subject "${subject.name}" does not have a lab component`,
        });
      }
    }

    const internalConflicts = checkTimeConflicts(events);
    if (internalConflicts.length > 0) {
      return res.status(400).json({
        message: "Time conflicts detected within this schedule",
        conflicts: internalConflicts,
      });
    }

    // Check for conflicts with ALL existing schedules (not just same course/year/semester)
    const allSchedules = await Schedule.find({ isActive: true });

    const existingConflicts = checkConflictsWithExisting(
      events,
      allSchedules,
      { courseId, yearLevel, semester, academicYear } // Pass current schedule context
    );
    if (existingConflicts.length > 0) {
      return res.status(400).json({
        message: "Schedule conflicts detected",
        conflicts: existingConflicts,
      });
    }

    const hoursValidation = await validateSubjectHours(events);
    if (!hoursValidation.isValid) {
      return res.status(400).json({
        message: "Subject hours validation failed",
        violations: hoursValidation.violations,
      });
    }

    const schedule = new Schedule({
      name,
      courseId,
      courseName,
      courseAbbreviation,
      yearLevel,
      semester,
      academicYear,
      events,
    });

    const savedSchedule = await schedule.save();

    const populatedSchedule = await Schedule.findById(savedSchedule._id)
      .populate("courseId", "name abbreviation")
      .populate("events.subjectId", "name code requiredHours hasLab");

    // Sync ScheduleEvent documents for fast conflict lookups
    try {
      const evDocs = (savedSchedule.events || []).map(ev => ({
        scheduleId: savedSchedule._id,
        scheduleName: savedSchedule.name,
        courseId: savedSchedule.courseId,
        courseName: savedSchedule.courseName,
        courseAbbreviation: savedSchedule.courseAbbreviation,
        yearLevel: savedSchedule.yearLevel,
        semester: savedSchedule.semester,
        day: ev.day,
        startTime: ev.startTime,
        endTime: ev.endTime,
        subjectId: ev.subjectId,
        subjectName: ev.subjectName || '',
        subjectCode: ev.subjectCode || '',
        sessionType: ev.sessionType || 'lecture',
        room: ev.room || '',
        assignedTeacher: ev.assignedTeacher || null,
        isActive: true
      }));
      // Remove existing events for this schedule then insert new
      await ScheduleEvent.deleteMany({ scheduleId: savedSchedule._id });
      if (evDocs.length > 0) await ScheduleEvent.insertMany(evDocs);
    } catch (err) {
      console.error('Failed to sync ScheduleEvent docs after schedule create:', err);
    }

    res.status(201).json(populatedSchedule);
  } catch (error) {
    console.error("Error creating schedule:", error);
    res
      .status(500)
      .json({ message: "Error creating schedule", error: error.message });
  }
});

// PUT update schedule - FIXED: Properly excludes current schedule from conflict check
router.put("/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const {
      name,
      courseId,
      courseName,
      courseAbbreviation,
      yearLevel,
      semester,
      academicYear,
      events,
    } = req.body;

    // If events are being updated, validate them
    if (events !== undefined) {
      // Events must be a non-empty array
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ message: "Events must be a non-empty array" });
      }

      // Validate each event: required fields, sessionType, time format and ordering, lab eligibility
      for (const event of events) {
        if (!event.day || !event.startTime || !event.endTime || !event.subjectId) {
          return res.status(400).json({
            message: "Each event must have day, startTime, endTime, and subjectId",
          });
        }

        if (event.sessionType && !["lecture", "lab"].includes(event.sessionType)) {
          return res.status(400).json({
            message: 'Session type must be either "lecture" or "lab"',
          });
        }

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(event.startTime) || !timeRegex.test(event.endTime)) {
          return res.status(400).json({
            message: "Invalid time format. Use HH:MM format (e.g., 08:30)",
          });
        }

        const startMinutes = timeToMinutes(event.startTime);
        const endMinutes = timeToMinutes(event.endTime);
        if (endMinutes <= startMinutes) {
          return res.status(400).json({ message: "End time must be after start time" });
        }

        // Check if subjectId is an offering or a subject (same logic as POST route)
        let subject = await Subject.findById(event.subjectId);
        let offering = null;
        
        if (!subject) {
          // Try to find it as an offering
          offering = await SubjectOffering.findById(event.subjectId).populate('subjectId');
          if (offering && offering.subjectId) {
            subject = offering.subjectId; // Use the populated subject from the offering
          }
        }

        if (subject && event.sessionType === "lab" && !subject.hasLab) {
          return res.status(400).json({
            message: `Subject "${subject.name}" does not have a lab component`,
          });
        }
      }

      // Check internal conflicts
      const internalConflicts = checkTimeConflicts(events);
      if (internalConflicts.length > 0) {
        return res.status(400).json({
          message: "Time conflicts detected within this schedule",
          conflicts: internalConflicts,
        });
      }

      // Check for conflicts with ALL existing schedules (excluding the current one being updated)
      const allSchedules = await Schedule.find({ 
        isActive: true,
        _id: { $ne: req.params.id } // Exclude current schedule from conflict check
      });

      const existingConflicts = checkConflictsWithExisting(
        events,
        allSchedules,
        { 
          courseId: courseId || schedule.courseId, 
          yearLevel: yearLevel || schedule.yearLevel,
          semester: semester || schedule.semester,
          academicYear: academicYear || schedule.academicYear
        }
      );
      if (existingConflicts.length > 0) {
        return res.status(400).json({
          message: "Schedule conflicts detected",
          conflicts: existingConflicts,
        });
      }

      // Validate hours per session type
      const hoursValidation = await validateSubjectHours(events);
      if (!hoursValidation.isValid) {
        return res.status(400).json({
          message: "Subject hours validation failed",
          violations: hoursValidation.violations,
        });
      }
    }

    // Update fields
    if (name !== undefined) schedule.name = name;
    if (courseId !== undefined) schedule.courseId = courseId;
    if (courseName !== undefined) schedule.courseName = courseName;
    if (courseAbbreviation !== undefined)
      schedule.courseAbbreviation = courseAbbreviation;
    if (yearLevel !== undefined) schedule.yearLevel = yearLevel;
    if (semester !== undefined) schedule.semester = semester;
    if (academicYear !== undefined) schedule.academicYear = academicYear;
    if (events !== undefined) schedule.events = events;

    const updatedSchedule = await schedule.save();

    const populatedSchedule = await Schedule.findById(updatedSchedule._id)
      .populate("courseId", "name abbreviation")
      .populate("events.subjectId", "name code requiredHours hasLab");

    res.json(populatedSchedule);
    // Sync ScheduleEvent docs for updated schedule
    try {
      await ScheduleEvent.deleteMany({ scheduleId: updatedSchedule._id });
      const evDocs = (updatedSchedule.events || []).map(ev => ({
        scheduleId: updatedSchedule._id,
        scheduleName: updatedSchedule.name,
        courseId: updatedSchedule.courseId,
        courseName: updatedSchedule.courseName,
        courseAbbreviation: updatedSchedule.courseAbbreviation,
        yearLevel: updatedSchedule.yearLevel,
        semester: updatedSchedule.semester,
        day: ev.day,
        startTime: ev.startTime,
        endTime: ev.endTime,
        subjectId: ev.subjectId,
        subjectName: ev.subjectName || '',
        subjectCode: ev.subjectCode || '',
        sessionType: ev.sessionType || 'lecture',
        room: ev.room || '',
        assignedTeacher: ev.assignedTeacher || null,
        isActive: true
      }));
      if (evDocs.length > 0) await ScheduleEvent.insertMany(evDocs);
    } catch (err) {
      console.error('Failed to sync ScheduleEvent docs after schedule update:', err);
    }
  } catch (error) {
    console.error("Error updating schedule:", error);
    res
      .status(500)
      .json({ message: "Error updating schedule", error: error.message });
  }
});

// DELETE schedule (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    schedule.isActive = false;
    await schedule.save();

    // Mark associated ScheduleEvent docs inactive
    try {
      await ScheduleEvent.updateMany({ scheduleId: schedule._id }, { isActive: false });
    } catch (err) {
      console.error('Failed to mark ScheduleEvent docs inactive on schedule delete:', err);
    }

    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res
      .status(500)
      .json({ message: "Error deleting schedule", error: error.message });
  }
});

// Helper functions
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function checkTimeConflicts(events) {
  const conflicts = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];

      if (event1.day === event2.day) {
        const start1 = timeToMinutes(event1.startTime);
        const end1 = timeToMinutes(event1.endTime);
        const start2 = timeToMinutes(event2.startTime);
        const end2 = timeToMinutes(event2.endTime);

        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            event1: `${event1.day} ${event1.startTime}-${event1.endTime}`,
            event2: `${event2.day} ${event2.startTime}-${event2.endTime}`,
            message: "Time overlap detected",
          });
        }
      }
    }
  }

  return conflicts;
}

function checkConflictsWithExisting(newEvents, existingSchedules, currentScheduleContext) {
  const conflicts = [];

  for (const existingSchedule of existingSchedules) {
    for (const existingEvent of existingSchedule.events) {
      for (const newEvent of newEvents) {
        // Only check if events are on the same day
        if (existingEvent.day !== newEvent.day) continue;

        const existingStart = timeToMinutes(existingEvent.startTime);
        const existingEnd = timeToMinutes(existingEvent.endTime);
        const newStart = timeToMinutes(newEvent.startTime);
        const newEnd = timeToMinutes(newEvent.endTime);

        // Check if time slots overlap
        const hasTimeOverlap = newStart < existingEnd && existingStart < newEnd;
        if (!hasTimeOverlap) continue;

        // 1. STUDENT CONFLICT: Same course/year/semester/academic year can't attend two classes at once
        const sameStudents = 
          existingSchedule.courseId?.toString() === currentScheduleContext.courseId?.toString() &&
          existingSchedule.yearLevel === currentScheduleContext.yearLevel &&
          existingSchedule.semester === currentScheduleContext.semester &&
          existingSchedule.academicYear === currentScheduleContext.academicYear;

        if (sameStudents) {
          conflicts.push({
            type: 'STUDENT',
            existingSchedule: existingSchedule.name,
            existingEvent: `${existingEvent.day} ${existingEvent.startTime}-${existingEvent.endTime}`,
            newEvent: `${newEvent.day} ${newEvent.startTime}-${newEvent.endTime}`,
            message: `Students in ${existingSchedule.courseName || existingSchedule.courseAbbreviation} Year ${existingSchedule.yearLevel} cannot attend two classes at the same time`,
          });
        }

        // 2. TEACHER CONFLICT: Same teacher can't teach two classes at once (in same academic year)
        const existingTeacherId = existingEvent.assignedTeacher?.teacherId?.toString() || 
                                   existingEvent.assignedTeacher?.teacherId?._id?.toString();
        const newTeacherId = newEvent.assignedTeacher?.teacherId?.toString() || 
                            newEvent.assignedTeacher?.teacherId?._id?.toString();

        if (existingTeacherId && newTeacherId && existingTeacherId === newTeacherId && 
            existingSchedule.academicYear === currentScheduleContext.academicYear) {
          conflicts.push({
            type: 'TEACHER',
            existingSchedule: existingSchedule.name,
            existingEvent: `${existingEvent.day} ${existingEvent.startTime}-${existingEvent.endTime}`,
            newEvent: `${newEvent.day} ${newEvent.startTime}-${newEvent.endTime}`,
            teacherName: newEvent.assignedTeacher?.teacherName || existingEvent.assignedTeacher?.teacherName || 'Unknown',
            message: `Teacher ${newEvent.assignedTeacher?.teacherName || 'Unknown'} is already assigned to "${existingSchedule.name}" at this time`,
          });
        }

        // 3. ROOM CONFLICT: Same room can't host two classes at once (in same academic year)
        const existingRoom = existingEvent.room?.trim();
        const newRoom = newEvent.room?.trim();

        if (existingRoom && newRoom && existingRoom.toLowerCase() === newRoom.toLowerCase() &&
            existingSchedule.academicYear === currentScheduleContext.academicYear) {
          conflicts.push({
            type: 'ROOM',
            existingSchedule: existingSchedule.name,
            existingEvent: `${existingEvent.day} ${existingEvent.startTime}-${existingEvent.endTime}`,
            newEvent: `${newEvent.day} ${newEvent.startTime}-${newEvent.endTime}`,
            room: newRoom,
            message: `Room "${newRoom}" is already occupied by "${existingSchedule.name}" at this time`,
          });
        }
      }
    }
  }

  return conflicts;
}

async function validateSubjectHours(events) {
  const subjectHours = {};
  const violations = [];

  for (const event of events) {
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);
    const durationHours = (endMinutes - startMinutes) / 60;

    const sessionType = event.sessionType || "lecture";
    const key = `${event.subjectId}_${sessionType}`;

    if (!subjectHours[key]) {
      subjectHours[key] = {
        subjectId: event.subjectId,
        sessionType: sessionType,
        totalHours: 0,
      };
    }
    subjectHours[key].totalHours += durationHours;
  }

  for (const [key, data] of Object.entries(subjectHours)) {
    const { subjectId, sessionType, totalHours } = data;
    const subject = await Subject.findById(subjectId);
    if (!subject) continue;

    let requiredHours;
    const sessions = subject.getRequiredSessions();

    if (sessionType === "lecture") {
      requiredHours = sessions.lecture.hours;
    } else if (sessionType === "lab" && sessions.lab) {
      requiredHours = sessions.lab.hours * sessions.lab.sessions;
    } else if (sessionType === "lab" && !sessions.lab) {
      violations.push({
        subjectId: subject._id,
        subjectName: subject.name,
        subjectCode: subject.code,
        sessionType: sessionType,
        message: `${subject.name} does not have a lab component`,
      });
      continue;
    }

    if (totalHours > requiredHours) {
      violations.push({
        subjectId: subject._id,
        subjectName: subject.name,
        subjectCode: subject.code,
        sessionType: sessionType,
        scheduledHours: totalHours,
        requiredHours: requiredHours,
        excessHours: totalHours - requiredHours,
        message: `${subject.name} ${sessionType} is scheduled for ${totalHours}h but requires only ${requiredHours}h`,
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

// GET recyclable schedules
router.get("/recyclable", async (req, res) => {
  try {
    const schedules = await Schedule.find({ isActive: true })
      .populate("courseId", "name abbreviation code")
      .select("name academicYear semester yearLevel courseId events")
      .sort({ academicYear: -1, semester: -1 });

    // Add subject count for each schedule
    const schedulesWithCount = schedules.map(schedule => ({
      ...schedule.toObject(),
      subjectCount: schedule.events?.length || 0,
      courseCode: schedule.courseId?.abbreviation || schedule.courseId?.code
    }));

    res.json(schedulesWithCount);
  } catch (error) {
    console.error("Error fetching recyclable schedules:", error);
    res.status(500).json({ message: "Error fetching recyclable schedules" });
  }
});

// GET detailed schedule for recycling
router.get("/:id/detailed", async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate({
        path: "courseId",
        select: "name abbreviation code"
      })
      .populate({
        path: "events.subjectId",
        select: "name code requiredHours hasLab lectureUnits labUnits"
      });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Get subject offerings for this schedule to get teacher assignments
    const subjectOfferings = await SubjectOffering.find({
      courseId: schedule.courseId._id,
      yearLevel: schedule.yearLevel,
      semester: schedule.semester,
      academicYear: schedule.academicYear
    }).populate("subjectId", "name code");

    // Transform the data for recycling
    const detailedSchedule = {
      ...schedule.toObject(),
      subjects: subjectOfferings.map(offering => ({
        _id: offering._id,
        subjectId: offering.subjectId,
        assignedTeachers: offering.assignedTeachers || [],
        preferredRooms: offering.preferredRooms || []
      }))
    };

    res.json(detailedSchedule);
  } catch (error) {
    console.error("Error fetching detailed schedule:", error);
    res.status(500).json({ message: "Error fetching schedule details" });
  }
});

// POST recycle schedule
router.post("/recycle", async (req, res) => {
  try {
    const { 
      sourceScheduleId, 
      targetAcademicYear, 
      targetSemester, 
      teacherMappings 
    } = req.body;

    // Get source schedule
    const sourceSchedule = await Schedule.findById(sourceScheduleId)
      .populate("courseId");

    if (!sourceSchedule) {
      return res.status(404).json({ message: "Source schedule not found" });
    }

    // Check if target schedule already exists
    const existingSchedule = await Schedule.findOne({
      courseId: sourceSchedule.courseId._id,
      yearLevel: sourceSchedule.yearLevel,
      academicYear: targetAcademicYear,
      semester: targetSemester,
      isActive: true
    });

    if (existingSchedule) {
      return res.status(400).json({ 
        message: "A schedule for this course, year level, and semester already exists" 
      });
    }

    // Create new schedule
    const newSchedule = new Schedule({
      name: `${sourceSchedule.courseId.abbreviation} Year ${sourceSchedule.yearLevel} - ${targetAcademicYear} Semester ${targetSemester}`,
      courseId: sourceSchedule.courseId._id,
      yearLevel: sourceSchedule.yearLevel,
      academicYear: targetAcademicYear,
      semester: targetSemester,
      events: sourceSchedule.events || [],
      isActive: true
    });

    const savedSchedule = await newSchedule.save();

    // Copy subject offerings with updated teacher mappings
    const sourceOfferings = await SubjectOffering.find({
      courseId: sourceSchedule.courseId._id,
      yearLevel: sourceSchedule.yearLevel,
      semester: sourceSchedule.semester,
      academicYear: sourceSchedule.academicYear
    });

    let subjectsCopied = 0;
    let teachersUpdated = 0;

    for (const sourceOffering of sourceOfferings) {
      // Create new offering for target academic year
      const newOfferingData = {
        subjectId: sourceOffering.subjectId,
        courseId: sourceOffering.courseId,
        yearLevel: sourceOffering.yearLevel,
        semester: targetSemester,
        academicYear: targetAcademicYear,
        assignedTeachers: [...(sourceOffering.assignedTeachers || [])],
        preferredRooms: sourceOffering.preferredRooms || []
      };

      // Update teacher assignments based on mappings
      teacherMappings.forEach(mapping => {
        if (mapping.subjectId === sourceOffering._id.toString()) {
          const teacherIndex = mapping.assignmentIndex;
          if (newOfferingData.assignedTeachers[teacherIndex]) {
            newOfferingData.assignedTeachers[teacherIndex] = {
              teacherId: mapping.newTeacherId,
              teacherName: mapping.newTeacherName,
              type: mapping.assignmentType
            };
            teachersUpdated++;
          }
        }
      });

      const newOffering = new SubjectOffering(newOfferingData);
      await newOffering.save();
      subjectsCopied++;
    }

    res.json({
      success: true,
      message: "Schedule recycled successfully",
      newScheduleId: savedSchedule._id,
      subjectsCopied,
      teachersUpdated
    });

  } catch (error) {
    console.error("Error recycling schedule:", error);
    res.status(500).json({ 
      message: "Error recycling schedule",
      error: error.message 
    });
  }
});

export default router;