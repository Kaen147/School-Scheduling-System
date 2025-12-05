import { useState, useEffect } from "react";
import Swal from "sweetalert2";

function AddSubjectModal({ show, onClose, onSuccess, courses = [] }) {
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [yearLevel, setYearLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [bulkSubjects, setBulkSubjects] = useState([newSubjectRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [existingOfferings, setExistingOfferings] = useState([]);

  function newSubjectRow() {
    return {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: "",
      code: "",
      hasLab: false,
      lectureUnits: 3,
      labUnits: 0,
    };
  }

  const fetchExistingOfferings = async () => {
    if (selectedCourseIds.length === 0 || !yearLevel || !semester || !academicYear) return;
    
    try {
      const allOfferings = [];
      for (const courseId of selectedCourseIds) {
        const query = new URLSearchParams({
          courseId: courseId,
          yearLevel: yearLevel,
          semester: semester,
          academicYear: academicYear
        }).toString();

        const res = await fetch(`http://localhost:5000/api/offerings?${query}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allOfferings.push(...(Array.isArray(data) ? data : []));
      }
      setExistingOfferings(allOfferings);
    } catch (err) {
      console.error("Error fetching existing offerings:", err);
      setExistingOfferings([]);
    }
  };

  const addBulkSubjectRow = () => {
    setBulkSubjects(prev => [...prev, newSubjectRow()]);
  };

  const removeBulkSubjectRow = (id) => {
    if (bulkSubjects.length === 1) {
      Swal.fire({
        icon: "warning",
        title: "Cannot Remove",
        text: "You must have at least one subject row",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }
    setBulkSubjects(prev => prev.filter(s => s.id !== id));
  };

  const updateBulkSubject = (id, field, value) => {
    setBulkSubjects(prev =>
      prev.map(subj => {
        if (subj.id !== id) return subj;
        const updated = { ...subj, [field]: value };
        if (field === "hasLab") {
          updated.lectureUnits = value ? 2 : 3;
          updated.labUnits = value ? 1 : 0;
        }
        return updated;
      })
    );
  };

  useEffect(() => {
    if (show) {
      resetForm();
    }
  }, [show]);

  useEffect(() => {
    if (show && selectedCourseIds.length > 0 && yearLevel && semester && academicYear) {
      fetchExistingOfferings();
    }
  }, [show, selectedCourseIds, yearLevel, semester, academicYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (selectedCourseIds.length === 0 || !yearLevel || !semester || !academicYear) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill in all context fields",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    const validSubjects = bulkSubjects.filter(s => s.name.trim() && s.code.trim());

    if (validSubjects.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Subjects",
        text: "Please fill in at least one subject with both name and code",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    // Check for duplicate subjects in the form itself (same code/name within this batch)
    const codes = new Set();
    for (const subject of validSubjects) {
      const code = subject.code.trim().toUpperCase();
      
      if (codes.has(code)) {
        Swal.fire({
          icon: "error",
          title: "Duplicate Subject Code",
          text: `Duplicate subject code in this batch: "${code}" appears multiple times`,
          confirmButtonColor: "#3B82F6",
        });
        return;
      }
      codes.add(code);
    }

    setSubmitting(true);
    const results = { successful: [], failed: [] };

    for (const subject of validSubjects) {
      try {
        const computedHours = Number(subject.lectureUnits || 0) + Number(subject.labUnits || 0);
        const subjectPayload = {
          name: subject.name.trim(),
          code: subject.code.trim(),
          hasLab: subject.hasLab,
          lectureUnits: Number(subject.lectureUnits),
          labUnits: Number(subject.labUnits),
          requiredHours: computedHours
        };

        let createdSubject;
        const subjectRes = await fetch("http://localhost:5000/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subjectPayload)
        });

        if (!subjectRes.ok) {
          const err = await subjectRes.json();
          
          // If subject already exists (409), fetch it and use it to create a new offering (new section)
          if (subjectRes.status === 409 && err.existingSubject) {
            createdSubject = err.existingSubject;
            console.log(`✓ Using existing subject: ${createdSubject.code} - ${createdSubject.name}`);
          } else {
            throw new Error(err.message || `HTTP ${subjectRes.status}`);
          }
        } else {
          createdSubject = await subjectRes.json();
        }

        const offeringPayload = {
          subjectId: createdSubject._id,
          courseId: selectedCourseIds,
          yearLevel: Number(yearLevel),
          semester: semester,
          academicYear: academicYear,
          assignedTeachers: [],
          preferredRooms: [],
          isActive: true
        };

        const offeringRes = await fetch("http://localhost:5000/api/offerings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(offeringPayload)
        });

        if (!offeringRes.ok) {
          const err = await offeringRes.json();
          throw new Error(err.message || `HTTP ${offeringRes.status}`);
        }

        results.successful.push(subject.name);
      } catch (err) {
        console.error("Error creating subject/offering:", err);
        results.failed.push({ name: subject.name, reason: err.message });
      }
    }

    setSubmitting(false);

    let htmlContent = "";
    if (results.successful.length) {
      htmlContent += `<p style="color: #10b981; font-weight: bold;">✅ Added ${results.successful.length} subject(s):</p>`;
      htmlContent += `<p>${results.successful.join(", ")}</p>`;
    }
    if (results.failed.length) {
      htmlContent += `<p style="color: #ef4444; font-weight: bold;">❌ Failed ${results.failed.length}:</p>`;
      htmlContent += `<p>${results.failed.map(f => `${f.name} (${f.reason})`).join("<br>")}</p>`;
    }

    if (results.successful.length > 0) {
      Swal.fire({
        icon: "success",
        title: "Subjects Added!",
        html: htmlContent || "Subjects created successfully.",
        timer: 2500,
        showConfirmButton: false,
      });
      onSuccess && onSuccess();
      handleClose();
    } else if (results.failed.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Failed to Add Subjects",
        html: htmlContent,
        confirmButtonColor: "#3B82F6",
      });
    } else {
      Swal.fire({
        icon: "info",
        title: "No Subjects Added",
        text: "No subjects were added.",
        confirmButtonColor: "#3B82F6",
      });
    }
  };

  const resetForm = () => {
    setSelectedCourseIds([]);
    setYearLevel("");
    setSemester("");
    setAcademicYear("2024-2025");
    setBulkSubjects([newSubjectRow()]);
    setExistingOfferings([]);
  };

  const handleClose = () => {
    resetForm();
    onClose && onClose();
  };

  if (!show) return null;

  const isContextSet = selectedCourseIds.length > 0 && yearLevel && semester && academicYear;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-subject-title" style={{ pointerEvents: 'auto' }}>
      <div className="modal-content large" style={{ maxWidth: 1000, maxHeight: "90vh", overflow: "auto", pointerEvents: 'auto', position: 'relative', zIndex: 1000 }}>
        <div className="modal-header">
          <h2 id="add-subject-title" className="modal-title">Add Subject Offering</h2>
          <button onClick={handleClose} className="modal-close" aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          <div style={{ padding: 15, backgroundColor: "#F0FDF4", borderRadius: 8, marginBottom: 20, border: "2px solid #10B981" }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>Set Context</h3>

            <div className="form-group">
              <label className="form-label">Course(s) *</label>
              <div style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: 12, backgroundColor: 'white', maxHeight: 200, overflowY: 'auto' }}>
                {courses.length === 0 ? (
                  <p style={{ margin: 0, color: '#6B7280', fontSize: 14 }}>No courses available</p>
                ) : (
                  courses.map((course) => (
                    <label key={course._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}>
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.includes(course._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCourseIds(prev => [...prev, course._id]);
                          } else {
                            setSelectedCourseIds(prev => prev.filter(id => id !== course._id));
                          }
                        }}
                        style={{ width: 'auto', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        {course.abbreviation ? `${course.abbreviation} - ${course.name}` : course.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label">Year Level *</label>
                <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} required className="form-select">
                  <option value="">Select...</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div>
                <label className="form-label">Semester *</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} required className="form-select">
                  <option value="">Select...</option>
                  <option value="1">1st Semester</option>
                  <option value="2">2nd Semester</option>
                  <option value="summer">Summer</option>
                </select>
              </div>
              <div>
                <label className="form-label">Academic Year *</label>
                <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2024-2025" required className="form-input" />
              </div>
            </div>

            {existingOfferings.length > 0 && (
              <div style={{ marginTop: 15, padding: 10, backgroundColor: "#DBEAFE", borderRadius: 4 }}>
                <strong>📚 Existing offerings in this context:</strong>
                <ul style={{ margin: "8px 0 0 20px", fontSize: 13 }}>
                  {existingOfferings.map(o => (
                    <li key={o._id}>{o.subjectId?.code} - {o.subjectId?.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {isContextSet && (
            <div style={{ padding: 15, backgroundColor: "#D1FAE5", borderRadius: 8, marginBottom: 20, border: "2px solid #10B981" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h3 style={{ margin: 0 }}>Add Subjects</h3>
                <button type="button" onClick={addBulkSubjectRow} className="action-btn primary" style={{ padding: "6px 12px", fontSize: 14 }}>➕ Add Another</button>
              </div>

              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {bulkSubjects.map((subject, index) => (
                  <div key={subject.id} style={{ marginBottom: 15, padding: 12, backgroundColor: "white", borderRadius: 6, border: "1px solid #E5E7EB" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <strong>Subject #{index + 1}</strong>
                      {bulkSubjects.length > 1 && (
                        <button type="button" onClick={() => removeBulkSubjectRow(subject.id)} className="action-btn danger" style={{ padding: "4px 10px", fontSize: 12 }}>✕</button>
                      )}
                    </div>

                    <div className="form-grid" style={{ marginBottom: 10 }}>
                      <div>
                        <label className="form-label">Subject Name *</label>
                        <input type="text" value={subject.name} onChange={(e) => updateBulkSubject(subject.id, "name", e.target.value)} placeholder="e.g., Database Management" className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Subject Code *</label>
                        <input type="text" value={subject.code} onChange={(e) => updateBulkSubject(subject.id, "code", e.target.value)} placeholder="e.g., IT301" className="form-input" />
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="checkbox" checked={subject.hasLab} onChange={(e) => updateBulkSubject(subject.id, "hasLab", e.target.checked)} style={{ width: "auto", cursor: "pointer" }} />
                        <span>Has laboratory component</span>
                      </label>
                    </div>

                    <div className="form-grid">
                      <div>
                        <label className="form-label">Lecture Units</label>
                        <input type="number" min={0} value={subject.lectureUnits} onChange={(e) => updateBulkSubject(subject.id, "lectureUnits", Number(e.target.value))} className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Lab Units</label>
                        <input type="number" min={0} value={subject.labUnits} onChange={(e) => updateBulkSubject(subject.id, "labUnits", Number(e.target.value))} className="form-input" disabled={!subject.hasLab} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-buttons" style={{ marginTop: 20 }}>
            <button type="button" onClick={handleClose} className="action-btn secondary" disabled={submitting}>Cancel</button>
            <button type="submit" className="action-btn primary" disabled={submitting || !isContextSet || bulkSubjects.filter(s => s.name.trim() && s.code.trim()).length === 0}>
              {submitting ? "Creating..." : `✅ Create ${bulkSubjects.filter(s => s.name.trim() && s.code.trim()).length} Subject(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSubjectModal;