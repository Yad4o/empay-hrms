// ── Toast ─────────────────────────────────────────
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  const iconMap = { success: IC.check, error: IC.x, info: IC.info, warning: IC.warn };
  const colorMap = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--info)', warning: 'var(--warning)' };
  t.className = `toast toast-${type}`;
  const iconColor = colorMap[type] || 'var(--text-secondary)';
  t.innerHTML = `<span style="color:${iconColor};flex-shrink:0">${iconMap[type] || IC.info}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Modal ─────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-container').innerHTML = html;
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-container').innerHTML = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    const searchInput = document.querySelector('#content-area input[type="text"], #content-area input:not([type])');
    if (searchInput) searchInput.focus();
  }
});

// ── Navigation ────────────────────────────────────
const VIEWS = {
  dashboard:  { label: 'Dashboard',  icon: IC.dashboard, render: Views.dashboard,  roles: null },
  employees:  { label: 'Employees',  icon: IC.users,     render: Views.employees,  roles: ['admin','hr_officer','payroll_officer'] },
  directory:  { label: 'Directory',  icon: IC.book,      render: Views.directory,  roles: ['employee'] },
  attendance: { label: 'Attendance', icon: IC.calendar,  render: Views.attendance, roles: null },
  leaves:     { label: 'Time Off',   icon: IC.umbrella,  render: Views.leaves,     roles: null },
  payroll:    { label: 'Payroll',    icon: IC.payroll,   render: Views.payroll,    roles: ['admin','payroll_officer'] },
  reports:    { label: 'Reports',    icon: IC.chart,     render: Views.reports,    roles: ['admin','hr_officer','payroll_officer'] },
  settings:   { label: 'Settings',  icon: IC.sliders,   render: Views.settings,   roles: ['admin'] },
  profile:    { label: 'My Profile', icon: IC.user,      render: Views.profile,    roles: null },
};

function buildNav() {
  const nav = document.getElementById('sidebar-nav');
  let html = '';
  for (const [key, cfg] of Object.entries(VIEWS)) {
    if (cfg.roles && !cfg.roles.includes(Auth.role)) continue;
    html += `<div class="nav-item" data-view="${key}" onclick="navigate('${key}')">
      <span class="nav-icon">${cfg.icon}</span>
      <span>${cfg.label}</span>
      ${key === 'leaves' ? '<span id="leaves-badge" style="display:none;margin-left:auto;background:var(--danger);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px"></span>' : ''}
    </div>`;
  }
  nav.innerHTML = html;

  document.getElementById('sidebar-user-avatar').textContent = Auth.initials(Auth.email);
  document.getElementById('sidebar-user-email').textContent = Auth.email;
  document.getElementById('sidebar-user-role').textContent = Auth.roleLabel();

  if (['admin', 'hr_officer', 'payroll_officer'].includes(Auth.role)) {
    api.get('/leaves?status=pending').then(list => {
      const badge = document.getElementById('leaves-badge');
      if (badge && list.length > 0) {
        badge.textContent = list.length;
        badge.style.display = '';
      }
    }).catch(() => {});
  }
}

let currentView = null;

async function navigate(view) {
  if (!VIEWS[view]) view = 'dashboard';
  if (VIEWS[view].roles && !VIEWS[view].roles.includes(Auth.role)) {
    view = 'dashboard';
  }
  currentView = view;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  const content = document.getElementById('content-area');
  content.style.animation = 'none';
  content.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-muted)">Loading…</div>';
  requestAnimationFrame(() => { content.style.animation = ''; });

  try {
    await VIEWS[view].render(content);
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

// ── Route by hash ─────────────────────────────────
function routeFromHash() {
  const hash = location.hash.slice(2) || 'dashboard';
  navigate(hash);
}

window.addEventListener('hashchange', routeFromHash);

// ── Mobile sidebar auto-close ─────────────────────
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== hamburger) {
    sidebar.classList.remove('open');
  }
});

// ── Boot ──────────────────────────────────────────
(async function init() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }
  buildNav();
  routeFromHash();
})();
