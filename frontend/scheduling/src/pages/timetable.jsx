import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './timetable.css';
import axios from 'axios';
import Swal from 'sweetalert2';
import ScheduleEventModal from '../components/modals/timetable/ScheduleEventModal';
import SaveScheduleModal from '../components/modals/timetable/SaveScheduleModal';
import DeleteEventModal from '../components/modals/timetable/DeleteEventModal';
import ValidationModals from '../components/modals/timetable/ValidationModals';

const WeeklyTimetable = (props) => {
  // Modal state for ScheduleEventModal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState({});
  const navigate = useNavigate();
  const params = useParams();
  // Determine mode: prop > URL > default
  let mode = props.mode;
  if (!mode) {
    if (window.location.pathname.includes('/timetable/view/')) mode = 'view';
    else if (window.location.pathname.includes('/timetable/edit/')) mode = 'edit';
    else mode = 'create';
  }
  const [schedule, setSchedule] = useState({});
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [subjectHoursUsed, setSubjectHoursUsed] = useState({});

  // ADDED: Missing fetchData function
  const fetchData = async (info, excludeScheduleId = null) => {
    try {
      const courseRes = await axios.get("https://school-scheduling-system-production.up.railway.app/api/courses");
      setCourses(courseRes.data);

      // Fetch offerings for this specific schedule context (course, year, semester, academicYear)
      if (info?.courseId && info?.yearLevel && info?.semester && info?.academicYear) {
        const offeringsRes = await axios.get(
          `https://school-scheduling-system-production.up.railway.app/api/offerings?courseId=${info.courseId}&yearLevel=${info.yearLevel}&semester=${info.semester}&academicYear=${info.academicYear}`
        );
        
        // Set offerings as subjects so the modal can access assignedTeachers
        setSubjects(offeringsRes.data || []);
        
        let url = `https://school-scheduling-system-production.up.railway.app/api/schedules/check-conflicts/${info.courseId}/${info.yearLevel}/${info.semester}`;
        
        // Add excludeScheduleId as query parameter if provided
        if (excludeScheduleId) {
          url += `?excludeScheduleId=${excludeScheduleId}`;
        }
        
        const existingRes = await axios.get(url);
        setExistingSchedules(existingRes.data || []);
      } else {
        // Fallback: fetch all subjects if no schedule info
        const subjectRes = await axios.get("https://school-scheduling-system-production.up.railway.app/api/subjects");
        setSubjects(subjectRes.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // Helper function to get required sessions from plain subject object
  const getRequiredSessions = (subjectOrOffering) => {
    if (typeof subjectOrOffering?.getRequiredSessions === 'function') {
      return subjectOrOffering.getRequiredSessions();
    }
    
    // Handle offerings: extract subject from subjectId
    const subject = subjectOrOffering?.subjectId || subjectOrOffering;
    
    // If the subject object contains lectureUnits/labUnits, use them (1 unit = 1 hour)
    if (subject) {
      const lectureUnits = Number(subject.lectureUnits || subject.lectureHours || 0);
      const labUnits = Number(subject.labUnits || 0);
      const lectureHours = lectureUnits; // 1 unit = 1 hour
      const labHours = labUnits * 3; // 1 lab unit = 3 hours total

      return {
        lecture: { hours: lectureHours, sessions: 1 },
        lab: labHours > 0 ? { hours: labHours, sessions: 2 } : null
      };
    }

    // Default fallback for backward-compatibility
    return {
      lecture: { hours: 3, sessions: 1 },
      lab: null
    };
  };

  useEffect(() => {
    // MOVED: timeSlots definition inside useEffect
    const timeSlots = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break;
        
        const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const time12 = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        
        timeSlots.push({ timeKey, time12 });
      }
    }

    // Helper to convert events array to schedule object (cellKey: event)
    const eventsToScheduleObj = (events, timeSlots) => {
      const scheduleObj = {};
      (events || []).forEach(event => {
        if (!event.day || !event.startTime || !event.endTime) {
          console.warn('Skipping invalid event:', event);
          return;
        }

        let startIdx = -1, endIdx = -1;
        for (let i = 0; i < timeSlots.length; i++) {
          if (timeSlots[i].timeKey === event.startTime) startIdx = i;
          if (timeSlots[i].timeKey === event.endTime) endIdx = i;
        }

        if (startIdx === -1 || endIdx === -1) {
          console.warn('Could not find time slots for event:', event);
          return;
        }

        const cellKey = `${event.day}-${timeSlots[startIdx].timeKey}`;
        
        // CRITICAL: Extract subjectId as string, not object
        let subjectId = event.subjectId;
        if (typeof subjectId === 'object' && subjectId !== null && subjectId._id) {
          subjectId = subjectId._id;
        }
        
        // CRITICAL FIX: If subjectId is null/undefined, skip this event
        if (!subjectId) {
          console.error('Event has no subjectId:', event.subjectName, event.subjectCode);
          return; // Skip this event - don't add it to scheduleObj
        }

        scheduleObj[cellKey] = {
          day: event.day,
          startTime: event.startTime,
          endTime: event.endTime,
          subjectId: subjectId, // Ensure this is a string ID
          subjectName: event.subjectName || '', // Preserve subject name
          subjectCode: event.subjectCode || '', // Preserve subject code
          room: event.room || '',
          sessionType: event.sessionType || 'lecture',
          slotsOccupied: endIdx - startIdx,
          color: event.sessionType === 'lab' 
            ? { bg: '#FEF3C7', border: '#F59E0B' }
            : { bg: '#DBEAFE', border: '#2563EB' },
          assignedTeacher: event.assignedTeacher || null
        };
      });

      return scheduleObj;
    };

    const fetchScheduleById = async (id) => {
      try {
        const res = await axios.get(`https://school-scheduling-system-production.up.railway.app/api/schedules/${id}`);
        const data = res.data;
        
        // Build schedule object for grid
        const scheduleObj = eventsToScheduleObj(data.events, timeSlots);
        setSchedule(scheduleObj);
        setScheduleInfo({
          academicYear: data.academicYear,
          courseId: data.courseId?._id || data.courseId,
          courseName: data.courseName,
          courseAbbreviation: data.courseAbbreviation,
          yearLevel: data.yearLevel,
          semester: data.semester,
        });
        
        // FIXED: Now fetchData is defined
        fetchData({
          courseId: data.courseId?._id || data.courseId,
          yearLevel: data.yearLevel,
          semester: data.semester,
        }, id); // Pass the current schedule ID here
      } catch (err) {
        console.error("Error fetching schedule by id:", err);
      }
    };

    if ((mode === 'view' || mode === 'edit') && params.id) {
      fetchScheduleById(params.id);
    } else {
      const storedScheduleInfo = JSON.parse(localStorage.getItem('scheduleInfo') || '{}');
      if (storedScheduleInfo) {
        setScheduleInfo(storedScheduleInfo);
      }
      fetchData(storedScheduleInfo); // No ID to exclude in create mode
    }
    // eslint-disable-next-line
  }, [mode, params.id]);

  useEffect(() => {
    // MOVED: timeSlots definition inside this useEffect too
    const timeSlots = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break;
        
        const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const time12 = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        
        timeSlots.push({ timeKey, time12 });
      }
    }

    const hoursMap = {};
    Object.values(schedule).forEach(event => {
      if (!event.subjectId) return;
      
      // Extract subjectId as string for consistent tracking
      let subjectIdString = event.subjectId;
      if (typeof subjectIdString === 'object' && subjectIdString !== null) {
        subjectIdString = subjectIdString._id || subjectIdString;
      }
      subjectIdString = String(subjectIdString);
      
      const startIndex = timeSlots.findIndex(slot => slot.timeKey === event.startTime);
      const endIndex = timeSlots.findIndex(slot => slot.timeKey === event.endTime);
      
      if (startIndex === -1 || endIndex === -1) {
        console.warn('Could not find time slots for event:', event);
        return;
      }
      
      const hours = ((endIndex - startIndex) * 30) / 60;
      const sessionType = event.sessionType || 'lecture';
      
      // Track hours separately for lecture and lab using the extracted subject ID
      const key = `${subjectIdString}_${sessionType}`;
      hoursMap[key] = (hoursMap[key] || 0) + hours;
    });
    
    setSubjectHoursUsed(hoursMap);
  }, [schedule]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  // MOVED: timeSlots is now defined inside each useEffect where it's needed
  // This function is for the initial render and other uses outside effects
  const getTimeSlots = () => {
    const timeSlots = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break;
        
        const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const time12 = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        
        timeSlots.push({ timeKey, time12 });
      }
    }
    return timeSlots;
  };

  const getYearSuffix = (year) => {
    switch(year) {
      case '1': return 'st';
      case '2': return 'nd';
      case '3': return 'rd';
      case '4': return 'th';
      default: return '';
    }
  };

  const getSemesterSuffix = (semester) => {
    switch(semester) {
      case '1': return 'st';
      case '2': return 'nd';
      default: return '';
    }
  };

  const calculateDuration = (startTime, endTime) => {
    const timeSlots = getTimeSlots();
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

  const calculateHours = (startTime, endTime) => {
    const timeSlots = getTimeSlots();
    const startIndex = timeSlots.findIndex(slot => slot.timeKey === startTime);
    const endIndex = timeSlots.findIndex(slot => slot.timeKey === endTime);
    return ((endIndex - startIndex) * 30) / 60;
  };

  const checkExternalConflicts = (day, startTime, endTime, excludeCellKey = null) => {
    // This function is not needed anymore - conflict checking is handled in the modal
    // Keeping empty implementation for backward compatibility
    return [];
  };

  const handleCellClick = async (day, timeSlot) => {
    // Build teachers map: subjectId -> assignedTeachers[]
    const teachersMap = {};
    subjects.forEach(subject => {
      if (Array.isArray(subject.assignedTeachers)) {
        teachersMap[subject._id] = subject.assignedTeachers;
      }
    });

    const cellKey = `${day}-${timeSlot.timeKey}`;
    const existingEvent = schedule[cellKey];
    const timeSlots = getTimeSlots();
    const startIndex = timeSlots.findIndex(slot => slot.timeKey === timeSlot.timeKey);

    setModalProps({
      isOpen: true,
      day,
      timeSlot,
      timeSlots,
      scheduleInfo,
      subjects,
      teachers: teachersMap,
      existingEvent,
      schedule,
      subjectHoursUsed,
      calculateDuration,
      calculateHours,
      getYearSuffix,
      existingSchedules,
      checkExternalConflicts,
      onConfirm: (formValues) => {
        const endIndex = timeSlots.findIndex(slot => slot.timeKey === formValues.endTime);
        if (endIndex <= startIndex) {
          ValidationModals.showInvalidTimeError();
          return;
        }
        const subjectOrOffering = subjects.find(s => s._id === formValues.subjectId);
        const subject = subjectOrOffering?.subjectId || subjectOrOffering; // Extract nested subject if offering
        const subjectName = subject?.name || 'Unknown Subject';
        
        const eventHours = calculateHours(timeSlot.timeKey, formValues.endTime);
        const sessionType = formValues.sessionType || 'lecture';
        // Calculate hours for this session type
        const key = `${formValues.subjectId}_${sessionType}`;
        const currentHours = subjectHoursUsed[key] || 0;
        const existingHours = existingEvent && existingEvent.subjectId === formValues.subjectId && existingEvent.sessionType === sessionType
          ? calculateHours(existingEvent.startTime, existingEvent.endTime)
          : 0;
        const totalHours = currentHours + eventHours - existingHours;
        
        // Validate hours based on session type
        const sessions = getRequiredSessions(subjectOrOffering);
        
        let requiredHours;
        if (sessionType === 'lecture') {
          requiredHours = sessions.lecture.hours;
        } else if (sessionType === 'lab' && sessions.lab) {
          requiredHours = sessions.lab.hours * sessions.lab.sessions;
        }
        
        if (totalHours > requiredHours) {
          ValidationModals.showHoursExceededError(
            `${subjectName} (${sessionType.toUpperCase()})`,
            requiredHours,
            totalHours
          );
          return;
        }
        
        const slotsOccupied = endIndex - startIndex;
        const updatedSchedule = { ...schedule };
        
        let hasConflict = false;

        // When editing an existing event, allow overlap only with the same event's previous occupied slots
        let selfOccupiedKeys = new Set();
        if (existingEvent) {
          const oldStartIndex = timeSlots.findIndex(slot => slot.timeKey === existingEvent.startTime);
          const oldEndIndex = timeSlots.findIndex(slot => slot.timeKey === existingEvent.endTime);
          const oldDay = existingEvent.day;
          for (let i = oldStartIndex; i < oldEndIndex; i++) {
            selfOccupiedKeys.add(`${oldDay}-${timeSlots[i].timeKey}`);
          }
        }

        for (let i = startIndex; i < endIndex; i++) {
          const slotKey = `${day}-${timeSlots[i].timeKey}`;
          if (updatedSchedule[slotKey] && !selfOccupiedKeys.has(slotKey)) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          ValidationModals.showTimeConflictError();
          return;
        }

        // External conflict checking is now handled in the modal itself
        
        if (existingEvent) {
          const oldStartIndex = timeSlots.findIndex(slot => slot.timeKey === existingEvent.startTime);
          const oldEndIndex = timeSlots.findIndex(slot => slot.timeKey === existingEvent.endTime);
          const oldDay = existingEvent.day;
          for (let i = oldStartIndex; i < oldEndIndex; i++) {
            const slotKey = `${oldDay}-${timeSlots[i].timeKey}`;
            delete updatedSchedule[slotKey];
          }
        }
        
        // Color coding based on session type
        const color = sessionType === 'lab' 
          ? { bg: '#FEF3C7', border: '#F59E0B' } // Yellow for lab
          : { bg: '#DBEAFE', border: '#2563EB' }; // Blue for lecture
        
        updatedSchedule[cellKey] = {
          courseId: formValues.courseId,
          subjectId: formValues.subjectId,
          subjectName: subjectName, // Add subject name for conflict detection
          subjectCode: subject?.code || '', // Add subject code for conflict detection
          day: day,
          startTime: timeSlot.timeKey,
          endTime: formValues.endTime,
          room: formValues.room,
          sessionType: sessionType,
          color: color,
          slotsOccupied,
          assignedTeacher: formValues.assignedTeacher // Save teacher info in event
        };
        
        setSchedule(updatedSchedule);
        const duration = calculateDuration(timeSlot.timeKey, formValues.endTime);
        ValidationModals.showEventSuccess(!!existingEvent, duration);
        setModalOpen(false);
      },
      onClose: () => setModalOpen(false)
    });
    setModalOpen(true);
  };

  const handleDeleteEvent = async (day, timeSlot) => {
    const cellKey = `${day}-${timeSlot.timeKey}`;
    const event = schedule[cellKey];
    
    if (!event) return;

    const confirmed = await DeleteEventModal.show();

    if (confirmed) {
      const timeSlots = getTimeSlots();
      const updatedSchedule = { ...schedule };
      const startIndex = timeSlots.findIndex(slot => slot.timeKey === timeSlot.timeKey);
      const endIndex = timeSlots.findIndex(slot => slot.timeKey === event.endTime);
      
      for (let i = startIndex; i < endIndex; i++) {
        const slotKey = `${day}-${timeSlots[i].timeKey}`;
        delete updatedSchedule[slotKey];
      }
      
      setSchedule(updatedSchedule);
      DeleteEventModal.showSuccess();
    }
  };

  const handleSaveSchedule = async () => {
    if (Object.keys(schedule).length === 0) {
      SaveScheduleModal.showEmptyWarning();
      return;
    }

    if (!scheduleInfo) {
      SaveScheduleModal.showMissingInfoError();
      return;
    }

    const scheduleName = await SaveScheduleModal.show(scheduleInfo, getYearSuffix, getSemesterSuffix);

    if (scheduleName) {
      setIsSaving(true);
      try {
        // Get unique events with improved deduplication
        const uniqueEvents = [];
        const seen = new Set();

        Object.values(schedule).forEach(event => {
          if (!event || !event.subjectId) return;
          
          // CRITICAL FIX: Extract subjectId as string early
          let subjectIdString = event.subjectId;
          if (typeof subjectIdString === 'object' && subjectIdString !== null) {
            subjectIdString = subjectIdString._id || subjectIdString;
          }
          subjectIdString = String(subjectIdString);
          
          const key = `${event.day}_${event.startTime}_${subjectIdString}_${event.sessionType || 'lecture'}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueEvents.push(event);
          }
        });

        const scheduleData = {
          name: scheduleName,
          academicYear: scheduleInfo.academicYear,
          courseId: scheduleInfo.courseId,
          courseName: scheduleInfo.courseName,
          courseAbbreviation: scheduleInfo.courseAbbreviation,
          yearLevel: scheduleInfo.yearLevel,
          semester: scheduleInfo.semester,
          events: uniqueEvents.map(event => {
            // Validate required fields
            if (!event.day || !event.startTime || !event.endTime || !event.subjectId) {
              console.error('Invalid event detected:', event);
              return null;
            }

            // CRITICAL FIX: Properly extract subjectId as string
            let offeringIdOrSubjectId = event.subjectId;
            if (typeof offeringIdOrSubjectId === 'object' && offeringIdOrSubjectId !== null) {
              if (offeringIdOrSubjectId._id) {
                offeringIdOrSubjectId = offeringIdOrSubjectId._id;
              }
            }
            // Ensure it's a string
            offeringIdOrSubjectId = String(offeringIdOrSubjectId);

            // Find offering by comparing string IDs (subjects array contains offerings)
            // The event.subjectId might be an offering ID (new events) or subject ID (loaded events)
            let offering = subjects.find(s => {
              const sId = String(s._id);
              return sId === offeringIdOrSubjectId;
            });
            
            // If not found as offering, check if it matches a subjectId in offerings
            if (!offering) {
              offering = subjects.find(s => {
                if (s.subjectId) {
                  const subjId = typeof s.subjectId === 'object' ? s.subjectId._id : s.subjectId;
                  return String(subjId) === offeringIdOrSubjectId;
                }
                return false;
              });
            }

            // CRITICAL: Extract actual Subject ID from offering.subjectId
            // offerings have { subjectId: { _id, name, code, ... }, ... }
            let actualSubjectId = null;
            let subjectRecord = null;
            
            if (offering && offering.subjectId) {
              // offering.subjectId could be populated object or just an ID string
              if (typeof offering.subjectId === 'object') {
                actualSubjectId = String(offering.subjectId._id);
                subjectRecord = offering.subjectId;
              } else {
                actualSubjectId = String(offering.subjectId);
                // subjectId is just an ID, use the event's stored name/code
                subjectRecord = {
                  _id: offering.subjectId,
                  name: event.subjectName || offering.subjectId.name || '',
                  code: event.subjectCode || offering.subjectId.code || ''
                };
              }
            } else if (offering) {
              // Fallback: if no subjectId field, might be a subject object itself
              actualSubjectId = String(offering._id);
              subjectRecord = offering;
            } else {
              // Last resort: event already has a subject ID, just use it with stored names
              actualSubjectId = offeringIdOrSubjectId;
              subjectRecord = {
                _id: offeringIdOrSubjectId,
                name: event.subjectName || '',
                code: event.subjectCode || ''
              };
            }
            
            if (!actualSubjectId) {
              console.error('Cannot extract subject ID from offering:', event.subjectName);
              return null; // Skip this event
            }

            // Build event data
            const eventData = {
              day: event.day,
              startTime: event.startTime,
              endTime: event.endTime,
              subjectId: actualSubjectId, // FIXED: Use actual Subject ID, not offering ID
              room: event.room || '',
              sessionType: event.sessionType || 'lecture',
              subjectName: subjectRecord?.name || '',
              subjectCode: subjectRecord?.code || ''
            };

            // Add teacher info if available
            if (event.assignedTeacher) {
              let teacherId = event.assignedTeacher.teacherId;
              let teacherName = event.assignedTeacher.teacherName || event.assignedTeacher.name || '';
              
              // Handle populated teacher object
              if (typeof teacherId === 'object' && teacherId !== null) {
                teacherName = teacherId.name || 
                             `${teacherId.firstName || ''} ${teacherId.lastName || ''}`.trim() || 
                             teacherName;
                teacherId = teacherId._id;
              }
              
              if (teacherId) {
                eventData.assignedTeacher = {
                  teacherId: String(teacherId),
                  teacherName: teacherName
                };
              }
            }

            return eventData;
          }).filter(Boolean) // Remove any null entries
        };

        // Validate before sending
        if (scheduleData.events.length === 0) {
          SaveScheduleModal.showEmptyWarning();
          setIsSaving(false);
          return;
        }

        // Create or update based on mode
        let response;
        if (mode === 'edit' && params.id) {
          response = await axios.put(`https://school-scheduling-system-production.up.railway.app/api/schedules/${params.id}`, scheduleData);
        } else {
          response = await axios.post('https://school-scheduling-system-production.up.railway.app/api/schedules', scheduleData);
        }

        if (response.status === 201 || response.status === 200) {
          await SaveScheduleModal.showSuccess();
          localStorage.removeItem('scheduleInfo');
          navigate('/schedules');
        }
      } catch (error) {
        console.error('Error saving schedule:', error);
        
        // Check if it's a subject hours validation error with violations
        if (error.response?.data?.violations && Array.isArray(error.response.data.violations)) {
          const violations = error.response.data.violations;
          const violationList = violations.map(v => {
            return `<li style="margin-bottom: 0.75rem; padding: 0.75rem; background: #FEE2E2; border-left: 4px solid #EF4444; border-radius: 4px;">
              <div style="font-weight: 600; color: #991B1B; margin-bottom: 0.25rem;">
                ${v.subjectCode} - ${v.subjectName}
              </div>
              <div style="color: #7F1D1D; font-size: 0.9em;">
                ${v.sessionType.toUpperCase()}: Scheduled ${v.scheduledHours}h but requires only ${v.requiredHours}h
              </div>
              <div style="color: #991B1B; font-size: 0.85em; margin-top: 0.25rem;">
                ⚠️ Excess: ${v.excessHours}h
              </div>
            </li>`;
          }).join('');
          
          Swal.fire({
            icon: 'error',
            title: 'Subject Hours Exceeded',
            html: `
              <p style="margin-bottom: 1rem; color: #6B7280;">
                The following subjects have more hours scheduled than required:
              </p>
              <ul style="text-align: left; list-style: none; padding: 0; margin: 0;">
                ${violationList}
              </ul>
              <p style="color: #6B7280; font-size: 0.9em; margin-top: 1rem;">
                Please adjust the duration of these events or remove some sessions.
              </p>
            `,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'OK',
            width: '600px'
          });
          return;
        }
        
        // Generic error handling
        const errorMsg = error.response?.data?.message || error.message;
        ValidationModals.showSaveError(errorMsg);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  const formatEndTime = (endTime) => {
    const timeSlots = getTimeSlots();
    const slot = timeSlots.find(s => s.timeKey === endTime);
    return slot ? slot.time12 : '';
  };

  const isSlotOccupied = (day, timeIndex) => {
    const timeSlots = getTimeSlots();
    const cellKey = `${day}-${timeSlots[timeIndex].timeKey}`;
    const event = schedule[cellKey];
    if (event) return cellKey;

    for (let i = 0; i < timeIndex; i++) {
      const prevKey = `${day}-${timeSlots[i].timeKey}`;
      const prevEvent = schedule[prevKey];
      if (prevEvent) {
        const prevIndex = timeSlots.findIndex(slot => slot.timeKey === timeSlots[i].timeKey);
        if (timeIndex < prevIndex + prevEvent.slotsOccupied) {
          return prevKey;
        }
      }
    }
    return null;
  };

  // Group hours by subject and calculate totals
  const getSubjectSummary = () => {
    const summary = {};
    
    Object.entries(subjectHoursUsed).forEach(([key, hours]) => {
      const [subjectId, sessionType] = key.split('_');
      
      if (!summary[subjectId]) {
        // Try to find subject in the subjects array (which could be offerings or subjects)
        let subject = subjects.find(s => {
          // Direct match
          if (String(s._id) === String(subjectId)) return true;
          
          // If s is an offering, check if its subjectId matches
          if (s.subjectId) {
            const nestedSubjectId = typeof s.subjectId === 'object' ? s.subjectId._id : s.subjectId;
            if (String(nestedSubjectId) === String(subjectId)) return true;
          }
          
          return false;
        });
        
        // If not found in subjects array, try to get info from schedule events
        if (!subject) {
          // Look for an event with this subjectId to get name/code
          const eventWithSubject = Object.values(schedule).find(event => {
            let eventSubjectId = event.subjectId;
            if (typeof eventSubjectId === 'object' && eventSubjectId !== null) {
              eventSubjectId = eventSubjectId._id || eventSubjectId;
            }
            return String(eventSubjectId) === String(subjectId);
          });
          
          if (eventWithSubject) {
            subject = {
              _id: subjectId,
              name: eventWithSubject.subjectName || 'Unknown Subject',
              code: eventWithSubject.subjectCode || 'UNKNOWN',
              lectureUnits: 3, // Default values
              labUnits: 0,
              hasLab: eventWithSubject.sessionType === 'lab' || 
                      Object.values(schedule).some(e => 
                        String(e.subjectId) === String(subjectId) && e.sessionType === 'lab'
                      )
            };
          }
        }
        
        summary[subjectId] = {
          subject,
          lecture: 0,
          lab: 0
        };
      }
      
      if (sessionType === 'lecture') {
        summary[subjectId].lecture = hours;
      } else if (sessionType === 'lab') {
        summary[subjectId].lab = hours;
      }
    });
    
    return summary;
  };

  // Use getTimeSlots for rendering
  const timeSlots = getTimeSlots();

  return (
    <div className="timetable-container">
      <div className="timetable-wrapper">
        {modalOpen && (
          <ScheduleEventModal
            {...modalProps}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={goBack} className="action-btn secondary">Go Back</button>
          {mode === 'view' ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="action-btn primary"
                onClick={() => navigate(`/timetable/edit/${params.id}`)}
              >
                Edit
              </button>
              <button
                className="action-btn secondary"
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSaveSchedule} 
              className="action-btn primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </button>
          )}
        </div>
        
        {scheduleInfo && (
          <div style={{ 
            backgroundColor: '#F3F4F6', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: '#1F2937' }}>
              {scheduleInfo.courseName} Schedule {scheduleInfo.academicYear && `(${scheduleInfo.academicYear})`}
            </h2>
            <p style={{ margin: '0', color: '#6B7280' }}>
              {scheduleInfo.yearLevel}{getYearSuffix(scheduleInfo.yearLevel)} Year • 
              {scheduleInfo.semester}{getSemesterSuffix(scheduleInfo.semester)} Semester
            </p>
            {existingSchedules.length > 0 && (
              <p className="conflict-warning" style={{ margin: '0.5rem 0 0 0', color: '#DC2626', fontSize: '14px' }}>
                ⚠️ {existingSchedules.length} existing schedule(s) detected - conflicts will be checked
              </p>
            )}
          </div>
        )}

        {Object.keys(subjectHoursUsed).length > 0 && (
          <div className="subject-hours-summary" style={{
            backgroundColor: '#FEF3C7',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', color: '#92400E' }}>
              Subject Hours Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(getSubjectSummary()).map(([subjectId, data]) => {
                const { subject, lecture, lab } = data;
                if (!subject) return null;
                // If subject is actually an offering, extract the underlying subject record
                const subjectRecord = subject.subjectId || subject;

                const sessions = getRequiredSessions(subjectRecord);
                const requiredLecture = sessions.lecture.hours;
                const requiredLab = sessions.lab ? sessions.lab.hours * sessions.lab.sessions : 0;
                const total = lecture + lab;
                // Calculate requiredTotal from sessions: lecture hours + lab hours
                const requiredTotal = requiredLecture + requiredLab;
                
                let color = '#059669';
                if (total > requiredTotal) color = '#DC2626';
                else if (total < requiredTotal) color = '#F59E0B';
                
                return (
                  <div key={subjectId} style={{
                    padding: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${color}`
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1F2937', marginBottom: '8px' }}>
                      {subjectRecord.code} - {subjectRecord.name}
                    </div>
                    
                    {/* Lecture Hours */}
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                      <span style={{ color: '#2563EB', fontWeight: '500' }}>📚 Lecture:</span> {lecture.toFixed(1)}h / {requiredLecture}h
                      {lecture >= requiredLecture && ' ✓'}
                      {lecture > requiredLecture && ' ⚠️'}
                    </div>
                    
                    {/* Lab Hours (if applicable) */}
                    {(subjectRecord.hasLab || lab > 0) && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                        <span style={{ color: '#F59E0B', fontWeight: '500' }}>🧪 Lab:</span> {lab.toFixed(1)}h / {requiredLab}h
                        {lab >= requiredLab && ' ✓'}
                        {lab > requiredLab && ' ⚠️'}
                      </div>
                    )}
                    
                    {/* Total */}
                    <div style={{ fontSize: '12px', color: '#1F2937', fontWeight: 'bold', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #E5E7EB' }}>
                      Total: {total.toFixed(1)}h / {requiredTotal}h
                      {total >= requiredTotal && total <= requiredTotal && ' ✓'}
                      {total > requiredTotal && ' ⚠️ EXCEEDS'}
                      {total < requiredTotal && ` (${(requiredTotal - total).toFixed(1)}h remaining)`}
                    </div>
                    
                    {/* Progress bar */}
                    <div style={{
                      marginTop: '6px',
                      height: '4px',
                      backgroundColor: '#E5E7EB',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((total / requiredTotal) * 100, 100)}%`,
                        backgroundColor: color,
                        transition: 'width 0.3s'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h1 className="timetable-title">Weekly Timetable</h1>

        <div className="table-container">
          <div className="table-wrapper">
            <table className="timetable-table">
              <thead>
                <tr className="header-row">
                  <th className="header-cell time-cell">Time</th>
                  {days.map(day => (
                    <th key={day} className="header-cell day-cell-header">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot, timeIndex) => (
                  <tr key={timeSlot.timeKey} className="body-row">
                    <td className="time-slot-cell">{timeSlot.time12}</td>
                    {days.map(day => {
                      const cellKey = `${day}-${timeSlot.timeKey}`;
                      const event = schedule[cellKey];
                      const occupiedBy = isSlotOccupied(day, timeIndex);

                      if (occupiedBy && occupiedBy !== cellKey) return null;

                      const rowSpan = event?.slotsOccupied || 1;
                      const courseName = scheduleInfo?.courseAbbreviation;
                      
                      // Use preserved subject info first, then fall back to lookup
                      let subjectName = event?.subjectName;
                      let subjectCode = event?.subjectCode;
                      
                      // If not preserved, try to look them up
                      if (!subjectName || !subjectCode) {
                        let subjectData = undefined;
                        if (event?.subjectId) {
                          // event.subjectId may be an object (populated) or string (id)
                          if (typeof event.subjectId === 'object' && event.subjectId !== null) {
                            subjectData = subjects.find(s => s._id === event.subjectId._id);
                          } else {
                            subjectData = subjects.find(s => s._id === event.subjectId);
                          }
                        }
                        // If subjectData is an offering, extract the nested subject record
                        const subjectRecord = subjectData?.subjectId || subjectData;
                        subjectName = subjectName || subjectRecord?.name;
                        subjectCode = subjectCode || subjectRecord?.code;
                      }
                      
                      const duration = event ? calculateDuration(timeSlot.timeKey, event.endTime) : '';
                      const sessionType = event?.sessionType || 'lecture';
                      const sessionIcon = sessionType === 'lab' ? '🧪' : '📚';
                      const teacherName = event?.assignedTeacher?.teacherName || event?.assignedTeacher?.name || null;

                      return (
                        <td
                          key={cellKey}
                          rowSpan={rowSpan}
                          className="schedule-cell"
                          onClick={mode === 'view' ? undefined : () => handleCellClick(day, timeSlot)}
                          onContextMenu={mode === 'view' ? undefined : (e) => {
                            e.preventDefault();
                            if (event) handleDeleteEvent(day, timeSlot);
                          }}
                          style={{ height: `${24 * rowSpan}px`, cursor: mode === 'view' ? 'default' : 'pointer' }}
                        >
                          {event ? (
                            <div
                              className="event-box"
                              style={{
                                backgroundColor: (event.color?.bg) || (event.sessionType === 'lab' ? '#FEF3C7' : '#DBEAFE'),
                                borderColor: (event.color?.border) || (event.sessionType === 'lab' ? '#F59E0B' : '#2563EB'),
                                position: 'relative'
                              }}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                {sessionIcon} {courseName} - {subjectCode}
                              </div>
                              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                {subjectName}
                              </div>
                              <div style={{ fontSize: '10px', color: '#059669', marginTop: '2px', fontWeight: '600' }}>
                                👨‍🏫 {teacherName || 'No teacher assigned'}
                              </div>
                              <div style={{ 
                                fontSize: '10px', 
                                color: sessionType === 'lab' ? '#92400E' : '#1E40AF',
                                fontWeight: '600',
                                marginTop: '2px',
                                textTransform: 'uppercase'
                              }}>
                                {sessionType}
                              </div>
                              <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                                {timeSlot.time12} - {formatEndTime(event.endTime)}
                              </div>
                              <div style={{ fontSize: '9px', color: '#6B7280' }}>
                                {duration} {event.room && `• ${event.room}`}
                              </div>
                            </div>
                          ) : (
                            <div className="empty-cell">{mode === 'view' ? '' : 'Click to add'}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="instructions">
          <h3 className="instructions-title">How to use:</h3>
          <ul className="instructions-list">
            <li>Click on any time slot to add/edit an event</li>
            <li>Right-click on an event to delete it</li>
            <li><strong>📚 Lecture (Blue)</strong>: Regular lecture sessions</li>
            <li><strong>🧪 Lab (Yellow)</strong>: Laboratory sessions</li>
            <li>Subjects are filtered based on selected course, year, and semester</li>
            <li>Hours are tracked separately for lecture and lab sessions</li>
            <li>Lecture-only subjects: 3 hours/week total</li>
            <li>Subjects with lab: 2 hours lecture + 3 hours lab</li>
            <li>Conflicts with existing schedules are detected and prevented</li>
            <li>Select the end time - duration will be calculated automatically</li>
            <li>Optionally add a room/location for the event</li>
            <li>Click "Save Schedule" when finished to save your timetable</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WeeklyTimetable;