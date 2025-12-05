import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/NavBarAdmin.css";
import "./SchedulesManagement.css";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";

// Import modal components
import {
  showPDFOptionsModal,
  showPDFGeneratingModal,
  showPDFSuccessModal,
  showPDFErrorModal,
} from "../components/modals/PDFOptionsModal";
import showDeleteScheduleModal from "../components/modals/DeleteScheduleModal";
import  showCreateScheduleModal  from "../components/modals/CreateScheduleModal";
import ScheduleRecycler from "../components/modals/ScheduleRecycler";

function SchedulesManagement() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    academicYear: "",
    courseId: "",
    yearLevel: "",
    semester: "",
  });
  const [courses, setCourses] = useState([]);
  const [showRecycler, setShowRecycler] = useState(false);
  const [recyclerTarget, setRecyclerTarget] = useState({ academicYear: "", semester: "" });

  useEffect(() => {
    fetchSchedules();
    fetchCourses();
  }, []);
  // open create schedule modal (uses SweetAlert2 inside)
  

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await axios.get("https://school-scheduling-system-production.up.railway.app/api/schedules");
      setSchedules(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get("https://school-scheduling-system-production.up.railway.app/api/courses");
      setCourses(res.data);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const getFilteredSchedules = () => {
    return schedules.filter((schedule) => {
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = schedule.name?.toLowerCase().includes(searchLower);
        const matchesCourse = schedule.courseName
          ?.toLowerCase()
          .includes(searchLower);
        const matchesAbbr = schedule.courseAbbreviation
          ?.toLowerCase()
          .includes(searchLower);
        if (!matchesName && !matchesCourse && !matchesAbbr) return false;
      }

      if (filters.academicYear && schedule.academicYear !== filters.academicYear) {
        return false;
      }

      if (filters.courseId && schedule.courseId !== filters.courseId) {
        return false;
      }

      if (
        filters.yearLevel &&
        schedule.yearLevel?.toString() !== filters.yearLevel
      ) {
        return false;
      }

      if (
        filters.semester &&
        schedule.semester?.toString() !== filters.semester
      ) {
        return false;
      }

      return true;
    });
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      academicYear: "",
      courseId: "",
      yearLevel: "",
      semester: "",
    });
  };

  const openRecycler = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Recycle Schedule',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 10px;">
            <strong>Target Academic Year:</strong>
            <input type="text" id="academicYear" placeholder="e.g., 2024-2025" 
                   style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
          </label>
          <label style="display: block; margin-bottom: 10px;">
            <strong>Target Semester:</strong>
            <select id="semester" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </select>
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const academicYear = document.getElementById('academicYear').value;
        const semester = document.getElementById('semester').value;
        
        if (!academicYear) {
          Swal.showValidationMessage('Please enter an academic year');
          return false;
        }
        
        return { academicYear, semester };
      }
    });

    if (formValues) {
      setRecyclerTarget(formValues);
      setShowRecycler(true);
    }
  };

  const handleRecyclerSuccess = (data) => {
    Swal.fire({
      title: 'Success!',
      text: `Schedule recycled successfully! ${data.subjectsCopied} subjects copied with ${data.teachersUpdated} teacher updates.`,
      icon: 'success'
    });
    fetchSchedules(); // Refresh the schedule list
  };

  const handleViewSchedule = (schedule) => {
  navigate(`/timetable/view/${schedule._id}`);
};

  const handleEditSchedule = (schedule) => {
  navigate(`/timetable/edit/${schedule._id}`);
};

  const handleDownloadPDF = async (schedule) => {
    const pdfOptions = await showPDFOptionsModal();
    if (!pdfOptions) return;

    try {
      showPDFGeneratingModal();
      await generateSchedulePDF(schedule, pdfOptions);
      showPDFSuccessModal();
    } catch (error) {
      console.error("Error generating PDF:", error);
      showPDFErrorModal();
    }
  };

  const generateSchedulePDF = async (schedule, options) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    // Generate time slots
    const timeSlots = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break;
        const timeKey = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? "PM" : "AM";
        const time12 = `${displayHour}:${minute
          .toString()
          .padStart(2, "0")} ${period}`;
        timeSlots.push({ timeKey, time12 });
      }
    }

    // Create event map
    const eventMap = {};
    schedule.events.forEach((event) => {
      const key = `${event.day}-${event.startTime}`;
      eventMap[key] = event;
    });

    const occupiedSlots = new Set();

    // Create a temporary container for the table
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width =
      options.orientation === "portrait" ? "750px" : "1400px";
    container.style.backgroundColor = "white";
    container.style.padding = "30px";
    document.body.appendChild(container);

    // Build header
    let headerHTML = `
      <div style="text-align: center; margin-bottom: 20px; font-family: Arial, sans-serif;">
        <h1 style="margin: 0 0 10px 0; font-size: ${
          options.orientation === "portrait" ? "22px" : "28px"
        }; color: #1F2937;">${schedule.name}</h1>
        <p style="margin: 3px 0; font-size: ${
          options.orientation === "portrait" ? "13px" : "16px"
        }; color: #4B5563;">
          <strong>${schedule.courseName} (${
      schedule.courseAbbreviation
    })</strong>
        </p>
        <p style="margin: 3px 0; font-size: ${
          options.orientation === "portrait" ? "12px" : "14px"
        }; color: #6B7280;">
          ${schedule.yearLevel}${getYearSuffix(schedule.yearLevel)} Year - 
          ${schedule.semester}${getSemesterSuffix(
      schedule.semester
    )} Semester | Events: ${schedule.events.length}
        </p>
        <div style="border-bottom: 3px solid #3B82F6; margin-top: 15px;"></div>
      </div>
    `;

    // Build table with responsive font sizes
    const isPortrait = options.orientation === "portrait";
    let timetableHTML = `
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background-color: #3B82F6; color: white;">
            <th style="padding: ${
              isPortrait ? "8px 4px" : "12px 8px"
            }; text-align: left; border: 1px solid #2563EB; font-weight: 600; font-size: ${
      isPortrait ? "10px" : "14px"
    };">Time</th>
            ${days
              .map(
                (day) =>
                  `<th style="padding: ${
                    isPortrait ? "8px 4px" : "12px 8px"
                  }; text-align: center; border: 1px solid #2563EB; font-weight: 600; font-size: ${
                    isPortrait ? "10px" : "14px"
                  };">${day}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
    `;

    timeSlots.forEach((timeSlot) => {
      timetableHTML += `<tr>`;
      timetableHTML += `<td style="padding: ${
        isPortrait ? "6px 4px" : "8px"
      }; border: 1px solid #D1D5DB; background-color: #F9FAFB; font-size: ${
        isPortrait ? "8px" : "11px"
      }; font-weight: 500; white-space: nowrap;">${timeSlot.time12}</td>`;

      days.forEach((day) => {
        const cellKey = `${day}-${timeSlot.timeKey}`;

        if (occupiedSlots.has(cellKey)) {
          return;
        }

        const event = eventMap[cellKey];

        if (event) {
          const startIndex = timeSlots.findIndex(
            (ts) => ts.timeKey === event.startTime
          );
          const endIndex = timeSlots.findIndex(
            (ts) => ts.timeKey === event.endTime
          );
          const rowspan = endIndex - startIndex;

          for (let i = startIndex; i < endIndex; i++) {
            occupiedSlots.add(`${day}-${timeSlots[i].timeKey}`);
          }

          const subject = event.subjectId;
          const subjectCode = subject?.code || "N/A";
          const subjectName = subject?.name || "Unknown Subject";

          timetableHTML += `
            <td rowspan="${rowspan}" style="
              padding: ${isPortrait ? "6px" : "10px"}; 
              border: 1px solid #3B82F6; 
              background-color: #DBEAFE;
              vertical-align: top;
            ">
              <div style="font-weight: bold; font-size: ${
                isPortrait ? "9px" : "12px"
              }; color: #1e40af; margin-bottom: 3px;">
                ${schedule.courseAbbreviation} - ${subjectCode}
              </div>
              <div style="font-size: ${
                isPortrait ? "8px" : "11px"
              }; color: #1e40af; margin-bottom: 3px; line-height: 1.2;">
                ${subjectName}
              </div>
              <div style="font-size: ${
                isPortrait ? "7px" : "10px"
              }; color: #6B7280; margin-bottom: 2px;">
                ${formatTime(event.startTime)} - ${formatTime(event.endTime)}
              </div>
              ${
                event.room
                  ? `<div style="font-size: ${
                      isPortrait ? "7px" : "10px"
                    }; color: #6B7280;">${event.room}</div>`
                  : ""
              }
            </td>
          `;
        } else {
          timetableHTML += `<td style="padding: ${
            isPortrait ? "6px 4px" : "8px"
          }; border: 1px solid #D1D5DB; background-color: #FFFFFF;"></td>`;
        }
      });

      timetableHTML += `</tr>`;
    });

    timetableHTML += `</tbody></table>`;

    // Add footer
    const footerHTML = `
      <div style="margin-top: 20px; text-align: center; font-family: Arial, sans-serif; color: #6B7280; font-size: ${
        isPortrait ? "9px" : "12px"
      };">
        <p style="margin: 5px 0;">Generated on ${new Date().toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        )}</p>
      </div>
    `;

    container.innerHTML = headerHTML + timetableHTML + footerHTML;

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      scale: options.quality,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // PDF dimensions based on size
    const pageSizes = {
      a4: { width: 210, height: 297 },
      letter: { width: 215.9, height: 279.4 },
      legal: { width: 215.9, height: 355.6 },
      a3: { width: 297, height: 420 },
    };

    let pdfWidth = pageSizes[options.size].width;
    let pdfHeight = pageSizes[options.size].height;

    if (options.orientation === "landscape") {
      [pdfWidth, pdfHeight] = [pdfHeight, pdfWidth];
    }

    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: "mm",
      format: options.size,
    });

    // Calculate dimensions to fit the page
    const ratio = imgWidth / imgHeight;
    const pdfRatio = pdfWidth / pdfHeight;

    let finalWidth = pdfWidth - 20;
    let finalHeight = finalWidth / ratio;

    if (finalHeight > pdfHeight - 20) {
      finalHeight = pdfHeight - 20;
      finalWidth = finalHeight * ratio;
    }

    const xOffset = (pdfWidth - finalWidth) / 2;
    const yOffset = (pdfHeight - finalHeight) / 2;

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", xOffset, yOffset, finalWidth, finalHeight);

    // Save PDF
    const fileName = `${schedule.name.replace(
      /[^a-z0-9]/gi,
      "_"
    )}_Schedule.pdf`;
    pdf.save(fileName);
  };

  const handleDeleteSchedule = async (scheduleId, scheduleName) => {
    await showDeleteScheduleModal(scheduleId, scheduleName, fetchSchedules);
  };

  const formatTime = (timeKey) => {
    const [hour, minute] = timeKey.split(":").map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const period = hour >= 12 ? "PM" : "AM";
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  const getYearSuffix = (year) => {
    const yearStr = year?.toString();
    if (yearStr === "1") return "st";
    if (yearStr === "2") return "nd";
    if (yearStr === "3") return "rd";
    return "th";
  };

  const getUniqueAcademicYears = () => {
    const years = schedules.map(s => s.academicYear).filter(Boolean);
    return [...new Set(years)].sort().reverse(); // Most recent first
  };

  const getSemesterSuffix = (semester) => {
    const semStr = semester?.toString();
    if (semStr === "1") return "st";
    if (semStr === "2") return "nd";
    return "";
  };

  if (loading) {
    return (
      <div className="schedules-layout">
        <div className="schedules-main-content">
          <div className="main-content">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading schedules...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedules-layout">
        <div className="schedules-main-content">
          <div className="main-content">
            <div className="error-container">
              <h3>Error Loading Schedules</h3>
              <p>{error}</p>
              <button onClick={fetchSchedules} className="action-btn primary">
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredSchedules = getFilteredSchedules();

  return (
    <div className="schedules-layout">
      <div className="schedules-main-content">
        <div className="main-content">
          {/* Header */}
          <div className="schedules-header">
            <h1>Schedules Management</h1>
            <div className="header-actions">
              <button
                onClick={openRecycler}
                className="action-btn secondary"
                title="Copy an existing schedule and update teachers"
              >
                🔄 Recycle Schedule
              </button>
              <button
                onClick={() => showCreateScheduleModal(courses, navigate)}
                className="action-btn primary"
              >
                + Create New Schedule
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="stats-cards">
            <div className="stat-card">
              <h3>Total Schedules</h3>
              <div className="stat-number total">{schedules.length}</div>
              <p className="stat-label">All schedules</p>
            </div>
            <div className="stat-card">
              <h3>Courses</h3>
              <div className="stat-number">
                {new Set(schedules.map((s) => s.courseId)).size}
              </div>
              <p className="stat-label">Unique courses</p>
            </div>
            <div className="stat-card">
              <h3>This Semester</h3>
              <div className="stat-number">
                {schedules.filter((s) => s.semester === "1").length}
              </div>
              <p className="stat-label">1st semester schedules</p>
            </div>
          </div>

          {/* Filters */}
          <div className="schedules-controls-section">
            <div className="schedules-controls-grid">
              <div className="control-group">
                <label className="control-label">Search</label>
                <input
                  type="text"
                  className="control-input"
                  placeholder="Search by name, course..."
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      searchTerm: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="control-group">
                <label className="control-label">Academic Year</label>
                <select
                  className="control-select"
                  value={filters.academicYear}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      academicYear: e.target.value,
                    }))
                  }
                >
                  <option value="">All Academic Years</option>
                  {getUniqueAcademicYears().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label className="control-label">Course</label>
                <select
                  className="control-select"
                  value={filters.courseId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      courseId: e.target.value,
                    }))
                  }
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.abbreviation} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label className="control-label">Year Level</label>
                <select
                  className="control-select"
                  value={filters.yearLevel}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      yearLevel: e.target.value,
                    }))
                  }
                >
                  <option value="">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div className="control-group">
                <label className="control-label">Semester</label>
                <select
                  className="control-select"
                  value={filters.semester}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      semester: e.target.value,
                    }))
                  }
                >
                  <option value="">All Semesters</option>
                  <option value="1">1st Semester</option>
                  <option value="2">2nd Semester</option>
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="action-btn secondary"
                style={{ marginTop: "auto" }}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Schedules Table */}
          {filteredSchedules.length === 0 ? (
            <div className="empty-state">
              <h3>No Schedules Found</h3>
              <p>
                {filters.searchTerm ||
                filters.courseId ||
                filters.yearLevel ||
                filters.semester
                  ? "No schedules match the selected filters"
                  : "Create your first schedule to get started"}
              </p>
              <button
                onClick={() => showCreateScheduleModal(courses, navigate)}
                className="action-btn primary"
              >
                + Create Schedule
              </button>
            </div>
          ) : (
            <div className="schedules-table-container">
              <table className="schedules-table">
                <thead>
                  <tr>
                    <th>Schedule Name</th>
                    <th>Course</th>
                    <th>Academic Year</th>
                    <th>Year & Semester</th>
                    <th>Events</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((schedule) => (
                    <tr key={schedule._id}>
                      <td>
                        <div className="schedule-name">{schedule.name}</div>
                      </td>
                      <td>
                        <div className="course-info">
                          <strong>{schedule.courseAbbreviation}</strong>
                          <br />
                          <small>{schedule.courseName}</small>
                        </div>
                      </td>
                      <td>
                        <div className="academic-year-badge">
                          {schedule.academicYear || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div className="year-sem-badge">
                          {schedule.yearLevel}
                          {getYearSuffix(schedule.yearLevel)} Year
                          <br />
                          <small>
                            {schedule.semester}
                            {getSemesterSuffix(schedule.semester)} Semester
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="events-count">
                          {schedule.events?.length || 0} events
                        </span>
                      </td>
                      <td>
                        <small style={{ color: "#666" }}>
                          {new Date(schedule.createdAt).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => handleViewSchedule(schedule)}
                            className="action-btn small primary"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            className="action-btn small secondary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSchedule(schedule._id, schedule.name)
                            }
                            className="action-btn small danger"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Schedule Recycler Modal */}
      <ScheduleRecycler
        show={showRecycler}
        onClose={() => setShowRecycler(false)}
        onSuccess={handleRecyclerSuccess}
        targetAcademicYear={recyclerTarget.academicYear}
        targetSemester={recyclerTarget.semester}
      />
    </div>
  );
}

export default SchedulesManagement;