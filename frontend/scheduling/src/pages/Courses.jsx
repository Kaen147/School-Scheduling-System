import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import AdminSidebar from "../components/NavBarAdmin";
import "../components/NavBarAdmin.css";
import "./Courses.css";

import AddCourseModal from "../components/modals/AddCourseModal";
import EditCourseModal from "../components/modals/EditCourseModal";
import AddSubjectModal from "../components/modals/AddSubjectModal";
import EditSubjectModal from "../components/modals/EditSubjectModal";

function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("2024-2025"); // NEW!

  // modals
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // expanded course offerings (changed from subjects)
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [offeringsByCourse, setOfferingsByCourse] = useState({}); // changed from subjectsByCourse

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/courses");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Re-fetch offerings automatically when filters change
  useEffect(() => {
    if (expandedCourseId) {
      fetchOfferingsForCourse(expandedCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear, filterSemester, academicYear]); // added academicYear

  // fetch offerings dynamically per course + filters (UPDATED to use offerings endpoint)
  const fetchOfferingsForCourse = async (courseId) => {
    try {
      const params = new URLSearchParams();
      params.append("courseId", courseId);
      if (filterYear) params.append("yearLevel", filterYear);
      if (filterSemester) params.append("semester", filterSemester);
      if (academicYear) params.append("academicYear", academicYear); // NEW!

      const res = await fetch(`http://localhost:5000/api/offerings?${params}`); // CHANGED endpoint
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // group by year + semester
      const grouped = {};
      data.forEach((offering) => {
        const key = `${offering.yearLevel}-${offering.semester}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(offering);
      });

      // sort years & semesters
      const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
        const [yearA, semA] = a.split("-");
        const [yearB, semB] = b.split("-");
        if (yearA !== yearB) return yearA - yearB;
        if (semA === "summer") return 3;
        if (semB === "summer") return -3;
        return semA - semB;
      });

      setOfferingsByCourse((prev) => ({ // CHANGED from subjectsByCourse
        ...prev,
        [courseId]: sortedGroups,
      }));
    } catch (err) {
      console.error("Error fetching offerings:", err);
    }
  };

  const toggleExpand = (courseId) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
      fetchOfferingsForCourse(courseId); // CHANGED from fetchSubjectsForCourse
    }
  };

  const openEditCourse = (course) => {
    setSelectedCourse(course);
    setShowEditCourseModal(true);
  };

  const openEditSubject = (subject) => {
    setSelectedSubject(subject);
    setShowEditSubjectModal(true);
  };

  const deleteCourse = async (course) => {
    // Show confirmation dialog with SweetAlert2
    const result = await Swal.fire({
      title: "Delete Course?",
      html: `<p>Are you sure you want to delete <strong>${course.name}</strong>?</p>
             <p style="color: #dc2626; font-size: 14px; margin-top: 10px;">
               ⚠️ This will also delete all subjects and offerings associated with this course. 
               This action cannot be undone.
             </p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel"
    });
    
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/courses/${course._id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `HTTP ${res.status}`);
      }

      Swal.fire({
        icon: "success",
        title: "Course Deleted!",
        text: `Course "${course.name}" deleted successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });
      
      // Refresh the courses list
      fetchCourses();
      
      // Clear expanded course if it was the deleted one
      if (expandedCourseId === course._id) {
        setExpandedCourseId(null);
        setOfferingsByCourse({});
      }
    } catch (err) {
      console.error("Error deleting course:", err);
      Swal.fire({
        icon: "error",
        title: "Error Deleting Course",
        text: err.message || "Failed to delete course",
        confirmButtonColor: "#3B82F6",
      });
    }
  };

  // ✅ Updated clearFilters to also clear offerings shown
  const clearFilters = () => {
    setSearchTerm("");
    setFilterYear("");
    setFilterSemester("");
    setAcademicYear("2024-2025");
    setExpandedCourseId(null);
    setOfferingsByCourse({}); // CHANGED from subjectsByCourse
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    return courses.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const abbr = (c.abbreviation || "").toLowerCase();
      
      // If search term exists, filter by name/abbreviation
      if (term && !name.includes(term) && !abbr.includes(term)) {
        return false;
      }
      
      return true;
    });
  }, [courses, searchTerm, filterYear, filterSemester]);

  return (
    <div className="user-management-layout">
      <AdminSidebar />
      <div className="user-management-main-content">
        {/* Header */}
        <div className="user-management-header">
          <h1>Courses Management</h1>
          <div className="header-buttons">
            <button
              onClick={() => {
                setShowEditCourseModal(false);
                setShowEditSubjectModal(false);
                setShowAddSubjectModal(false);
                setShowAddCourseModal(true);
              }}
              className="action-btn primary"
            >
              + Add Course
            </button>
            <button
              onClick={() => {
                setShowEditCourseModal(false);
                setShowEditSubjectModal(false);
                setShowAddCourseModal(false);
                setShowAddSubjectModal(true);
              }}
              className="action-btn success"
            >
              + Add Subject
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="courses-controls-section">
          <div className="courses-controls-grid">
            <div className="control-group">
              <label className="control-label">Search Courses</label>
              <input
                className="control-input"
                type="text"
                placeholder="Search by name or abbreviation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="control-group">
              <label className="control-label">Academic Year</label>
              <input
                className="control-input"
                type="text"
                placeholder="2024-2025"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>

            <div className="control-group">
              <label className="control-label">Filter by Year</label>
              <select
                className="control-select"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div className="control-group">
              <label className="control-label">Filter by Semester</label>
              <select
                className="control-select"
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
              >
                <option value="">All Semesters</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
                <option value="summer">Summer</option>
              </select>
            </div>

            <div className="control-group">
              <button onClick={clearFilters} className="action-btn secondary">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading courses...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "1.5rem" }}>
            <h3>No courses found</h3>
          </div>
        ) : (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="users-table-container">
              <table className="users-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Abbreviation</th>
                    <th>Subjects</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course._id}>
                      <td>
                        <strong>{course.name}</strong>
                        <br />
                        <span style={{ color: "#64748b", fontSize: 13 }}>
                          {course.description || ""}
                        </span>
                      </td>
                      <td>{course.abbreviation || "—"}</td>
                      <td>
                        <button
                          className="action-btn secondary small"
                          onClick={() => toggleExpand(course._id)}
                        >
                          {expandedCourseId === course._id ? "Hide" : "View"}
                        </button>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="action-btn primary small"
                            onClick={() => openEditCourse(course)}
                          >
                            Edit Course
                          </button>
                          <button
                            className="action-btn success small"
                            onClick={() => {
                              setSelectedCourse(course);
                              setShowAddSubjectModal(true);
                            }}
                          >
                            Add Subject
                          </button>
                          <button
                            className="action-btn danger small"
                            onClick={() => deleteCourse(course)}
                          >
                            Delete Course
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Offerings grouped by year and semester (CHANGED from subjects) */}
              {expandedCourseId && offeringsByCourse[expandedCourseId] && (
                <div className="prospectus-section">
                  <h3>
                    {" "}
                    {
                      filteredCourses.find((c) => c._id === expandedCourseId)
                        ?.name
                    }
                  </h3>

                  {offeringsByCourse[expandedCourseId].length > 0 ? (
                    offeringsByCourse[expandedCourseId].map(
                      ([key, offerings]) => { // CHANGED from subjects
                        const [year, sem] = key.split("-");
                        const semLabel =
                          sem === "1"
                            ? "1st Semester"
                            : sem === "2"
                            ? "2nd Semester"
                            : "Summer";

                        const yearLabel =
                          year === "1"
                            ? "1st Year"
                            : year === "2"
                            ? "2nd Year"
                            : year === "3"
                            ? "3rd Year"
                            : "4th Year";

                        return (
                          <div key={key} className="prospectus-group">
                            <div className="prospectus-header">
                              {yearLabel} - {semLabel}
                            </div>
                            <div className="subject-list">
                              {offerings.map((offering) => ( // CHANGED from subjects → offerings
                                <div key={offering._id} className="subject-row">
                                  <div className="subject-code">
                                    {offering.subjectId?.code || "N/A"} {/* CHANGED: offerings have subjectId ref */}
                                  </div>
                                  <div className="subject-name">
                                    {offering.subjectId?.name || "Unknown Subject"}
                                  </div>
                                  <div className="subject-units">
                                    {(offering.subjectId?.lectureUnits || 0) + (offering.subjectId?.labUnits || 0)} units
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )
                  ) : (
                    <div className="empty-state">
                      <p>No offerings found for this filter.</p> {/* CHANGED text */}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        <AddCourseModal
          show={showAddCourseModal}
          onClose={() => setShowAddCourseModal(false)}
          onSuccess={() => {
            fetchCourses();
            setShowAddCourseModal(false);
          }}
        />

        <EditCourseModal
          show={showEditCourseModal}
          onClose={() => setShowEditCourseModal(false)}
          onSuccess={() => {
            fetchCourses();
            setShowEditCourseModal(false);
          }}
          course={selectedCourse}
        />

        <AddSubjectModal
          show={showAddSubjectModal}
          onClose={() => setShowAddSubjectModal(false)}
          onSuccess={() => {
            fetchCourses();
            setShowAddSubjectModal(false);
          }}
          courses={courses}
          defaultCourseId={selectedCourse?._id}
        />

        <EditSubjectModal
          show={showEditSubjectModal}
          onClose={() => setShowEditSubjectModal(false)}
          onSuccess={() => {
            fetchCourses();
            setShowEditSubjectModal(false);
          }}
          subject={selectedSubject}
          courses={courses}
        />
      </div>
    </div>
  );
}

export default CoursesPage;
