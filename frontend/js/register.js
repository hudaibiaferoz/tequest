// js/register.js

const API =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : 'https://tequest-backend-jq8o.onrender.com';


const COMP_DATA = [
  { id:1, name:'Think Fast to Win Challenge', max_teams:20 },
  { id:2, name:'Battle of Interfaces',max_teams:20 },
  { id:3, name:'Frames of Imagination', max_teams:20 },
  { id:4, name:'Race Against the Clock', max_teams:20 },
  { id:5, name:'Watch. Recall. Rebuild.', max_teams:20 }
];

let competitions = [];
let selectedCompId = null;

// ── Load competitions ──
async function loadComps() {
  try {
    const res = await fetch(`${API}/api/competitions`, { signal: AbortSignal.timeout(5000) });
    competitions = await res.json();
  } catch {
    competitions = COMP_DATA.map(c => ({ ...c, registered_teams: 0, is_open: true }));
  }
  renderSlotChips();
  renderCompSelectGrid();
}

function renderSlotChips() {
  const bar = document.getElementById('slotStatusBar');
  if (!bar) return;
  bar.innerHTML = competitions.map(c => {
    const left = c.max_teams - (c.registered_teams || 0);
    const isFull = left <= 0 || !c.is_open;
    const isLow = left <= 5 && !isFull;
    const cls = isFull ? 'closed' : isLow ? 'low' : 'open';
    return `<div class="slot-chip ${cls}">
      <div class="slot-chip-dot"></div>
      ${c.name.split(' ').slice(0,3).join(' ')} — ${isFull ? 'Full' : `${left} slots left`}
    </div>`;
  }).join('');
}

function renderCompSelectGrid() {
  const grid = document.getElementById('compSelectGrid');
  if (!grid) return;
  grid.innerHTML = competitions.map(c => {
    const left = c.max_teams - (c.registered_teams || 0);
    const isFull = left <= 0 || !c.is_open;
    const isLow = left <= 5 && !isFull;
    return `<div class="comp-select-card ${isFull ? 'disabled' : ''}" 
      data-id="${c.id}" onclick="${isFull ? '' : `selectComp(${c.id})`}">
      
      <div class="csc-name">${c.name}</div>
      <div class="csc-slots ${isFull ? 'full' : isLow ? 'low' : ''}">
        ${isFull ? 'Registration Closed' : `${left} of ${c.max_teams} slots remaining`}
      </div>
      <span class="csc-badge ${isFull ? 'closed' : 'open'}">${isFull ? 'Closed' : 'Open'}</span>
    </div>`;
  }).join('');
}

function selectComp(id) {
  selectedCompId = id;
  document.getElementById('selectedComp').value = id;
  document.querySelectorAll('.comp-select-card').forEach(card => {
    card.classList.toggle('selected', parseInt(card.dataset.id) === id);
  });
  document.getElementById('compError').textContent = '';
}

// ── Form Validation ──
function validateField(input) {
  const val = input.value.trim();
  const errorEl = input.closest('.field-group')?.querySelector('.field-error');
  if (!val) {
    input.classList.add('error');
    if (errorEl) errorEl.textContent = 'This field is required.';
    return false;
  }
  input.classList.remove('error');
  if (errorEl) errorEl.textContent = '';
  return true;
}

function validateJUWId(value) {
  // Basic JUW ID format check — adjust regex to match actual format
  return /^[A-Za-z0-9\-]{5,20}$/.test(value.trim());
}

// ── Form Submit ──
document.getElementById('regForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  let valid = true;

  // Validate competition
  if (!selectedCompId) {
    document.getElementById('compError').textContent = 'Please select a competition.';
    valid = false;
  }

  // Validate all required inputs
  form.querySelectorAll('input[required], select[required]').forEach(input => {
    if (!validateField(input)) valid = false;
  });

  // Validate JUW IDs
  const m1Id = form.querySelector('[name="m1_juw_id"]').value.trim();
  const m2Id = form.querySelector('[name="m2_juw_id"]').value.trim();
  if (m1Id && !validateJUWId(m1Id)) {
    document.getElementById('m1IdError').textContent = 'Invalid JUW ID format.';
    valid = false;
  }
  if (m2Id && !validateJUWId(m2Id)) {
    document.getElementById('m2IdError').textContent = 'Invalid JUW ID format.';
    valid = false;
  }
  if (m1Id && m2Id && m1Id.toLowerCase() === m2Id.toLowerCase()) {
    document.getElementById('m2IdError').textContent = 'Both members must have different JUW IDs.';
    valid = false;
  }

  if (!valid) {
    const formStatus = document.getElementById('formStatus');
    if (formStatus) {
      formStatus.classList.add('error');
      formStatus.textContent = 'Please fix the highlighted errors and try again.';
    }
    return;
  }

  // Build payload
  const payload = {
    competition_id: selectedCompId,
    team_name: form.querySelector('[name="team_name"]').value.trim(),
    member1: {
      full_name: form.querySelector('[name="m1_name"]').value.trim(),
      father_name: form.querySelector('[name="m1_father"]').value.trim(),
      juw_id: m1Id,
      batch: form.querySelector('[name="m1_batch"]').value,
      section: form.querySelector('[name="m1_section"]').value,
      is_leader: true
    },
    member2: {
      full_name: form.querySelector('[name="m2_name"]').value.trim(),
      father_name: form.querySelector('[name="m2_father"]').value.trim(),
      juw_id: m2Id,
      batch: form.querySelector('[name="m2_batch"]').value,
      section: form.querySelector('[name="m2_section"]').value,
      is_leader: false
    }
  };

  // Submit
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const spinner = document.getElementById('submitSpinner');
  const formStatus = document.getElementById('formStatus');
  formStatus.textContent = '';
  formStatus.classList.remove('error', 'success');
  submitBtn.disabled = true;
  submitText.textContent = 'Submitting…';
  spinner.classList.add('visible');

  try {
    const res = await fetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      const comp = competitions.find(c => c.id === selectedCompId);
      document.getElementById('successMsg').textContent = `"${payload.team_name}" has been registered for ${comp?.name}. See you on May 20!`;
      document.getElementById('successDetails').innerHTML = `
        <strong>Team:</strong> ${payload.team_name}<br>
        <strong>Competition:</strong> ${comp?.name}<br>
        <strong>Leader:</strong> ${payload.member1.full_name} (${m1Id})<br>
        <strong>Member 2:</strong> ${payload.member2.full_name} (${m2Id})
      `;
      openModal('successModal');
      const formStatus = document.getElementById('formStatus');
      if (formStatus) {
        formStatus.classList.remove('error');
        formStatus.classList.add('success');
        formStatus.textContent = 'Registration submitted successfully!';
      }
      form.reset();
      selectedCompId = null;
      loadComps();
    } else {
      const message = data.detail || data.message || 'Registration failed. Please try again.';
      document.getElementById('errorMsg').textContent = message;
      openModal('errorModal');
      const formStatus = document.getElementById('formStatus');
      if (formStatus) {
        formStatus.classList.add('error');
        formStatus.textContent = message;
      }
    }
  } catch (err) {
    const message = 'Cannot connect to server. Please check your internet connection and try again.';
    document.getElementById('errorMsg').textContent = message;
    openModal('errorModal');
    const formStatus = document.getElementById('formStatus');
    if (formStatus) {
      formStatus.classList.add('error');
      formStatus.textContent = message;
    }
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Submit Registration';
    spinner.classList.remove('visible');
  }
});

// Live validation
document.querySelectorAll('input[required], select[required]').forEach(input => {
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => {
    if (input.classList.contains('error')) validateField(input);
  });
});

loadComps();
