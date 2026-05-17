// js/register.js
// API is declared globally in config.js — do not redeclare here

// ── Fallback data ──
const COMP_DATA = [
  { id: 1, name: 'Think Fast to Win Challenge', max_teams: 20 },
  { id: 2, name: 'Battle of Interfaces', max_teams: 20 },
  { id: 3, name: 'Frames of Imagination', max_teams: 20 },
  { id: 4, name: 'Race Against the Clock', max_teams: 20 },
  { id: 5, name: 'Watch. Recall. Rebuild.', max_teams: 20 }
];

let competitions = [];
let selectedCompId = null;

// ── Load competitions ──
async function loadComps() {
  try {
    const res = await fetch(`${API}/api/competitions`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    competitions = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("API load failed:", err);

    competitions = COMP_DATA.map(c => ({
      ...c,
      registered_teams: 0,
      is_open: true
    }));
  }

  renderSlotChips();
  renderCompSelectGrid();
}

// ── Render chips ──
function renderSlotChips() {
  const bar = document.getElementById('slotStatusBar');
  if (!bar) return;

  bar.innerHTML = competitions.map(c => {
    const left = c.max_teams - (c.registered_teams || 0);
    const isFull = left <= 0 || !c.is_open;
    const isLow = left <= 5 && !isFull;

    const cls = isFull ? 'closed' : isLow ? 'low' : 'open';

    return `
      <div class="slot-chip ${cls}">
        <div class="slot-chip-dot"></div>
        ${c.name.split(' ').slice(0, 3).join(' ')} —
        ${isFull ? 'Full' : `${left} slots left`}
      </div>
    `;
  }).join('');
}

// ── Render competition cards ──
function renderCompSelectGrid() {
  const grid = document.getElementById('compSelectGrid');
  if (!grid) return;

  grid.innerHTML = competitions.map(c => {
    const left = c.max_teams - (c.registered_teams || 0);
    const isFull = left <= 0 || !c.is_open;
    const isLow = left <= 5 && !isFull;

    return `
      <div class="comp-select-card ${isFull ? 'disabled' : ''}" data-id="${c.id}">
        <div class="csc-name">${c.name}</div>
        <div class="csc-slots ${isFull ? 'full' : isLow ? 'low' : ''}">
          ${isFull ? 'Registration Closed' : `${left} of ${c.max_teams} slots remaining`}
        </div>
        <span class="csc-badge ${isFull ? 'closed' : 'open'}">
          ${isFull ? 'Closed' : 'Open'}
        </span>
      </div>
    `;
  }).join('');

  // attach events safely
  document.querySelectorAll('.comp-select-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      selectComp(id);
    });
  });
}

// ── Select competition ──
function selectComp(id) {
  selectedCompId = id;

  const hidden = document.getElementById('selectedComp');
  if (hidden) hidden.value = id;

  document.querySelectorAll('.comp-select-card').forEach(card => {
    card.classList.toggle('selected', parseInt(card.dataset.id) === id);
  });

  const err = document.getElementById('compError');
  if (err) err.textContent = '';
}

// ── Validation ──
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
  return /^[A-Za-z0-9\-]{5,20}$/.test(value.trim());
}

// ── Submit form ──
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('regForm');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let valid = true;

    if (!selectedCompId) {
      document.getElementById('compError').textContent = 'Please select a competition.';
      valid = false;
    }

    form.querySelectorAll('input[required], select[required]').forEach(input => {
      if (input.type === 'hidden') return; // skip hidden inputs, validated separately
      if (!validateField(input)) valid = false;
    });

    const m1Id = form.querySelector('[name="m1_juw_id"]').value.trim();
    const m2Id = form.querySelector('[name="m2_juw_id"]').value.trim();

    if (m1Id && !validateJUWId(m1Id)) valid = false;
    if (m2Id && !validateJUWId(m2Id)) valid = false;
    if (m1Id && m2Id && m1Id.toLowerCase() === m2Id.toLowerCase()) valid = false;

    if (!valid) return;

    const payload = {
      competition_id: parseInt(selectedCompId),
      team_name: form.team_name.value.trim(),
      member1: {
        full_name: form.m1_name.value.trim(),
        father_name: form.m1_father.value.trim(),
        juw_id: m1Id,
        batch: form.m1_batch.value,
        section: form.m1_section.value,
        is_leader: true
      },
      member2: {
        full_name: form.m2_name.value.trim(),
        father_name: form.m2_father.value.trim(),
        juw_id: m2Id,
        batch: form.m2_batch.value,
        section: form.m2_section.value,
        is_leader: false
      }
    };

    try {
      const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Registration failed");

      alert("Registration successful!");
      form.reset();
      selectedCompId = null;
      loadComps();

    } catch (err) {
      alert(err.message || "Server error");
    }
  });

  loadComps();
});
