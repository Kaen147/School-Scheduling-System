import Schedule from '../models/scheduleModel.js';
import SubjectOffering from '../models/subjectOfferingModel.js';
import Subject from '../models/subjectModel.js';
import Course from '../models/courseModel.js';
import User from '../models/userModel.js';
import TeacherWorkload from '../models/teacherWorkloadModel.js';

/**
 * UNIT COUNTING POLICY:
 * Units = (Subject Credit Hours) × (Number of Schedule Events Per Course)
 * 
 * Examples:
 * - NSTP 1 (3 units) added to BSIT schedule 1 time = 3 × 1 = 3 units
 * - NSTP 1 (3 units) added to BSTM schedule 1 time = 3 × 1 = 3 units
 * - If teacher teaches both at same time (combined): Teacher load = 3 units (1 event)
 * - If teacher teaches both at different times (separate): Teacher load = 6 units (2 events)
 */

// Helper function to calculate units for a subject in a schedule
const calculateUnitsForSubjectInSchedule = (subject, schedule, offeringId) => {
  if (!subject) {
    console.error('Subject not found for unit calculation');
    return 0;
  }

  // Get credit hours from subject
  const creditHours = subject.requiredHours || subject.lectureUnits || 3;

  // Count events in this schedule that reference this subject/offering
  const eventCount = schedule.events.filter(
    event => event.subjectId.toString() === offeringId.toString()
  ).length;

  // Apply policy: Units = creditHours × eventCount
  return creditHours * eventCount;
};

// Helper function to get all events for a subject in a schedule
const getSubjectEvents = (schedule, offeringId) => {
  return schedule.events.filter(
    event => event.subjectId.toString() === offeringId.toString()
  );
};

