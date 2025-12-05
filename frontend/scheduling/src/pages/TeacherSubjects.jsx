import { useEffect, useState } from "react";
import axios from "axios";
import "./TeacherSubjects.css";
import { BookOpen } from "lucide-react";

function TeacherSubjects({ teacherId }) {
  const [subjects, setSubjects] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper functions for time calculations
  const calculateEventDuration = (startTime, endTime) => {
    const timeSlots = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break;
        const hh = hour.toString().padStart(2, "0");
        const mm = minute.toString().padStart(2, "0");
        timeSlots.push(`${hh}:${mm}`);
      }
    }
    
    const startIndex = timeSlots.findIndex(slot => slot === startTime);
    const endIndex = timeSlots.findIndex(slot => slot === endTime);
    const slots = endIndex - startIndex;
    return (slots * 30) / 60; // Convert to hours
  };

  const formatTime = (timeString) => {
    const [hour, minute] = timeString.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      if (!teacherId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Fetch both offerings and schedule data
        const [offeringsRes, scheduleRes] = await Promise.all([
          axios.get("https://school-scheduling-system-production.up.railway.app/api/offerings", { signal }),
          fetch(`https://school-scheduling-system-production.up.railway.app/api/schedules/by-teacher/${teacherId}`)
        ]);

        const allOfferings = Array.isArray(offeringsRes.data) ? offeringsRes.data : [];
        const scheduleData = await scheduleRes.json();
        setScheduleData(Array.isArray(scheduleData) ? scheduleData : []);

        // Filter and group offerings assigned to this teacher
        const myOfferings = allOfferings.filter((offering) => {
          const assignedTeachers = offering.assignedTeachers || [];
          return assignedTeachers.some((t) => {
            let tid = t?.teacherId;
            if (tid && typeof tid === "object") {
              tid = tid._id || tid.id;
            }
            return String(tid) === String(teacherId);
          });
        });

        // Group by subject + year + semester
        const subjectMap = {};
        const subjectList = [];

        myOfferings.forEach((offering) => {
          const subject = offering.subjectId;
          if (!subject) return;

          const key = `${subject._id}|${offering.yearLevel}|${offering.semester}`;

          if (!subjectMap[key]) {
            const totalUnits =
              (Number(subject.lectureUnits) || 0) + (Number(subject.labUnits) || 0);

            subjectMap[key] = {
              _id: offering._id,
              subjectId: subject._id,
              code: subject.code,
              name: subject.name,
              lectureUnits: subject.lectureUnits || 0,
              labUnits: subject.labUnits || 0,
              totalUnits,
              hasLab: subject.hasLab,
              isActive: subject.isActive,
              yearLevel: offering.yearLevel,
              semester: offering.semester,
              courses: offering.courseId || [],
            };
            subjectList.push(subjectMap[key]);
          }
        });

        // Sort by code
        subjectList.sort((a, b) => {
          if (a.code && b.code) {
            return a.code.localeCompare(b.code);
          }
          return (a.name || "").localeCompare(b.name || "");
        });

        setSubjects(subjectList);
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Error fetching data:", err);
        setError("Failed to load subjects. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [teacherId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your subjects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <p className="error-icon">⚠️</p>
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {subjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>No Subjects Yet</h2>
          <p>You don't have any subjects assigned for this semester.</p>
        </div>
      ) : (
        <>
          <div className="subjects-header">
            <h2 className="subjects-title">My Subjects</h2>
          </div>
          <div className="subjects-grid">
            {subjects.map((subject) => {
              const courseNames =
                Array.isArray(subject.courses) && subject.courses.length > 0
                  ? subject.courses
                      .map((c) =>
                        typeof c === "string" ? c : c.abbreviation || c.name || ""
                      )
                      .filter(Boolean)
                      .join(", ")
                  : "Multiple Courses";

              const semesterText =
                subject.semester === "summer"
                  ? "Summer"
                  : `${subject.semester}${subject.semester === "1" ? "st" : subject.semester === "2" ? "nd" : subject.semester === "3" ? "rd" : "th"}`;

              // Get actual schedule events for this subject
              const subjectEvents = scheduleData
                .flatMap(schedule => schedule.events || [])
                .filter(event => event.subjectId?.code === subject.code);

              // Calculate total hours per week from actual schedule
              const lectureEvents = subjectEvents.filter(e => (e.sessionType || 'lecture') === 'lecture');
              const labEvents = subjectEvents.filter(e => e.sessionType === 'lab');
              
              const totalHours = subjectEvents.reduce((total, event) => {
                // Calculate actual hours from schedule times
                const startTime = event.startTime;
                const endTime = event.endTime;
                const duration = calculateEventDuration(startTime, endTime);
                return total + duration;
              }, 0);

              // Get unique rooms for this subject
              const rooms = [...new Set(subjectEvents.map(e => e.room).filter(Boolean))];
              const roomText = rooms.length > 0 ? rooms.join(", ") : "Room TBA";

              // Get schedule times
              const scheduleTimes = subjectEvents.map(event => {
                const dayNames = {
                  monday: "Mon", tuesday: "Tue", wednesday: "Wed", 
                  thursday: "Thu", friday: "Fri"
                };
                const dayName = dayNames[event.day.toLowerCase()] || event.day;
                const time = formatTime(event.startTime);
                return `${dayName} ${time}`;
              });

              return (
                <div className="subject-card-new" key={`${subject.subjectId}-${subject.yearLevel}-${subject.semester}`}>
                  {/* Subject Icon */}
                  <div className="subject-icon">
                    <BookOpen size={20} />
                  </div>

                  {/* Subject Content */}
                  <div className="subject-content">
                    {/* Subject Title */}
                    <h3 className="subject-title">{subject.name}</h3>
                    <p className="subject-code">{subject.code}</p>

                    {/* Course and Year Info */}
                    <div className="course-info">
                      <span className="course-badge">{courseNames} {subject.yearLevel} Year</span>
                    </div>

                    {/* Room Info */}
                    <div className="room-info">
                      <span className="room-icon">🏢</span>
                      <span>{roomText}</span>
                    </div>

                    {/* Hours Info */}
                    <div className="hours-info">
                      <span className="hours-icon">⏰</span>
                      <span>{totalHours > 0 ? `${totalHours} hours per week` : `${(Number(subject.lectureUnits) || 0) + ((Number(subject.labUnits) || 0) * 3)} hours per week`}</span>
                    </div>

                    {/* Schedule Times */}
                    <div className="schedule-times">
                      {scheduleTimes.length > 0 ? (
                        scheduleTimes.map((timeText, index) => (
                          <span key={index} className="time-badge">{timeText}</span>
                        ))
                      ) : (
                        <span className="time-badge">Schedule TBA</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default TeacherSubjects;
