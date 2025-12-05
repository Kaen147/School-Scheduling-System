import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import TeacherCard from '../TeacherCard';
import './ScheduleRecycler.css';

const ScheduleRecycler = ({ show, onClose, onSuccess, targetAcademicYear, targetSemester }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Source, 2: Review & Update Teachers, 3: Confirm
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [teacherMappings, setTeacherMappings] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [teacherWorkloads, setTeacherWorkloads] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    if (show) {
      fetchAvailableSchedules();
      fetchTeachers();
    }
  }, [show]);

  const fetchAvailableSchedules = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/schedules/recyclable');
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
      const response = await axios.get('http://localhost:5000/api/users?role=teacher');
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
    try {
      const workloadPromises = teachers.map(async (teacher) => {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/workload/teacher/${teacher._id}?academicYear=${targetAcademicYear}&semester=${targetSemester}`
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

  const selectSchedule = async (schedule) => {
    try {
      setLoading(true);
      setSelectedSchedule(schedule);
      
      // Fetch detailed schedule data including subjects and current teacher assignments
      const response = await axios.get(`http://localhost:5000/api/schedules/${schedule._id}/detailed`);
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

  const getFilteredTeachers = () => {
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
    });
  };

  const validateMappings = () => {
    const missingMappings = Object.values(teacherMappings).filter(mapping => !mapping.newTeacher);
    return missingMappings.length === 0;
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

      const response = await axios.post('http://localhost:5000/api/schedules/recycle', recyclingData);
      
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
    setStep(1);
    setSelectedSchedule(null);
    setScheduleData(null);
    setTeacherMappings({});
    setSearchTerm('');
    setFilterBy('all');
    onClose();
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
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Select Source</span>
          </div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Update Teachers</span>
          </div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Confirm</span>
          </div>
        </div>

        <div className="recycler-content">
          {step === 1 && (
            <div className="source-selection">
              <h3>Select Schedule to Recycle</h3>
              <p>Choose a previous schedule to use as a template. All subjects and room assignments will be copied, and you can update teacher assignments in the next step.</p>
              
              {loading ? (
                <div className="loading">Loading available schedules...</div>
              ) : (
                <div className="schedule-grid">
                  {availableSchedules.map(schedule => (
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
            </div>
          )}

          {step === 2 && scheduleData && (
            <div className="teacher-mapping">
              <h3>Update Teacher Assignments</h3>
              <p>Review and update teacher assignments for the new academic year. Original teachers are shown for reference.</p>
              
              <div className="mapping-controls">
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="teacher-search"
                />
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

              <div className="mappings-list">
                {Object.entries(teacherMappings).map(([key, mapping]) => (
                  <div key={key} className="mapping-item">
                    <div className="subject-info">
                      <h4>{mapping.subject.subjectId?.code} - {mapping.subject.subjectId?.name}</h4>
                      <p>Assignment Type: <strong>{mapping.originalTeacher.type}</strong></p>
                    </div>
                    
                    <div className="teacher-assignment">
                      <div className="original-teacher">
                        <label>Original Teacher:</label>
                        <div className="teacher-display">
                          {mapping.originalTeacher.teacherName || 'Unknown Teacher'}
                        </div>
                      </div>
                      
                      <div className="arrow">→</div>
                      
                      <div className="new-teacher">
                        <label>New Teacher:</label>
                        <div className="teacher-selector">
                          {mapping.newTeacher ? (
                            <div className="selected-teacher">
                              <span>{mapping.newTeacher.firstName} {mapping.newTeacher.lastName}</span>
                              <button 
                                type="button"
                                onClick={() => updateTeacherMapping(key, null)}
                                className="change-btn"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <div className="teacher-options">
                              {getFilteredTeachers().slice(0, 3).map(teacher => (
                                <TeacherCard
                                  key={teacher._id}
                                  teacher={teacher}
                                  workload={teacherWorkloads[teacher._id]}
                                  onSelect={() => updateTeacherMapping(key, teacher)}
                                  isSelected={false}
                                />
                              ))}
                              {getFilteredTeachers().length > 3 && (
                                <div className="more-teachers">
                                  +{getFilteredTeachers().length - 3} more teachers available
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="step-actions">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="secondary-btn"
                >
                  Back
                </button>
                <button 
                  type="button" 
                  onClick={() => setStep(3)}
                  className="primary-btn"
                  disabled={!validateMappings()}
                >
                  Continue
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