import express from 'express';
import SubjectOffering from '../models/subjectOfferingModel.js';
import {
  calculateTeacherWorkload,
  recalculateAllTeacherWorkloads,
  calculateSubjectUnitsInSchedule,
  getTeacherWorkloadReport,
  getAllTeachersWorkloadSummary,
  formatWorkloadDisplay,
  validateTeacherUnitLimit
} from '../controllers/teacherWorkloadController.js';

const router = express.Router();

/**
 * DEBUG: GET /api/workload/debug/offerings
 * Returns ALL offerings with their assignedTeachers (for debugging)
 */
router.get('/debug/offerings', async (req, res) => {
  try {
    const offerings = await SubjectOffering.find()
      .populate('subjectId', '_id name code')
      .lean();
    
    console.log("🔍 DEBUG: Found", offerings.length, "total offerings");
    offerings.forEach((o, i) => {
      console.log(`  [${i}] Subject: ${o.subjectId?.name}, Teachers:`, 
        o.assignedTeachers.map(t => `${t.teacherId} (${typeof t.teacherId})`));
    });
    
    res.json({
      debug: true,
      total: offerings.length,
      offerings: offerings.map(o => ({
        _id: o._id,
        subject: o.subjectId?.name,
        assignedTeachers: o.assignedTeachers.map(t => ({
          teacherId: String(t.teacherId),
          teacherId_type: typeof t.teacherId,
          teacherName: t.teacherName
        }))
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/workload/teacher/:teacherId
 * Get teacher workload for a specific semester
 * Query params: ?academicYear=2024-2025&semester=1
 */
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    const workload = await calculateTeacherWorkload(teacherId, academicYear, semester);

    res.json({
      success: true,
      data: workload,
      policy: 'Units = (Credit Hours) × (Number of Schedule Events Per Course)',
      message: `Workload calculated for ${workload.teacherName} - ${academicYear} ${semester}${semester === '1' ? 'st' : semester === '2' ? 'nd' : ''} Semester`
    });
  } catch (error) {
    console.error('Error getting teacher workload:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating teacher workload',
      error: error.message
    });
  }
});

/**
 * GET /api/workload/teacher/:teacherId/report
 * Get formatted teacher workload report
 */
router.get('/teacher/:teacherId/report', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    const report = await getTeacherWorkloadReport(teacherId, academicYear, semester);

    res.json({
      success: true,
      data: report,
      policy: 'Units = (Credit Hours) × (Number of Schedule Events Per Course)'
    });
  } catch (error) {
    console.error('Error getting workload report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating workload report',
      error: error.message
    });
  }
});

/**
 * GET /api/workload/all-teachers/summary
 * Get summary of all teachers' workload
 */
router.get('/all-teachers/summary', async (req, res) => {
  try {
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    const summary = await getAllTeachersWorkloadSummary(academicYear, semester);

    res.json({
      success: true,
      data: summary,
      policy: 'Units = (Credit Hours) × (Number of Schedule Events Per Course)'
    });
  } catch (error) {
    console.error('Error getting workload summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating workload summary',
      error: error.message
    });
  }
});

/**
 * POST /api/workload/recalculate-all
 * Recalculate all teachers' workload (admin only)
 */
router.post('/recalculate-all', async (req, res) => {
  try {
    const { academicYear = '2024-2025', semester = '1' } = req.body;

    console.log(`Recalculating all teacher workloads for ${academicYear} Semester ${semester}`);

    const results = await recalculateAllTeacherWorkloads(academicYear, semester);

    res.json({
      success: true,
      message: `Recalculated workload for ${results.length} teachers`,
      data: results,
      policy: 'Units = (Credit Hours) × (Number of Schedule Events Per Course)'
    });
  } catch (error) {
    console.error('Error recalculating workloads:', error);
    res.status(500).json({
      success: false,
      message: 'Error recalculating workloads',
      error: error.message
    });
  }
});

/**
 * GET /api/workload/subject/:scheduleId/:subjectId
 * Calculate units for a specific subject in a schedule
 */
