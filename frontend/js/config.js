// js/config.js — Single source of truth for API URL
// All other JS files use the global `API` set here — do NOT redeclare it.

const API =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : 'https://tequest-backend-jq8o.onrender.com';

// Expose as window property so other scripts can reference it safely
window.API = API;

const COMPETITIONS = [
  {
    id: 1,
    name: 'Think Fast to Win Challenge',
    icon: '🧩',
    desc: 'Solve riddles, crack the clues and prove your thinking speed. Logic meets lateral thinking under time pressure.',
    max_teams: 20
  },
  {
    id: 2,
    name: 'Battle of Interfaces',
    icon: '🎨',
    desc: 'Recreate. Innovate. Impress. Bring design to life. Recreate a given UI with creativity and precision.',
    max_teams: 20
  },
  {
    id: 3,
    name: 'Frames of Imagination',
    icon: '📽️',
    desc: 'Impress. Connect. Inspire. Tell a story with creativity and logic through a visual presentation challenge.',
    max_teams: 20
  },
  {
    id: 4,
    name: 'Race Against the Clock',
    icon: '⚡',
    desc: 'Complete the most coding tasks in limited time. Show your speed and skills in rapid-fire programming.',
    max_teams: 20
  },
  {
    id: 5,
    name: 'Watch. Recall. Rebuild.',
    icon: '🧠',
    desc: 'Test your memory, recall, and attention to detail. Watch a demo, then rebuild it from memory.',
    max_teams: 20
  }
];

async function fetchCompetitions() {
  try {
    const res = await fetch(`${API}/api/competitions`); // fixed: was API_BASE
    if (!res.ok) throw new Error('API unavailable');
    return await res.json();
  } catch {
    return COMPETITIONS.map(c => ({ ...c, registered_teams: 0, is_open: true }));
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});
