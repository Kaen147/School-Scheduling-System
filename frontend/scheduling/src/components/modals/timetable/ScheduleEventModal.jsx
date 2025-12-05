import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const ScheduleEventModal = ({
  isOpen,
  day,
  timeSlot,
  timeSlots,
  scheduleInfo,
  subjects,
  teachers = [],
  existingEvent,
  subjectHoursUsed,
  calculateDuration,
  calculateHours,
  getYearSuffix,
  onConfirm,
  onClose,
  existingSchedules = [],
  checkExternalConflicts = null
  ,
  schedule = {}
}) => {
  // Helper function to get required sessions from subject or offering
  // Handles both old subject structure and new offering structure
  const getRequiredSessions = (subjectOrOffering) => {
    // Get actual subject data (might be nested in offering)
    const subject = subjectOrOffering?.subjectId || subjectOrOffering;
    
    if (typeof subject.getRequiredSessions === 'function') {
      return subject.getRequiredSessions();
    }

    // Derive units/hours from subject fields. Accept either 'lectureUnits'/'labUnits'
    // or older 'lectureHours'/'labHours' naming. Use defaults if missing.
    const lectureUnits = Number(subject?.lectureUnits ?? subject?.lectureHours ?? (subject?.hasLab ? 2 : 3));
    const labUnits = Number(subject?.labUnits ?? subject?.labHours ?? 0);

    const lecture = { hours: lectureUnits || (subject?.hasLab ? 2 : 3) };
    const lab = labUnits > 0 ? { hours: labUnits, sessions: subject?.labSessions ?? 1 } : null;

    return { lecture, lab };
  };

  // State for selected subject and teacher. Start empty and normalize when existingEvent is provided
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [sessionType, setSessionType] = useState('lecture');
  const [endTime, setEndTime] = useState('');
  // index into the selected subject's preferredRooms array
  const [selectedPreferredRoomIndex, setSelectedPreferredRoomIndex] = useState(0);

  // Normalize IDs if existingEvent contains populated objects (or strings)
  useEffect(() => {
    if (!existingEvent) return;

    const normalizeId = (val) => {
      if (!val && val !== 0) return '';
      if (typeof val === 'object' && val !== null) return val._id || val.id || '';
      return String(val);
    };

    setSelectedSubjectId(normalizeId(existingEvent.subjectId));
    setSelectedTeacherId(normalizeId(existingEvent.assignedTeacher?.teacherId));
    setSessionType(existingEvent.sessionType || 'lecture');
    setEndTime(existingEvent.endTime || '');
  }, [existingEvent]);

  // FIXED: Get assigned teachers for selected subject - handle both populated and non-populated data
  const getAssignedTeachers = (subjectId) => {
    const subject = subjects.find(s => s._id === subjectId);
    if (!subject || !subject.assignedTeachers || subject.assignedTeachers.length === 0) {
      return [];
    }
    
    const teachers = subject.assignedTeachers.map(t => {
      // Handle both populated (object) and non-populated (string) teacherId
      let teacherId = null;
      let teacherName = '';
      
      if (typeof t.teacherId === 'object' && t.teacherId !== null) {
        // Populated case: teacherId is an object with _id, name, firstName, lastName, etc.
        teacherId = t.teacherId._id;
        teacherName = t.teacherId.name || 
                      `${t.teacherId.firstName || ''} ${t.teacherId.lastName || ''}`.trim() ||
                      t.teacherName ||
                      'Unknown';
      } else if (typeof t.teacherId === 'string') {
        // Non-populated case: teacherId is just a string ID
        teacherId = t.teacherId;
        teacherName = t.teacherName || 'Unknown';
      }
      
      return {
        teacherId: teacherId,
        teacherName: teacherName,
        type: t.type || 'both'
      };
    }).filter(t => t.teacherId); // Remove any invalid entries
    
    return teachers;
  };

  // Calculate duration between start and end time
  const calculateSelectedDuration = () => {
    if (!timeSlot || !endTime) return null;
    
    const startTime = timeSlot.timeKey;
    
    // Convert time to minutes for calculation
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (endMinutes <= startMinutes) return null;
    
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  // Format time for display (12-hour format)
  const formatTimeDisplay = (timeKey) => {
    if (!timeKey) return '';
    const [hours, minutes] = timeKey.split(':').map(Number);
    const hour12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Calculate required hours for selected subject and session type
  const getRequiredHours = (subjectId, sessionType) => {
    if (!subjectId) return 0;
    
    const subject = subjects.find(s => s._id === subjectId);
    if (!subject) return 0;
    
    // Get actual subject data (might be nested in offering)
    const subjectData = subject.subjectId || subject;
    
    const lectureUnits = Number(subjectData?.lectureUnits ?? subjectData?.lectureHours ?? 3);
    const labUnits = Number(subjectData?.labUnits ?? subjectData?.labHours ?? 0);
    
    if (sessionType === 'lecture') {
      return lectureUnits;
    } else if (sessionType === 'lab') {
      return labUnits * 3; // Lab units = 3 hours total
    }
    
    return lectureUnits + (labUnits * 3); // Total if both
  };

  // Calculate currently scheduled hours for the subject and session type
  const getScheduledHours = (subjectId, sessionType) => {
    if (!subjectId || !subjectHoursUsed) return 0;
    
    const hoursData = subjectHoursUsed[subjectId];
    if (!hoursData) return 0;
    
    if (sessionType === 'lecture') {
      return hoursData.lecture || 0;
    } else if (sessionType === 'lab') {
      return hoursData.lab || 0;
    }
    
    return (hoursData.lecture || 0) + (hoursData.lab || 0);
  };

  // Calculate what the scheduled hours will be after adding this session
  const getProjectedHours = (subjectId, sessionType) => {
    const currentHours = getScheduledHours(subjectId, sessionType);
    const sessionDuration = calculateSessionDuration();
    
    return currentHours + sessionDuration;
  };

  // Calculate duration of the current session in hours
  const calculateSessionDuration = () => {
    if (!timeSlot || !endTime) return 0;
    
    const startTime = timeSlot.timeKey;
    
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (endMinutes <= startMinutes) return 0;
    
    return (endMinutes - startMinutes) / 60; // Convert to hours
  };

  // Get status of hours requirement fulfillment
  const getHoursStatus = (subjectId, sessionType) => {
    if (!subjectId || (!timeSlot || !endTime)) return null;
    
    const required = getRequiredHours(subjectId, sessionType);
    const current = getScheduledHours(subjectId, sessionType);
    const projected = getProjectedHours(subjectId, sessionType);
    
    if (required === 0) return null;
    
    const currentPercentage = (current / required) * 100;
    const projectedPercentage = (projected / required) * 100;
    
    let status = 'normal';
    let message = '';
    
    if (projectedPercentage < 100) {
      status = 'under';
      message = `${(100 - projectedPercentage).toFixed(0)}% remaining`;
    } else if (projectedPercentage === 100) {
      status = 'complete';
      message = 'Complete';
    } else {
      status = 'over';
      message = `${(projectedPercentage - 100).toFixed(0)}% over limit`;
    }
    
    return {
      required,
      current,
      projected,
      currentPercentage,
      projectedPercentage,
      status,
      message,
      sessionDuration: calculateSessionDuration()
    };
  };

  // Reset teacher selection when subject changes
  useEffect(() => {
    if (!existingEvent) {
      setSelectedTeacherId('');
    }
    // reset preferred room index when changing subject (new selection)
    setSelectedPreferredRoomIndex(0);
  }, [selectedSubjectId]);

  if (!isOpen) return null;

  // Helper function to check if a subject is fully scheduled
  const isSubjectFullyScheduled = (subject) => {
    const sessions = getRequiredSessions(subject);
    
    // Check lecture hours
    const lectureRequired = sessions.lecture.hours;
    const lectureScheduled = getScheduledHours(subject._id, 'lecture');
    const lectureComplete = lectureScheduled >= lectureRequired;
    
    // Check lab hours if subject has lab
    let labComplete = true; // Default to true if no lab
    if (sessions.lab && sessions.lab.hours > 0) {
      const labRequired = sessions.lab.hours;
      const labScheduled = getScheduledHours(subject._id, 'lab');
      labComplete = labScheduled >= labRequired;
    }
    
    // Subject is fully scheduled only if both lecture and lab (if applicable) are complete
    return lectureComplete && labComplete;
  };

  // Filter subjects based on schedule info
  // Note: subjects are now offerings from the parent timetable page
  // They already match the schedule's course/year/semester
  const filteredSubjects = subjects.filter(subject => {
    // First check the basic filtering criteria
    let passesBasicFilter = false;
    
    // If it's an old-style subject with courses array
    if (subject.courses && Array.isArray(subject.courses)) {
      passesBasicFilter = subject.courses.some(course => 
        (typeof course === 'object' ? course._id : course) === scheduleInfo?.courseId
      ) &&
      subject.yearLevel === scheduleInfo?.yearLevel &&
      subject.semester === scheduleInfo?.semester &&
      (subject.isActive !== false);
    } else {
      // New structure: offerings are already filtered by parent
      // Just filter by active status
      passesBasicFilter = subject.isActive !== false;
    }
    
    // If basic filter fails, exclude the subject
    if (!passesBasicFilter) return false;
    
    // If editing an existing event, always show the current subject
    if (existingEvent && existingEvent.subjectId === subject._id) {
      return true;
    }
    
    // For new events, exclude fully scheduled subjects
    return !isSubjectFullyScheduled(subject);
  });

  const subjectOptions = filteredSubjects.map(subject => {
    // Handle both old subject structure and new offering structure
    const code = subject.subjectId?.code || subject.code;
    const name = subject.subjectId?.name || subject.name;
    
    // Get completion status for visual indication
    const sessions = getRequiredSessions(subject);
    const lectureRequired = sessions.lecture.hours;
    const lectureScheduled = getScheduledHours(subject._id, 'lecture');
    const lectureComplete = lectureScheduled >= lectureRequired;
    
    let labComplete = true; // Default if no lab
    let hasLab = false;
    if (sessions.lab && sessions.lab.hours > 0) {
      hasLab = true;
      const labRequired = sessions.lab.hours;
      const labScheduled = getScheduledHours(subject._id, 'lab');
      labComplete = labScheduled >= labRequired;
    }
    
    // Create status indicators
    let statusText = '';
    if (hasLab) {
      const lectureStatus = lectureComplete ? '✅' : `${lectureScheduled}/${lectureRequired}h`;
      const labStatus = labComplete ? '✅' : `${getScheduledHours(subject._id, 'lab')}/${sessions.lab.hours}h`;
      statusText = ` (Lec: ${lectureStatus}, Lab: ${labStatus})`;
    } else {
      const lectureStatus = lectureComplete ? '✅' : `${lectureScheduled}/${lectureRequired}h`;
      statusText = ` (${lectureStatus})`;
    }
    
    return (
      <option key={subject._id} value={subject._id}>
        {code} - {name}{statusText}
      </option>
    );
  });

  const assignedTeachers = getAssignedTeachers(selectedSubjectId);

  // Get preferred rooms from the selected subject (robust normalization)
  const getPreferredRooms = (subjectId) => {
    const subject = subjects.find(s => s._id === subjectId);
    if (!subject) return [];
    const prefs = subject.preferredRooms || [];
    return prefs.map(p => {
      if (!p) return null;
      if (typeof p === 'string') return { roomId: '', roomName: p, roomType: 'classroom', capacity: 0 };
      return {
        roomId: p.roomId || p._id || p.id || '',
        roomName: p.roomName || p.name || '',
        roomType: p.roomType || p.type || 'classroom',
        capacity: p.capacity || 0
      };
    }).filter(Boolean);
  };

  const preferredRooms = getPreferredRooms(selectedSubjectId);

  // If editing an existing event that had a room, try to pick that room in the preferredRooms list
  useEffect(() => {
    if (existingEvent?.room && preferredRooms.length > 0) {
      const idx = preferredRooms.findIndex(pr => pr.roomName === existingEvent.room);
      if (idx >= 0) setSelectedPreferredRoomIndex(idx);
    }
  }, [preferredRooms, existingEvent]);

  const teacherOptions = assignedTeachers.length === 0
    ? [<option key="none" value="">No teacher assigned to this subject</option>]
    : [
        <option key="" value="">Select a teacher</option>,
        ...assignedTeachers.map(t => (
          <option key={t.teacherId} value={t.teacherId}>
            {t.teacherName}
          </option>
        ))
      ];

  const timeOptions = timeSlots
    .filter(slot => {
      const currentIndex = timeSlots.findIndex(s => s.timeKey === timeSlot.timeKey);
      const slotIndex = timeSlots.findIndex(s => s.timeKey === slot.timeKey);
      return slotIndex > currentIndex;
    })
    .map(slot => (
      <option key={slot.timeKey} value={slot.timeKey}>{slot.time12}</option>
    ));

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!selectedSubjectId) {
      Swal.fire('Error', 'Please select a subject', 'error');
      return;
    }
    if (!selectedTeacherId) {
      Swal.fire('Error', 'Please select a teacher', 'error');
      return;
    }
    if (!sessionType) {
      Swal.fire('Error', 'Please select a session type', 'error');
      return;
    }
    if (!endTime) {
      Swal.fire('Error', 'Please select an end time', 'error');
      return;
    }
    
    const subject = filteredSubjects.find(s => s._id === selectedSubjectId);
    const subjectRecord = subject?.subjectId || subject; // Extract nested subject if offering
    
    if (sessionType === 'lab' && !subjectRecord?.hasLab) {
      Swal.fire('Error', 'This subject does not have a lab component', 'error');
      return;
    }

    // CHECK FOR EXTERNAL CONFLICTS
    if (checkExternalConflicts && existingSchedules && existingSchedules.length > 0) {
      const conflicts = [];
      const timeToMinutes = (t) => {
        if (!t) return NaN;
        const parts = String(t).split(':').map(Number);
        if (parts.length !== 2) return NaN;
        return parts[0] * 60 + parts[1];
      };

      const newStartMin = timeToMinutes(timeSlot.timeKey);
      const newEndMin = timeToMinutes(endTime);

      existingSchedules.forEach(existingSchedule => {
        (existingSchedule.events || []).forEach(event => {
          if (event.day !== day) return;

          const existingStartMin = timeToMinutes(event.startTime);
          const existingEndMin = timeToMinutes(event.endTime);

          if (isNaN(existingStartMin) || isNaN(existingEndMin)) return;

          // Check for time overlap
          const hasTimeOverlap = newStartMin < existingEndMin && existingStartMin < newEndMin;
          if (!hasTimeOverlap) return;

          // Determine conflict type
          let conflictType = null;
          let conflictMessage = '';

          // 1. STUDENT CONFLICT: Same course/year/semester
          const sameStudents = 
            String(existingSchedule.courseId?._id || existingSchedule.courseId) === String(scheduleInfo.courseId) &&
            String(existingSchedule.yearLevel) === String(scheduleInfo.yearLevel) &&
            String(existingSchedule.semester) === String(scheduleInfo.semester);

          if (sameStudents) {
            conflictType = 'STUDENT';
            conflictMessage = `Students can't attend two classes at once`;
          }

          // 2. TEACHER CONFLICT: Same teacher assigned
          const existingTeacherId = event.assignedTeacher?.teacherId;
          const newTeacherId = selectedTeacherId;

          if (!conflictType && existingTeacherId && newTeacherId && String(existingTeacherId) === String(newTeacherId)) {
            conflictType = 'TEACHER';
            const teacherName = event.assignedTeacher?.teacherName || 'Teacher';
            conflictMessage = `${teacherName} is already teaching another class`;
          }

          // 3. ROOM CONFLICT: Same room
          const existingRoom = event.room?.trim();
          // Get room from preferredRooms
          let newRoom = '';
          if (preferredRooms.length > 0) {
            const pr = preferredRooms[selectedPreferredRoomIndex] || preferredRooms[0];
            newRoom = pr ? (pr.roomName || '').trim() : '';
          }

          if (!conflictType && existingRoom && newRoom && existingRoom.toLowerCase() === newRoom.toLowerCase()) {
            conflictType = 'ROOM';
            conflictMessage = `Room "${newRoom}" is already occupied`;
          }

          // If any conflict detected, add to list
          if (conflictType) {
            let subjName = 'Unknown';
            
            try {
              // First try to get from event's stored fields
              if (event.subjectCode) {
                subjName = event.subjectCode;
              } else if (event.subjectName) {
                subjName = event.subjectName;
              } else if (event.subjectId) {
                // Try to get from populated subjectId (backend populates this)
                if (typeof event.subjectId === 'object' && event.subjectId !== null) {
                  subjName = event.subjectId.code || event.subjectId.name || 'Unknown';
                } else {
                  // Last resort: try to find in subjects array (might not exist if different course)
                  const subj = subjects.find(s => String(s._id) === String(event.subjectId));
                  subjName = subj?.subjectId?.code || subj?.code || subj?.subjectId?.name || subj?.name || 'Unknown';
                }
              }
            } catch (e) {
              // ignore
            }

            conflicts.push({
              type: conflictType,
              scheduleName: existingSchedule.name,
              courseInfo: `${existingSchedule.courseAbbreviation || 'N/A'} Y${existingSchedule.yearLevel} S${existingSchedule.semester}`,
              day: event.day,
              time: event.startTime,
              subject: subjName,
              sessionType: event.sessionType || 'lecture',
              message: conflictMessage
            });
          }
        });
      });

      if (conflicts.length > 0) {
        // Build a concise summary (first conflict) and a detailed list
        const first = conflicts[0];
        const summary = `${first.scheduleName} — ${first.subject}`;
        
        const conflictList = conflicts.map(c => {
          const sessionLabel = (c.sessionType || 'lecture').toUpperCase();
          const typeIcon = c.type === 'STUDENT' ? '👥' : c.type === 'TEACHER' ? '👨‍🏫' : '🚪';
          return `<li style="margin-bottom: 0.75rem;">
            <div><strong>${typeIcon} ${c.type} CONFLICT</strong></div>
            <div style="color: #374151; margin-top: 0.25rem;">${c.message}</div>
            <div style="color: #6B7280; font-size: 0.9em; margin-top: 0.25rem;">
              Schedule: <strong>${c.scheduleName}</strong> (${c.courseInfo})<br/>
              Subject: <strong>${c.subject}</strong> (${sessionLabel}) at ${c.time}
            </div>
          </li>`;
        }).join('');

        Swal.fire({
          icon: 'error',
          title: `Schedule conflict with ${summary}`,
          html: `
            <p style="margin-bottom: 0.5rem; color: #6B7280;">This time slot conflicts with existing schedules:</p>
            <ul style="text-align: left; margin: 1rem 0; background: #FEE2E2; padding: 1rem; border-radius: 6px; list-style: none;">${conflictList}</ul>
            <p style="color: #6B7280; font-size: 0.9em; margin-top: .5rem;">Please choose a different time, teacher, or room.</p>
          `,
          confirmButtonColor: '#EF4444',
          confirmButtonText: 'OK'
        });
        return;
      }
    }

    // CHECK FOR INTERNAL (IN-MEMORY) CONFLICTS AGAINST CURRENT schedule
    // Use the same slot-based conflict check as the parent component
    const startIndex = timeSlots.findIndex(slot => slot.timeKey === timeSlot.timeKey);
    const endIndex = timeSlots.findIndex(slot => slot.timeKey === endTime);

    // Build a set of keys that are occupied by the existing event being edited (if any)
    let selfOccupiedKeys = new Set();
    if (existingEvent) {
      const oldStartIndex = timeSlots.findIndex(slot => slot.timeKey === existingEvent.startTime);
      const oldEndIndex = timeSlots.findIndex(slot => slot.timeKey === existingEvent.endTime);
      const oldDay = existingEvent.day;
      for (let i = oldStartIndex; i < oldEndIndex; i++) {
        selfOccupiedKeys.add(`${oldDay}-${timeSlots[i].timeKey}`);
      }
    }

    // Check each time slot in the proposed range
    const conflictingEvents = [];
    for (let i = startIndex; i < endIndex; i++) {
      const slotKey = `${day}-${timeSlots[i].timeKey}`;
      const existingSlotEvent = schedule[slotKey];

      // If there's an event at this slot and it's not part of the event being edited
      if (existingSlotEvent && !selfOccupiedKeys.has(slotKey)) {
        // Find subject info for conflict message
        let code = existingSlotEvent.subjectCode || existingSlotEvent.subjectName;
        
        if (!code) {
          try {
            const subjId = typeof existingSlotEvent.subjectId === 'object' && existingSlotEvent.subjectId !== null 
              ? existingSlotEvent.subjectId._id 
              : existingSlotEvent.subjectId;
            const subj = subjects.find(s => String(s._id) === String(subjId));
            code = subj?.subjectId?.code || subj?.code || subj?.subjectId?.name || subj?.name || 'Unknown';
          } catch (e) {
            code = 'Unknown';
          }
        }
        
        conflictingEvents.push({
          subject: code,
          time: existingSlotEvent.startTime,
          sessionType: existingSlotEvent.sessionType || 'lecture'
        });
        break; // Found a conflict, no need to check further
      }
    }

    if (conflictingEvents.length > 0) {
      const first = conflictingEvents[0];
      const summary = `${first.subject}`;
      const conflictList = conflictingEvents.map(c => {
        const sessionLabel = (c.sessionType || 'lecture').toUpperCase();
        return `<li style="margin-bottom: 0.5rem;"><strong>${c.subject}</strong> (${sessionLabel})<br/>
          <span style="color: #6B7280; font-size: 0.9em;">Conflicts at ${c.time}</span></li>`;
      }).join('');

      Swal.fire({
        icon: 'error',
        title: `Schedule conflict with ${summary}`,
        html: `
          <p style="margin-bottom: 0.5rem;">This time slot conflicts with events already added to the current schedule.</p>
          <ul style="text-align: left; margin: 1rem 0; background: #FEE2E2; padding: 1rem; border-radius: 6px;">${conflictList}</ul>
        `,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    // FIXED: Get teacher name correctly by comparing IDs (handle both string and object cases)
    let teacherName = '';
    
    if (subject && Array.isArray(subject.assignedTeachers)) {
      const teacherObj = subject.assignedTeachers.find(t => {
        // Handle both cases: when teacherId is populated (object) or just a string ID
        let teacherIdValue;
        if (typeof t.teacherId === 'object' && t.teacherId !== null) {
          teacherIdValue = t.teacherId._id;
        } else {
          teacherIdValue = t.teacherId;
        }
        return String(teacherIdValue) === String(selectedTeacherId);
      });

      if (teacherObj) {
        // Get teacher name from multiple possible sources
        if (typeof teacherObj.teacherId === 'object' && teacherObj.teacherId !== null) {
          // Populated case
          teacherName = teacherObj.teacherId.name ||
                        `${teacherObj.teacherId.firstName || ''} ${teacherObj.teacherId.lastName || ''}`.trim() ||
                        teacherObj.teacherName ||
                        '';
        } else {
          // Non-populated case
          teacherName = teacherObj.teacherName || '';
        }
      }
    }
    
    // determine roomName to send: from preferredRooms if available
    let roomNameToSend = '';
    if (preferredRooms.length > 0) {
      const pr = preferredRooms[selectedPreferredRoomIndex] || preferredRooms[0];
      roomNameToSend = pr ? (pr.roomName || '') : '';
    }

    // Pass the data to parent component
    onConfirm({
      courseId: scheduleInfo.courseId,
      subjectId: selectedSubjectId,
      sessionType,
      endTime,
      room: roomNameToSend,
      assignedTeacher: selectedTeacherId ? { 
        teacherId: selectedTeacherId, 
        teacherName: teacherName 
      } : undefined
    });
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal-content" onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>
            {existingEvent ? '✏️ Edit Schedule Event' : '➕ Add Schedule Event'}
          </h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close" 
            aria-label="Close"
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              color: '#6B7280'
            }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Subject */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#1F2937',
              marginBottom: '6px'
            }}>
              Subject <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select 
              value={selectedSubjectId} 
              onChange={e => setSelectedSubjectId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            >
              {filteredSubjects.length === 0 ? (
                <option value="">🎉 All subjects are fully scheduled!</option>
              ) : (
                <>
                  <option value="">— Select a subject —</option>
                  {subjectOptions}
                </>
              )}
            </select>
            
            {/* Show helpful note about scheduling progress */}
            {filteredSubjects.length > 0 && (
              <div style={{ 
                fontSize: '11px', 
                color: '#6B7280', 
                marginTop: '4px' 
              }}>
                💡 Subjects shown include scheduling progress. Fully scheduled subjects are hidden.
              </div>
            )}
            
            {/* Show celebration message when all subjects are complete */}
            {filteredSubjects.length === 0 && !existingEvent && (
              <div style={{ 
                fontSize: '12px', 
                color: '#059669', 
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#D1FAE5',
                borderRadius: '6px',
                border: '1px solid #10B981'
              }}>
                🎉 Congratulations! All subjects for this course are fully scheduled. 
                You can still edit existing events if needed.
              </div>
            )}
          </div>
          
          {/* Teacher */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#1F2937',
              marginBottom: '6px'
            }}>
              Teacher <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select 
              value={selectedTeacherId} 
              onChange={e => setSelectedTeacherId(e.target.value)} 
              disabled={assignedTeachers.length === 0}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: `1px solid ${assignedTeachers.length === 0 ? '#FCA5A5' : '#D1D5DB'}`,
                borderRadius: '6px',
                backgroundColor: assignedTeachers.length === 0 ? '#FEF2F2' : '#FFFFFF',
                cursor: assignedTeachers.length === 0 ? 'not-allowed' : 'pointer',
                outline: 'none',
                opacity: assignedTeachers.length === 0 ? 0.7 : 1
              }}
            >
              {teacherOptions}
            </select>
            {assignedTeachers.length === 0 && selectedSubjectId && (
              <div style={{ 
                color: '#DC2626', 
                fontSize: '12px', 
                marginTop: '6px',
                padding: '8px 10px',
                backgroundColor: '#FEE2E2',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚠️</span>
                <span>No teachers assigned to this subject. Assign one first.</span>
              </div>
            )}
          </div>
          
          {/* Session Type */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#1F2937',
              marginBottom: '6px'
            }}>
              Session Type <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select 
              value={sessionType} 
              onChange={e => setSessionType(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="lecture">📚 Lecture</option>
              <option 
                value="lab" 
                disabled={(() => {
                  const subj = filteredSubjects.find(s => s._id === selectedSubjectId);
                  const subjRecord = subj?.subjectId || subj;
                  return !subjRecord?.hasLab;
                })()}
              >
                🧪 Laboratory
              </option>
            </select>
          </div>
          
          {/* Hours Requirement Tracking */}
          {selectedSubjectId && sessionType && (
            <div style={{ 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '6px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Hours
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#6B7280' 
                }}>
                  Required: {getRequiredHours(selectedSubjectId, sessionType)}h
                </span>
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '12px',
                  marginBottom: '4px'
                }}>
                  <span style={{ color: '#6B7280' }}>Currently Scheduled:</span>
                  <span style={{ color: '#374151', fontWeight: '500' }}>
                    {getScheduledHours(selectedSubjectId, sessionType)}h
                  </span>
                </div>
                
                {timeSlot && endTime && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '12px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ color: '#6B7280' }}>This Session:</span>
                    <span style={{ color: '#374151', fontWeight: '500' }}>
                      +{calculateSessionDuration()}h
                    </span>
                  </div>
                )}
                
                <div style={{ 
                  height: '4px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '4px'
                }}>
                  <div style={{ 
                    height: '100%',
                    backgroundColor: getScheduledHours(selectedSubjectId, sessionType) >= getRequiredHours(selectedSubjectId, sessionType) ? '#10B981' : '#3B82F6',
                    width: `${Math.min((getScheduledHours(selectedSubjectId, sessionType) / getRequiredHours(selectedSubjectId, sessionType)) * 100, 100)}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
              
              {(() => {
                const hoursStatus = getHoursStatus(selectedSubjectId, sessionType);
                if (!hoursStatus) return null;
                
                const statusColors = {
                  under: { bg: '#FEF3C7', text: '#D97706', border: '#F59E0B' },
                  complete: { bg: '#D1FAE5', text: '#059669', border: '#10B981' },
                  over: { bg: '#FEE2E2', text: '#DC2626', border: '#EF4444' }
                };
                
                const colors = statusColors[hoursStatus.status] || statusColors.under;
                
                return (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '6px 8px',
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: colors.text, fontWeight: '600' }}>
                      {hoursStatus.status === 'under' && '⚠️ Incomplete'}
                      {hoursStatus.status === 'complete' && '✅ Complete'}
                      {hoursStatus.status === 'over' && '❌ Over Limit'}
                    </span>
                    <span style={{ color: colors.text, fontWeight: '500' }}>
                      After: {hoursStatus.projected}h / {hoursStatus.required}h
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* End Time */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#1F2937',
              marginBottom: '6px'
            }}>
              End Time <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select 
              value={endTime} 
              onChange={e => setEndTime(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">— Select end time —</option>
              {timeOptions}
            </select>
            
            {/* Duration Display */}
            {timeSlot && endTime && (
              <div style={{ 
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280', fontWeight: '500' }}>Time Span:</span>
                  <span style={{ color: '#374151', fontWeight: '600' }}>
                    {formatTimeDisplay(timeSlot.timeKey)} - {formatTimeDisplay(endTime)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ color: '#6B7280', fontWeight: '500' }}>Duration:</span>
                  <span style={{ 
                    color: '#059669', 
                    fontWeight: '700',
                    fontSize: '14px'
                  }}>
                    {calculateSelectedDuration()}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Room / Location */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#1F2937',
              marginBottom: '6px'
            }}>
              Room / Location
            </label>
            {preferredRooms.length > 0 ? (
              <select 
                value={selectedPreferredRoomIndex} 
                onChange={e => setSelectedPreferredRoomIndex(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {preferredRooms.map((pr, idx) => (
                  <option key={idx} value={idx}>
                    {pr.roomName || `Room ${idx+1}`} {pr.roomType ? `(${pr.roomType})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ 
                fontSize: '13px', 
                color: '#6B7280',
                padding: '10px 12px',
                backgroundColor: '#F9FAFB',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                fontStyle: 'italic'
              }}>
                📍 No preferred rooms assigned to this subject
              </div>
            )}
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="modal-footer" style={{ 
          padding: '16px 20px',
          backgroundColor: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#E5E7EB',
              color: '#1F2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D1D5DB'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#E5E7EB'}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563EB'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3B82F6'}
          >
            {existingEvent ? '💾 Update Event' : '✅ Add Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleEventModal;