import Swal from 'sweetalert2';

const SaveScheduleModal = {
  show: async (scheduleInfo, getYearSuffix, getSemesterSuffix, mode = 'create', currentName = '') => {
    // Generate default name for new schedules, use current name for edits
    const defaultName = mode === 'edit' && currentName 
      ? currentName
      : `${scheduleInfo.courseAbbreviation} ${scheduleInfo.yearLevel}${getYearSuffix(scheduleInfo.yearLevel)} Year - ${scheduleInfo.semester}${getSemesterSuffix(scheduleInfo.semester)} Sem`;
    
    const { value: scheduleName } = await Swal.fire({
      title: mode === 'edit' ? 'Update Schedule' : 'Save Schedule',
      html: `
        <div style="text-align: left;">
          <p>You're about to ${mode === 'edit' ? 'update' : 'save'} the schedule for:</p>
          <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <strong>${scheduleInfo.courseName}</strong><br/>
            ${scheduleInfo.yearLevel}${getYearSuffix(scheduleInfo.yearLevel)} Year - 
            ${scheduleInfo.semester}${getSemesterSuffix(scheduleInfo.semester)} Semester
          </div>
          <label for="schedule-name" style="display: block; text-align: left; margin-top: 15px; font-weight: 600;">
            Schedule Name:
          </label>
          <input 
            type="text" 
            id="schedule-name" 
            class="swal2-input" 
            placeholder="e.g., BSIT 1st Year - 1st Sem 2024"
            value="${defaultName}"
            style="margin-top: 5px;"
          >
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: mode === 'edit' ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      preConfirm: () => {
        const name = document.getElementById('schedule-name').value;
        if (!name) {
          Swal.showValidationMessage('Please enter a schedule name!');
          return false;
        }
        return name;
      }
    });

    return scheduleName;
  },

  showSuccess: (action = 'created') => {
    return Swal.fire({
      icon: 'success',
      title: `Schedule ${action === 'updated' ? 'Updated' : 'Created'}!`,
      text: `Your schedule has been ${action} successfully.`,
      timer: 2000,
      showConfirmButton: false,
    });
  },

  showError: (message) => {
    return Swal.fire({
      icon: 'error',
      title: 'Save Failed',
      text: message || 'Failed to save schedule. Please try again.',
      confirmButtonColor: '#3B82F6'
    });
  },

  showEmptyWarning: () => {
    return Swal.fire({
      icon: 'warning',
      title: 'Empty Schedule',
      text: 'Please add at least one event before saving.',
      confirmButtonColor: '#3B82F6'
    });
  },

  showMissingInfoError: () => {
    return Swal.fire({
      icon: 'error',
      title: 'Missing Information',
      text: 'Schedule information is missing. Please go back and create a new schedule.',
      confirmButtonColor: '#3B82F6'
    });
  },

  showUpdateConfirmation: (scheduleName) => {
    return Swal.fire({
      title: 'Update Schedule?',
      html: `
        <p>You're about to update:</p>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <strong>${scheduleName}</strong>
        </div>
        <p>This will overwrite the existing schedule.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
    });
  }
};

export default SaveScheduleModal;