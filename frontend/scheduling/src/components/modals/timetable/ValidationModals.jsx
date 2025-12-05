import Swal from 'sweetalert2';

const ValidationModals = {
  showInvalidTimeError: () => {
    return Swal.fire({
      icon: 'error',
      title: 'Invalid Time',
      text: 'End time must be after start time!',
      confirmButtonColor: '#3B82F6'
    });
  },

  showHoursExceededError: (subjectName, requiredHours, totalHours) => {
    return Swal.fire({
      icon: 'error',
      title: 'Hours Limit Exceeded',
      html: `
        <p>This would exceed the required hours for <strong>${subjectName}</strong></p>
        <p>Required: ${requiredHours}h | Would be: ${totalHours.toFixed(1)}h</p>
      `,
      confirmButtonColor: '#3B82F6'
    });
  },

  showTimeConflictError: () => {
    return Swal.fire({
      icon: 'error',
      title: 'Time Conflict (Internal)',
      html: `
        <p><strong>Conflict Type:</strong> Internal Schedule Conflict</p>
        <p>This time slot overlaps with another event already in this schedule!</p>
        <p style="font-size: 0.9em; color: #666;">Please choose a different time or edit the existing event.</p>
      `,
      confirmButtonColor: '#3B82F6',
      confirmButtonText: 'OK'
    });
  },

  showExternalConflictWarning: (conflicts) => {
    const conflictList = conflicts.map(c => {
      const icon = c.sessionType === 'lab' ? '🧪' : '📚';
      const sessionLabel = c.sessionType.toUpperCase();
      return `<li style="margin-bottom: 0.5rem;"><strong>${c.scheduleName}</strong><br/>
        ${icon} ${c.subject} (${sessionLabel})<br/>
        <span style="color: #6B7280; font-size: 0.9em;">⏰ ${c.time}</span></li>`;
    }).join('');
    
    return Swal.fire({
      icon: 'warning',
      title: 'Schedule Conflict Detected',
      html: `
        <p style="margin-bottom: 1rem;">This time slot conflicts with existing schedules for the same course/year/semester:</p>
        <ul style="text-align: left; margin: 1rem 0; background: #FEF3C7; padding: 1rem; border-radius: 6px;">${conflictList}</ul>
        <p style="margin: 0.5rem 0; font-size: 0.9em; color: #666;">Students in this course/year cannot attend multiple classes at once.</p>
      `,
      confirmButtonColor: '#3B82F6',
      confirmButtonText: 'Understood'
    });
  },

  showEventSuccess: (isUpdate, duration) => {
    return Swal.fire({
      icon: 'success',
      title: isUpdate ? 'Event Updated!' : 'Event Added!',
      text: `Schedule saved successfully (Duration: ${duration})`,
      timer: 1500,
      showConfirmButton: false
    });
  },

  showSaveError: (errorMessage) => {
    let errorHtml = `<p><strong>Error saving schedule:</strong></p>`;
    
    if (errorMessage.includes('conflict') || errorMessage.includes('Conflict')) {
      errorHtml += `
        <p style="text-align: left; margin: 1rem 0; background: #FEE2E2; padding: 0.75rem; border-radius: 6px;">
          <strong>Conflict Type:</strong> External Schedule Conflict<br/>
          <span style="font-size: 0.9em;">This schedule conflicts with other schedules for the same course/year/semester.</span>
        </p>
      `;
    } else if (errorMessage.includes('hours') || errorMessage.includes('Hours')) {
      errorHtml += `
        <p style="text-align: left; margin: 1rem 0; background: #FEE2E2; padding: 0.75rem; border-radius: 6px;">
          <strong>Conflict Type:</strong> Hours Limit Exceeded<br/>
          <span style="font-size: 0.9em;">One or more subjects exceed their required hours.</span>
        </p>
      `;
    } else if (errorMessage.includes('subject') || errorMessage.includes('Subject')) {
      errorHtml += `
        <p style="text-align: left; margin: 1rem 0; background: #FEE2E2; padding: 0.75rem; border-radius: 6px;">
          <strong>Conflict Type:</strong> Subject Validation Error<br/>
          <span style="font-size: 0.9em;">One or more subjects could not be found or validated.</span>
        </p>
      `;
    } else {
      errorHtml += `<p style="text-align: left; margin: 1rem 0; background: #FEE2E2; padding: 0.75rem; border-radius: 6px;">${errorMessage}</p>`;
    }
    
    return Swal.fire({
      icon: 'error',
      title: 'Failed to Save Schedule',
      html: errorHtml,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Got it'
    });
  }
};

export default ValidationModals;