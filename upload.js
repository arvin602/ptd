// =============================================================
// upload.js — PTD upload panel
// Only runs when a Tutor navigates to the upload view
// =============================================================


function renderUploadPanel(area) {
  area.innerHTML = `
    <div class="upload-panel">
      <div class="upload-form">

        <div class="upload-success" id="upload-success">
          ✅ Worksheet uploaded and added to the library!
        </div>
        <div class="upload-error" id="upload-error"></div>

        <div class="up-section">
          <div class="up-section-title">📄 PDF File</div>
          <div class="drop-zone" id="drop-zone">
            <input type="file" accept=".pdf" id="pdf-input" onchange="onFileChosen(this)" />
            <div class="drop-icon">📂</div>
            <div class="drop-label">Drop your PDF here, or click to browse</div>
            <div class="drop-sub">Accepts .pdf files only · Max 50 MB</div>
            <div class="drop-chosen" id="drop-chosen"></div>
          </div>
          <div class="progress-bar-wrap" id="progress-wrap">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
        </div>

        <div class="up-section">
          <div class="up-section-title">📝 Worksheet Details</div>
          <div class="up-grid">

            <div class="up-field full">
              <label>Title</label>
              <input type="text" id="up-title" placeholder="e.g. Quadratics & Factoring" />
            </div>

            <div class="up-field">
              <label>Subject</label>
              <select id="up-subject">
                <option value="">Select subject…</option>
                <option>Math</option>
                <option>English</option>
                <option>Science</option>
                <option>History</option>
                <option>French</option>
                <option>Geo</option>
                <option>General</option>
              </select>
            </div>

            <div class="up-field">
              <label>Topic</label>
              <input type="text" id="up-topic" placeholder="e.g. Algebra" />
            </div>

            <div class="up-field">
              <label>Grade Level</label>
              <select id="up-grade">
                <option value="">Select grade…</option>
                <option>Kindergarten</option>
                <option>Grade 1</option>
                <option>Grade 2</option>
                <option>Grade 3</option>
                <option>Grade 4</option>
                <option>Grade 5</option>
                <option>Grade 6</option>
                <option>Grade 7</option>
                <option>Grade 8</option>
                <option>Grade 9</option>
                <option>Grade 10</option>
                <option>Grade 11</option>
                <option>Grade 12</option>
                <option>All grades</option>
              </select>
            </div>

            <div class="up-field">
              <label>Difficulty</label>
              <select id="up-diff">
                <option value="">Select difficulty…</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>

            <div class="up-field">
              <label>Number of Pages</label>
              <input type="number" id="up-pages" placeholder="e.g. 4" min="1" />
            </div>

            <div class="up-field">
              <label>Curriculum</label>
              <input type="text" id="up-curriculum" placeholder="e.g. Ontario" value="Ontario" />
            </div>

            <div class="up-field full">
              <label>Description</label>
              <textarea id="up-desc" placeholder="Brief description of what this worksheet covers…"></textarea>
            </div>

            <div class="up-field full">
              <label>
                Tutor Notes
                <span style="font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 11px; color: var(--slate)">
                  (only visible to tutors)
                </span>
              </label>
              <textarea id="up-notes" placeholder="Tips, common mistakes, how to use this sheet…"></textarea>
            </div>

          </div>
        </div>

        <div class="up-actions">
          <button class="btn-upload" id="submit-btn" onclick="submitUpload()">⬆ Add to Library</button>
          <button class="btn-upload-ghost" onclick="clearUploadForm()">Clear form</button>
        </div>

      </div>
    </div>
  `;

  const dz = document.getElementById('drop-zone');

  dz.addEventListener('dragover', e => {
    e.preventDefault();
    dz.classList.add('dragover');
  });

  dz.addEventListener('dragleave', () => {
    dz.classList.remove('dragover');
  });

  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      document.getElementById('pdf-input').files = e.dataTransfer.files;
      showChosenFile(file.name);
    }
  });
}


function onFileChosen(input) {
  if (input.files[0]) showChosenFile(input.files[0].name);
}

function showChosenFile(name) {
  const el = document.getElementById('drop-chosen');
  if (el) {
    el.textContent    = '📎 ' + name;
    el.style.display  = 'block';
  }
}


async function submitUpload() {
  const title   = document.getElementById('up-title').value.trim();
  const subject = document.getElementById('up-subject').value;
  const topic   = document.getElementById('up-topic').value.trim();
  const grade   = document.getElementById('up-grade').value;
  const diff    = document.getElementById('up-diff').value;
  const pages   = parseInt(document.getElementById('up-pages').value) || 1;
  const curr    = document.getElementById('up-curriculum').value.trim() || 'Ontario';
  const desc    = document.getElementById('up-desc').value.trim();
  const notes   = document.getElementById('up-notes').value.trim();
  const file    = document.getElementById('pdf-input')?.files[0];

  const errEl = document.getElementById('upload-error');
  errEl.classList.remove('show');

  if (!title || !subject || !grade) {
    errEl.textContent = 'Please fill in Title, Subject, and Grade before uploading.';
    errEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled    = true;
  btn.textContent = '⏳ Uploading…';

  try {
    let filePath = null;

    if (file) {
      setProgress(20);

      const ext      = file.name.split('.').pop();
      const safeName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      filePath       = `${Date.now()}_${safeName}.${ext}`;

      const { error: storageErr } = await sb.storage
        .from(BUCKET)
        .upload(filePath, file, { contentType: 'application/pdf', upsert: false });

      if (storageErr) throw new Error('Storage error: ' + storageErr.message);
      setProgress(60);
    }

    const { error: dbErr } = await sb.from('worksheets').insert({
      title,
      subject,
      topic:        topic || subject,
      grade,
      difficulty:   diff  || 'Intermediate',
      pages,
      curriculum:   curr,
      description:  desc,
      tutor_notes:  notes,
      file_path:    filePath,
    });

    if (dbErr) throw new Error('Database error: ' + dbErr.message);
    setProgress(100);

    await loadWorksheets();

    const suc = document.getElementById('upload-success');
    if (suc) {
      suc.classList.add('show');
      setTimeout(() => suc.classList.remove('show'), 5000);
    }

    clearUploadForm();

  } catch (err) {
    errEl.textContent = '❌ Upload failed: ' + err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '⬆ Add to Library';
    setTimeout(() => setProgress(0), 1000);
  }
}


function setProgress(pct) {
  const wrap = document.getElementById('progress-wrap');
  const bar  = document.getElementById('progress-bar');
  if (!wrap || !bar) return;
  wrap.classList.toggle('show', pct > 0);
  bar.style.width = pct + '%';
}


function clearUploadForm() {
  ['up-title', 'up-topic', 'up-pages', 'up-desc', 'up-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const curr = document.getElementById('up-curriculum');
  if (curr) curr.value = 'Ontario';

  ['up-subject', 'up-grade', 'up-diff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  const fileInput  = document.getElementById('pdf-input');
  const dropChosen = document.getElementById('drop-chosen');

  if (fileInput)  fileInput.value = '';
  if (dropChosen) { dropChosen.textContent = ''; dropChosen.style.display = 'none'; }

  setProgress(0);
}
