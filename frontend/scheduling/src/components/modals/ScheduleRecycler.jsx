import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Calendar, Users, Trash2, Info, UserCheck, Search } from 'lucide-react';
import TeacherCard from '../TeacherCard';
import './ScheduleRecycler.css';

const ScheduleRecycler = ({ show, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: Target Info, 1: Select Source, 2: Update Teachers
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [teacherMappings, setTeacherMappings] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [teacherWorkloads, setTeacherWorkloads] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [autoAssignMode, setAutoAssignMode] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [targetAcademicYear, setTargetAcademicYear] = useState('');
  const [targetSemester, setTargetSemester] = useState('1');
  const [academicYearError, setAcademicYearError] = useState('');
  const [scheduleFilters, setScheduleFilters] = useState({
    academicYear: '',
    semester: '',
    searchTerm: '',
    courseCode: ''
  });

  useEffect(() => {
    if (show && step === 1) {
      fetchAvailableSchedules();
      fetchTeachers();
    }
  }, [show, step]);

  const fetchAvailableSchedules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/schedules/recyclable`);
      setAvailableSchedules(response.data);
    } catch (error) {
      console.error('Error fetching recyclable schedules:', error);
      Swal.fire('Error', 'Failed to fetch available schedules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users?role=teacher`);
      setTeachers(response.data);
      
      // Fetch teacher workloads for target semester
      if (targetAcademicYear && targetSemester) {
        await fetchTeacherWorkloads();
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchTeacherWorkloads = async () => {
    if (!teachers.length) return;
    
    try {
      const workloadPromises = teachers.map(async (teacher) => {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/workload/teacher/${teacher._id}?academicYear=${targetAcademicYear}&semester=${targetSemester}`
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
    if (teachers.length > 0 && targetAcademicYear && targetSemester) {
      fetchTeacherWorkloads();
    }
  }, [teachers, targetAcademicYear, targetSemester]);

  const selectSchedule = async (schedule) => {
    try {
      setLoading(true);
      setSelectedSchedule(schedule);
      
      // Fetch detailed schedule data including subjects and current teacher assignments
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/schedules/${schedule._id}/detailed`);
      setScheduleData(response.data);
      
      // Initialize teacher mappings with current assignments
      const mappings = {};
      response.data.subjects?.forEach(subject => {
        subject.assignedTeachers?.forEach((teacher, index) => {
          const key = `${subject._id}_${index}`;
          mappings[key] = {
            originalTeacher: teacher,
            newTeacher: null, // Will be selected by user
            subject: subject,
            assignmentIndex: index
          };
        });
      });
      setTeacherMappings(mappings);
      
      setStep(2);
    } catch (error) {
      console.error('Error fetching schedule details:', error);
      Swal.fire('Error', 'Failed to load schedule details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateTeacherMapping = (mappingKey, newTeacher) => {
    setTeacherMappings(prev => ({
      ...prev,
      [mappingKey]: {
        ...prev[mappingKey],
        newTeacher: newTeacher
      }
    }));
  };

  const getFilteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      switch (filterBy) {
        case 'available':
          const workload = teacherWorkloads[teacher._id];
          if (!workload) return true;
          const limit = teacher.employmentType === 'Part-time' ? 18 : 24;
          return workload.totalUnits < limit || teacher.isOverloaded;
        case 'full-time':
          return teacher.employmentType === 'Full-time';
        case 'part-time':
          return teacher.employmentType === 'Part-time';
        default:
          return true;
      }
    }).sort((a, b) => {
      // Sort by availability (available first)
      const aWorkload = teacherWorkloads[a._id];
      const bWorkload = teacherWorkloads[b._id];
      const aLimit = a.employmentType === 'Part-time' ? 18 : 24;
      const bLimit = b.employmentType === 'Part-time' ? 18 : 24;
      const aUnits = aWorkload?.totalUnits || 0;
      const bUnits = bWorkload?.totalUnits || 0;
      
      return (aUnits / aLimit) - (bUnits / bLimit);
    });
  }, [teachers, searchTerm, filterBy, teacherWorkloads]);

  const validateMappings = () => {
    const missingMappings = Object.values(teacherMappings).filter(mapping => !mapping.newTeacher);
    return missingMappings.length === 0;
  };

  const getMappingProgress = () => {
    const total = Object.keys(teacherMappings).length;
    const completed = Object.values(teacherMappings).filter(m => m.newTeacher).length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const keepOriginalTeachers = () => {
    const newMappings = { ...teacherMappings };
    let keptCount = 0;
    let unavailableCount = 0;
    
    Object.entries(newMappings).forEach(([key, mapping]) => {
      if (!mapping.newTeacher) {
        const sameTeacher = teachers.find(t => 
          t._id === mapping.originalTeacher.teacherId
        );
        
        if (sameTeacher) {
          newMappings[key].newTeacher = sameTeacher;
          keptCount++;
        } else {
          unavailableCount++;
        }
      }
    });
    
    setTeacherMappings(newMappings);
    
    if (unavailableCount > 0) {
      Swal.fire({
        title: 'Teachers Assigned',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p style="margin-bottom: 10px;">✓ Kept ${keptCount} original teacher(s)</p>
            <p style="color: #f57c00; font-size: 14px;">
              ⚠ ${unavailableCount} original teacher(s) not found - please assign manually
            </p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'OK'
      });
    } else {
      Swal.fire({
        title: 'Success!',
        text: `Kept all ${keptCount} original teacher(s)`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const clearAllMappings = () => {
    const clearedMappings = {};
    Object.entries(teacherMappings).forEach(([key, mapping]) => {
      clearedMappings[key] = { ...mapping, newTeacher: null };
    });
    setTeacherMappings(clearedMappings);
  };

  const getFilteredSchedules = useMemo(() => {
    return availableSchedules.filter(schedule => {
      // Search term filter
      if (scheduleFilters.searchTerm) {
        const searchLower = scheduleFilters.searchTerm.toLowerCase();
        const matchesName = schedule.name?.toLowerCase().includes(searchLower);
        const matchesCourse = schedule.courseCode?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesCourse) return false;
      }

      // Academic year filter
      if (scheduleFilters.academicYear && schedule.academicYear !== scheduleFilters.academicYear) {
        return false;
      }

      // Semester filter
      if (scheduleFilters.semester && schedule.semester !== scheduleFilters.semester) {
        return false;
      }

      // Course filter
      if (scheduleFilters.courseCode && schedule.courseCode !== scheduleFilters.courseCode) {
        return false;
      }

      return true;
    });
  }, [availableSchedules, scheduleFilters]);

  const getUniqueAcademicYears = useMemo(() => {
    const years = availableSchedules.map(s => s.academicYear).filter(Boolean);
    return [...new Set(years)].sort().reverse();
  }, [availableSchedules]);

  const getUniqueCourses = useMemo(() => {
    const courses = availableSchedules
      .map(s => ({ code: s.courseCode, name: s.courseName }))
      .filter(c => c.code);
    
    // Remove duplicates based on course code
    const uniqueMap = new Map();
    courses.forEach(course => {
      if (!uniqueMap.has(course.code)) {
        uniqueMap.set(course.code, course);
      }
    });
    
    return Array.from(uniqueMap.values()).sort((a, b) => 
      a.code.localeCompare(b.code)
    );
  }, [availableSchedules]);

  const clearScheduleFilters = () => {
    setScheduleFilters({ 
      academicYear: '', 
      semester: targetSemester, // Keep the target semester locked
      searchTerm: '', 
      courseCode: '' 
    });
  };

  const executeRecycling = async () => {
    if (!validateMappings()) {
      Swal.fire('Incomplete', 'Please assign teachers to all subjects before proceeding.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Schedule Recycling',
      html: `
        <div style="text-align: left; margin: 1rem 0;">
          <p><strong>Source Schedule:</strong> ${selectedSchedule.name}</p>
          <p><strong>Source Academic Year:</strong> ${selectedSchedule.academicYear}</p>
          <p><strong>Target Academic Year:</strong> ${targetAcademicYear}</p>
          <p><strong>Semester:</strong> ${targetSemester}</p>
          <p><strong>Subjects to Copy:</strong> ${Object.keys(teacherMappings).length}</p>
        </div>
        <p style="color: #059669; font-weight: 600;">This will create a new schedule with updated teacher assignments.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Recycle Schedule',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      
      // Prepare recycling data
      const recyclingData = {
        sourceScheduleId: selectedSchedule._id,
        targetAcademicYear,
        targetSemester,
        teacherMappings: Object.entries(teacherMappings).map(([key, mapping]) => ({
          subjectId: mapping.subject._id,
          assignmentIndex: mapping.assignmentIndex,
          originalTeacherId: mapping.originalTeacher.teacherId,
          newTeacherId: mapping.newTeacher._id,
          newTeacherName: `${mapping.newTeacher.firstName} ${mapping.newTeacher.lastName}`,
          assignmentType: mapping.originalTeacher.type
        }))
      };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/schedules/recycle`, recyclingData);
      
      Swal.fire({
        title: 'Schedule Recycled Successfully!',
        html: `
          <div style="text-align: left; margin: 1rem 0;">
            <p><strong>New Schedule ID:</strong> ${response.data.newScheduleId}</p>
            <p><strong>Subjects Copied:</strong> ${response.data.subjectsCopied}</p>
            <p><strong>Teachers Updated:</strong> ${response.data.teachersUpdated}</p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Continue'
      });

      onSuccess(response.data);
      handleClose();
    } catch (error) {
      console.error('Error recycling schedule:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to recycle schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setSelectedSchedule(null);
    setScheduleData(null);
    setTeacherMappings({});
    setSearchTerm('');
    setFilterBy('all');
    setSelectedMapping(null);
    setAutoAssignMode(false);
    setTargetAcademicYear('');
    setTargetSemester('1');
    setAcademicYearError('');
    setScheduleFilters({ academicYear: '', semester: '', searchTerm: '', courseCode: '' });
    onClose();
  };

  const validateAndProceed = () => {
    if (!targetAcademicYear.trim()) {
      setAcademicYearError('Please enter an academic year');
      return;
    }
    
    // Validate format (e.g., 2024-2025)
    const yearPattern = /^\d{4}-\d{4}$/;
    if (!yearPattern.test(targetAcademicYear)) {
      setAcademicYearError('Please use format: YYYY-YYYY (e.g., 2024-2025)');
      return;
    }
    
    setAcademicYearError('');
    
    // Pre-filter schedules by semester when moving to next step
    setScheduleFilters(prev => ({
      ...prev,
      semester: targetSemester
    }));
    
    setStep(1);
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="recycler-modal">
        <div className="recycler-header">
          <h2>Recycle Schedule</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="recycler-progress">
          <div className={`progress-step ${step >= 0 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Target Info</span>
          </div>
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Select Source</span>
          </div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Update Teachers</span>
          </div>
        </div>

        <div className="recycler-content">
          {step === 0 && (
            <div className="target-info-step">
              <div className="step-icon">
                <Calendar size={48} strokeWidth={1.5} />
              </div>
              <h3>Set Target Academic Period</h3>
              <p className="step-description">
                Choose the academic year and semester for your new schedule. 
                We'll help you copy an existing schedule and update the teacher assignments.
              </p>
              
              <div className="target-form">
                <div className="form-group">
                  <label htmlFor="academicYear">Academic Year</label>
                  <input
                    id="academicYear"
                    type="text"
                    className={`form-input ${academicYearError ? 'error' : ''}`}
                    placeholder="e.g., 2024-2025"
                    value={targetAcademicYear}
                    onChange={(e) => {
                      setTargetAcademicYear(e.target.value);
                      setAcademicYearError('');
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        validateAndProceed();
                      }
                    }}
                  />
                  {academicYearError && (
                    <span className="error-message">{academicYearError}</span>
                  )}
                  <span className="form-hint">Format: YYYY-YYYY (e.g., 2024-2025)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="semester">Semester</label>
                  <div className="semester-selector">
                    <button
                      type="button"
                      className={`semester-option ${targetSemester === '1' ? 'selected' : ''}`}
                      onClick={() => setTargetSemester('1')}
                    >
                      <div className="semester-number">1</div>
                      <div className="semester-label">First Semester</div>
                    </button>
                    <button
                      type="button"
                      className={`semester-option ${targetSemester === '2' ? 'selected' : ''}`}
                      onClick={() => setTargetSemester('2')}
                    >
                      <div className="semester-number">2</div>
                      <div className="semester-label">Second Semester</div>
                    </button>
                    <button
                      type="button"
                      className={`semester-option ${targetSemester === 'Summer' ? 'selected' : ''}`}
                      onClick={() => setTargetSemester('Summer')}
                    >
                      <div className="semester-number">☀</div>
                      <div className="semester-label">Summer</div>
                    </button>
                  </div>
                </div>

                <div className="info-box">
                  <div className="info-icon">
                    <Info size={24} />
                  </div>
                  <div className="info-content">
                    <strong>What happens next?</strong>
                    <p>After setting the target period, you'll select a previous schedule to copy from, then review and update teacher assignments for the new academic year.</p>
                  </div>
                </div>
              </div>

              <div className="step-actions">
                <button 
                  type="button" 
                  onClick={handleClose}
                  className="secondary-btn"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={validateAndProceed}
                  className="primary-btn"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="source-selection">
              <div className="step-icon">
                <Users size={48} strokeWidth={1.5} />
              </div>
              <h3>Select Schedule to Recycle</h3>
              <p>
                Choose a schedule from <strong>{targetSemester === 'Summer' ? 'Summer' : `Semester ${targetSemester}`}</strong> to copy to <strong>{targetAcademicYear} - {targetSemester === 'Summer' ? 'Summer' : `Semester ${targetSemester}`}</strong>.
                <br />
                <span style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                  Showing schedules from the same {targetSemester === 'Summer' ? 'term' : 'semester'} to maintain consistency.
                </span>
              </p>
              
              {/* Schedule Filters */}
              <div className="schedule-filters">
                <div className="filter-row">
                  <div className="filter-group">
                    <label>Search</label>
                    <div className="search-input-wrapper">
                      <Search size={18} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search by name or course..."
                        value={scheduleFilters.searchTerm}
                        onChange={(e) => setScheduleFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        className="filter-input"
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <label>Course</label>
                    <select
                      value={scheduleFilters.courseCode}
                      onChange={(e) => setScheduleFilters(prev => ({ ...prev, courseCode: e.target.value }))}
                      className="filter-select"
                    >
                      <option value="">All Courses</option>
                      {getUniqueCourses.map(course => (
                        <option key={course.code} value={course.code}>
                          {course.code} - {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Academic Year</label>
                    <select
                      value={scheduleFilters.academicYear}
                      onChange={(e) => setScheduleFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                      className="filter-select"
                    >
                      <option value="">All Years</option>
                      {getUniqueAcademicYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Semester</label>
                    <select
                      value={scheduleFilters.semester}
                      onChange={(e) => setScheduleFilters(prev => ({ ...prev, semester: e.target.value }))}
                      className="filter-select"
                      disabled
                      title={`Filtered to ${targetSemester === 'Summer' ? 'Summer' : `Semester ${targetSemester}`} based on your target selection`}
                    >
                      <option value="">All Semesters</option>
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                    <span className="filter-locked-hint">
                      Locked to {targetSemester === 'Summer' ? 'Summer' : `Semester ${targetSemester}`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={clearScheduleFilters}
                    className="clear-filters-btn"
                    title="Clear all filters"
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="filter-results">
                  Showing {getFilteredSchedules.length} of {availableSchedules.length} schedules
                </div>
              </div>
              
              {loading ? (
                <div className="loading">Loading available schedules...</div>
              ) : getFilteredSchedules.length === 0 ? (
                <div className="empty-state-schedules">
                  <p>No schedules found matching your filters.</p>
                  {(scheduleFilters.academicYear || scheduleFilters.semester || scheduleFilters.searchTerm || scheduleFilters.courseCode) && (
                    <button 
                      type="button"
                      onClick={clearScheduleFilters}
                      className="secondary-btn"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="schedule-grid">
                  {getFilteredSchedules.map(schedule => (
                    <div 
                      key={schedule._id} 
                      className="schedule-card"
                      onClick={() => selectSchedule(schedule)}
                    >
                      <div className="schedule-info">
                        <h4>{schedule.name}</h4>
                        <p className="schedule-details">
                          <strong>Academic Year:</strong> {schedule.academicYear}<br/>
                          <strong>Semester:</strong> {schedule.semester}<br/>
                          <strong>Subjects:</strong> {schedule.subjectCount || 0}
                        </p>
                        <div className="schedule-meta">
                          <span className="course-badge">{schedule.courseCode}</span>
                          <span className="year-badge">Year {schedule.yearLevel}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="step-actions">
                <button 
                  type="button" 
                  onClick={() => setStep(0)}
                  className="secondary-btn"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {step === 2 && scheduleData && (
            <div className="teacher-mapping">
              <div className="mapping-header">
                <div>
                  <h3>Update Teacher Assignments</h3>
                  <p>Review and update teacher assignments for {targetAcademicYear} - {targetSemester}</p>
                </div>
                <div className="progress-indicator">
                  <div className="progress-circle">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                      <path
                        className="circle-bg"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="circle"
                        strokeDasharray={`${getMappingProgress().percentage}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="progress-text">
                      {getMappingProgress().completed}/{getMappingProgress().total}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mapping-toolbar">
                <div className="mapping-controls">
                  <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search teachers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="teacher-search"
                    />
                  </div>
                  <select 
                    value={filterBy} 
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="teacher-filter"
                  >
                    <option value="all">All Teachers</option>
                    <option value="available">Available</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                  </select>
                </div>
                <div className="bulk-actions">
                  <button 
                    type="button"
                    onClick={keepOriginalTeachers}
                    className="action-btn keep-original"
                    title="Keep the same teachers from the original schedule"
                  >
                    <UserCheck size={18} />
                    <span>Keep Original Teachers</span>
                  </button>
                  <button 
                    type="button"
                    onClick={clearAllMappings}
                    className="action-btn clear-all"
                    title="Clear all teacher assignments"
                  >
                    <Trash2 size={18} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <div className="mappings-container">
                <div className="mappings-list">
                  {Object.entries(teacherMappings).map(([key, mapping]) => (
                    <div 
                      key={key} 
                      className={`mapping-item ${selectedMapping === key ? 'selected' : ''} ${mapping.newTeacher ? 'completed' : ''}`}
                      onClick={() => setSelectedMapping(selectedMapping === key ? null : key)}
                    >
                      <div className="mapping-item-header">
                        <div className="subject-info">
                          <h4>{mapping.subject.subjectId?.code} - {mapping.subject.subjectId?.name}</h4>
                          <div className="subject-meta">
                            <span className="assignment-type">{mapping.originalTeacher.type}</span>
                            <span className="units">{mapping.subject.subjectId?.units || 0} units</span>
                          </div>
                        </div>
                        <div className="mapping-status">
                          {mapping.newTeacher ? (
                            <span className="status-badge completed">✓ Assigned</span>
                          ) : (
                            <span className="status-badge pending">⚠ Pending</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="teacher-assignment">
                        <div className="teacher-column">
                          <label>Original Teacher</label>
                          <div className="teacher-display original">
                            <span className="teacher-name">
                              {mapping.originalTeacher.teacherName || 'Unknown Teacher'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="arrow-icon">→</div>
                        
                        <div className="teacher-column">
                          <label>New Teacher</label>
                          {mapping.newTeacher ? (
                            <div className="teacher-display selected">
                              <span className="teacher-name">
                                {mapping.newTeacher.firstName} {mapping.newTeacher.lastName}
                              </span>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTeacherMapping(key, null);
                                }}
                                className="change-btn"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <div className="teacher-display empty">
                              <span>Click to assign teacher</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedMapping === key && !mapping.newTeacher && (
                        <div className="teacher-selector-panel">
                          <div className="selector-header">
                            <h5>Select Teacher</h5>
                            <span className="available-count">
                              {getFilteredTeachers.length} available
                            </span>
                          </div>
                          <div className="teacher-grid">
                            {getFilteredTeachers.slice(0, 6).map(teacher => (
                              <TeacherCard
                                key={teacher._id}
                                teacher={teacher}
                                workload={teacherWorkloads[teacher._id]}
                                onSelect={() => {
                                  updateTeacherMapping(key, teacher);
                                  setSelectedMapping(null);
                                }}
                                isSelected={false}
                              />
                            ))}
                          </div>
                          {getFilteredTeachers.length > 6 && (
                            <div className="show-more">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Could implement a full teacher selection modal here
                                }}
                                className="show-more-btn"
                              >
                                Show all {getFilteredTeachers.length} teachers
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="step-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setStep(1);
                    setSelectedSchedule(null);
                    setScheduleData(null);
                    setTeacherMappings({});
                    setSelectedMapping(null);
                  }}
                  className="secondary-btn"
                >
                  ← Back to Schedule Selection
                </button>
                <button 
                  type="button" 
                  onClick={executeRecycling}
                  className="primary-btn"
                  disabled={!validateMappings()}
                >
                  Recycle Schedule →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="confirmation">
              <h3>Confirm Schedule Recycling</h3>
              <div className="summary">
                <div className="summary-item">
                  <strong>Source Schedule:</strong> {selectedSchedule?.name}
                </div>
                <div className="summary-item">
                  <strong>Academic Year:</strong> {selectedSchedule?.academicYear} → {targetAcademicYear}
                </div>
                <div className="summary-item">
                  <strong>Semester:</strong> {targetSemester}
                </div>
                <div className="summary-item">
                  <strong>Teacher Assignments:</strong> {Object.keys(teacherMappings).length} updated
                </div>
              </div>

              <div className="step-actions">
                <button 
                  type="button" 
                  onClick={() => setStep(2)}
                  className="secondary-btn"
                >
                  Back
                </button>
                <button 
                  type="button" 
                  onClick={executeRecycling}
                  className="primary-btn"
                  disabled={loading}
                >
                  {loading ? 'Recycling...' : 'Recycle Schedule'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleRecycler;