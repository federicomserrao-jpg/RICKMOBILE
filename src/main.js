// main.js - Scalextric Catalog App
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// AUTH
// ============================================
const USUARIOS = {
  'admin':    { clave: 'ricky123',   rol: 'admin' },
  'invitado': { clave: 'invitado123', rol: 'guest' },
};
const SESSION_KEY = 'rickmobile_auth';
const THEME_KEY = 'rickmobile_theme';

let currentRol = null;
const isAdmin = () => currentRol === 'admin';

function isLoggedIn() {
  const s = sessionStorage.getItem(SESSION_KEY);
  if (!s) return false;
  const parsed = JSON.parse(s);
  currentRol = parsed.rol;
  return true;
}

// Theme
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

initTheme();

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-overlay">
      <div class="login-box">
        <div class="login-logo">🏎️</div>
        <div class="login-title">COLECCIÓN <span>RICKY</span></div>
        <div class="login-subtitle">Ingresá tus credenciales</div>
        <div class="form-field">
          <label class="form-label">Usuario</label>
          <input class="form-input" id="loginUser" type="text" placeholder="admin" autocomplete="username" />
        </div>
        <div class="form-field">
          <label class="form-label">Contraseña</label>
          <input class="form-input" id="loginPass" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <div class="login-error" id="loginError"></div>
        <button class="btn btn-primary" id="loginBtn">Ingresar 🏁</button>
      </div>
    </div>
  `;

  const doLogin = () => {
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value.trim();
    const match = USUARIOS[user];
    if (match && match.clave === pass) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, rol: match.rol }));
      currentRol = match.rol;
      initApp();
    } else {
      const err = document.getElementById('loginError');
      err.textContent = '⛔ Usuario o contraseña incorrectos';
      document.getElementById('loginPass').value = '';
    }
  };

  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

// ============================================
// STATE
// ============================================
let allCars = [];
let filteredCars = [];
let activeCategory = 'Todos';
let searchQuery = '';
let currentDetail = null;

const CATEGORIES = ['Todos', 'F1', 'GT', 'LMP', 'Rally', 'Calle', 'NASCAR', 'Indy', 'Camion'];

// ============================================
// RENDER APP SHELL
// ============================================
function initApp() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('app').innerHTML = `
    <div class="header">
      <div class="header-top">
        <div class="logo">COLECCIÓN <span>RICKY</span> 🏎️</div>
        <div class="header-right">
          ${!isAdmin() ? `<span class="guest-badge">👁️ Invitado</span>` : ''}
          <div class="stats-pill" id="statsTotal">...</div>
          <button class="theme-toggle" id="themeToggle">${theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </div>
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Buscar por marca, modelo, referencia..." autocomplete="off" autocorrect="off" spellcheck="false" />
      </div>
    </div>

    <div class="filters" id="filtersBar"></div>
    <div class="results-bar" id="resultsBar"></div>

    <div class="cars-list" id="carsList">
      <div class="loading">
        <div class="loading-spinner"></div>
        Cargando colección...
      </div>
    </div>

    ${isAdmin() ? `<button class="fab" id="fabAdd" title="Agregar auto">＋</button>` : ''}

    <div class="modal-overlay" id="detailOverlay">
      <div class="modal" id="detailModal">
        <div class="modal-handle"></div>
        <div id="detailContent"></div>
      </div>
    </div>

    <div class="modal-overlay" id="formOverlay">
      <div class="modal" id="formModal">
        <div class="modal-handle"></div>
        <div class="modal-title" id="formTitle">Agregar Auto</div>
        <div id="formContent"></div>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `;

  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFilters();
  });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  if (isAdmin()) document.getElementById('fabAdd').addEventListener('click', () => openForm());
  ['detailOverlay', 'formOverlay'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      if (e.target.id === id) closeOverlay(id);
    });
  });

  loadCars();
}

// ============================================
// LOAD DATA
// ============================================
async function loadCars() {
  let all = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('autos')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) { showToast('Error cargando datos', true); return; }
    if (!data || data.length === 0) break;

    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  allCars = all;
  updateStats();
  renderFilters();
  applyFilters();
}

function updateStats() {
  document.getElementById('statsTotal').textContent = `${allCars.length} autos`;
}

// ============================================
// FILTERS
// ============================================
function renderFilters() {
  const bar = document.getElementById('filtersBar');
  bar.innerHTML = CATEGORIES.map(cat => {
    const count = cat === 'Todos' ? allCars.length : allCars.filter(c => c.categoria === cat).length;
    return `
      <button class="filter-chip ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
        ${cat} <span class="chip-count">${count}</span>
      </button>`;
  }).join('');

  bar.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      bar.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.dataset.cat === activeCategory));
      applyFilters();
    });
  });
}

function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
  filteredCars = allCars.filter(car => {
    const matchCat = activeCategory === 'Todos' || car.categoria === activeCategory;
    const matchSearch = !q || [car.marca, car.modelo, car.version, car.referencia, car.fabricante, car.dorsal]
      .some(v => v && String(v).toLowerCase().includes(q));
    return matchCat && matchSearch;
  });
  renderList();
}

// ============================================
// RENDER LIST
// ============================================
function renderList() {
  const list = document.getElementById('carsList');
  const bar = document.getElementById('resultsBar');

  bar.textContent = filteredCars.length === allCars.length
    ? `${allCars.length} autos en la colección`
    : `${filteredCars.length} de ${allCars.length} autos`;

  if (filteredCars.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Sin resultados</div></div>`;
    return;
  }

  list.innerHTML = filteredCars.map(car => `
    <div class="car-card" data-id="${car.id}">
      <div class="car-photo">
        ${car.foto_url ? `<img src="${car.foto_url}" alt="${car.modelo}" loading="lazy" />` : getCategoryEmoji(car.categoria)}
      </div>
      <div class="car-info">
        <div class="car-main">${car.marca || ''} ${car.modelo || ''}</div>
        <div class="car-version">${car.version || '—'}</div>
        <div class="car-tags">
          ${car.categoria ? `<span class="tag tag-cat">${car.categoria}</span>` : ''}
          ${car.fabricante ? `<span class="tag tag-fab">${car.fabricante}</span>` : ''}
          ${car.año ? `<span class="tag tag-año">${car.año}</span>` : ''}
          ${car.caja ? `<span class="tag ${car.caja === 'Si' ? 'tag-caja-si' : 'tag-caja-no'}">${car.caja === 'Si' ? '📦 Con caja' : '🚫 Sin caja'}</span>` : ''}
        </div>
      </div>
      <div class="car-right">
        ${car.dorsal ? `<div class="car-dorsal">#${car.dorsal}</div>` : ''}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.car-card').forEach(card => {
    card.addEventListener('click', () => openDetail(parseInt(card.dataset.id)));
  });
}

