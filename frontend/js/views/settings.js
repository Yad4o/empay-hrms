Views.settings = async function(container) {
  document.getElementById('page-title').textContent = 'Settings';
  document.getElementById('page-subtitle').textContent = 'User and system management';

  async function render() {
    const users = await api.get('/settings/users');

    const roleBadge = r => {
      const m = { admin:'badge-danger', hr_officer:'badge-accent', payroll_officer:'badge-warning', employee:'badge-info' };
      const labels = { admin:'Admin', hr_officer:'HR Officer', payroll_officer:'Payroll Officer', employee:'Employee' };
      return `<span class="badge ${m[r]||'badge-muted'}">${labels[r]||r}</span>`;
    };

    const rows = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>
          <div class="emp-cell">
            <div class="emp-avatar">${u.email.slice(0,2).toUpperCase()}</div>
            <span>${u.email}</span>
          </div>
        </td>
        <td>${roleBadge(u.role)}</td>
        <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="editUser(${u.id}, '${u.role}', ${u.is_active})">Edit Role</button>
            ${u.id !== parseInt(Auth.userId) ? `<button class="btn btn-ghost btn-sm" onclick="toggleUser(${u.id}, ${u.is_active})">${u.is_active ? 'Disable' : 'Enable'}</button>` : ''}
          </div>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="toolbar">
        <div style="font-size:13px;color:var(--text-secondary)">${users.length} total users</div>
        <button class="btn btn-primary" onclick="addUser()">+ Add User</button>
      </div>
      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

    window.editUser = (id, currentRole, isActive) => {
      openModal(`
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Edit User Role</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Role</label>
              <select class="form-control" id="eu-role">
                <option value="admin" ${currentRole==='admin'?'selected':''}>Administrator</option>
                <option value="hr_officer" ${currentRole==='hr_officer'?'selected':''}>HR Officer</option>
                <option value="payroll_officer" ${currentRole==='payroll_officer'?'selected':''}>Payroll Officer</option>
                <option value="employee" ${currentRole==='employee'?'selected':''}>Employee</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveRole(${id})">Save</button>
          </div>
        </div>`);
    };

    window.saveRole = async (id) => {
      try {
        await api.put(`/settings/users/${id}`, { role: document.getElementById('eu-role').value });
        toast('Role updated', 'success'); closeModal(); await render();
      } catch(err) { toast(err.message, 'error'); }
    };

    window.toggleUser = async (id, isActive) => {
      if (!confirm(`${isActive ? 'Disable' : 'Enable'} this user?`)) return;
      try {
        await api.put(`/settings/users/${id}`, { is_active: !isActive });
        toast(`User ${isActive ? 'disabled' : 'enabled'}`, 'success'); await render();
      } catch(err) { toast(err.message, 'error'); }
    };
  }

  window.addUser = () => {
    openModal(`
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Add User</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="nu-email" type="email" placeholder="user@company.com"></div>
          <div class="form-group"><label class="form-label">Password</label><input class="form-control" id="nu-pw" type="password" value="Employee@123"></div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <select class="form-control" id="nu-role">
              <option value="employee">Employee</option>
              <option value="hr_officer">HR Officer</option>
              <option value="payroll_officer">Payroll Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="createUser()">Create</button>
        </div>
      </div>`);
  };

  window.createUser = async () => {
    const body = {
      email:    document.getElementById('nu-email').value,
      password: document.getElementById('nu-pw').value,
      role:     document.getElementById('nu-role').value,
    };
    try {
      await api.post('/settings/users', body);
      toast('User created', 'success'); closeModal(); await render();
    } catch(err) { toast(err.message, 'error'); }
  };

  await render();
};
