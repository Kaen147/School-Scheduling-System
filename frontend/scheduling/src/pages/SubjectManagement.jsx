import { useEffect, useState } from "react";
import axios from "axios";
import EditSubjectModal from "../components/modals/EditSubjectModal";
import AddSubjectsModal from "../components/modals/AddSubjectModal";
import "../components/NavBarAdmin.css";
import "./SubjectManagement.css";
import Swal from "sweetalert2";

function SubjectManagement() {
  const [subjects, setSubjects] = useState([]); // For dropdown reference
  const [offerings, setOfferings] = useState([]); // Main data to display
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    courseId: null, // null means no filter applied
    yearLevel: "",
    semester: "",
    academicYear: "",
    hasTeacher: "",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch offerings, subjects, and courses in parallel
      const [offeringsRes, subjectsRes, coursesRes] = await Promise.all([
        axios.get("http://localhost:5000/api/offerings"),
        axios.get("http://localhost:5000/api/subjects"),
        axios.get("http://localhost:5000/api/courses"),
      ]);

      // Fetch teachers and rooms separately and tolerate failure
      let teachersRes = { data: [] };
      let roomsRes = { data: [] };
      try {
        teachersRes = await axios.get("http://localhost:5000/api/users/teachers");
      } catch (err) {
        console.error("Failed to fetch teachers (non-blocking):", err.message || err);
      }
      try {
        roomsRes = await axios.get("http://localhost:5000/api/rooms");
      } catch (err) {
        console.error("Failed to fetch rooms (non-blocking):", err.message || err);
      }

      setOfferings(offeringsRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data || []);
      setRooms(roomsRes.data || []);
      setCourses(coursesRes.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSubjects = () => {
    // If no course is selected, return empty array (no subjects shown)
    if (!filters.courseId) {
      return [];
    }

    return offerings.filter((offering) => {
      // Filter by search term (subject name or code)
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const subjectName = offering.subjectId?.name?.toLowerCase() || "";
        const subjectCode = offering.subjectId?.code?.toLowerCase() || "";
        if (!subjectName.includes(term) && !subjectCode.includes(term)) {
          return false;
        }
      }
      
      // Filter by course (handle courseId as array for multi-course support)
      if (filters.courseId !== "all") {
        const courses = Array.isArray(offering.courseId) 
          ? offering.courseId 
          : (offering.courseId ? [offering.courseId] : []);
        
        // Check if any course in the array matches the filter
        const hasMatchingCourse = courses.some(course => {
          const courseId = typeof course === "object" ? course._id : course;
          return courseId === filters.courseId;
        });
        
        if (!hasMatchingCourse) return false;
      }
      
      // Filter by year level
      if (filters.yearLevel && offering.yearLevel?.toString() !== filters.yearLevel) {
        return false;
      }
      
      // Filter by semester
      if (filters.semester && offering.semester !== filters.semester) {
        return false;
      }
      
      // Filter by academic year
      if (filters.academicYear && offering.academicYear !== filters.academicYear) {
        return false;
      }
      
      // Filter by teacher status
      if (filters.hasTeacher) {
        const hasAssignedTeacher = offering.assignedTeachers?.length > 0;
        if (filters.hasTeacher === "yes" && !hasAssignedTeacher) return false;
        if (filters.hasTeacher === "no" && hasAssignedTeacher) return false;
      }
      
      return true;
    });
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      courseId: null,
      yearLevel: "",
      semester: "",
      academicYear: "",
      hasTeacher: "",
    });
  };

  const handleEditSubject = (offering) => {
    // Pass the offering to edit modal
    setSelectedSubject(offering);
    setShowEditModal(true);
  };

  const handleDeleteSubject = async (offering) => {
    const subjectName = offering.subjectId?.name || "this subject";
    const subjectCode = offering.subjectId?.code || "";
    
    const result = await Swal.fire({
      title: `Delete ${subjectCode} - ${subjectName}?`,
      text: "This will remove this offering. The subject itself will remain in the catalog.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Offering",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`http://localhost:5000/api/offerings/${offering._id}`);
      Swal.fire({ icon: "success", title: "Offering Deleted", timer: 1200, showConfirmButton: false });
      fetchData();
    } catch (err) {
      console.error("Failed to delete offering:", err);
      Swal.fire({ icon: "error", title: "Delete failed", text: err?.response?.data?.message || err.message });
    }
  };

  const handleUpdateSuccess = (message = "Success") => {
    Swal.fire({
      icon: "success",
      title: message,
      timer: 1500,
      showConfirmButton: false,
    });
    fetchData();
  };

  const getYearSuffix = (year) => {
    if (year === 1) return "st";
    if (year === 2) return "nd";
    if (year === 3) return "rd";
    return "th";
  };

  const getSemesterName = (semester) => {
    if (semester === "first" || semester === "1") return "1st Semester";
    if (semester === "second" || semester === "2") return "2nd Semester";
    return "Summer";
  };

  const filteredSubjects = getFilteredSubjects();

  // Determine if any filter is applied
  const isFilterApplied = 
    filters.searchTerm ||
    filters.courseId ||
    filters.yearLevel ||
    filters.semester ||
    filters.academicYear ||
    filters.hasTeacher;

  if (loading)
    return (
      <div className="subject-mgmt-layout">
        <div className="subject-mgmt-main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading subjects...</p>
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="subject-mgmt-layout">
        <div className="subject-mgmt-main-content">
          <div className="error-container">
            <h3>Error Loading Subjects</h3>
            <p>{error}</p>
            <button onClick={fetchData} className="action-btn primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="subject-mgmt-layout">
      <div className="subject-mgmt-main-content">
        {/* Header */}
        <div className="subject-mgmt-header">
          <h1>Subject Management</h1>
          <div className="header-buttons">
            <button
              className="action-btn primary add-subject-btn"
              onClick={() => setShowAddModal(true)}
            >
              <span className="plus-icon">+</span> Add Subject
            </button>
            <button
              className="action-btn secondary small clear-filters-btn"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="subject-controls-section">
          <div className="subject-controls-grid">
            <div className="control-group">
              <label className="form-label">Search</label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    searchTerm: e.target.value,
                  }))
                }
                placeholder="Search by name or code..."
                className="form-input"
              />
            </div>
            <div className="control-group">
              <label className="form-label">Teacher Status</label>
              <select
                value={filters.hasTeacher}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    hasTeacher: e.target.value,
                  }))
                }
                className="form-input"
              >
                <option value="">All</option>
                <option value="yes">Assigned</option>
                <option value="no">Unassigned</option>
              </select>
            </div>

            <div className="control-group">
              <label className="form-label">Course</label>
              <select
                value={filters.courseId || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    courseId: e.target.value || null,
                  }))
                }
                className="form-input"
              >
                <option value="">-- Select Course --</option>
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.abbreviation || course.code || course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label className="form-label">Year Level</label>
              <select
                value={filters.yearLevel}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    yearLevel: e.target.value,
                  }))
                }
                className="form-input"
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div className="control-group">
              <label className="form-label">Semester</label>
              <select
                value={filters.semester}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    semester: e.target.value,
                  }))
                }
                className="form-input"
              >
                <option value="">All Semesters</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </div>

            <div className="control-group">
              <label className="form-label">Academic Year</label>
              <input
                type="text"
                value={filters.academicYear}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    academicYear: e.target.value,
                  }))
                }
                placeholder="e.g., 2024-2025"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        {filteredSubjects.length === 0 ? (
          <div className="empty-state">
            <h3>No Subjects Found</h3>
          </div>
        ) : (
          <div className="subjects-table-container">
            <table className="subjects-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Year & Sem</th>
                  <th>Academic Year</th>
                  <th>Type</th>
                  <th>Hours/Week</th>
                  <th>Teachers</th>
                  <th>Rooms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((offering) => {
                  // Handle courseId as array (multi-course support)
                  const courses = Array.isArray(offering.courseId) 
                    ? offering.courseId 
                    : (offering.courseId ? [offering.courseId] : []);
                  
                  const courseDisplay = courses.length > 0
                    ? courses.map(c => c.abbreviation || c.code || c.name).join(' + ')
                    : 'N/A';
                  
                  return (
                  <tr key={offering._id}>
                    <td>{offering.subjectId?.code || 'N/A'}</td>
                    <td>{offering.subjectId?.name || 'N/A'}</td>
                    <td>{courseDisplay}</td>
                    <td>
                      {offering.yearLevel}
                      {getYearSuffix(offering.yearLevel)} Year
                      <br />
                      <small>{getSemesterName(offering.semester)}</small>
                    </td>
                    <td>{offering.academicYear}</td>
                    <td>
                      <span
                        className={`badge ${
                          offering.subjectId?.hasLab ? "badge-lab" : "badge-lecture"
                        }`}
                      >
                        {offering.subjectId?.hasLab ? "With Lab" : "Lecture"}
                      </span>
                    </td>
                    <td>
                      {offering.subjectId?.requiredHours || (offering.subjectId?.hasLab ? 5 : 3)} hrs
                    </td>
                    <td>
                      {offering.assignedTeachers?.length > 0 ? (
                        <div className="teachers-list">
                          {offering.assignedTeachers.map((t, i) => (
                            <div key={i} className="teacher-item">
                              {t.teacherName}{" "}
                              <span className="teacher-type">({t.type})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        "Unassigned"
                      )}
                    </td>
                    <td>
                      {offering.preferredRooms?.length > 0 ? (
                        <div className="rooms-list">
                          {offering.preferredRooms.map((r, i) => (
                            <div key={i} className="room-item">
                              {r.roomName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "No rooms"
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleEditSubject(offering)}
                          className="action-btn primary small edit-btn"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteSubject(offering)}
                          className="action-btn danger small"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && selectedSubject && (
        <EditSubjectModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => handleUpdateSuccess("Subject Updated!")}
          subject={selectedSubject}
          courses={courses}
          teachers={teachers}
          rooms={rooms}
        />
      )}

      {showAddModal && (
        <AddSubjectsModal
          show={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => handleUpdateSuccess("Subject Added!")}
          courses={courses}
          teachers={teachers}
          rooms={rooms}
        />
      )}
    </div>
  );
}

export default SubjectManagement;