// Main function to calculate teacher workload
// Separates ASSIGNMENT UNITS (subjects assigned) from SCHEDULE UNITS (actual scheduled events)
export const calculateTeacherWorkload = async (teacherId, academicYear = '2024-2025', semester = '1') => {
  try {
    console.log("🔄 calculateTeacherWorkload called for teacherId:", teacherId, "type:", typeof teacherId);
    
    // Convert teacherId to string for comparison
    const teacherIdStr = String(teacherId);
    console.log("📝 Looking for teacherId as string:", teacherIdStr);
    
    // Fetch ALL subject offerings for this semester to check manually
    // DON'T use .lean() yet - keep as Mongoose documents so ObjectId comparisons work
    const allOfferingsDocs = await SubjectOffering.find({
      semester: semester,
      academicYear: academicYear,
      isActive: true
    })
      .populate('subjectId', '_id name code requiredHours lectureUnits labUnits')
      .populate('courseId', '_id name abbreviation');

    // Convert to lean for processing
    const allOfferings = allOfferingsDocs.map(doc => doc.toObject({ lean: true }));

    console.log("📋 Total offerings found:", allOfferings.length);
    
    // Debug: print first few offerings with their teachers
    allOfferings.slice(0, 5).forEach((o, i) => {
      console.log(`  [${i}] ${o.subjectId?.name}: teachers =`, 
        o.assignedTeachers.map(t => `${t.teacherId} (${typeof t.teacherId})`));
    });

    // Filter for ones assigned to this teacher
    // Use the original docs for comparison, then filter
    const offeringIndices = [];
    allOfferingsDocs.forEach((doc, idx) => {
      const assigned = doc.assignedTeachers || [];
      const match = assigned.some(t => {
        if (!t.teacherId) return false;
        
        // Use mongoose equals method if available
        if (typeof t.teacherId.equals === 'function') {
          return t.teacherId.equals(teacherId);
        }
        
        // Fallback: string comparison
        return String(t.teacherId) === String(teacherId);
      });
      
      if (match) {
        console.log("    ✅ Match found for:", doc.subjectId?.name);
        offeringIndices.push(idx);
      }
    });

    const offerings = offeringIndices.map(idx => allOfferings[idx]);

    console.log("📋 Offerings assigned to this teacher:", offerings.length);
    if (offerings.length > 0) {
      offerings.forEach(o => {
        console.log("    -", o.subjectId?.name, "units:", (o.subjectId?.lectureUnits || 0) + (o.subjectId?.labUnits || 0));
      });
    }

    // Fetch all active schedules for this semester
    const schedules = await Schedule.find({
      semester: semester,
      isActive: true
    })
      .populate('courseId', '_id name abbreviation')
      .lean();

    console.log("📅 Found schedules:", schedules.length);

    const teachingAssignments = [];
    const processedKeys = new Set();
    let totalAssignmentUnits = 0; // Sum of all assigned subject units (regardless of schedule)
    let totalScheduleUnits = 0;   // Sum of units from actual schedule events

    // Process each offering
    for (const offering of offerings) {
      if (!offering.subjectId) continue;

      const subject = offering.subjectId;
      const lectureUnits = Number(subject.lectureUnits || 0);
      const labUnits = Number(subject.labUnits || 0);
      const subjectTotalUnits = lectureUnits + labUnits;

      // Get courses array (handle single course or multi-course offerings)
      const coursesArray = Array.isArray(offering.courseId) 
        ? offering.courseId 
        : [offering.courseId];

      // For each course in this offering
      for (const course of coursesArray) {
        // Find schedule for this course
        const schedule = schedules.find(s => 
          s.courseId._id.toString() === course._id.toString() &&
          s.yearLevel === offering.yearLevel.toString() &&
          s.semester === offering.semester
        );

        const key = `${offering._id}_${course._id}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        // Get event details from schedule for this course (if it exists)
        const courseEvents = schedule?.events || [];
        const eventCount = courseEvents.length;
        
        // ASSIGNMENT UNITS: Always based on subject units (same per course regardless of schedule)
        const assignmentUnitsForThisCourse = subjectTotalUnits;
        
        // SCHEDULE UNITS: Based on actual scheduled events (only if schedule exists and has events)
        const scheduleUnitsForThisCourse = eventCount > 0 ? (subjectTotalUnits * eventCount) : 0;

        // Add to totals
        totalAssignmentUnits += assignmentUnitsForThisCourse;
        totalScheduleUnits += scheduleUnitsForThisCourse;

        teachingAssignments.push({
          offeringId: offering._id,
          subjectId: subject._id,
          subjectCode: subject.code,
          subjectName: subject.name,
          courseId: course._id,
          courseName: course.name,
          courseAbbreviation: course.abbreviation,
          scheduleId: schedule?._id || null,
          lectureUnits,
          labUnits,
          subjectTotalUnits,
          assignmentUnits: assignmentUnitsForThisCourse,
          scheduleUnits: scheduleUnitsForThisCourse,
          eventCount,
          yearLevel: offering.yearLevel.toString(),
          semester: offering.semester,
          academicYear,
          events: courseEvents.map(e => ({
            day: e.day,
            startTime: e.startTime,
            endTime: e.endTime,
            room: e.room || 'TBD'
          })) || [],
          hasSchedule: !!schedule,
          scheduledEvents: eventCount
        });
      }
    }

    // Calculate totals
    const totalCourses = teachingAssignments.length;

    // Get teacher info
    const teacher = await User.findById(teacherId).lean();
    if (!teacher) {
      throw new Error(`Teacher ${teacherId} not found`);
    }

    // Create or update workload
    const employmentType = teacher.employmentType || 'full-time';
    const isOverloaded = teacher.isOverloaded || false;
    const maxUnitLimit = employmentType === 'part-time' ? 18 : (isOverloaded ? 999 : 24); // 999 = effectively unlimited when overloaded
    
    const workload = await TeacherWorkload.findOneAndUpdate(
      { teacherId, academicYear, semester },
      {
        teacherId,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        employmentType: employmentType,
        isOverloaded,
        maxUnitLimit,
        academicYear,
        semester,
        teachingAssignments,
        totalAssignmentUnits,  // Sum of all assigned subject units
        totalScheduleUnits,    // Sum of units from actual scheduled events
        totalCourses,
        totalStudents: 0,
        isActive: true
      },
      { upsert: true, new: true }
    );

    return workload.toObject();
  } catch (error) {
    console.error('Error calculating teacher workload:', error);
    throw error;
  }
};

// Recalculate all teachers' workload
export const recalculateAllTeacherWorkloads = async (academicYear = '2024-2025', semester = '1') => {
  try {
    // Get all unique teachers
    const offerings = await SubjectOffering.find({
      isActive: true
    }).distinct('assignedTeachers.teacherId');

    const results = [];
    for (const teacherId of offerings) {
      if (!teacherId) continue;
      const workload = await calculateTeacherWorkload(teacherId, academicYear, semester);
      results.push(workload);
    }

    return results;
  } catch (error) {
    console.error('Error recalculating all workloads:', error);
    throw error;
  }
};

// Calculate units for a specific subject in a schedule
export const calculateSubjectUnitsInSchedule = async (scheduleId, subjectId) => {
  try {
    const schedule = await Schedule.findById(scheduleId)
      .populate({
        path: 'events.subjectId',
        populate: {
          path: 'subjectId',
          select: 'requiredHours lectureUnits'
        }
      });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Check if subjectId is an offering or subject
    const offering = await SubjectOffering.findById(subjectId).populate('subjectId');
    const subject = offering?.subjectId || (await Subject.findById(subjectId));

    if (!subject) {
      throw new Error('Subject not found');
    }

    const creditHours = subject.requiredHours || subject.lectureUnits || 3;
    const eventCount = schedule.events.filter(
      e => e.subjectId.toString() === subjectId.toString()
    ).length;

    return {
      creditHours,
      eventCount,
      unitCount: creditHours * eventCount,
      policy: 'Units = creditHours × eventCount'
    };
  } catch (error) {
    console.error('Error calculating subject units:', error);
    throw error;
  }
};

// Get teacher workload report
export const getTeacherWorkloadReport = async (teacherId, academicYear = '2024-2025', semester = '1') => {
  try {
    const workload = await TeacherWorkload.getTeacherWorkload(teacherId, academicYear, semester);

    if (!workload) {
      return {
        teacherId,
        message: 'No workload found for this teacher',
        totalUnits: 0,
        assignments: []
      };
    }

    return {
      teacherId: workload.teacherId,
      teacherName: workload.teacherName,
      email: workload.email,
      academicYear: workload.academicYear,
      semester: workload.semester,
      totalUnits: workload.totalUnits,
      totalCourses: workload.totalCourses,
      summary: workload.summary,
      assignments: workload.teachingAssignments.map(a => ({
        subject: `${a.subjectCode} - ${a.subjectName}`,
        course: `${a.courseAbbreviation}`,
        creditHours: a.creditHours,
        eventCount: a.eventCount,
        units: a.unitCount,
        events: a.events,
        policy: `${a.creditHours} hours × ${a.eventCount} events = ${a.unitCount} units`
      }))
    };
  } catch (error) {
    console.error('Error getting workload report:', error);
    throw error;
  }
};

// Get all teachers' workload summary for a semester
export const getAllTeachersWorkloadSummary = async (academicYear = '2024-2025', semester = '1') => {
  try {
    const workloads = await TeacherWorkload.getAllTeacherWorkloads(academicYear, semester);

    return {
      academicYear,
      semester,
      totalTeachers: workloads.length,
      summary: workloads.map(w => ({
        teacherId: w.teacherId._id,
        teacherName: `${w.teacherId.firstName} ${w.teacherId.lastName}`,
        email: w.teacherId.email,
        totalUnits: w.totalUnits,
        totalCourses: w.totalCourses,
        averageUnitsPerCourse: w.summary.averageUnitsPerCourse || 0,
        assignmentCount: w.teachingAssignments.length
      })),
      totalUnitsAssigned: workloads.reduce((sum, w) => sum + w.totalUnits, 0),
      averageUnitsPerTeacher: workloads.length > 0
        ? workloads.reduce((sum, w) => sum + w.totalUnits, 0) / workloads.length
        : 0
    };
  } catch (error) {
    console.error('Error getting workload summary:', error);
    throw error;
  }
};

// Format workload for display
export const formatWorkloadDisplay = (workload) => {
  if (!workload) return null;

  return {
    teacher: workload.teacherName,
    email: workload.email,
    semester: `${workload.semester === '1' ? '1st' : workload.semester === '2' ? '2nd' : 'Summer'} Semester ${workload.academicYear}`,
    totalUnits: workload.totalUnits,
    breakdown: workload.teachingAssignments.map(a => ({
      subject: `${a.subjectCode}`,
      course: a.courseAbbreviation,
      schedule: a.events.map(e => `${e.day} ${e.startTime}-${e.endTime}`).join(', '),
      calculation: `${a.creditHours} units/hour × ${a.eventCount} event(s) = ${a.unitCount} units`
    }))
  };
};

// Validate if assigning a subject to a teacher would exceed unit limits
// Uses ASSIGNMENT UNITS (not schedule units) to check availability
// SIMPLE VALIDATION - directly count units from database
export const validateTeacherUnitLimit = async (teacherId, subjectId, academicYear = '2024-2025', semester = '1', previousTeacherIds = []) => {
  try {
    console.log("🔍 VALIDATION START for teacherId:", teacherId);

    // 1. Get teacher and determine limit
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return { valid: false, reason: 'Teacher not found' };
    }

    const maxUnitLimit = teacher.employmentType === 'full-time' ? 24 : 18; // Part-time: 15-18 units, Full-time: 24 units (unlimited when overloaded)
    console.log(`👥 Teacher: ${teacher.firstName} ${teacher.lastName}, Type: ${teacher.employmentType}, Normal Limit: ${maxUnitLimit}, Currently Overloaded: ${teacher.isOverloaded || false}`);

    // 2. Get subject units
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return { valid: false, reason: 'Subject not found' };
    }
    const subjectUnits = (subject.lectureUnits || 0) + (subject.labUnits || 0);
    console.log(`📚 Subject: ${subject.name}, Units: ${subjectUnits}`);

    // 3. Find ALL offerings where this teacher is assigned (this semester)
    const offerings = await SubjectOffering.find({
      semester: semester,
      academicYear: academicYear,
      isActive: true
    }).populate('subjectId', 'name lectureUnits labUnits');

    console.log(`� Total offerings in ${semester} semester: ${offerings.length}`);

    // 4. Calculate current total units for THIS teacher
    let currentUnits = 0;
    let isAlreadyAssignedToThisSubject = false;

    offerings.forEach(offering => {
      const teachers = offering.assignedTeachers || [];
      const isAssigned = teachers.some(t => String(t.teacherId) === String(teacherId));
      
      if (isAssigned && offering.subjectId) {
        const units = (offering.subjectId.lectureUnits || 0) + (offering.subjectId.labUnits || 0);
        currentUnits += units;
        console.log(`  ✅ Assigned to: ${offering.subjectId.name} (${units} units)`);
        
        // Check if this is the subject we're validating
        if (String(offering.subjectId._id) === String(subjectId)) {
          isAlreadyAssignedToThisSubject = true;
          console.log(`    ⚠️ This is the subject being validated!`);
        }
      }
    });

    console.log(`💼 Current total units: ${currentUnits}`);

    // 5. Calculate what the new total would be
    let newTotal;
    if (isAlreadyAssignedToThisSubject) {
      // Teacher already has this subject, so total stays the same
      newTotal = currentUnits;
      console.log(`🔄 Teacher already assigned to this subject. Total remains: ${newTotal}`);
    } else {
      // Teacher doesn't have this subject yet, so add it
      newTotal = currentUnits + subjectUnits;
      console.log(`➕ Adding ${subjectUnits} units: ${currentUnits} + ${subjectUnits} = ${newTotal}`);
    }

    // 6. Check if it exceeds limits
    const exceedsNormalLimit = newTotal > maxUnitLimit;
    
    console.log(`📊 Limits Check - Normal: ${newTotal} > ${maxUnitLimit}? ${exceedsNormalLimit ? '❌ YES' : '✅ NO'}`);

    // For part-time teachers, only check normal limit
    if (teacher.employmentType === 'part-time') {
      return {
        valid: !exceedsNormalLimit,
        reason: exceedsNormalLimit 
          ? `Cannot assign: would exceed part-time limit of ${maxUnitLimit} units (current: ${currentUnits}, after adding ${subjectUnits}: ${newTotal})`
          : 'Unit limit check passed',
        currentAssignmentUnits: currentUnits,
        maxUnitLimit,
        subjectUnits,
        newTotal,
        employmentType: teacher.employmentType,
        requiresOverload: false
      };
    }

    // For full-time teachers
    if (exceedsNormalLimit && !teacher.isOverloaded) {
      // Exceeds normal limit but teacher is not currently overloaded
      // This requires overload approval (no upper limit when overloaded)
      return {
        valid: false,
        requiresOverload: true,
        reason: `Teacher would exceed normal limit of ${maxUnitLimit} units but can be overloaded with no upper limit`,
        currentAssignmentUnits: currentUnits,
        maxUnitLimit,
        subjectUnits,
        newTotal,
        employmentType: teacher.employmentType,
        teacherName: `${teacher.firstName} ${teacher.lastName}`
      };
    } else {
      // Either within normal limit, or teacher is already overloaded (no limit when overloaded)
      return {
        valid: true,
        reason: teacher.isOverloaded && exceedsNormalLimit 
          ? 'Teacher is overloaded - no upper limit applies' 
          : 'Unit limit check passed',
        currentAssignmentUnits: currentUnits,
        maxUnitLimit,
        subjectUnits,
        newTotal,
        employmentType: teacher.employmentType,
        requiresOverload: false,
        isOverloaded: teacher.isOverloaded || exceedsNormalLimit
      };
    }
  } catch (error) {
    console.error('❌ Validation error:', error);
    return { valid: false, reason: `Validation error: ${error.message}` };
  }
};
