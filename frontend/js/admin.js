// js/admin.js

const API =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : 'https://tequest-backend-jq8o.onrender.com';

const ADMIN_PASS = 'tecquest2026'; // Change this or use env-based check
let allTeams = [];
let allComps = [];
let deleteTeamId = null;

// ── Login ──
function adminLogin() {
  const pass = document.getElementById('adminPass').value;
  if (pass === ADMIN_PASS) {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    sessionStorage.setItem('admin_auth', '1');
    loadAdminData();
  } else {
    document.getElementById('loginError').textContent = 'Incorrect password.';
  }
}

function adminLogout() {
  sessionStorage.removeItem('admin_auth');
  document.getElementById('adminLogin').style.display = 'flex';
  document.getElementById('adminDashboard').style.display = 'none';
}

// Auto-login if session active
if (sessionStorage.getItem('admin_auth')) {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'flex';
  loadAdminData();
}

// ── Views ──
function switchView(view, el) {
  document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
  document.querySelectorAll('.sn-item').forEach(a => a.classList.remove('active'));
  document.getElementById(`view-${view}`).style.display = 'block';
  el.classList.add('active');
  return false;
}

// ── Load all data ──
async function loadAdminData() {
  try {
    const [compsRes, teamsRes] = await Promise.all([
      fetch(`${API}/api/competitions`),
      fetch(`${API}/api/admin/teams`, { headers: { 'X-Admin-Key': ADMIN_PASS } })
    ]);
    allComps = await compsRes.json();
    allTeams = await teamsRes.json();
  } catch {
    allComps = [
      {id:1,name:'Think Fast to Win Challenge',registered_teams:0,max_teams:20,is_open:true},
      {id:2,name:'Battle of Interfaces',registered_teams:0,max_teams:20,is_open:true},
      {id:3,name:'Frames of Imagination',registered_teams:0,max_teams:20,is_open:true},
      {id:4,name:'Race Against the Clock',registered_teams:0,max_teams:20,is_open:true},
      {id:5,name:'Watch. Recall. Rebuild.',registered_teams:0,max_teams:20,is_open:true},
    ];
    allTeams = [];
  }
  renderOverview();
  renderTeamsTable(allTeams);
  renderCompManage();
  populateFilterDropdown();
}

// ── Overview ──
function renderOverview() {
  const cards = document.getElementById('overviewCards');
  const totalTeams = allTeams.length;
  const totalParticipants = totalTeams * 2;
  const fullComps = allComps.filter(c => c.registered_teams >= c.max_teams).length;
  const openComps = allComps.filter(c => c.is_open && c.registered_teams < c.max_teams).length;
  cards.innerHTML = `
    <div class="ov-card"><div class="ov-card-label">Total Teams</div><div class="ov-card-num">${totalTeams}</div></div>
    <div class="ov-card"><div class="ov-card-label">Participants</div><div class="ov-card-num blue">${totalParticipants}</div></div>
    <div class="ov-card"><div class="ov-card-label">Open Events</div><div class="ov-card-num">${openComps}</div></div>
    <div class="ov-card"><div class="ov-card-label">Full Events</div><div class="ov-card-num red">${fullComps}</div></div>
  `;
  const bars = document.getElementById('slotBars');
  bars.innerHTML = allComps.map(c => {
    const pct = Math.round(((c.registered_teams || 0) / c.max_teams) * 100);
    const cls = pct >= 100 ? 'full' : pct >= 70 ? 'low' : 'ok';
    return `<div class="slot-bar-row">
      <div class="sbr-header">
        <span>${c.name}</span>
        <span>${c.registered_teams || 0}/${c.max_teams} teams</span>
      </div>
      <div class="sbr-bar"><div class="sbr-fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ── Teams Table ──
function renderTeamsTable(teams) {
  const tbody = document.getElementById('teamsTableBody');
  if (!teams.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No registrations yet.</td></tr>';
    return;
  }
  tbody.innerHTML = teams.map((t, i) => {
    const comp = allComps.find(c => c.id === t.competition_id);
    const leader = t.participants?.find(p => p.is_leader) || t.participants?.[0] || {};
    const member2 = t.participants?.find(p => !p.is_leader) || t.participants?.[1] || {};
    const date = t.created_at ? new Date(t.created_at).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
    return `<tr>
      <td>${i+1}</td>
      <td><strong style="color:white">${t.team_name}</strong></td>
      <td><span class="td-comp-badge">${comp?.name?.split(' ').slice(0,2).join(' ') || '—'}</span></td>
      <td>${leader.full_name || '—'}<br><small style="color:rgba(255,255,255,.4)">${leader.juw_id || ''}</small></td>
      <td>${member2.full_name || '—'}<br><small style="color:rgba(255,255,255,.4)">${member2.juw_id || ''}</small></td>
      <td style="color:rgba(255,255,255,.5)">${date}</td>
      <td><button class="btn-delete" onclick="confirmDelete(${t.id})">Delete</button></td>
    </tr>`;
  }).join('');
}

// ── Filter ──
function populateFilterDropdown() {
  const sel = document.getElementById('filterComp');
  sel.innerHTML = '<option value="">All Competitions</option>' +
    allComps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function filterTeams() {
  const compId = parseInt(document.getElementById('filterComp').value);
  const filtered = compId ? allTeams.filter(t => t.competition_id === compId) : allTeams;
  renderTeamsTable(filtered);
}

// ── Competition Management ──
function renderCompManage() {
  const grid = document.getElementById('compManageGrid');
  grid.innerHTML = allComps.map(c => {
    const pct = Math.round(((c.registered_teams || 0) / c.max_teams) * 100);
    const cls = pct >= 100 ? 'full' : pct >= 70 ? 'low' : 'ok';
    return `<div class="comp-manage-card">
      <div class="cmc-header">
        <div class="cmc-name">${c.name}</div>
        <button class="cmc-toggle ${c.is_open ? 'close-btn' : ''}" onclick="toggleComp(${c.id}, ${c.is_open})">
          ${c.is_open ? 'Close' : 'Open'}
        </button>
      </div>
      <div class="cmc-bar">
        <div class="sbr-bar"><div class="sbr-fill ${cls}" style="width:${pct}%"></div></div>
      </div>
      <div class="cmc-stats">
        <strong>${c.registered_teams || 0}</strong> / ${c.max_teams} teams registered
        &nbsp;|&nbsp; Status: <strong style="color:${c.is_open ? '#22c55e' : 'var(--red)'}">${c.is_open ? 'Open' : 'Closed'}</strong>
      </div>
    </div>`;
  }).join('');
}

// ── Delete ──
function confirmDelete(id) {
  deleteTeamId = id;
  document.getElementById('confirmDeleteBtn').onclick = () => deleteTeam(id);
  openModal('deleteModal');
}

async function deleteTeam(id) {
  try {
    const res = await fetch(`${API}/api/admin/teams/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': ADMIN_PASS }
    });
    if (res.ok) {
      closeModal('deleteModal');
      loadAdminData();
    }
  } catch {
    alert('Failed to delete. Check connection.');
  }
}

// ── Toggle Competition ──
async function toggleComp(id, currentlyOpen) {
  try {
    await fetch(`${API}/api/admin/competitions/${id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_PASS },
      body: JSON.stringify({ is_open: !currentlyOpen })
    });
    loadAdminData();
  } catch {
    alert('Failed to update competition status.');
  }
}

// ── Export CSV ──
function exportCSV() {
  if (!allTeams.length) { alert('No data to export.'); return; }
  const rows = [['#','Team Name','Competition','Leader Name','Leader JUW ID','Leader Section','Leader Batch','M2 Name','M2 JUW ID','M2 Section','M2 Batch','Registered']];
  allTeams.forEach((t, i) => {
    const comp = allComps.find(c => c.id === t.competition_id);
    const leader = t.participants?.find(p => p.is_leader) || {};
    const m2 = t.participants?.find(p => !p.is_leader) || {};
    rows.push([
      i+1, t.team_name, comp?.name || '',
      leader.full_name||'', leader.juw_id||'', leader.section||'', leader.batch||'',
      m2.full_name||'', m2.juw_id||'', m2.section||'', m2.batch||'',
      t.created_at ? new Date(t.created_at).toLocaleString() : ''
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tecquest2026_registrations_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}