function getCategoryEmoji(cat) {
  const map = { F1: '🏎️', GT: '🚗', LMP: '🏁', Rally: '🚙', Calle: '🚕', NASCAR: '🔴', Indy: '🟡', Camion: '🚛' };
  return map[cat] || '🏎️';
}

// ============================================
// DETAIL MODAL
// ============================================
function openDetail(id) {
  currentDetail = allCars.find(c => c.id === id);
  if (!currentDetail) return;
  const car = currentDetail;

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-photo">
      ${car.foto_url ? `<img src="${car.foto_url}" alt="${car.modelo}" />` : `<span>${getCategoryEmoji(car.categoria)}</span>`}
    </div>
    ${isAdmin() ? `
    <div class="photo-actions">
      <button class="btn-sm btn-sm-photo" id="changePhotoBtn">
        📷 ${car.foto_url ? 'Cambiar foto' : 'Agregar foto'}
        <input type="file" accept="image/*" id="changePhotoInput" />
      </button>
      ${car.foto_url ? `<button class="btn-sm btn-sm-delete" id="deletePhotoBtn">🗑️ Quitar</button>` : ''}
    </div>` : ''}
    <div class="modal-separator"></div>
    <div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Fabricante</div><div class="detail-value">${car.fabricante || '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Referencia</div><div class="detail-value">${car.referencia || '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Marca</div><div class="detail-value">${car.marca || '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Modelo</div><div class="detail-value">${car.modelo || '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Año</div><div class="detail-value">${car.año || '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Dorsal</div><div class="detail-value">${car.dorsal ? `#${car.dorsal}` : '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Categoría</div><div class="detail-value">${car.categoria || '—'}</div></div>
      <div class="detail-field"><div class="detail-label">Caja</div><div class="detail-value">${car.caja || '—'}</div></div>
      ${car.ed_especial ? `<div class="detail-field full"><div class="detail-label">Edición Especial</div><div class="detail-value">${car.ed_especial}</div></div>` : ''}
      <div class="detail-field full"><div class="detail-label">Versión</div><div class="detail-value">${car.version || '—'}</div></div>
      ${car.notas ? `<div class="detail-field full"><div class="detail-label">Notas</div><div class="detail-value" style="font-size:14px;font-weight:400">${car.notas}</div></div>` : ''}
    </div>
    ${isAdmin() ? `
    <button class="btn btn-secondary" id="editCarBtn">✏️ Editar</button>
    <button class="btn btn-secondary" id="deleteCarBtn" style="color:var(--alpine-pink);border-color:rgba(232,0,61,0.3);margin-top:8px;">🗑️ Eliminar</button>
    ` : ''}
  `;

  openOverlay('detailOverlay');

  if (isAdmin()) {
    document.getElementById('changePhotoInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await uploadPhoto(car.id, file);
    });

    const delPhotoBtn = document.getElementById('deletePhotoBtn');
    if (delPhotoBtn) delPhotoBtn.addEventListener('click', async () => {
      await updateCarField(car.id, { foto_url: '' });
      closeOverlay('detailOverlay');
      showToast('Foto eliminada');
    });

    document.getElementById('editCarBtn').addEventListener('click', () => {
      closeOverlay('detailOverlay');
      openForm(car);
    });

    document.getElementById('deleteCarBtn').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar ${car.marca} ${car.modelo}?`)) return;
      const { error } = await supabase.from('autos').delete().eq('id', car.id);
      if (!error) {
        allCars = allCars.filter(c => c.id !== car.id);
        applyFilters(); updateStats(); renderFilters();
        closeOverlay('detailOverlay');
        showToast('Auto eliminado');
      }
    });
  }
}

