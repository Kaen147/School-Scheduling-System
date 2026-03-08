/**
 * Print Utilities for Benedicto College Scheduling System
 * Contains reusable print functions for generating PDF documents
 */

/**
 * Print Teacher Schedule
 * Generates a PDF of a teacher's weekly schedule
 * 
 * @param {Object} params - Print parameters
 * @param {string} params.teacherName - Full name of the teacher
 * @param {number} params.totalUnits - Total units taught
 * @param {number} params.totalHours - Total hours per week
 * @param {string} params.currentDate - Current date string
 */
export const printTeacherSchedule = async ({ teacherName, totalUnits, totalHours, currentDate }) => {
  const html2pdf = (await import('html2pdf.js')).default;
  
  // ============================================
  // EDIT HEADER HERE - Customize school info
  // ============================================
  const SCHOOL_NAME = 'BENEDICTO COLLEGE';
  const SCHOOL_TAGLINE = 'Your Education... Our Mission';
  const SCHOOL_WEBSITE = 'www.benedictocollege.com.ph';
  const SCHOOL_ADDRESS = 'A.S. Fortuna Street, Mandaue City 6014, Metro Cebu, Philippines';
  const SCHOOL_CONTACT = 'Tel. Nos.: (63-32) 345-5790, 345-6873 or 74';
  const DOCUMENT_TYPE = 'Faculty Teaching Schedule';
  
  // Create a clean print container
  const printContainer = document.createElement('div');
  printContainer.style.padding = '10px';
  printContainer.style.backgroundColor = 'white';
  printContainer.style.fontFamily = 'Arial, sans-serif';
  printContainer.style.fontSize = '9px';
  
  printContainer.innerHTML = `
    <!-- Official Document Header - Benedicto College Style -->
    <div style="border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 8px;">
      <!-- Logo and School Name Row -->
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <div style="flex: 0 0 100px; text-align: left;">
          <!-- BC Logo - Using actual logo from assets -->
          <img src="/src/assets/BC Logo.png" style="width: 100px; height: 100px; object-fit: contain;" alt="BC Logo" />
        </div>
        <div style="width: 15px;"></div>
        <div style="flex: 1; text-align: center;">
          <h1 style="margin: 0 0 2px 0; font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #000;">${SCHOOL_NAME}</h1>
          <p style="margin: 0 0 3px 0; font-size: 9px; font-style: italic; color: #666;">${SCHOOL_TAGLINE}</p>
          <p style="margin: 0 0 1px 0; font-size: 8px; font-weight: 600; color: #000;">${SCHOOL_WEBSITE}</p>
          <p style="margin: 0 0 1px 0; font-size: 7px; color: #000;">${SCHOOL_ADDRESS}</p>
          <p style="margin: 0; font-size: 7px; color: #000;">${SCHOOL_CONTACT}</p>
        </div>
        <div style="width: 15px;"></div>
        <div style="flex: 0 0 100px;"></div>
      </div>
    </div>
    
    <!-- Document Title -->
    <div style="text-align: center; margin-bottom: 6px;">
      <h2 style="margin: 0 0 3px 0; font-size: 13px; font-weight: bold; color: #000; text-transform: uppercase;">${DOCUMENT_TYPE}</h2>
      <p style="margin: 0 0 1px 0; font-size: 8px; color: #666;">Academic Year ${new Date().getFullYear()}-${new Date().getFullYear() + 1}</p>
      <p style="margin: 0; font-size: 7px; color: #999;">Document No: TS-${Date.now().toString().slice(-6)} | Date: ${currentDate}</p>
    </div>
    
    <!-- Course/Faculty Information Box -->
    <div style="background-color: #f5f5f5; padding: 4px 8px; margin-bottom: 6px; border: 1px solid #ddd;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 7px;">
        <div>
          <strong style="color: #000;">Faculty Name:</strong>
          <span style="color: #333; margin-left: 4px;">${teacherName}</span>
        </div>
        <div>
          <strong style="color: #000;">Total Units:</strong>
          <span style="color: #333; margin-left: 4px;">${totalUnits} units</span>
        </div>
        <div>
          <strong style="color: #000;">Total Hours/Week:</strong>
          <span style="color: #333; margin-left: 4px;">${totalHours} hours</span>
        </div>
      </div>
    </div>
    
    <!-- Weekly Timetable Label -->
    <div style="margin-bottom: 4px;">
      <h3 style="margin: 0; font-size: 10px; font-weight: bold; color: #000;">Weekly Timetable</h3>
    </div>
  `;
  
  // Clone and style the schedule table for compact display
  const tableWrapper = document.querySelector('.teacher-schedule-table');
  if (tableWrapper) {
    const tableClone = tableWrapper.cloneNode(true);
    
    // Apply compact styles to table
    tableClone.style.width = '100%';
    tableClone.style.fontSize = '7px';
    tableClone.style.borderCollapse = 'collapse';
    
    // Style all cells
    const cells = tableClone.querySelectorAll('th, td');
    cells.forEach(cell => {
      cell.style.padding = '2px 1px';
      cell.style.fontSize = '7px';
      cell.style.border = '1px solid #e5e7eb';
    });
    
    // Style headers
    const headers = tableClone.querySelectorAll('th');
    headers.forEach(header => {
      header.style.backgroundColor = '#1e40af';
      header.style.color = 'white';
      header.style.fontSize = '8px';
      header.style.fontWeight = 'bold';
    });
    
    // Style event cards to be more compact
    const eventCards = tableClone.querySelectorAll('.event-card');
    eventCards.forEach(card => {
      card.style.fontSize = '6px';
      card.style.padding = '2px';
      card.style.lineHeight = '1.2';
    });
    
    printContainer.appendChild(tableClone);
  }
  
  // Add signature section
  const signatureSection = document.createElement('div');
  signatureSection.style.marginTop = '12px';
  signatureSection.style.paddingTop = '8px';
  signatureSection.style.borderTop = '1px solid #e5e7eb';
  signatureSection.style.display = 'flex';
  signatureSection.style.justifyContent = 'space-between';
  signatureSection.style.alignItems = 'flex-end';
  signatureSection.style.fontSize = '7px';
  signatureSection.innerHTML = `
    <div style="flex: 1;">
      <div style="margin-bottom: 25px;">
        <div style="color: #6b7280; margin-bottom: 2px;">Prepared by:</div>
        <div style="width: 100px; border-bottom: 1px solid #000; margin-bottom: 2px; margin-top: 35px;"></div>
        <div style="color: #374151; font-size: 6px;">Faculty Signature</div>
      </div>
    </div>
    <div style="flex: 1; text-align: center;">
      <div style="margin-bottom: 25px;">
        <div style="color: #6b7280; margin-bottom: 2px;">Reviewed by:</div>
        <div style="width: 100px; border-bottom: 1px solid #000; margin: 35px auto 2px auto;"></div>
        <div style="color: #374151; font-size: 6px;">Department Head</div>
      </div>
    </div>
    <div style="flex: 1; text-align: right;">
      <div style="margin-bottom: 25px;">
        <div style="color: #6b7280; margin-bottom: 2px;">Approved by:</div>
        <div style="width: 100px; border-bottom: 1px solid #000; margin-left: auto; margin-bottom: 2px; margin-top: 20px;"></div>
        <div style="color: #374151; font-size: 6px;">Academic Dean</div>
      </div>
    </div>
  `;
  printContainer.appendChild(signatureSection);
  
  // Add footer
  const footer = document.createElement('div');
  footer.style.marginTop = '4px';
  footer.style.textAlign = 'center';
  footer.style.fontSize = '6px';
  footer.style.color = '#9ca3af';
  footer.style.borderTop = '1px solid #e5e7eb';
  footer.style.paddingTop = '3px';
  footer.innerHTML = `
    <p style="margin: 0;">This is an official document generated by the Benedicto College Scheduling System</p>
    <p style="margin: 1px 0 0 0;">Generated on: ${currentDate} | For Academic Use Only</p>
  `;
  printContainer.appendChild(footer);
  
  // Configure PDF options for Folio (8.5 x 13 inches)
  const opt = {
    margin: [5, 5, 5, 5],
    filename: `${teacherName.replace(/\s+/g, '_')}_Schedule.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: [215.9, 330.2], // Folio size: 8.5 x 13 inches
      orientation: 'portrait'
    },
    pagebreak: { mode: 'avoid-all' }
  };
  
  // Generate PDF
  try {
    await html2pdf().set(opt).from(printContainer).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};

/**
 * Print Class Schedule (Timetable)
 * Generates a PDF of a class schedule
 * 
 * @param {Object} params - Print parameters
 * @param {Object} params.scheduleInfo - Schedule information (course, year, semester)
 * @param {string} params.academicYear - Academic year string
 * @param {string} params.currentDate - Current date string
 * @param {Function} params.getYearSuffix - Function to get year suffix (1st, 2nd, etc.)
 * @param {Function} params.getSemesterSuffix - Function to get semester suffix
 */
export const printClassSchedule = async ({ scheduleInfo, academicYear, currentDate, getYearSuffix, getSemesterSuffix }) => {
  const html2pdf = (await import('html2pdf.js')).default;
  
  // ============================================
  // EDIT HEADER HERE - Customize school info
  // ============================================
  const SCHOOL_NAME = 'BENEDICTO COLLEGE';
  const SCHOOL_TAGLINE = 'Your Education... Our Mission';
  const SCHOOL_WEBSITE = 'www.benedictocollege.com.ph';
  const SCHOOL_ADDRESS = 'A.S. Fortuna Street, Mandaue City 6014, Metro Cebu, Philippines';
  const SCHOOL_CONTACT = 'Tel. Nos.: (63-32) 345-5790, 345-6873 or 74';
  const DOCUMENT_TYPE = 'Class Schedule';
  
  // Create a clean print container
  const printContainer = document.createElement('div');
  printContainer.style.padding = '10px';
  printContainer.style.backgroundColor = 'white';
  printContainer.style.fontFamily = 'Arial, sans-serif';
  printContainer.style.fontSize = '9px';
  
  printContainer.innerHTML = `
    <!-- Official Document Header - Benedicto College Style -->
    <div style="border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 8px;">
      <!-- Logo and School Name Row -->
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <div style="flex: 0 0 100px; text-align: left;">
          <!-- BC Logo - Using actual logo from assets -->
          <img src="/src/assets/BC Logo.png" style="width: 100px; height: 100px; object-fit: contain;" alt="BC Logo" />
        </div>
        <div style="width: 15px;"></div>
        <div style="flex: 1; text-align: center;">
          <h1 style="margin: 0 0 2px 0; font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #000;">${SCHOOL_NAME}</h1>
          <p style="margin: 0 0 3px 0; font-size: 9px; font-style: italic; color: #666;">${SCHOOL_TAGLINE}</p>
          <p style="margin: 0 0 1px 0; font-size: 8px; font-weight: 600; color: #000;">${SCHOOL_WEBSITE}</p>
          <p style="margin: 0 0 1px 0; font-size: 7px; color: #000;">${SCHOOL_ADDRESS}</p>
          <p style="margin: 0; font-size: 7px; color: #000;">${SCHOOL_CONTACT}</p>
        </div>
        <div style="width: 15px;"></div>
        <div style="flex: 0 0 100px;"></div>
      </div>
    </div>
    
    <!-- Document Title -->
    <div style="text-align: center; margin-bottom: 6px;">
      <h2 style="margin: 0 0 3px 0; font-size: 13px; font-weight: bold; color: #000; text-transform: uppercase;">${DOCUMENT_TYPE}</h2>
      <p style="margin: 0 0 1px 0; font-size: 8px; color: #666;">Academic Year ${academicYear}</p>
      <p style="margin: 0; font-size: 7px; color: #999;">Document No: CS-${Date.now().toString().slice(-6)} | Date: ${currentDate}</p>
    </div>
    
    <!-- Course Information Box -->
    <div style="background-color: #f5f5f5; padding: 4px 8px; margin-bottom: 6px; border: 1px solid #ddd;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 7px;">
        <div>
          <strong style="color: #000;">Course:</strong>
          <span style="color: #333; margin-left: 4px;">${scheduleInfo?.courseName || 'N/A'} (${scheduleInfo?.courseAbbreviation || 'N/A'})</span>
        </div>
        <div>
          <strong style="color: #000;">Year Level:</strong>
          <span style="color: #333; margin-left: 4px;">${scheduleInfo?.yearLevel}${getYearSuffix(scheduleInfo?.yearLevel)} Year</span>
        </div>
        <div>
          <strong style="color: #000;">Semester:</strong>
          <span style="color: #333; margin-left: 4px;">${scheduleInfo?.semester}${getSemesterSuffix(scheduleInfo?.semester)} Semester</span>
        </div>
      </div>
    </div>
    
    <!-- Weekly Timetable Label -->
    <div style="margin-bottom: 4px;">
      <h3 style="margin: 0; font-size: 10px; font-weight: bold; color: #000;">Weekly Timetable</h3>
    </div>
  `;
  
  // Clone and style the schedule table for compact display
  const tableWrapper = document.querySelector('.timetable-table');
  if (tableWrapper) {
    const tableClone = tableWrapper.cloneNode(true);
    
    // Apply compact styles to table
    tableClone.style.width = '100%';
    tableClone.style.fontSize = '7px';
    tableClone.style.borderCollapse = 'collapse';
    
    // Style all cells
    const cells = tableClone.querySelectorAll('th, td');
    cells.forEach(cell => {
      cell.style.padding = '2px 1px';
      cell.style.fontSize = '7px';
      cell.style.border = '1px solid #e5e7eb';
    });
    
    // Style headers
    const headers = tableClone.querySelectorAll('th');
    headers.forEach(header => {
      header.style.backgroundColor = '#1e40af';
      header.style.color = 'white';
      header.style.fontSize = '8px';
      header.style.fontWeight = 'bold';
    });
    
    // Style event cards to be more compact
    const eventCards = tableClone.querySelectorAll('.event-card');
    eventCards.forEach(card => {
      card.style.fontSize = '6px';
      card.style.padding = '2px';
      card.style.lineHeight = '1.2';
    });
    
    printContainer.appendChild(tableClone);
  }
  
  // Add signature section
  const signatureSection = document.createElement('div');
  signatureSection.style.marginTop = '12px';
  signatureSection.style.paddingTop = '8px';
  signatureSection.style.borderTop = '1px solid #e5e7eb';
  signatureSection.style.display = 'flex';
  signatureSection.style.justifyContent = 'space-between';
  signatureSection.style.alignItems = 'flex-end';
  signatureSection.style.fontSize = '7px';
  signatureSection.innerHTML = `
    <div style="flex: 1;">
      <div style="margin-bottom: 25px;">
        <div style="color: #6b7280; margin-bottom: 2px;">Prepared by:</div>
        <div style="width: 100px; border-bottom: 1px solid #000; margin-bottom: 2px; margin-top: 35px;"></div>
        <div style="color: #374151; font-size: 6px;">Registrar</div>
      </div>
    </div>
    <div style="flex: 1; text-align: center;">
      <div style="margin-bottom: 25px;">
        <div style="color: #6b7280; margin-bottom: 2px;">Reviewed by:</div>
        <div style="width: 100px; border-bottom: 1px solid #000; margin: 35px auto 2px auto;"></div>
        <div style="color: #374151; font-size: 6px;">Department Head</div>
      </div>
    </div>
    <div style="flex: 1; text-align: right;">
      <div style="margin-bottom: 25px;">
        <div style="color: #6b7280; margin-bottom: 2px;">Approved by:</div>
        <div style="width: 100px; border-bottom: 1px solid #000; margin-left: auto; margin-bottom: 2px; margin-top: 35px;"></div>
        <div style="color: #374151; font-size: 6px;">Academic Dean</div>
      </div>
    </div>
  `;
  printContainer.appendChild(signatureSection);
  
  // Add footer
  const footer = document.createElement('div');
  footer.style.marginTop = '4px';
  footer.style.textAlign = 'center';
  footer.style.fontSize = '6px';
  footer.style.color = '#9ca3af';
  footer.style.borderTop = '1px solid #e5e7eb';
  footer.style.paddingTop = '3px';
  footer.innerHTML = `
    <p style="margin: 0;">This is an official document generated by the Benedicto College Scheduling System</p>
    <p style="margin: 1px 0 0 0;">Generated on: ${currentDate} | For Academic Use Only</p>
  `;
  printContainer.appendChild(footer);
  
  // Configure PDF options for Folio (8.5 x 13 inches)
  const opt = {
    margin: [5, 5, 5, 5],
    filename: `${scheduleInfo?.courseAbbreviation || 'Schedule'}_${scheduleInfo?.yearLevel}Y_S${scheduleInfo?.semester}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: [215.9, 330.2], // Folio size: 8.5 x 13 inches
      orientation: 'portrait'
    },
    pagebreak: { mode: 'avoid-all' }
  };
  
  // Generate PDF
  try {
    await html2pdf().set(opt).from(printContainer).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
};
