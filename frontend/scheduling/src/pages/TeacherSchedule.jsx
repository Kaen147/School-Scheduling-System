
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./TeacherSchedule.css";

function TeacherSchedule({ teacherId: propTeacherId, hideControls = false }) {
  const { user, loading: authLoading } = useAuth();
  const teacherId = propTeacherId || user?.id;
  
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break;
        const hh = hour.toString().padStart(2, "0");
        const mm = minute.toString().padStart(2, "0");
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? "PM" : "AM";
        slots.push({
          timeKey: `${hh}:${mm}`,
          time12: `${displayHour}:${mm} ${period}`,
          index: slots.length
        });
      }
    }
    return slots;
  }, []);

  // Helper function to format time
  const formatTime = (timeKey) => {
    const slot = timeSlots.find(s => s.timeKey === timeKey);
    return slot ? slot.time12 : '';
  };

  // Helper function to calculate duration
  const calculateDuration = (startTime, endTime) => {
    const startIndex = timeSlots.findIndex(slot => slot.timeKey === startTime);
    const endIndex = timeSlots.findIndex(slot => slot.timeKey === endTime);
    const slots = endIndex - startIndex;
    const minutes = slots * 30;
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const printButton = () => {
    window.print();
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      if (authLoading) return;
      
      if (!teacherId) {
        console.log('TeacherSchedule: No teacherId provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('TeacherSchedule: Fetching schedule for teacherId:', teacherId);
        
        const response = await fetch(`http://localhost:5000/api/schedules/by-teacher/${teacherId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('TeacherSchedule: Received data:', data);
        
        setSchedules(Array.isArray(data) ? data : []);
        
        // Set teacher info from the current user
        setTeacherInfo(user);
      } catch (error) {
        console.error('TeacherSchedule: Error fetching schedule:', error);
        setSchedules([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [teacherId, authLoading, user]);

  // Flatten all events from all schedules
  const allEvents = useMemo(() => {
    const events = [];
    schedules.forEach(schedule => {
      if (schedule.events && Array.isArray(schedule.events)) {
        schedule.events.forEach(event => {
          events.push({
            ...event,
            scheduleId: schedule._id,
            courseName: schedule.courseName,
            courseAbbreviation: schedule.courseAbbreviation,
            yearLevel: schedule.yearLevel,
            semester: schedule.semester,
            subjectName: event.subjectId?.name,
            subjectCode: event.subjectId?.code
          });
        });
      }
    });
    return events;
  }, [schedules]);

  // Create a grid system for positioning events
  const eventGrid = useMemo(() => {
    const grid = {};
    
    // Initialize grid for all days and time slots
    days.forEach(day => {
      grid[day] = timeSlots.map(() => null);
    });
    
    // Place events in the grid
    allEvents.forEach(event => {
      const startIndex = timeSlots.findIndex(slot => slot.timeKey === event.startTime);
      const endIndex = timeSlots.findIndex(slot => slot.timeKey === event.endTime);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const dayIndex = days.indexOf(event.day);
        if (dayIndex !== -1) {
          // Calculate positioning to center on time lines
          const duration = endIndex - startIndex;
          const heightInPixels = duration * 24; // 24px per time slot
          
          const eventData = {
            ...event,
            startIndex,
            endIndex,
            duration,
            heightInPixels
          };
          
          // Mark all occupied slots
          for (let i = startIndex; i < endIndex; i++) {
            if (i >= 0 && i < timeSlots.length) {
              grid[event.day][i] = i === startIndex ? eventData : 'occupied';
            }
          }
        }
      }
    });
    
    return grid;
  }, [allEvents, timeSlots, days]);

  // Calculate summary statistics
  const { totalUnits, totalHours, subjectSummary } = useMemo(() => {
    let totalUnits = 0;
    let totalHours = 0;
    const subjectHours = {};

    allEvents.forEach(event => {
      const duration = calculateDuration(event.startTime, event.endTime);
      const hours = parseFloat(duration.replace(/[^\d.]/g, '')) || 0;
      
      totalHours += hours;
      
      const sessionKey = `${event.subjectCode}-${event.sessionType || 'lecture'}`;
      if (!subjectHours[sessionKey]) {
        subjectHours[sessionKey] = {
          subjectCode: event.subjectCode,
          subjectName: event.subjectName,
          sessionType: event.sessionType || 'lecture',
          hours: 0,
          requiredHours: 3, // Default
          hasLab: event.hasLab
        };
      }
      subjectHours[sessionKey].hours += hours;
    });

    return { 
      totalUnits, 
      totalHours: Math.round(totalHours * 10) / 10, 
      subjectSummary: Object.values(subjectHours)
    };
  }, [allEvents]);

  if (authLoading || isLoading)
    return <div className="schedule-loading">Loading schedule...</div>;

  if (!teacherId)
    return <div className="schedule-loading">Please log in to view your schedule.</div>;

  if (allEvents.length === 0)
    return <div className="schedule-loading">No scheduled events yet.</div>;

  return (
    <div className="teacher-schedule-wrapper">
      {/* Teacher Info Header */}
      <div style={{ 
        backgroundColor: '#F3F4F6', 
        padding: '1rem', 
        borderRadius: '8px', 
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#1F2937' }}>
          {teacherInfo 
            ? `${teacherInfo.firstName || ''} ${teacherInfo.lastName || ''}` 
            : 'Teacher Schedule'
          }
        </h2>
        <p style={{ margin: '0', color: '#6B7280' }}>
          Faculty Teaching Schedule
        </p>
      </div>

      {/* Summary Stats */}
      <div className="no-print" style={{
        backgroundColor: '#FEF3C7',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', color: '#92400E' }}>
          Teaching Load Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '6px',
            borderLeft: '4px solid #3B82F6'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1F2937', marginBottom: '4px' }}>
              📊 Total Units: {totalUnits}
            </div>
          </div>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '6px',
            borderLeft: '4px solid #10B981'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1F2937', marginBottom: '4px' }}>
              ⏱️ Total Hours/Week: {totalHours}h
            </div>
          </div>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '6px',
            borderLeft: '4px solid #F59E0B'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1F2937', marginBottom: '4px' }}>
              📚 Total Subjects: {new Set(allEvents.map(e => e.subjectCode)).size}
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {subjectSummary.map((subject, index) => {
            const sessionIcon = subject.sessionType === 'lab' ? '🧪' : '📚';
            const color = subject.sessionType === 'lab' ? '#F59E0B' : '#2563EB';
            
            return (
              <div key={index} style={{
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '6px',
                borderLeft: `4px solid ${color}`
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                  {sessionIcon} {subject.subjectCode} - {subject.subjectName}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                  <span style={{ color: color, fontWeight: '500' }}>
                    {subject.sessionType.toUpperCase()}: {subject.hours}h/week
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!hideControls && (
        <button onClick={printButton} className="print-button no-print">
          🖨️ Print Schedule
        </button>
      )}

      {/* Schedule Table */}
      <div className="teacher-schedule-container">
        <div className="table-wrapper" style={{ position: 'relative' }}>
          <table className="teacher-schedule-table">
            <thead>
              <tr>
                <th className="time-column">Time</th>
                {days.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, timeIndex) => (
                <tr key={slot.timeKey} style={{ height: '24px' }}>
                  <td className="time-cell">{slot.time12}</td>
                  {days.map((day) => {
                    const eventData = eventGrid[day][timeIndex];
                    
                    // Skip if this slot is occupied by an event that started earlier
                    if (eventData === 'occupied') {
                      return null;
                    }
                    
                    return (
                      <td 
                        key={`${day}-${timeIndex}`} 
                        className="schedule-cell"
                        style={{ 
                          position: 'relative',
                          height: '24px',
                          padding: 0,
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        {eventData && eventData !== 'occupied' ? (
                          <div
                            className={`event-card ${eventData.sessionType === 'lab' ? 'lab' : ''}`}
                            style={{
                              position: 'absolute',
                              top: `${-12}px`, // Center on the time line
                              left: '4px',
                              right: '4px',
                              height: `${eventData.heightInPixels}px`,
                              backgroundColor: eventData.sessionType === 'lab' ? '#FEF3C7' : '#DBEAFE',
                              border: `2px solid ${eventData.sessionType === 'lab' ? '#F59E0B' : '#2563EB'}`,
                              borderRadius: '6px',
                              padding: '6px 4px',
                              marginTop: '22px', // Add margin to properly center on time lines
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              zIndex: 10,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              fontSize: eventData.heightInPixels < 60 ? '10px' : '12px',
                              textAlign: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                              {eventData.sessionType === 'lab' ? '🧪' : '📚'} {eventData.courseAbbreviation} - {eventData.subjectCode}
                            </div>
                            <div style={{ fontSize: '11px', marginTop: '2px' }}>
                              {eventData.subjectName}
                            </div>
                            <div style={{ fontSize: '10px', color: '#059669', marginTop: '2px', fontWeight: '600' }}>
                              👨‍🏫 {eventData.assignedTeacher?.teacherName || 'No teacher assigned'}
                            </div>
                            <div style={{ 
                              fontSize: '10px', 
                              color: eventData.sessionType === 'lab' ? '#92400E' : '#1E40AF',
                              fontWeight: '600',
                              marginTop: '2px',
                              textTransform: 'uppercase'
                            }}>
                              {eventData.sessionType || 'lecture'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                              {formatTime(eventData.startTime)} - {formatTime(eventData.endTime)}
                            </div>
                            <div style={{ fontSize: '9px', color: '#6B7280' }}>
                              {calculateDuration(eventData.startTime, eventData.endTime)} {eventData.room && `• ${eventData.room}`}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Print Summary */}
        <div className="report-summary print-only">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Units:</span>
              <span className="summary-value">{totalUnits}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Hours/Week:</span>
              <span className="summary-value">{totalHours}h</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Subjects:</span>
              <span className="summary-value">{new Set(allEvents.map(e => e.subjectCode)).size}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Classes:</span>
              <span className="summary-value">{allEvents.length}</span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="signature-line" style={{ width: '220px', borderBottom: '1px solid #000', marginBottom: '6px' }}></div>
              <div className="signature-label" style={{ fontSize: '12px', color: '#374151' }}>
                {teacherInfo ? `${teacherInfo.firstName || ''} ${teacherInfo.lastName || ''}` : "Teacher's Signature"}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '12px', color: '#374151' }}>
              Generated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherSchedule;