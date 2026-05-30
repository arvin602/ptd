// =============================================================
// app.js — PTD core logic
// Config, auth, data loading, rendering
// =============================================================


// ── Config ────────────────────────────────────────────────────

const SUPABASE_URL  = 'https://zpljfpfajhykjdglktil.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwbGpmcGZhamh5a2pkZ2xrdGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjYwODQsImV4cCI6MjA4OTcwMjA4NH0.rFIiKNagw3qXQ1Tq4niYPhLuGyzU7ayFkC_MtpYrZzo';
const BUCKET        = 'worksheets';
const INVITE_CODE   = 'PTD-2025';   // ← share this with anyone you want to give access

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);


// ── Subject colours ───────────────────────────────────────────

const subjectCfg = {
  Math:    { cls: 'sc-math',    color: '#2563eb', dot: '#93c5fd' },
  English: { cls: 'sc-english', color: '#9333ea', dot: '#d8b4fe' },
  Science: { cls: 'sc-science', color: '#16a34a', dot: '#86efac' },
  History: { cls: 'sc-history', color: '#ea580c', dot: '#fdba74' },
  French:  { cls: 'sc-french',  color: '#e11d48', dot: '#fda4af' },
  Geo:     { cls: 'sc-geo',     color: '#ca8a04', dot: '#fde68a' },
  General: { cls: 'sc-general', color: '#475569', dot: '#cbd5e1' },
};


// ── App state ─────────────────────────────────────────────────

let activeSubject = 'All';
let viewMode      = 'grid';
let navView       = 'all';
let allWorksheets = [];


// ── Auth ──────────────────────────────────────────────────────

// Check if the user is already logged in when the page loads.
// If they are, skip the login screen and go straight to the app.
window.addEventListener('load', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    showApp(session.user);
  }
});

function switchTab(tab) {
  document.getElementById('form-login').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('form-forgot').style.display = tab === 'forgot' ? 'block' : 'none';

  document.getElementById('tab-login').classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');

  clearAuthMessages();
}

function clearAuthMessages() {
  ['login-error', 'signup-error', 'signup-success', 'forgot-error', 'forgot-success'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); el.textContent = ''; }
  });
}

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}

function showSuccess(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  clearAuthMessages();

  if (!email || !password) {
    showError('login-error', 'Please enter your email and password.');
    return;
  }

  const btn = document.querySelector('#form-login .btn-enter');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.innerHTML = 'Sign In <span>→</span>';

  if (error) {
    showError('login-error', 'Incorrect email or password. Please try again.');
    return;
  }

  showApp(data.user);
}

async function handleSignup() {
  const code     = document.getElementById('signup-code').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  clearAuthMessages();

  if (code !== INVITE_CODE) {
    showError('signup-error', 'Invalid invite code. Contact Prem Tutoring to get access.');
    return;
  }

  if (!email || !password) {
    showError('signup-error', 'Please fill in all fields.');
    return;
  }

  if (password.length < 6) {
    showError('signup-error', 'Password must be at least 6 characters.');
    return;
  }

  const btn = document.querySelector('#form-signup .btn-enter');
  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  const { error } = await sb.auth.signUp({ email, password });

  btn.disabled = false;
  btn.innerHTML = 'Create Account <span>→</span>';

  if (error) {
    showError('signup-error', error.message);
    return;
  }

  showSuccess('signup-success', 'Account created! Check your email to confirm your address, then sign in.');
  document.getElementById('signup-code').value     = '';
  document.getElementById('signup-email').value    = '';
  document.getElementById('signup-password').value = '';
}

async function handleForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();

  clearAuthMessages();

  if (!email) {
    showError('forgot-error', 'Please enter your email address.');
    return;
  }

  const btn = document.querySelector('#form-forgot .btn-enter');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  const { error } = await sb.auth.resetPasswordForEmail(email);

  btn.disabled = false;
  btn.innerHTML = 'Send Reset Link <span>→</span>';

  if (error) {
    showError('forgot-error', error.message);
    return;
  }

  showSuccess('forgot-success', 'Reset link sent — check your inbox.');
}

async function handleLogout() {
  await sb.auth.signOut();

  document.getElementById('app-page').classList.remove('active');
  document.getElementById('login-page').classList.add('active');
  document.getElementById('search-input').value = '';
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';

  activeSubject = 'All';
  navView       = 'all';
  allWorksheets = [];

  switchTab('login');
}


// ── Enter key support ─────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const loginVisible  = document.getElementById('form-login').style.display  !== 'none';
  const signupVisible = document.getElementById('form-signup').style.display !== 'none';
  const forgotVisible = document.getElementById('form-forgot').style.display !== 'none';
  if (loginVisible)  handleLogin();
  if (signupVisible) handleSignup();
  if (forgotVisible) handleForgotPassword();
});


// ── App initialisation ────────────────────────────────────────

function showApp(user) {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('app-page').classList.add('active');

  const initial = user.email[0].toUpperCase();
  document.getElementById('user-avatar').textContent        = initial;
  document.getElementById('user-email-display').textContent = user.email;
  document.getElementById('topbar-user-badge').innerHTML    = `
    <div class="topbar-user-dot"></div>
    ${user.email}
  `;

  document.getElementById('content-area').innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading worksheets…</p>
    </div>
  `;

  loadWorksheets();
}


// ── Data loading ──────────────────────────────────────────────

async function loadWorksheets() {
  try {
    const { data, error } = await sb
      .from('worksheets')
      .select('*')
      .order('date_added', { ascending: false });

    if (error) throw error;

    allWorksheets = (data || []).map(normaliseRow);
    updateSidebar();
    updateStats();
    renderView();
  } catch (err) {
    document.getElementById('content-area').innerHTML = `
      <div class="loading-state">
        <div style="font-size: 40px">⚠️</div>
        <p style="color: #dc2626">Could not load worksheets: ${err.message}</p>
        <p style="font-size: 12px; color: var(--slate)">Check your Supabase table and RLS policies.</p>
      </div>
    `;
  }
}

function normaliseRow(row) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const emojis = { Math:'📐', English:'✏️', Science:'🔬', History:'🌍', French:'🇫🇷', Geo:'🗺️', General:'📝' };
  const d = new Date(row.date_added);

  return {
    id:          row.id,
    title:       row.title        || 'Untitled',
    subject:     row.subject      || 'General',
    topic:       row.topic        || row.subject || 'General',
    grade:       row.grade        || 'All grades',
    pages:       row.pages        || 1,
    date:        months[d.getMonth()] + ' ' + d.getFullYear(),
    dateObj:     d,
    emoji:       emojis[row.subject] || '📄',
    curriculum:  row.curriculum   || 'Ontario',
    difficulty:  row.difficulty   || 'Intermediate',
    description: row.description  || '',
    tutorNotes:  row.tutor_notes  || '',
    filePath:    row.file_path    || null,
  };
}

function getPublicUrl(filePath) {
  if (!filePath) return null;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
}


// ── Sidebar ───────────────────────────────────────────────────

function updateSidebar() {
  document.getElementById('nc-all').textContent = allWorksheets.length;
  buildSubjectNav();
  buildGradeNav();
  buildGradeDropdown();
  buildSubjectPills();
}

function buildSubjectNav() {
  const subjects = ['All', ...new Set(allWorksheets.map(w => w.subject))];

  document.getElementById('subject-nav').innerHTML = subjects.map(s => {
    const cfg   = subjectCfg[s];
    const count = s === 'All' ? allWorksheets.length : allWorksheets.filter(w => w.subject === s).length;
    const dot   = cfg
      ? `<span class="subject-dot" style="background: ${cfg.dot}"></span>`
      : `<span class="subject-dot" style="background: var(--teal-lt)"></span>`;

    return `
      <button class="nav-item" onclick="setSidebarSubject('${s}', this)">
        <span class="ni-icon">${dot}</span> ${s}
        <span class="nav-count">${count}</span>
      </button>
    `;
  }).join('');
}

function buildGradeNav() {
  const grades = [...new Set(allWorksheets.map(w => w.grade))].sort();

  document.getElementById('grade-nav').innerHTML = grades.map(g => {
    const count = allWorksheets.filter(w => w.grade === g).length;
    return `
      <button class="nav-item" onclick="setSidebarGrade('${g}', this)" style="font-size: 12.5px">
        <span class="ni-icon">🏷</span> ${g}
        <span class="nav-count">${count}</span>
      </button>
    `;
  }).join('');
}

function buildGradeDropdown() {
  const grades = ['All', ...[...new Set(allWorksheets.map(w => w.grade))].sort()];
  document.getElementById('grade-filter').innerHTML = grades
    .map(g => `<option value="${g}">${g === 'All' ? 'All grades' : g}</option>`)
    .join('');
}

function buildSubjectPills() {
  const subjects = ['All', ...new Set(allWorksheets.map(w => w.subject))];
  document.getElementById('subject-pills').innerHTML = subjects
    .map(s => `<button class="pill ${s === activeSubject ? 'active' : ''}" onclick="setSubjectFilter('${s}')">${s}</button>`)
    .join('');
}


// ── Stats ─────────────────────────────────────────────────────

function updateStats() {
  const now       = new Date();
  const thisMonth = allWorksheets.filter(w =>
    w.dateObj.getMonth()    === now.getMonth() &&
    w.dateObj.getFullYear() === now.getFullYear()
  ).length;

  document.getElementById('stat-total').textContent    = allWorksheets.length;
  document.getElementById('stat-subjects').textContent = new Set(allWorksheets.map(w => w.subject)).size;
  document.getElementById('stat-grades').textContent   = new Set(allWorksheets.map(w => w.grade)).size;
  document.getElementById('stat-new').textContent      = thisMonth;
}


// ── Navigation ────────────────────────────────────────────────

function setNavView(view, btn) {
  navView       = view;
  activeSubject = 'All';

  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildSubjectPills();
  document.getElementById('grade-filter').value = 'All';

  const titles = { all: 'All Worksheets', recent: 'Recent Additions', upload: 'Upload Worksheet' };
  const subs   = { all: 'Browse the full PTD library', recent: 'Worksheets added in the last 30 days', upload: 'Add a new worksheet to the PTD library' };

  document.getElementById('view-title').textContent    = titles[view] || 'Library';
  document.getElementById('view-subtitle').textContent = subs[view]   || '';

  const isUpload = view === 'upload';
  document.getElementById('filter-bar').style.display    = isUpload ? 'none' : 'flex';
  document.getElementById('view-controls').style.display = isUpload ? 'none' : 'flex';

  renderView();
}

function setSidebarSubject(subject, btn) {
  navView       = 'all';
  activeSubject = subject;

  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildSubjectPills();

  document.getElementById('view-title').textContent      = subject === 'All' ? 'All Worksheets' : subject;
  document.getElementById('view-subtitle').textContent   = subject === 'All' ? 'Browse the full PTD library' : `All ${subject} worksheets`;
  document.getElementById('filter-bar').style.display    = 'flex';
  document.getElementById('view-controls').style.display = 'flex';

  renderView();
}

function setSidebarGrade(grade, btn) {
  navView       = 'all';
  activeSubject = 'All';

  document.querySelectorAll('.sidebar .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildSubjectPills();

  document.getElementById('grade-filter').value          = grade;
  document.getElementById('view-title').textContent      = grade;
  document.getElementById('view-subtitle').textContent   = `All worksheets for ${grade}`;
  document.getElementById('filter-bar').style.display    = 'flex';
  document.getElementById('view-controls').style.display = 'flex';

  renderView();
}

function setSubjectFilter(subject) {
  activeSubject = subject;
  buildSubjectPills();
  renderView();
}

function setViewMode(mode) {
  viewMode = mode;
  document.getElementById('vt-grid').classList.toggle('active', mode === 'grid');
  document.getElementById('vt-list').classList.toggle('active', mode === 'list');
  renderView();
}


// ── Filtering & sorting ───────────────────────────────────────

function getFiltered() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const grade = document.getElementById('grade-filter').value;
  const sort  = document.getElementById('sort-select').value;

  let items = [...allWorksheets];

  if (navView === 'recent') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    items = items.filter(w => w.dateObj >= cutoff);
  }

  if (activeSubject !== 'All') items = items.filter(w => w.subject === activeSubject);
  if (grade !== 'All')         items = items.filter(w => w.grade === grade);

  if (query) {
    items = items.filter(w =>
      w.title.toLowerCase().includes(query)       ||
      w.subject.toLowerCase().includes(query)     ||
      w.topic.toLowerCase().includes(query)       ||
      w.grade.toLowerCase().includes(query)       ||
      w.description.toLowerCase().includes(query)
    );
  }

  if (sort === 'newest')    items.sort((a, b) => b.dateObj - a.dateObj);
  if (sort === 'az')        items.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'za')        items.sort((a, b) => b.title.localeCompare(a.title));
  if (sort === 'pages-asc') items.sort((a, b) => a.pages - b.pages);

  return items;
}


// ── Rendering ─────────────────────────────────────────────────

function renderView() {
  const area = document.getElementById('content-area');

  if (navView === 'upload') {
    renderUploadPanel(area);
    return;
  }

  const items = getFiltered();
  document.getElementById('result-info').innerHTML = `<strong>${items.length}</strong> of ${allWorksheets.length} results`;

  viewMode === 'grid' ? renderGrid(items, area) : renderList(items, area);
}

function renderGrid(items, area) {
  if (!items.length) {
    area.innerHTML = `
      <div class="worksheet-grid">
        <div class="empty-state">
          <div class="es-icon">🔍</div>
          <h3>No results found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      </div>
    `;
    return;
  }

  area.innerHTML = `<div class="worksheet-grid">${items.map(cardHTML).join('')}</div>`;
}

function cardHTML(w) {
  const cfg = subjectCfg[w.subject] || subjectCfg.General;

  return `
    <div class="ws-card" onclick="openModal('${w.id}')">
      <div class="card-accent" style="background: ${cfg.color}"></div>
      <div class="card-body">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px">
          <span class="card-subject-tag ${cfg.cls}">${w.subject}</span>
          <span style="font-size: 11px; color: var(--slate)">${w.date}</span>
        </div>
        <div class="card-title">${w.title}</div>
        <div class="card-meta">
          <span class="meta-tag">📌 ${w.topic}</span>
          <span class="meta-tag">🎓 ${w.grade}</span>
          <span class="meta-tag">📄 ${w.pages}p</span>
          <span class="meta-tag">${w.difficulty}</span>
        </div>
        <div class="card-actions">
          <button class="btn-sm btn-ghost" onclick="event.stopPropagation(); openModal('${w.id}')">👁 Preview</button>
          <button class="btn-sm btn-teal"  onclick="event.stopPropagation(); downloadFile('${w.id}')">⬇ PDF</button>
        </div>
      </div>
    </div>
  `;
}

function renderList(items, area) {
  if (!items.length) {
    area.innerHTML = `
      <div style="padding: 28px">
        <div class="empty-state">
          <div class="es-icon">🔍</div>
          <h3>No results found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      </div>
    `;
    return;
  }

  const rows = items.map(w => {
    const cfg = subjectCfg[w.subject] || subjectCfg.General;
    return `
      <div class="list-row" onclick="openModal('${w.id}')">
        <div class="list-title-cell">
          <div class="list-emoji ${cfg.cls}">${w.emoji}</div>
          <div>
            <div class="list-title">${w.title}</div>
            <div class="list-topic">${w.topic}</div>
          </div>
        </div>
        <div><span class="list-badge ${cfg.cls}">${w.subject}</span></div>
        <div class="lr-grade list-grade">${w.grade}</div>
        <div class="lr-pages list-pages">${w.pages} pages</div>
        <div class="list-actions">
          <button class="btn-sm btn-ghost" style="padding: 6px 10px; font-size: 12px" onclick="event.stopPropagation(); openModal('${w.id}')">👁</button>
          <button class="btn-sm btn-teal"  style="padding: 6px 10px; font-size: 12px" onclick="event.stopPropagation(); downloadFile('${w.id}')">⬇</button>
        </div>
      </div>
    `;
  }).join('');

  area.innerHTML = `
    <div class="worksheet-list">
      <div class="list-header">
        <div>Worksheet</div>
        <div>Subject</div>
        <div class="lh-grade">Grade</div>
        <div class="lh-pages">Pages</div>
        <div>Actions</div>
      </div>
      ${rows}
    </div>
  `;
}


// ── File download ─────────────────────────────────────────────

function downloadFile(id) {
  const w = allWorksheets.find(x => x.id === id);
  if (!w || !w.filePath) {
    alert('No file linked to this worksheet yet.');
    return;
  }
  const url = getPublicUrl(w.filePath);
  if (url) window.open(url, '_blank');
}


// ── Modal ─────────────────────────────────────────────────────

function openModal(id) {
  const w = allWorksheets.find(x => x.id === id);
  if (!w) return;

  const cfg = subjectCfg[w.subject] || subjectCfg.General;

  document.getElementById('modal-banner').style.background = cfg.color;
  document.getElementById('modal-stag').textContent        = w.subject + ' · ' + w.topic;
  document.getElementById('modal-stag').className          = `modal-subject-tag ${cfg.cls}`;
  document.getElementById('modal-title').textContent       = w.title;
  document.getElementById('mi-grade').textContent          = w.grade;
  document.getElementById('mi-pages').textContent          = w.pages + ' pages';
  document.getElementById('mi-date').textContent           = w.date;
  document.getElementById('mi-topic').textContent          = w.topic;
  document.getElementById('mi-curriculum').textContent     = w.curriculum;
  document.getElementById('mi-diff').textContent           = w.difficulty;
  document.getElementById('mi-desc').textContent           = w.description || 'No description provided.';
  document.getElementById('mi-notes').textContent          = w.tutorNotes  || 'No tutor notes added.';

  const url         = w.filePath ? getPublicUrl(w.filePath) : null;
  const previewBtn  = document.getElementById('modal-preview-btn');
  const downloadBtn = document.getElementById('modal-download-btn');

  if (url) {
    previewBtn.onclick  = () => window.open(url, '_blank');
    downloadBtn.onclick = () => window.open(url, '_blank');
    previewBtn.style.opacity  = '1';
    downloadBtn.style.opacity = '1';
  } else {
    previewBtn.onclick  = () => alert('No PDF file linked to this worksheet.');
    downloadBtn.onclick = () => alert('No PDF file linked to this worksheet.');
    previewBtn.style.opacity  = '0.5';
    downloadBtn.style.opacity = '0.5';
  }

  document.getElementById('modal-bg').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  document.body.style.overflow = '';
}

function handleModalBgClick(e) {
  if (e.target === document.getElementById('modal-bg')) closeModal();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
