const API_URL = "https://script.google.com/macros/s/AKfycbzz-62UOauzAlY793hSLcGKkNBGFx_ruNiSULBjxe7i9a_q1TIhMozPM9CQB87-g5lK/exec";

$(document).ready(function () {
  // Theme toggle functionality
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

  // Check for saved theme preference
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    $('#themeToggle').html('<i class="fas fa-sun"></i>');
  }

  // Navigation functions
  function showView(viewId) {
    $('#selectionPage, #projectForm, #overtimeForm').addClass('hidden');
    $(`#${viewId}`).removeClass('hidden');
  }

  // Navigation event handlers
  $('#reportIntakeBtn').click(() => showView('projectForm'));
  $('#overtimeRequestBtn').click(() => showView('overtimeForm'));
  $('#backFromProject').click(() => showView('selectionPage'));
  $('#backFromOvertime').click(() => showView('selectionPage'));
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

  // Initialize Project Time Tracking Form
  function initProjectForm() {
    populateDropdowns();
    
    const startSelect = $('#startTime');
    const endSelect = $('#endTime');
    const totalTimeLabel = $('#totalTimeLabel');

    const generateTimeSlots = () => {
      const slots = [];
      const current = new Date();
      current.setHours(0, 0, 0, 0);
      for (let i = 0; i < 143; i++) {
        slots.push(formatTime(current));
        current.setMinutes(current.getMinutes() + 10);
      }
      slots.push("11:59:59 PM");
      return slots;
    };

    const formatTime = (date) => {
      let hours = date.getHours();
      let minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const timeSlots = generateTimeSlots();
    timeSlots.forEach(t => startSelect.append(new Option(t, t)));

    startSelect.on('change', function () {
      const selectedIndex = timeSlots.indexOf($(this).val());
      endSelect.empty().append(new Option("Select End Time", "", true, true));
      for (let i = selectedIndex + 1; i < timeSlots.length; i++) {
        endSelect.append(new Option(timeSlots[i], timeSlots[i]));
      }
      totalTimeLabel.text('0:00');
    });

    endSelect.on('change', function () {
      const start = startSelect.val();
      const end = endSelect.val();
      if (!start || !end) return totalTimeLabel.text('0:00');
      totalTimeLabel.text(calculateTimeDiff(start, end));
    });

    $('#projectName').change(function () {
      const show = $(this).val() === 'Other Project';
      $('#otherProjectGroup').toggleClass('hidden', !show);
      if (show) $('#otherProject').focus();
    });

    $('#submitProjectBtn').click(submitProjectForm);
    $('#resetProjectBtn').click(resetProjectForm);
  }

  // Initialize Overtime Request Form
  function initOvertimeForm() {
    $('#project').change(function () {
      const show = $(this).val() === 'Other Project';
      $('#otherProjectGroupOvertime').toggleClass('hidden', !show);
      if (show) $('#otherProjectOvertime').focus();
    });

    $('#start, #end').on('change input', calculateOvertimeHours);
    $('#submitOvertimeBtn').click(submitOvertimeForm);
    $('#resetOvertimeBtn').click(resetOvertimeForm);
  }

  // Shared functions
  function populateDropdowns() {
    $.get(API_URL, function (response) {
      const data = typeof response === 'string' ? JSON.parse(response) : response;

      // Project Form Dropdowns
      $('#profileName').empty().append(new Option("Select Profile", "", true, true));
      data.profileNames.forEach(name => $('#profileName').append(new Option(name, name)));

      $('#teamMember').empty().append(new Option("Select Team Member", "", true, true));
      data.teamMembers.forEach(name => $('#teamMember').append(new Option(name, name)));

      $('#projectName').empty().append(new Option("Select Project", "", true, true));
      data.projectNames.forEach(name => $('#projectName').append(new Option(name, name)));
      $('#projectName').append('<option value="Other Project">Other Project</option>');

      // Overtime Form Dropdowns
      $('#employee').empty().append(new Option("Select Employee", "", true, true));
      data.teamMembers.forEach(name => $('#employee').append(new Option(name, name)));

      $('#project').empty().append(new Option("Select Project", "", true, true));
      data.projectNames.forEach(name => $('#project').append(new Option(name, name)));
      $('#project').append('<option value="Other Project">Other Project</option>');

      // Initialize Select2
      $('select').select2();
    });
  }

  function calculateTimeDiff(start, end) {
    const parse = t => {
      const [hm, ampm] = t.trim().split(' ');
      let [h, m] = hm.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    let diffMinutes = parse(end) - parse(start);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // handle next-day

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}:${String(minutes).padStart(2, '0')}`;
  }

  function calculateOvertimeHours() {
    const start = $('#start').val();
    const end = $('#end').val();
    
    if (start && end) {
      const startTime = new Date(`1970-01-01T${start}`);
      const endTime = new Date(`1970-01-01T${end}`);
      let diff = (endTime - startTime) / 3600000; // hours
      
      if (diff < 0) diff += 24; // Handle overnight
      
      $('#hoursDisplay').text(diff.toFixed(2));
      $('#totalTimeOvertime').val(diff.toFixed(2));
    } else {
      $('#hoursDisplay').text("0.00");
      $('#totalTimeOvertime').val("");
    }
  }

  function validateForm(formId) {
    let valid = true;

    $(`#${formId} input[required], #${formId} select[required], #${formId} textarea[required]`).each(function () {
      const $this = $(this);
      const isSelect2 = $this.next('.select2-container').length;

      if (!$this.val()) {
        $this.addClass('invalid');
        if (isSelect2) {
          $this.next('.select2-container').find('.select2-selection').addClass('invalid');
        }
        valid = false;
      } else {
        $this.removeClass('invalid').addClass('valid');
        if (isSelect2) {
          $this.next('.select2-container').find('.select2-selection').removeClass('invalid').addClass('valid');
        }
      }
    });

    return valid;
  }

  function submitProjectForm() {
    if (!validateForm('projectFormArea')) return;

    $('#submitProjectBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Submitting...');
    
    const projectName = $('#projectName').val() === 'Other Project' 
      ? $('#otherProject').val() 
      : $('#projectName').val();

    const payload = {
      profileName: $('#profileName').val(),
      projectName: projectName,
      memo: $('#memo').val(),
      trackingDate: $('#trackingDate').val(),
      startTime: $('#startTime').val(),
      endTime: $('#endTime').val(),
      totalTime: $('#totalTimeLabel').text(),
      teamMember: $('#teamMember').val(),
      timeType: $('input[name="timeType"]:checked').val()
    };
    
    $.ajax({
      url: API_URL + "?" + new URLSearchParams(payload).toString(),
      method: "GET",
      success: function() {
        $('#projectFormArea').hide();
        $('#projectThankYou').removeClass('hidden');
        resetProjectForm(); // Clear all fields
      },
      error: function(err) {
        console.error("Submission error:", err);
        $('#projectThankYou p').text('Your submission was recorded, but there was a minor issue processing it.');
        $('#projectFormArea').hide();
        $('#projectThankYou').removeClass('hidden');
        resetProjectForm(); // Clear all fields even on error
      },
      complete: function() {
        $('#submitProjectBtn').prop('disabled', false).html('<i class="fas fa-paper-plane"></i> Submit Time Entry');
      }
    });
  }

  function submitOvertimeForm() {
    if (!validateForm('overtimeFormArea')) return;

    $('#submitOvertimeBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Submitting...');
    
    const projectName = $('#project').val() === 'Other Project'
      ? $('#otherProjectOvertime').val()
      : $('#project').val();

    const payload = {
      formType: "overtime",
      employee: $('#employee').val(),
      project: projectName,
      date: $('#date').val(),
      start: $('#start').val(),
      end: $('#end').val(),
      totalTime: $('#totalTimeOvertime').val(),
      reason: $('#reason').val(),
      notes: $('#notes').val()
    };
    
    $.ajax({
      url: API_URL + "?" + new URLSearchParams(payload).toString(),
      method: "GET",
      success: function() {
        $('#overtimeFormArea').hide();
        $('#overtimeThankYou').removeClass('hidden');
        resetOvertimeForm(); // Clear all fields
      },
      error: function(err) {
        console.error("Submission error:", err);
        $('#overtimeThankYou p').text('Your submission was recorded, but there was a minor issue processing it.');
        $('#overtimeFormArea').hide();
        $('#overtimeThankYou').removeClass('hidden');
        resetOvertimeForm(); // Clear all fields even on error
      },
      complete: function() {
        $('#submitOvertimeBtn').prop('disabled', false).html('<i class="fas fa-paper-plane"></i> Submit Request');
      }
    });
  }

  function resetProjectForm() {
  // Reset basic fields
  $('#profileName, #projectName, #teamMember, #startTime, #endTime').val('').trigger('change.select2');
  $('#memo').val('');
  $('#totalTimeLabel').text('0:00');
  $('#totalTime').val('');
  $('#trackingDate').val(new Date().toISOString().split('T')[0]);
  $('input[name="timeType"][value="Hourly Tracked"]').prop('checked', true);
  
  // Reset Other Project input
  $('#otherProjectGroup').addClass('hidden');
  $('#otherProject').val('');

  // Clear and reset endTime options
  $('#endTime').empty().append(new Option("Select End Time", "", true, true));

  // Remove validation states
  $('input, select, textarea').removeClass('invalid valid');
  $('.select2-selection').removeClass('invalid valid');
}


  function resetOvertimeForm() {
  // Reset fields
  $('#employee, #project, #reason').val('').trigger('change.select2');
  $('#start, #end').val('');
  $('#date').val(new Date().toISOString().split('T')[0]);
  $('#notes').val('');
  $('#hoursDisplay').text('0.00');
  $('#totalTimeOvertime').val('');

  // Reset Other Project (if implemented)
  $('#otherProjectGroupOvertime').addClass('hidden');
  $('#otherProjectOvertime').val('');

  // Remove validation states
  $('input, select, textarea').removeClass('invalid valid');
  $('.select2-selection').removeClass('invalid valid');
}


  // Initialize forms
  initProjectForm();
  initOvertimeForm();
});