router.get('/subject/:scheduleId/:subjectId', async (req, res) => {
  try {
    const { scheduleId, subjectId } = req.params;

    const units = await calculateSubjectUnitsInSchedule(scheduleId, subjectId);

    res.json({
      success: true,
      data: units,
      explanation: `This subject is worth ${units.creditHours} credit hours and appears ${units.eventCount} time(s) in this schedule, totaling ${units.unitCount} units.`
    });
  } catch (error) {
    console.error('Error calculating subject units:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating subject units',
      error: error.message
    });
  }
});

/**
 * GET /api/workload/teacher/:teacherId/formatted
 * Get formatted teacher workload for display
 */
router.get('/teacher/:teacherId/formatted', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    const workload = await calculateTeacherWorkload(teacherId, academicYear, semester);
    const formatted = formatWorkloadDisplay(workload);

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error getting formatted workload:', error);
    res.status(500).json({
      success: false,
      message: 'Error formatting workload',
      error: error.message
    });
  }
});

/**
 * POST /api/workload/verify-units
 * Verify and debug unit calculations
 */
router.post('/verify-units', async (req, res) => {
  try {
    const { scheduleId, teacherId, offeringId } = req.body;

    if (!scheduleId || !teacherId || !offeringId) {
      return res.status(400).json({
        success: false,
        message: 'scheduleId, teacherId, and offeringId are required'
      });
    }

    // Calculate based on provided data
    const workload = await calculateTeacherWorkload(teacherId);

    // Find specific assignment
    const assignment = workload.teachingAssignments.find(
      a => a.scheduleId.toString() === scheduleId && a.offeringId.toString() === offeringId
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      data: {
        assignment,
        calculation: `${assignment.creditHours} credit hours × ${assignment.eventCount} event(s) = ${assignment.unitCount} units`,
        policy: 'Units = (Credit Hours) × (Number of Schedule Events Per Course)',
        verification: {
          creditHours: assignment.creditHours,
          eventCount: assignment.eventCount,
          unitCount: assignment.unitCount,
          isCorrect: assignment.unitCount === (assignment.creditHours * assignment.eventCount)
        }
      }
    });
  } catch (error) {
    console.error('Error verifying units:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying units',
      error: error.message
    });
  }
});

/**
 * GET /api/workload/teacher/:teacherId/constraints
 * Check if teacher's workload exceeds unit limits
 */
router.get('/teacher/:teacherId/constraints', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    const workload = await calculateTeacherWorkload(teacherId, academicYear, semester);

    const employmentType = workload.employmentType || 'full-time';
    const maxUnitLimit = employmentType === 'part-time' ? 18 : 24;
    const exceedsLimit = workload.totalUnits > maxUnitLimit;
    const remainingUnits = Math.max(0, maxUnitLimit - workload.totalUnits);

    res.json({
      success: true,
      data: {
        teacherId: workload.teacherId,
        teacherName: workload.teacherName,
        email: workload.email,
        employmentType: employmentType,
        totalUnits: workload.totalUnits,
        maxUnitLimit,
        remainingUnits,
        exceedsLimit,
        status: exceedsLimit ? 'OVERLOAD' : 'OK',
        message: exceedsLimit 
          ? `Teacher exceeds limit by ${workload.totalUnits - maxUnitLimit} units` 
          : `Teacher can take ${remainingUnits} more units`,
        academicYear,
        semester
      }
    });
  } catch (error) {
    console.error('Error checking constraints:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking unit constraints',
      error: error.message
    });
  }
});

/**
 * GET /api/workload/all-teachers/constraints
 * Get constraint status for all teachers
 */