async function uploadPhoto(carId, file) {
  showToast('Subiendo foto...');
  const ext = file.name.split('.').pop();
  const path = `auto-${carId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('fotos-autos').upload(path, file, { upsert: true });
  if (uploadError) { showToast('Error subiendo foto', true); return; }
  const { data: urlData } = supabase.storage.from('fotos-autos').getPublicUrl(path);
  await updateCarField(carId, { foto_url: urlData.publicUrl });
  closeOverlay('detailOverlay');
  showToast('¡Foto guardada! 📸');
}

async function updateCarField(carId, fields) {
  const { error } = await supabase.from('autos').update(fields).eq('id', carId);
  if (!error) {
    const idx = allCars.findIndex(c => c.id === carId);
    if (idx !== -1) allCars[idx] = { ...allCars[idx], ...fields };
    applyFilters();
  }
}

// ============================================
// ADD / EDIT FORM
// ============================================
function openForm(car = null) {
  const isEdit = !!car;
  document.getElementById('formTitle').textContent = isEdit ? 'Editar Auto' : 'Agregar Auto';

  document.getElementById('formContent').innerHTML = `
    <div class="form-field">
      <label class="form-label">Foto</label>
      <div class="btn btn-upload-photo">
        📷 ${car?.foto_url ? 'Cambiar foto' : 'Tomar / Subir foto'}
        <input type="file" accept="image/*" id="formPhotoInput" />
      </div>
    </div>
    <div class="form-grid">
      <div class="form-field"><label class="form-label">Fabricante</label><input class="form-input" id="fFabricante" value="${car?.fabricante || ''}" placeholder="Scalextric" /></div>
      <div class="form-field"><label class="form-label">Referencia</label><input class="form-input" id="fReferencia" value="${car?.referencia || ''}" placeholder="C1234" /></div>
    </div>
    <div class="form-grid">
      <div class="form-field"><label class="form-label">Marca</label><input class="form-input" id="fMarca" value="${car?.marca || ''}" placeholder="Ferrari" /></div>
      <div class="form-field"><label class="form-label">Modelo</label><input class="form-input" id="fModelo" value="${car?.modelo || ''}" placeholder="F40" /></div>
    </div>
    <div class="form-field"><label class="form-label">Versión / Descripción</label><input class="form-input" id="fVersion" value="${car?.version || ''}" placeholder="Le Mans 1995 #35" /></div>
    <div class="form-grid">
      <div class="form-field"><label class="form-label">Año</label><input class="form-input" id="fAño" type="text" inputmode="numeric" value="${car?.año || ''}" placeholder="1995" /></div>
      <div class="form-field"><label class="form-label">Dorsal</label><input class="form-input" id="fDorsal" value="${car?.dorsal || ''}" placeholder="35" /></div>
    </div>
    <div class="form-grid">
      <div class="form-field">
        <label class="form-label">Categoría</label>
        <select class="form-select" id="fCategoria">
          ${['F1','GT','LMP','Rally','Calle','NASCAR','Indy','Camion'].map(c => `<option value="${c}" ${car?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label class="form-label">Caja</label>
        <select class="form-select" id="fCaja">
          <option value="Si" ${car?.caja === 'Si' ? 'selected' : ''}>Con caja</option>
          <option value="No" ${car?.caja === 'No' ? 'selected' : ''}>Sin caja</option>
          <option value="Rocco" ${car?.caja === 'Rocco' ? 'selected' : ''}>Rocco</option>
        </select>
      </div>
    </div>
    <div class="form-field"><label class="form-label">Edición Especial</label><input class="form-input" id="fEdEspecial" value="${car?.ed_especial || ''}" placeholder="Ej: 3973/5000" /></div>
    <div class="form-field"><label class="form-label">Notas</label><textarea class="form-textarea" id="fNotas" placeholder="Observaciones...">${car?.notas || ''}</textarea></div>
    <button class="btn btn-primary" id="saveCarBtn">${isEdit ? '💾 Guardar cambios' : '➕ Agregar auto'}</button>
    <button class="btn btn-secondary" id="cancelFormBtn">Cancelar</button>
  `;

  let pendingPhoto = null;
  document.getElementById('formPhotoInput').addEventListener('change', (e) => {
    pendingPhoto = e.target.files[0];
    if (pendingPhoto) showToast('Foto lista para subir 📸');
  });
  document.getElementById('saveCarBtn').addEventListener('click', async () => await saveCar(car?.id, isEdit, pendingPhoto));
  document.getElementById('cancelFormBtn').addEventListener('click', () => closeOverlay('formOverlay'));
  openOverlay('formOverlay');
}

async function saveCar(existingId, isEdit, photoFile) {
  const fields = {
    fabricante: document.getElementById('fFabricante').value.trim(),
    referencia: document.getElementById('fReferencia').value.trim(),
    marca: document.getElementById('fMarca').value.trim(),
    modelo: document.getElementById('fModelo').value.trim(),
    version: document.getElementById('fVersion').value.trim(),
    año: document.getElementById('fAño').value.trim(),
    dorsal: document.getElementById('fDorsal').value.trim(),
    categoria: document.getElementById('fCategoria').value,
    caja: document.getElementById('fCaja').value,
    ed_especial: document.getElementById('fEdEspecial').value.trim(),
    notas: document.getElementById('fNotas').value.trim(),
    tengo: true,
  };

  if (!fields.marca && !fields.modelo) { showToast('Completá al menos marca o modelo', true); return; }

  let savedId = existingId;

  if (isEdit) {
    const { error } = await supabase.from('autos').update(fields).eq('id', existingId);
    if (error) { showToast('Error guardando', true); return; }
    const idx = allCars.findIndex(c => c.id === existingId);
    if (idx !== -1) allCars[idx] = { ...allCars[idx], ...fields };
  } else {
    const maxId = allCars.length > 0 ? Math.max(...allCars.map(c => c.id)) : 0;
    const newId = maxId + 1;
    const { data, error } = await supabase.from('autos').insert({ id: newId, ...fields }).select().single();
    if (error) { showToast('Error guardando', true); return; }
    allCars.push(data);
    savedId = newId;
  }

  if (photoFile && savedId) {
    const ext = photoFile.name.split('.').pop();
    const path = `auto-${savedId}-${Date.now()}.${ext}`;
    await supabase.storage.from('fotos-autos').upload(path, photoFile, { upsert: true });
    const { data: urlData } = supabase.storage.from('fotos-autos').getPublicUrl(path);
    await supabase.from('autos').update({ foto_url: urlData.publicUrl }).eq('id', savedId);
    const idx = allCars.findIndex(c => c.id === savedId);
    if (idx !== -1) allCars[idx].foto_url = urlData.publicUrl;
  }

  updateStats(); renderFilters(); applyFilters();
  closeOverlay('formOverlay');
  showToast(isEdit ? '✅ Auto actualizado' : '✅ Auto agregado');
}

// ============================================
// MODAL HELPERS
// ============================================
function openOverlay(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeOverlay(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ============================================
// INIT
// ============================================
if (isLoggedIn()) {
  initApp();
} else {
  renderLogin();
}
