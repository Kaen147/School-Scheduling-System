import Subject from '../models/subjectModel.js';

// Add a subject (master definition only)
export const addSubject = async (req, res) => {
  try {
    const { code, name } = req.body;

    // Check if subject with same code already exists (prevent duplicate subjects in master list)
    if (code) {
      const existing = await Subject.findOne({ 
        code: code.toUpperCase(),
        isActive: true 
      });
      
      if (existing) {
        return res.status(409).json({ 
          message: `Subject with code "${code.toUpperCase()}" already exists. Use it to create multiple offerings/sections.`,
          existingSubject: existing
        });
      }
    }

    const newSubject = await Subject.create(req.body);
    res.status(201).json(newSubject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get subjects (simple query, no semester filters)
export const getSubjects = async (req, res) => {
  try {
    const { search, code } = req.query;

    let query = { isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    if (code) query.code = code.toUpperCase();

    const subjects = await Subject.find(query);
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// Update subject (edit master definition)
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedSubject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    
    res.json(updatedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a subject by id
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Subject.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

