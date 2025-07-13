const API_URL = "https://script.google.com/macros/s/AKfycbxBoOH8dgxC5modzKJ2wVJAaowxPtiZ7e5HBFvpMuPRW8coLZ1IPk2qFbFxid5633L8/exec";

let projectsMap = {};
let timeTypesMap = {};

$(document).ready(function () {
  // Password Toggle Eye
  $('#togglePassword').click(function () {
    const passwordInput = $('#passwordInput');
    const type = passwordInput.attr('type') === 'password' ? 'text' : 'password';
    passwordInput.attr('type', type);
    $(this).toggleClass('fa-eye fa-eye-slash');
  });

  // Password Check on Enter Key
  $('#passwordInput').keypress(function (e) {
    if (e.which === 13) {
      checkPassword();
    }
  });

  // Theme Toggle (if needed in future)
  $('#themeToggle').click(function () {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      $(this).html('<i class="fas fa-moon"></i>');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      $(this).html('<i class="fas fa-sun"></i>');
      localStorage.setItem('theme', 'dark');
    }
  });

  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    $('#themeToggle').html('<i class="fas fa-sun"></i>');
  }

  // Page View Switch
  function showView(viewId) {
    $('#selectionPage, #projectForm, #overtimeForm').addClass('hidden');
    $(`#${viewId}`).removeClass('hidden');
  }

  $('#reportIntakeBtn').click(() => showView('projectForm'));
  $('#overtimeRequestBtn').click(() => showView('overtimeForm'));
  $('#backFromProject, #backFromOvertime').click(() => showView('selectionPage'));
  $('#anotherProjectEntry').click(() => {
    $('#projectThankYou').addClass('hidden');
    $('#projectFormArea').show();
    resetProjectForm();
  });
  $('#anotherOvertimeEntry').click(() => {
    $('#overtimeThankYou').addClass('hidden');
    $('#overtimeFormArea').show();
    resetOvertimeForm();
  });

  // Set Date Range for Tracking Date
  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(today.getDate() - 30);
  const minDate = oneMonthAgo.toISOString().split('T')[0];
  const maxDate = today.toISOString().split('T')[0];
  $("#trackingDate").attr("min", minDate).attr("max", maxDate);
  $("#overtimeDate").attr("min", minDate).attr("max", maxDate);

  // Dropdown + Select2 Setup
  function populateDropdowns() {
    $.get(API_URL, function (response) {
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      
      // Store data globally for use in other functions
      window.apiData = data;
      projectsMap = data.projectsMap;
      timeTypesMap = data.timeTypesMap;

      // Debug: Log the projectsMap to console
      console.log('Projects Map:', projectsMap);

      // Project form dropdowns
      $('#profileName').empty().append(new Option("Select Profile", "", true, true));
      data.profileNames.forEach(name => $('#profileName').append(new Option(name, name)));

      $('#teamMember').empty().append(new Option("Select Team Member", "", true, true));
      data.teamMembers?.forEach(name => $('#teamMember').append(new Option(name, name)));

      // Overtime Profile dropdown - independent
      $('#overtimeProfile').empty().append(new Option("Select Profile", "", true, true));
      data.profileNames.forEach(name => $('#overtimeProfile').append(new Option(name, name)));

      // Employee dropdown - independent, populated immediately
      $('#employee').empty().append(new Option("Select Employee", "", true, true));
      if (data.teamMembers) {
        data.teamMembers.forEach(name => $('#employee').append(new Option(name, name)));
      }

      // Reason dropdown for overtime
      $('#reason').empty().append(new Option("Select Reason", "", true, true));
      const reasons = ['Project Deadline', 'Emergency Fix', 'Client Request', 'Extra Work', 'Other'];
      reasons.forEach(reason => $('#reason').append(new Option(reason, reason)));

      initializeSelect2();
    }).fail(function() {
      console.error('Failed to load data from API');
      alert('Failed to load data. Please refresh the page.');
    });
  }

  function initializeSelect2() {
    $('select').select2('destroy');
    $('select').select2({
      width: '100%',
      theme: 'default',
      dropdownCssClass: 'select2-dropdown-custom'
    });
  }

  // Render Time Type as Radio Buttons
  function renderTimeTypeOptions(timeTypes) {
    const container = $('#timeTypeOptions');
    container.empty(); // Clear old radios
    if (!Array.isArray(timeTypes) || timeTypes.length === 0) {
      container.append('<p>No time types found for selected project.</p>');
      return;
    }

    timeTypes.forEach((type, i) => {
      const id = `timeType_${i}`;
      container.append(`
        <label for="${id}" class="radio-label">
          <input type="radio" name="timeType" id="${id}" value="${type}" required>
          ${type}
        </label>
      `);
    });
  }

  function getSelectedTimeType() {
    return $('input[name="timeType"]:checked').val() || "";
  }

  function generateTimeSlots() {
    const slots = [];
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    for (let i = 0; i < 143; i++) {
      slots.push(formatTime(current));
      current.setMinutes(current.getMinutes() + 10);
    }
    slots.push("11:59:59 PM");
    return slots;
  }

  function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  function calculateTimeDiff(startTime, endTime) {
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const diffMinutes = endMinutes - startMinutes;
    return `${Math.floor(diffMinutes / 60)}:${(diffMinutes % 60).toString().padStart(2, '0')}`;
  }

  function initProjectForm() {
    populateDropdowns();

    const startSelect = $('#startTime');
    const endSelect = $('#endTime');
    const totalTimeLabel = $('#totalTimeLabel');

    const timeSlots = generateTimeSlots();
    timeSlots.forEach(t => startSelect.append(new Option(t, t)));

    startSelect.on('change', function () {
      const selectedIndex = timeSlots.indexOf($(this).val());
      endSelect.empty().append(new Option("Select End Time", "", true, true));
      for (let i = selectedIndex + 1; i < timeSlots.length; i++) {
        endSelect.append(new Option(timeSlots[i], timeSlots[i]));
      }
      endSelect.select2('destroy').select2({ width: '100%', theme: 'default' });
      totalTimeLabel.text('0:00');
    });

    endSelect.on('change', function () {
      const start = startSelect.val();
      const end = endSelect.val();
      if (!start || !end) return totalTimeLabel.text('0:00');
      const timeDiff = calculateTimeDiff(start, end);
      totalTimeLabel.text(timeDiff);
      $('#totalTime').val(timeDiff);
    });

    $('#profileName').on('change', function () {
      const selectedProfile = $(this).val();
      const projectDropdown = $('#projectName');
      projectDropdown.empty().append(new Option("Select Client", "", true, true));

      if (projectsMap[selectedProfile]) {
        projectsMap[selectedProfile].forEach(project => {
          projectDropdown.append(new Option(project, project));
        });
        projectDropdown.append('<option value="Other">Other</option>');
      }

      projectDropdown.select2('destroy').select2({ width: '100%', theme: 'default' });
    });

    // Project form - projectName handler
    $('#projectName').on('change', function () {
      const selectedProfile = $('#profileName').val();
      const selectedProject = $(this).val();
      const timeTypeRaw = timeTypesMap[selectedProfile]?.[selectedProject] || "";
      const timeTypes = timeTypeRaw.split(',').map(t => t.trim()).filter(Boolean);
      renderTimeTypeOptions(timeTypes);

      const show = selectedProject === 'Other';
      $('#otherProjectGroup').toggleClass('hidden', !show);
      if (show) $('#otherProject').focus();
    });

    $('#submitProjectBtn').click(submitProjectForm);
    $('#resetProjectBtn').click(resetProjectForm);
  }

  function initOvertimeForm() {
    const overtimeStartSelect = $('#start');
    const overtimeEndSelect = $('#end');
    const hoursDisplay = $('#hoursDisplay');

    const timeSlots = generateTimeSlots();
    timeSlots.forEach(t => overtimeStartSelect.append(new Option(t, t)));

    // Profile dropdown change handler - only populates project dropdown
    $('#overtimeProfile').on('change', function () {
      const selectedProfile = $(this).val();
      console.log('Selected overtime profile:', selectedProfile);
      console.log('Available projects for profile:', projectsMap[selectedProfile]);
      
      // Update project dropdown based on selected profile
      updateOvertimeProjectDropdown(selectedProfile);
    });

    // Time calculation handlers for overtime form
    overtimeStartSelect.on('change', function () {
      const selectedIndex = timeSlots.indexOf($(this).val());
      overtimeEndSelect.empty().append(new Option("Select End Time", "", true, true));
      for (let i = selectedIndex + 1; i < timeSlots.length; i++) {
        overtimeEndSelect.append(new Option(timeSlots[i], timeSlots[i]));
      }
      overtimeEndSelect.select2('destroy').select2({ width: '100%', theme: 'default' });
      hoursDisplay.text('0.00');
    });

    overtimeEndSelect.on('change', function () {
      const start = overtimeStartSelect.val();
      const end = overtimeEndSelect.val();
      if (!start || !end) return hoursDisplay.text('0.00');
      
      const timeDiff = calculateTimeDiff(start, end);
      const [hours, minutes] = timeDiff.split(':').map(Number);
      const totalHours = (hours + minutes / 60).toFixed(2);
      hoursDisplay.text(totalHours);
      $('#totalTimeOvertime').val(totalHours);
    });

    function updateOvertimeProjectDropdown(selectedProfile) {
      const projectDropdown = $('#overtimeProject');
      projectDropdown.empty().append(new Option("Select Project", "", true, true));

      console.log('Updating overtime project dropdown for profile:', selectedProfile);
      console.log('ProjectsMap:', projectsMap);
      console.log('Projects for selected profile:', projectsMap[selectedProfile]);

      if (selectedProfile && projectsMap[selectedProfile]) {
        projectsMap[selectedProfile].forEach(project => {
          projectDropdown.append(new Option(project, project));
        });
        projectDropdown.append(new Option("Other", "Other"));
      }

      // Destroy and reinitialize select2 for project dropdown
      projectDropdown.select2('destroy').select2({ width: '100%', theme: 'default' });
    }

    // Project dropdown change handler for overtime
    $('#overtimeProject').on('change', function () {
      const selectedProject = $(this).val();
    });

    overtimeStartSelect.on('change', function () {
      const selectedIndex = timeSlots.indexOf($(this).val());
      overtimeEndSelect.empty().append(new Option("Select End Time", "", true, true));
      for (let i = selectedIndex + 1; i < timeSlots.length; i++) {
        overtimeEndSelect.append(new Option(timeSlots[i], timeSlots[i]));
      }
      overtimeEndSelect.select2('destroy').select2({ width: '100%', theme: 'default' });
      hoursDisplay.text('0.00');
    });

    overtimeEndSelect.on('change', function () {
      const start = overtimeStartSelect.val();
      const end = overtimeEndSelect.val();
      if (!start || !end) return hoursDisplay.text('0.00');
      
      const timeDiff = calculateTimeDiff(start, end);
      const [hours, minutes] = timeDiff.split(':').map(Number);
      const totalHours = (hours + minutes / 60).toFixed(2);
      hoursDisplay.text(totalHours);
      $('#totalTimeOvertime').val(totalHours);
    });

    $('#submitOvertimeBtn').click(submitOvertimeForm);
    $('#resetOvertimeBtn').click(resetOvertimeForm);
  }

  function submitProjectForm() {
    const formData = {
      profileName: $('#profileName').val(),
      projectName: $('#projectName').val() === 'Other' ? $('#otherProject').val() : $('#projectName').val(),
      timeType: getSelectedTimeType(),
      teamMember: $('#teamMember').val(),
      trackingDate: $('#trackingDate').val(),
      startTime: $('#startTime').val(),
      endTime: $('#endTime').val(),
      totalTime: $('#totalTime').val() || $('#totalTimeLabel').text(),
      memo: $('#memo').val()
    };

    // Validation
    if (!formData.profileName || !formData.projectName || !formData.timeType || 
        !formData.teamMember || !formData.trackingDate || !formData.startTime || !formData.endTime) {
      alert('Please fill in all required fields.');
      return;
    }

    // Show loading state
    $('#submitProjectBtn').html('<i class="fas fa-spinner fa-spin"></i> Submitting...').prop('disabled', true);

    // Submit to API
    $.ajax({
      url: API_URL,
      type: 'GET',
      data: {
        action: 'submitProject',
        ...formData
      },
      success: function(response) {
        $('#projectFormArea').hide();
        $('#projectThankYou').removeClass('hidden');
        $('#submitProjectBtn').html('<i class="fas fa-paper-plane"></i> Submit Time Entry').prop('disabled', false);
      },
      error: function() {
        alert('Error submitting form. Please try again.');
        $('#submitProjectBtn').html('<i class="fas fa-paper-plane"></i> Submit Time Entry').prop('disabled', false);
      }
    });
  }

  function submitOvertimeForm() {
    const formData = {
      employee: $('#employee').val(),
      overtimeProfile: $('#overtimeProfile').val(),
      overtimeProject: $('#overtimeProject').val(),
      reason: $('#reason').val(),
      overtimeStart: $('#start').val(),
      overtimeEnd: $('#end').val(),
      overtimeDate: $('#overtimeDate').val(),
      totalTimeOvertime: $('#totalTimeOvertime').val() || $('#hoursDisplay').text(),
      notes: $('#notes').val()
    };
console.log({
  employee: $('#employee').val(),
  overtimeProfile: $('#overtimeProfile').val(),
  overtimeProject: $('#overtimeProject').val(),
  reason: $('#reason').val(),
  start: $('#start').val(),
  end: $('#end').val(),
  overtimeDate: $('#overtimeDate').val()
});

    // Validation
    if (!formData.employee || !formData.overtimeProfile || !formData.reason || !formData.overtimeStart || !formData.overtimeEnd || !formData.overtimeDate) {
      alert('Please fill in all required fields.');
      return;
    }

    // Show loading state
    $('#submitOvertimeBtn').html('<i class="fas fa-spinner fa-spin"></i> Submitting...').prop('disabled', true);

    // Submit to API
    $.ajax({
  url: API_URL,
  type: 'GET',
  data: {
    formType: 'overtime', // Required for Apps Script routing
    employee: formData.employee,
    overtimeProfile: formData.overtimeProfile,
    overtimeProject: formData.overtimeProject,
    overtimeDate: formData.overtimeDate,
    overtimeStart: formData.overtimeStart,
    overtimeEnd: formData.overtimeEnd,
    totalTimeOvertime: formData.totalTimeOvertime,
    reason: formData.reason,
    notes: formData.notes
  },
  success: function(response) {
    $('#overtimeFormArea').hide();
    $('#overtimeThankYou').removeClass('hidden');
    $('#submitOvertimeBtn').html('<i class="fas fa-paper-plane"></i> Submit Request').prop('disabled', false);
  },
  error: function() {
    alert('Error submitting form. Please try again.');
    $('#submitOvertimeBtn').html('<i class="fas fa-paper-plane"></i> Submit Request').prop('disabled', false);
  }
});

  }

  function resetProjectForm() {
    $('#profileName, #projectName, #teamMember, #startTime, #endTime').val('').trigger('change');
    $('#trackingDate, #memo, #otherProject').val('');
    $('#totalTimeLabel').text('0:00');
    $('#totalTime').val('');
    $('#timeTypeOptions').empty();
    $('#otherProjectGroup').addClass('hidden');
    $('input[name="timeType"]').prop('checked', false);
    
    // Reinitialize select2
    initializeSelect2();
  }

  function resetOvertimeForm() {
    $('#employee, #overtimeProfile, #overtimeProject, #reason, #start, #end').val('').trigger('change');
    $('#overtimeDate, #notes').val('');
    $('#hoursDisplay').text('0.00');
    $('#totalTimeOvertime').val('');
    
    
    // Reinitialize select2
    initializeSelect2();
  }

  // Initialize forms
  initProjectForm();
  initOvertimeForm();

  $('#enterPasswordBtn').on('click', function () {
  checkPassword();
});
});

// Password functions (from inline script in HTML)
const correctPassword = "EurosHub";
let enterButton = null;

function checkPassword() {
  const input = document.getElementById('passwordInput').value;
  if (input === correctPassword) {
    document.getElementById('passwordOverlay').style.display = "none";
  } else {
    document.getElementById('passwordError').style.display = "block";
    animateButtonError();
  }
}

function animateButtonError() {
  if (!enterButton) {
    enterButton = document.querySelector('#passwordOverlay button');
  }
  
  enterButton.classList.remove('shake');
  void enterButton.offsetWidth;
  enterButton.classList.add('shake');

  enterButton.style.backgroundColor = '#e74c3c';
  setTimeout(() => {
    enterButton.style.backgroundColor = '#00BFA6';
  }, 500);
}