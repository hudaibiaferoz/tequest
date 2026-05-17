// js/main.js — Landing page logic

// ── Navbar scroll effect ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ── Hamburger menu ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger?.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
mobileMenu?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── Countdown Timer ──
function updateCountdown() {
  const target = new Date('2026-05-20T09:00:00');
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) {
    document.getElementById('cdDays').textContent = '00';
    document.getElementById('cdHours').textContent = '00';
    document.getElementById('cdMins').textContent = '00';
    document.getElementById('cdSecs').textContent = '00';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cdDays').textContent = String(d).padStart(2, '0');
  document.getElementById('cdHours').textContent = String(h).padStart(2, '0');
  document.getElementById('cdMins').textContent = String(m).padStart(2, '0');
  document.getElementById('cdSecs').textContent = String(s).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

// ── Competitions Grid ──
// API is declared globally in config.js — do not redeclare here

const COMP_DATA = [
  { id:1, name:'Think Fast to Win Challenge',desc:'Solve riddles, crack clues and prove your thinking. Logic meets lateral thinking under time pressure.', max_teams:20 },
  { id:2, name:'Battle of Interfaces',desc:'Recreate. Innovate. Impress. Recreate a given UI with creativity and precision.', max_teams:20 },
  { id:3, name:'Frames of Imagination', desc:'Tell a story with creativity and logic through a visual presentation challenge.', max_teams:20 },
  { id:4, name:'Race Against the Clock',desc:'Complete the most coding tasks in limited time. Show your speed and programming skills.', max_teams:20 },
  { id:5, name:'Watch. Recall. Rebuild.',desc:'Test your memory, recall and attention to detail. Watch it, then rebuild it from memory.', max_teams:20 }
];

async function loadCompetitions() {
  let data;
  try {
    const res = await fetch(`${API}/api/competitions`, { signal: AbortSignal.timeout(5000) });
    data = await res.json();
  } catch {
    data = COMP_DATA.map(c => ({ ...c, registered_teams: 0, is_open: true }));
  }
  renderCompGrid(data);
  renderSlotsList(data);
}

function renderCompGrid(comps) {
  const grid = document.getElementById('compGrid');
  if (!grid) return;
  grid.innerHTML = comps.map(c => {
    const left = c.max_teams - (c.registered_teams || 0);
    const isFull = left <= 0 || !c.is_open;
    const isLow = left <= 5 && !isFull;
    return `
    <div class="comp-card${isFull ? ' full' : ''}">
      ${isFull ? '<span class="comp-badge-full">Full</span>' : ''}
      <div class="comp-icon">${c.icon || '🏆'}</div>
      <div class="comp-name">${c.name}</div>
      <div class="comp-desc">${c.desc}</div>
      <div class="comp-slots">
        <span>${isFull ? 'Registration Closed' : 'Slots Available'}</span>
        <span class="slots-count${isFull ? ' full' : isLow ? ' low' : ''}">
          ${isFull ? '0/20' : `${left}/20`}
        </span>
      </div>
    </div>`;
  }).join('');
}

function renderSlotsList(comps) {
  const list = document.getElementById('slotsList');
  if (!list) return;
  list.innerHTML = comps.map(c => {
    const left = c.max_teams - (c.registered_teams || 0);
    const isFull = left <= 0 || !c.is_open;
    const isLow = left <= 5 && !isFull;
    const cls = isFull ? 'closed' : isLow ? 'low' : 'open';
    const label = isFull ? 'Full' : `${left} left`;
    return `<div class="slot-row">
      <span>${c.name.split(' ').slice(0,3).join(' ')}…</span>
      <span class="slot-badge ${cls}">${label}</span>
    </div>`;
  }).join('');
}

// ── Intersection Observer for animations ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.animationPlayState = 'running';
      e.target.classList.add('in-view');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.comp-card, .rule-card, .av-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// Trigger in-view
const styleSheet = document.createElement('style');
styleSheet.textContent = '.in-view { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(styleSheet);

document.addEventListener("DOMContentLoaded", () => {
  loadCompetitions();
});