router.get('/all-teachers/constraints', async (req, res) => {
  try {
    const { academicYear = '2024-2025', semester = '1' } = req.query;

    const TeacherWorkload = (await import('../models/teacherWorkloadModel.js')).default;
    
    const workloads = await TeacherWorkload.find({
      academicYear,
      semester,
      isActive: true
    }).lean();

    const constraintStatus = workloads.map(w => {
      const employmentType = w.employmentType || 'full-time';
      const maxUnitLimit = employmentType === 'part-time' ? 18 : 24;
      const exceedsLimit = w.totalUnits > maxUnitLimit;
      const remainingUnits = Math.max(0, maxUnitLimit - w.totalUnits);

      return {
        teacherId: w.teacherId,
        teacherName: w.teacherName,
        email: w.email,
        employmentType: employmentType,
        totalUnits: w.totalUnits,
        maxUnitLimit,
        remainingUnits,
        exceedsLimit,
        status: exceedsLimit ? 'OVERLOAD' : 'OK',
        overloadUnits: exceedsLimit ? w.totalUnits - maxUnitLimit : 0
      };
    });

    const overloadedTeachers = constraintStatus.filter(t => t.exceedsLimit);
    const okTeachers = constraintStatus.filter(t => !t.exceedsLimit);

    res.json({
      success: true,
      data: {
        academicYear,
        semester,
        totalTeachers: constraintStatus.length,
        okTeachers: okTeachers.length,
        overloadedTeachers: overloadedTeachers.length,
        constraintLimits: {
          'part-time': 18,
          'full-time': 24
        },
        allTeachers: constraintStatus,
        overloaded: overloadedTeachers,
        withinLimits: okTeachers
      }
    });
  } catch (error) {
    console.error('Error getting constraint status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking constraints for all teachers',
      error: error.message
    });
  }
});

/**
 * POST /api/workload/validate-assignment
 * Validate if assigning a subject to a teacher would exceed unit limits
 * Body: { teacherId, subjectId, academicYear?, semester?, previousTeacherIds? }
 */
router.post('/validate-assignment', async (req, res) => {
  try {
    console.log("\n\n===========================================");
    console.log("🔵 VALIDATION ROUTE HIT!");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("===========================================\n");
    
    const { teacherId, subjectId, academicYear = '2024-2025', semester = '1', previousTeacherIds = [] } = req.body;

    if (!teacherId || !subjectId) {
      console.log("❌ Missing teacherId or subjectId");
      return res.status(400).json({
        success: false,
        message: 'teacherId and subjectId are required'
      });
    }

    console.log("✅ Calling validateTeacherUnitLimit NOW...");
    const validation = await validateTeacherUnitLimit(teacherId, subjectId, academicYear, semester, previousTeacherIds);

    console.log("\n📊 VALIDATION RESULT:");
    console.log(JSON.stringify(validation, null, 2));
    console.log("===========================================\n\n");
    
    res.json({
      success: validation.valid,
      ...validation
    });
  } catch (error) {
    console.error('❌ ERROR in validation route:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating unit limit',
      error: error.message
    });
  }
});

/**
 * POST /api/workload/teacher/:teacherId/overload
 * Set or remove overload status for a full-time teacher
 * Body: { isOverloaded: boolean }
 */
router.post('/teacher/:teacherId/overload', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { isOverloaded } = req.body;

    if (typeof isOverloaded !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isOverloaded must be a boolean value'
      });
    }

    // Get teacher
    const User = (await import('../models/userModel.js')).default;
    const teacher = await User.findById(teacherId);
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    if (teacher.employmentType !== 'full-time') {
      return res.status(400).json({
        success: false,
        message: 'Only full-time teachers can be overloaded'
      });
    }

    // Update overload status
    teacher.isOverloaded = isOverloaded;
    await teacher.save();

    // Also update the TeacherWorkload records
    const TeacherWorkload = (await import('../models/teacherWorkloadModel.js')).default;
    await TeacherWorkload.updateMany(
      { teacherId: teacherId },
      { 
        maxUnitLimit: isOverloaded ? 999 : 24, // 999 = effectively unlimited when overloaded
        isOverloaded: isOverloaded
      }
    );

    console.log(`✅ Teacher ${teacher.firstName} ${teacher.lastName} overload status set to: ${isOverloaded}`);

    res.json({
      success: true,
      message: `Teacher ${isOverloaded ? 'overloaded' : 'overload removed'}`,
      data: {
        teacherId: teacher._id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        isOverloaded: teacher.isOverloaded,
        maxUnitLimit: isOverloaded ? 'Unlimited' : 24
      }
    });
  } catch (error) {
    console.error('❌ ERROR in overload route:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating teacher overload status',
      error: error.message
    });
  }
});

export default router;
