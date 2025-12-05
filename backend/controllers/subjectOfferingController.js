import SubjectOffering from '../models/subjectOfferingModel.js';
import Subject from '../models/subjectModel.js';

export const createOffering = async (req, res) => {
  try {
    let { subjectId, courseId, yearLevel, semester, academicYear, assignedTeachers, preferredRooms, capacity, notes } = req.body;
    
    // Validate required fields
    if (!subjectId || !courseId || !yearLevel || !semester || !academicYear) {
      return res.status(400).json({ message: 'Missing required fields: subjectId, courseId, yearLevel, semester, academicYear' });
    }
    
    // Ensure courseId is an array (support both single course and multi-course)
    if (!Array.isArray(courseId)) {
      courseId = [courseId];
    }
    
    // Check if offering already exists for this combination
    // For multi-course offerings, check if the exact same course array exists
    const existing = await SubjectOffering.findOne({
      subjectId,
      yearLevel,
      semester,
      academicYear,
      isActive: true,
      $or: [
        // Exact match for all courses
        { courseId: { $all: courseId, $size: courseId.length } },
        // Or any overlap (to prevent partial duplicates)
        { courseId: { $in: courseId } }
      ]
    });
    
    if (existing) {
      return res.status(409).json({ message: 'Offering already exists or overlaps with existing offering for this subject/course/semester combination', offering: existing });
    }
    
    const offering = await SubjectOffering.create({
      subjectId,
      courseId,
      yearLevel,
      semester,
      academicYear,
      assignedTeachers: assignedTeachers || [],
      preferredRooms: preferredRooms || [],
      capacity,
      notes,
      isActive: true
    });
    
    const populated = await SubjectOffering.findById(offering._id)
      .populate('subjectId')
      .populate('courseId');
    
    res.status(201).json(populated);
  } catch (err) {
    console.error('createOffering error', err);
    res.status(500).json({ message: 'Failed to create offering', error: err.message });
  }
};

export const listOfferings = async (req, res) => {
  try {
    const { courseId, yearLevel, semester, subjectId, academicYear } = req.query;
    const filter = { isActive: true };
    
    // Support filtering by courseId (check if courseId array contains the requested course)
    if (courseId) filter.courseId = courseId; // MongoDB will match if courseId array contains this value
    if (yearLevel) filter.yearLevel = Number(yearLevel);
    if (semester) filter.semester = semester;
    if (subjectId) filter.subjectId = subjectId;
    if (academicYear) filter.academicYear = academicYear;

    const offerings = await SubjectOffering.find(filter)
      .populate('subjectId')
      .populate('courseId') // Will populate all courses in the array
      .populate({
        path: 'assignedTeachers.teacherId',
        model: 'User',
        select: '_id firstName lastName name email role'
      })
      .lean();
    res.json(offerings);
  } catch (err) {
    console.error('listOfferings error', err);
    res.status(500).json({ message: 'Failed to list offerings', error: err.message });
  }
};

export const getOffering = async (req, res) => {
  try {
    const offering = await SubjectOffering.findById(req.params.id).populate('subjectId');
    if (!offering) return res.status(404).json({ message: 'Offering not found' });
    res.json(offering);
  } catch (err) {
    console.error('getOffering error', err);
    res.status(500).json({ message: 'Failed to get offering', error: err.message });
  }
};

export const updateOffering = async (req, res) => {
  try {
    console.log('Updating offering:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const offering = await SubjectOffering.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!offering) return res.status(404).json({ message: 'Offering not found' });
    
    const populated = await SubjectOffering.findById(offering._id)
      .populate('subjectId')
      .populate('courseId');
    
    res.json(populated);
  } catch (err) {
    console.error('updateOffering error:', err);
    console.error('Error details:', err.message);
    if (err.name === 'ValidationError') {
      console.error('Validation errors:', err.errors);
    }
    res.status(500).json({ 
      message: 'Failed to update offering', 
      error: err.message,
      details: err.errors ? Object.keys(err.errors).map(key => err.errors[key].message) : []
    });
  }
};

export const deleteOffering = async (req, res) => {
  try {
    // soft-delete
    const offering = await SubjectOffering.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!offering) return res.status(404).json({ message: 'Offering not found' });
    res.json({ message: 'Offering marked inactive', offering });
  } catch (err) {
    console.error('deleteOffering error', err);
    res.status(500).json({ message: 'Failed to delete offering', error: err.message });
  }
};
