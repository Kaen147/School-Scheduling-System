import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import TeacherCard from "../TeacherCard";
import RoomCard from "../RoomCard";
import ConflictChecker from "../ConflictChecker";
import "./EditSubjectModal.css"; // New CSS file

function EditSubjectModal({
  show,
  onClose,
  onSuccess,
  subject,
  courses,
  teachers,
  rooms = [],
}) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    yearLevel: 1,
    semester: "1",
    hasLab: false,
    requiredHours: 3,
    courseIds: [], // Changed to array for multi-course support
    academicYear: "",
    assignedTeachers: [],
    preferredRooms: [],
  });
  const [loading, setLoading] = useState(false);
  const [teacherWorkloads, setTeacherWorkloads] = useState({});
  const [showTeacherSelection, setShowTeacherSelection] = useState(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [showRoomSelection, setShowRoomSelection] = useState(null);
  const [roomSearchTerm, setRoomSearchTerm] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [roomCapacityFilter, setRoomCapacityFilter] = useState({ min: "", max: "" });
  const [conflicts, setConflicts] = useState(null);

  useEffect(() => {
    if (subject) {
      // subject is now an offering object
      // Handle courseId as either array or single value
      const coursesArray = Array.isArray(subject.courseId) 
        ? subject.courseId.map(c => (typeof c === 'object' ? c._id : c))
        : (subject.courseId ? [typeof subject.courseId === 'object' ? subject.courseId._id : subject.courseId] : []);
      
      // Calculate required hours: lectureUnits + (labUnits * 3)
      const subj = subject.subjectId;
      const lectureUnits = Number(subj?.lectureUnits || 0);
      const labUnits = Number(subj?.labUnits || 0);
      // Always calculate: lecture hours + (lab units * 3 hours total)
      const calculatedHours = lectureUnits + (labUnits * 3);
      
      // Ensure assigned teachers have names populated
      const populatedTeachers = (subject.assignedTeachers || []).map(teacher => {
        if (teacher.teacherId && !teacher.teacherName) {
          const teacherInfo = teachers.find(t => t._id === teacher.teacherId);
          if (teacherInfo) {
            return {
              ...teacher,
              teacherName: `${teacherInfo.honorific || ""} ${teacherInfo.firstName} ${teacherInfo.lastName}`.trim()
            };
          }
        }
        return teacher;
      });

      setFormData({
        code: subj?.code || "",
        name: subj?.name || "",
        yearLevel: subject.yearLevel || 1,
        semester: subject.semester || "1",
        hasLab: subj?.hasLab || false,
        requiredHours: calculatedHours, // Always use calculated hours
        courseIds: coursesArray,
        academicYear: subject.academicYear || "",
        assignedTeachers: populatedTeachers,
        preferredRooms: subject.preferredRooms || [],
      });
    }
  }, [subject]);

  // Fetch teacher workloads
  const fetchTeacherWorkloads = async () => {
    if (!formData.academicYear || !formData.semester) return;
    
    try {
      const workloadPromises = teachers.map(async (teacher) => {
        try {
          const response = await axios.get(
            `https://school-scheduling-system-production.up.railway.app/api/workload/teacher/${teacher._id}?academicYear=${formData.academicYear}&semester=${formData.semester}`
          );
          return { teacherId: teacher._id, workload: response.data };
        } catch (error) {
          return { teacherId: teacher._id, workload: null };
        }
      });

      const workloadResults = await Promise.all(workloadPromises);
      const workloadMap = {};
      workloadResults.forEach(({ teacherId, workload }) => {
        workloadMap[teacherId] = workload;
      });
      setTeacherWorkloads(workloadMap);
    } catch (error) {
      console.error('Error fetching teacher workloads:', error);
    }
  };

  useEffect(() => {
    if (show && formData.academicYear && formData.semester) {
      fetchTeacherWorkloads();
    }
  }, [show, formData.academicYear, formData.semester, teachers]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addTeacher = () => {
    setFormData((prev) => ({
      ...prev,
      assignedTeachers: [
        ...prev.assignedTeachers,
        { teacherId: "", teacherName: "", type: "both" },
      ],
    }));
  };

  const removeTeacher = (index) => {
    setFormData((prev) => ({
      ...prev,
      assignedTeachers: prev.assignedTeachers.filter((_, i) => i !== index),
    }));
  };

  // Teacher selection functions
  const openTeacherSelection = (index) => {
    setShowTeacherSelection(index);
    setTeacherSearchTerm("");
    setTeacherFilter("all");
  };

  const closeTeacherSelection = () => {
    setShowTeacherSelection(null);
    setTeacherSearchTerm("");
  };

  const selectTeacher = async (teacher) => {
    const index = showTeacherSelection;
    if (index === null) return;

    // First update the teacher selection with both ID and name
    await updateTeacher(index, "teacherId", teacher._id);
    await updateTeacher(index, "teacherName", `${teacher.firstName} ${teacher.lastName}`);
    closeTeacherSelection();
  };

  const getTeacherDisplayInfo = (assignedTeacher) => {
    if (!assignedTeacher.teacherId) {
      return { name: 'Select Teacher', workload: null };
    }

    // First try to use the stored teacher name
    if (assignedTeacher.teacherName) {
      const workload = teacherWorkloads[assignedTeacher.teacherId];
      return { name: assignedTeacher.teacherName, workload };
    }

    // Fallback to finding in teachers array
    const teacher = teachers.find(th => th._id === assignedTeacher.teacherId);
    if (teacher) {
      const workload = teacherWorkloads[assignedTeacher.teacherId];
      return { 
        name: `${teacher.firstName} ${teacher.lastName}`, 
        workload 
      };
    }

    // Final fallback
    return { name: `Teacher ID: ${assignedTeacher.teacherId}`, workload: null };
  };

  const getFilteredTeachers = () => {
    let filtered = teachers.filter(teacher => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(teacherSearchTerm.toLowerCase()) ||
                           teacher.firstName.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
                           teacher.lastName.toLowerCase().includes(teacherSearchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      switch (teacherFilter) {
        case "available":
          const workload = teacherWorkloads[teacher._id];
          if (!workload) return true;
          const limit = teacher.employmentType === 'Part-time' ? 18 : 24;
          return workload.totalUnits < limit || teacher.isOverloaded;
        case "full-time":
          return teacher.employmentType === 'Full-time';
        case "part-time":
          return teacher.employmentType === 'Part-time';
        case "overloaded":
          return teacher.isOverloaded;
        default:
          return true;
      }
    });

    return filtered;
  };

  // Room selection functions
  const openRoomSelection = (index) => {
    setShowRoomSelection(index);
    setRoomSearchTerm("");
    setRoomFilter("all");
    setRoomCapacityFilter({ min: "", max: "" });
  };

  const closeRoomSelection = () => {
    setShowRoomSelection(null);
    setRoomSearchTerm("");
  };

  const selectRoom = (room) => {
    const index = showRoomSelection;
    if (index === null) return;

    updateRoom(index, "roomId", room._id);
    closeRoomSelection();
  };

  const getFilteredRooms = () => {
    let filtered = rooms.filter(room => {
      const roomName = room.name?.toLowerCase() || '';
      const building = room.building?.toLowerCase() || '';
      const type = room.type?.toLowerCase() || '';
      
      const matchesSearch = roomName.includes(roomSearchTerm.toLowerCase()) ||
                           building.includes(roomSearchTerm.toLowerCase()) ||
                           type.includes(roomSearchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Capacity filter
      if (roomCapacityFilter.min && room.capacity < parseInt(roomCapacityFilter.min)) return false;
      if (roomCapacityFilter.max && room.capacity > parseInt(roomCapacityFilter.max)) return false;

      // Type filter
      switch (roomFilter) {
        case "lecture":
          return type.includes('lecture') || type.includes('classroom');
        case "lab":
          return type.includes('lab');
        case "computer":
          return type.includes('computer');
        case "large":
          return room.capacity >= 50;
        case "medium":
          return room.capacity >= 30 && room.capacity < 50;
        case "small":
          return room.capacity < 30;
        default:
          return true;
      }
    });

    return filtered;
  };

  const updateTeacher = async (index, field, value) => {
    if (field === "teacherId" && value) {
      // Validate before assigning teacher
      try {
        const response = await axios.post("https://school-scheduling-system-production.up.railway.app/api/workload/validate-assignment", {
          teacherId: value,
          subjectId: subject.subjectId._id,
          academicYear: formData.academicYear,
          semester: formData.semester
        });

        if (!response.data.success) {
          // Check if this requires overload approval
          if (response.data.requiresOverload) {
            const result = await Swal.fire({
              title: 'Teacher Overload Required',
              html: `
                <div style="text-align: left; margin: 1rem 0;">
                  <p><strong>Teacher:</strong> ${response.data.teacherName}</p>
                  <p><strong>Current Units:</strong> ${response.data.currentAssignmentUnits}</p>
                  <p><strong>Normal Limit:</strong> ${response.data.maxUnitLimit} units</p>
                  <p><strong>After Assignment:</strong> ${response.data.newTotal} units</p>
                </div>
                <p style="color: #059669; font-weight: 600;">Do you want to overload ${response.data.teacherName}?</p>
              `,
              icon: 'question',
              showCancelButton: true,
              confirmButtonColor: '#059669',
              cancelButtonColor: '#6B7280',
              confirmButtonText: 'Yes, Overload Teacher',
              cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed) {
              // User confirmed overload - set teacher as overloaded
              try {
                const overloadResponse = await axios.post(`https://school-scheduling-system-production.up.railway.app/api/workload/teacher/${value}/overload`, {
                  isOverloaded: true
                });
                
                if (overloadResponse.data.success) {
                  console.log("✅ Teacher overloaded successfully, proceeding with assignment");
                  
                  // Continue with the normal assignment process
                  // Don't show success modal here - let the assignment complete first
                } else {
                  Swal.fire("Error", "Failed to set teacher overload status", "error");
                  return;
                }
              } catch (overloadErr) {
                console.error("Overload error:", overloadErr);
                Swal.fire("Error", "Failed to overload teacher", "error");
                return;
              }
            } else {
              // User cancelled - don't assign the teacher
              return;
            }
          } else {
            // Regular validation failure (not overload-related)
            Swal.fire(
              "Unit Limit Exceeded",
              `⚠️ Cannot assign this subject to the teacher.\n\n${response.data.reason}`,
              "warning"
            );
            return; // Don't assign the teacher
          }
        }
      } catch (err) {
        console.error("Validation error:", err);
        Swal.fire("Error", "Failed to validate teacher unit limit", "error");
        return;
      }
    }

    setFormData((prev) => {
      const updated = [...prev.assignedTeachers];
      updated[index][field] = value;
      if (field === "teacherId") {
        const teacher = teachers.find((t) => t._id === value);
        updated[index].teacherName = teacher
          ? `${teacher.honorific || ""} ${teacher.firstName} ${
              teacher.lastName
            }`.trim()
          : "";
      }
      return { ...prev, assignedTeachers: updated };
    });
  };

  const addRoom = () => {
    setFormData((prev) => ({
      ...prev,
      preferredRooms: [
        ...prev.preferredRooms,
        { roomId: "", roomName: "", roomType: "classroom", capacity: 30 },
      ],
    }));
  };

  const removeRoom = (index) => {
    setFormData((prev) => ({
      ...prev,
      preferredRooms: prev.preferredRooms.filter((_, i) => i !== index),
    }));
  };

  const updateRoom = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.preferredRooms];
      // if selecting by room id, populate roomName and roomType from rooms list
      if (field === 'roomId') {
        const room = rooms.find(r => r._id === value);
        updated[index].roomId = value;
        updated[index].roomName = room ? room.name : '';
        updated[index].roomType = room ? room.type : updated[index].roomType;
        updated[index].capacity = room ? room.capacity : updated[index].capacity;
      } else {
        updated[index][field] = value;
      }
      return { ...prev, preferredRooms: updated };
    });
  };
  const handleUpdate = async () => {
    try {
      console.log("🔵 handleUpdate called - SAVE button clicked!");
      setLoading(true);
      
      // Validate at least one course is selected
      if (!formData.courseIds || formData.courseIds.length === 0) {
        Swal.fire("Error", "Please select at least one course", "error");
        setLoading(false);
        return;
      }

      console.log("🔵 Running final validation for", formData.assignedTeachers.length, "teachers");

      // Validate all assigned teachers against unit limits
      // Send the list of PREVIOUS teachers so backend can account for removals
      for (const teacher of formData.assignedTeachers) {
        if (teacher.teacherId) {
          try {
            const previousTeacherIds = (subject.assignedTeachers || []).map(t => 
              typeof t.teacherId === 'object' ? t.teacherId._id : t.teacherId
            );
            
            console.log("📋 Validating teacher assignment:", {
              teacherId: teacher.teacherId,
              teacherName: teacher.teacherName,
              subjectId: subject.subjectId._id,
              academicYear: formData.academicYear,
              semester: formData.semester,
              previousTeacherIds
            });
            
            const validation = await axios.post("https://school-scheduling-system-production.up.railway.app/api/workload/validate-assignment", {
              teacherId: teacher.teacherId,
              subjectId: subject.subjectId._id,
              academicYear: formData.academicYear,
              semester: formData.semester,
              previousTeacherIds: previousTeacherIds  // Teachers being removed from this subject
            });

            console.log("✅ Validation response:", validation.data);

            if (!validation.data.success) {
              // Check if this requires overload approval
              if (validation.data.requiresOverload) {
                const result = await Swal.fire({
                  title: 'Teacher Overload Required',
                  html: `
                    <div style="text-align: left; margin: 1rem 0;">
                      <p><strong>Teacher:</strong> ${validation.data.teacherName}</p>
                      <p><strong>Current Units:</strong> ${validation.data.currentAssignmentUnits}</p>
                      <p><strong>Normal Limit:</strong> ${validation.data.maxUnitLimit} units</p>
                      <p><strong>After Assignment:</strong> ${validation.data.newTotal} units</p>
                    </div>
                    <p style="color: #059669; font-weight: 600;">Do you want to overload ${validation.data.teacherName}?</p>
                  `,
                  icon: 'question',
                  showCancelButton: true,
                  confirmButtonColor: '#059669',
                  cancelButtonColor: '#6B7280',
                  confirmButtonText: 'Yes, Overload Teacher',
                  cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                  // User confirmed overload - set teacher as overloaded
                  try {
                    const overloadResponse = await axios.post(`https://school-scheduling-system-production.up.railway.app/api/workload/teacher/${teacher.teacherId}/overload`, {
                      isOverloaded: true
                    });
                    
                    if (overloadResponse.data.success) {
                      console.log("✅ Teacher overloaded, continuing with save process");
                      
                      // Continue with validation for next teacher
                      // Don't show success modal here - let the save process complete first
                    } else {
                      Swal.fire("Error", "Failed to set teacher overload status", "error");
                      setLoading(false);
                      return;
                    }
                  } catch (overloadErr) {
                    console.error("Overload error:", overloadErr);
                    Swal.fire("Error", "Failed to overload teacher", "error");
                    setLoading(false);
                    return;
                  }
                } else {
                  // User cancelled - stop the save process
                  setLoading(false);
                  return;
                }
              } else {
                // Regular validation failure (not overload-related)
                console.log("❌ Validation FAILED - showing error");
                Swal.fire(
                  "Unit Limit Exceeded",
                  `❌ Cannot save: ${teacher.teacherName}\n\n${validation.data.reason}`,
                  "error"
                );
                setLoading(false);
                return;
              }
            }
            console.log("✅ Validation passed for", teacher.teacherName);
          } catch (err) {
            console.error("Validation error for teacher", teacher.teacherId, err);
            Swal.fire("Error", `Failed to validate units for ${teacher.teacherName}`, "error");
            setLoading(false);
            return;
          }
        }
      }
      
      // Update the offering (not the subject)
      const offeringPayload = {
        yearLevel: Number(formData.yearLevel),
        semester: formData.semester,
        courseId: formData.courseIds, // Send array for multi-course support
        academicYear: formData.academicYear,
        assignedTeachers: formData.assignedTeachers,
        preferredRooms: formData.preferredRooms,
      };
      
      await axios.patch(
        `https://school-scheduling-system-production.up.railway.app/api/offerings/${subject._id}`,
        offeringPayload
      );
      
      onSuccess("Subject Offering Updated!");
      onClose();
    } catch (err) {
      console.error('Update error:', err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to update subject offering";
      Swal.fire("Error", errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the subject!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await axios.delete(`https://school-scheduling-system-production.up.railway.app/api/subjects/${subject._id}`);
        onSuccess("Subject Deleted!");
        onClose();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete subject", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Edit Subject</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              disabled
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#666' }}>Subject code cannot be changed</small>
          </div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              disabled
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#666' }}>Subject name cannot be changed</small>
          </div>

          <div className="form-group">
            <label>
              Course(s) 
              <span style={{ fontSize: 12, fontWeight: 'normal', marginLeft: 8, color: '#6B7280' }}>
                (Select one or more for combined classes)
              </span>
            </label>
            <div style={{ 
              border: '1px solid #D1D5DB', 
              borderRadius: 6, 
              padding: 12,
              backgroundColor: 'white',
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              {courses.length === 0 ? (
                <p style={{ margin: 0, color: '#6B7280', fontSize: 14 }}>No courses available</p>
              ) : (
                courses.map((course) => (
                  <label 
                    key={course._id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10,
                      padding: '8px 4px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F3F4F6'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={formData.courseIds.includes(course._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            courseIds: [...prev.courseIds, course._id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            courseIds: prev.courseIds.filter(id => id !== course._id)
                          }));
                        }
                      }}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1 }}>
                      {course.abbreviation || course.code} - {course.name}
                    </span>
                  </label>
                ))
              )}
            </div>
            {formData.courseIds.length > 0 && (
              <div style={{ 
                marginTop: 8, 
                padding: 8, 
                backgroundColor: '#DBEAFE', 
                borderRadius: 4,
                fontSize: 13
              }}>
                <strong>✅ Selected ({formData.courseIds.length}):</strong>{' '}
                {formData.courseIds.map(id => {
                  const course = courses.find(c => c._id === id);
                  return course?.abbreviation || course?.name || id;
                }).join(', ')}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Year Level</label>
            <select
              name="yearLevel"
              value={formData.yearLevel}
              onChange={handleChange}
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div className="form-group">
            <label>Semester</label>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
            >
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="summer">Summer</option>
            </select>
          </div>

          <div className="form-group">
            <label>Academic Year</label>
            <input
              type="text"
              name="academicYear"
              value={formData.academicYear}
              onChange={handleChange}
              placeholder="e.g., 2024-2025"
            />
          </div>

          <div className="form-group">
            <label>Lab Status</label>
            <input
              type="text"
              value={formData.hasLab ? 'With Lab' : 'Lecture Only'}
              disabled
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#666' }}>Lab status is defined in the subject catalog</small>
          </div>

          <div className="form-group">
            <label>Required Hours</label>
            <input
              type="text"
              value={`${formData.requiredHours} hours/week`}
              disabled
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#666' }}>Hours are defined in the subject catalog</small>
          </div>

          <h3>Assigned Teachers</h3>
          <button type="button" className="add-btn" onClick={addTeacher}>
            + Add Teacher
          </button>
          {formData.assignedTeachers.map((t, i) => {
            const teacherInfo = getTeacherDisplayInfo(t);
            return (
            <div key={i} className="assignment-row">
              <div className="teacher-assignment-section">
                <div className="teacher-selection-button">
                  <button
                    type="button"
                    className={`select-teacher-btn ${t.teacherId ? 'selected' : ''}`}
                    onClick={() => openTeacherSelection(i)}
                  >
                    <span className="teacher-name">{teacherInfo.name}</span>
                    {teacherInfo.workload && (
                      <span className="workload-indicator">
                        {teacherInfo.workload.totalUnits || 0} units
                      </span>
                    )}
                  </button>
                </div>

                <select
                  value={t.type}
                  onChange={(e) => updateTeacher(i, "type", e.target.value)}
                  className="assignment-type-select"
                >
                  <option value="both">Both</option>
                  <option value="lecture">Lecture Only</option>
                  <option value="lab">Lab Only</option>
                </select>

                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeTeacher(i)}
                >
                  Remove
                </button>
              </div>
            </div>
            );
          })}

          {/* Teacher Selection Modal */}
          {showTeacherSelection !== null && (
            <div className="teacher-selection-overlay">
              <div className="teacher-selection-modal">
                <div className="teacher-selection-header">
                  <h4>Select Teacher</h4>
                  <button 
                    type="button" 
                    className="close-btn"
                    onClick={closeTeacherSelection}
                  >
                    ×
                  </button>
                </div>
                
                <div className="teacher-selection-filters">
                  <input
                    type="text"
                    placeholder="Search teachers..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="teacher-search"
                  />
                  
                  <div className="teacher-filters">
                    <button 
                      type="button"
                      className={`filter-button ${teacherFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setTeacherFilter('all')}
                    >
                      All
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${teacherFilter === 'available' ? 'active' : ''}`}
                      onClick={() => setTeacherFilter('available')}
                    >
                      Available
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${teacherFilter === 'full-time' ? 'active' : ''}`}
                      onClick={() => setTeacherFilter('full-time')}
                    >
                      Full-time
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${teacherFilter === 'part-time' ? 'active' : ''}`}
                      onClick={() => setTeacherFilter('part-time')}
                    >
                      Part-time
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${teacherFilter === 'overloaded' ? 'active' : ''}`}
                      onClick={() => setTeacherFilter('overloaded')}
                    >
                      Overloaded
                    </button>
                  </div>
                </div>
                
                <div className="teacher-selection-grid">
                  {getFilteredTeachers().map((teacher) => (
                    <TeacherCard
                      key={teacher._id}
                      teacher={teacher}
                      workload={teacherWorkloads[teacher._id]}
                      onSelect={selectTeacher}
                      isSelected={formData.assignedTeachers[showTeacherSelection]?.teacherId === teacher._id}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <h3>Preferred Rooms</h3>
          <button type="button" className="add-btn" onClick={addRoom}>
            + Add Room
          </button>
          {formData.preferredRooms.map((r, i) => (
            <div key={i} className="assignment-row">
              <div className="room-assignment-section">
                <div className="room-selection-button">
                  <button
                    type="button"
                    className={`select-room-btn ${r.roomId ? 'selected' : ''}`}
                    onClick={() => openRoomSelection(i)}
                  >
                    {r.roomId 
                      ? `${rooms.find(room => room._id === r.roomId)?.name || ''} ${rooms.find(room => room._id === r.roomId)?.type ? `(${rooms.find(room => room._id === r.roomId)?.type})` : ''}` 
                      : 'Select Room'
                    }
                    {r.roomId && (
                      <span className="room-capacity-indicator">
                        {rooms.find(room => room._id === r.roomId)?.capacity || 'N/A'} seats
                      </span>
                    )}
                  </button>
                </div>

                <select
                  value={r.roomType}
                  onChange={(e) => updateRoom(i, "roomType", e.target.value)}
                  className="room-type-select"
                >
                  <option value="classroom">Classroom</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="both">Both</option>
                </select>

                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removeRoom(i)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Room Selection Modal */}
          {showRoomSelection !== null && (
            <div className="room-selection-overlay">
              <div className="room-selection-modal">
                <div className="room-selection-header">
                  <h4>Select Room</h4>
                  <button 
                    type="button" 
                    className="close-btn"
                    onClick={closeRoomSelection}
                  >
                    ×
                  </button>
                </div>
                
                <div className="room-selection-filters">
                  <input
                    type="text"
                    placeholder="Search rooms, buildings, or types..."
                    value={roomSearchTerm}
                    onChange={(e) => setRoomSearchTerm(e.target.value)}
                    className="room-search"
                  />
                  
                  <div className="room-filters">
                    <button 
                      type="button"
                      className={`filter-button ${roomFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setRoomFilter('all')}
                    >
                      All
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${roomFilter === 'lecture' ? 'active' : ''}`}
                      onClick={() => setRoomFilter('lecture')}
                    >
                      Lecture
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${roomFilter === 'lab' ? 'active' : ''}`}
                      onClick={() => setRoomFilter('lab')}
                    >
                      Lab
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${roomFilter === 'computer' ? 'active' : ''}`}
                      onClick={() => setRoomFilter('computer')}
                    >
                      Computer
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${roomFilter === 'large' ? 'active' : ''}`}
                      onClick={() => setRoomFilter('large')}
                    >
                      Large (50+)
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${roomFilter === 'medium' ? 'active' : ''}`}
                      onClick={() => setRoomFilter('medium')}
                    >
                      Medium (30-49)
                    </button>
                    <button 
                      type="button"
                      className={`filter-button ${roomFilter === 'small' ? 'active' : ''}`}
                      onClick={() => setRoomFilter('small')}
                    >
                      Small (&lt;30)
                    </button>
                  </div>
                  
                  <div className="capacity-filter">
                    <label>Capacity:</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={roomCapacityFilter.min}
                      onChange={(e) => setRoomCapacityFilter(prev => ({ ...prev, min: e.target.value }))}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={roomCapacityFilter.max}
                      onChange={(e) => setRoomCapacityFilter(prev => ({ ...prev, max: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="room-selection-grid">
                  {getFilteredRooms().map((room) => (
                    <RoomCard
                      key={room._id}
                      room={room}
                      isAvailable={room.isActive}
                      onSelect={selectRoom}
                      isSelected={formData.preferredRooms[showRoomSelection]?.roomId === room._id}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conflict Checker */}
          <ConflictChecker
            teachers={formData.assignedTeachers}
            rooms={formData.preferredRooms}
            academicYear={formData.academicYear}
            semester={formData.semester}
            subjectId={subject?.subjectId?._id}
            onConflictUpdate={setConflicts}
          />
        </div>

        <div className="modal-footer">
          <button
            className="primary-btn"
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="danger-btn"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Subject"}
          </button>
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditSubjectModal;
