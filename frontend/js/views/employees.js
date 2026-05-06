Views.employees = async function(container) {
  document.getElementById('page-title').textContent = 'Employees';
  document.getElementById('page-subtitle').textContent = 'Manage employee records';

  const canEdit = Auth.hasAnyRole('admin', 'hr_officer');

  async function render(search = '', dept = '') {
    let url = '/employees?is_active=true';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (dept)   url += `&department=${encodeURIComponent(dept)}`;
    const emps = await api.get(url);

    const rows = emps.map(e => `
      <tr>
        <td>
          <div class="emp-cell">
            <div class="emp-avatar">${e.first_name[0]}${e.last_name[0]}</div>
            <div>
              <div class="emp-name">${e.first_name} ${e.last_name}</div>
              <div class="emp-id">${e.emp_id}</div>
            </div>
          </div>
        </td>
        <td>${e.email}</td>
        <td><span class="badge badge-primary">${e.department}</span></td>
        <td>${e.designation}</td>
        <td>₹${Number(e.basic_salary).toLocaleString('en-IN')}</td>
        <td>₹${Number(e.gross_salary).toLocaleString('en-IN')}</td>
        <td><span class="badge ${e.is_active ? 'badge-success' : 'badge-danger'}">${e.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="viewEmployee(${e.id})">View</button>
            ${canEdit ? `<button class="btn btn-ghost btn-sm" onclick="editEmployee(${e.id})">Edit</button>` : ''}
          </div>
        </td>
      </tr>`).join('') || `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👥</div><h3>No employees found</h3></div></td></tr>`;

    container.querySelector('tbody').innerHTML = rows;
  }

  const depts = await api.get('/employees/departments').catch(() => []);
  const deptOpts = ['', ...depts].map(d => `<option value="${d}">${d || 'All Departments'}</option>`).join('');

  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input class="form-control" id="emp-search" placeholder="Search employees…" oninput="empSearch()">
        </div>
        <select class="form-control" id="emp-dept" onchange="empSearch()" style="width:180px">
          ${deptOpts}
        </select>
      </div>
      <div class="toolbar-right">
        ${canEdit ? `<button class="btn btn-primary" onclick="addEmployee()">+ Add Employee</button>` : ''}
      </div>
    </div>
    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Employee</th><th>Email</th><th>Department</th><th>Designation</th>
            <th>Basic</th><th>Gross</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody><tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  window.empSearch = () => render(
    document.getElementById('emp-search').value,
    document.getElementById('emp-dept').value,
  );

  await render();

  window.viewEmployee = async (id) => {
    const e = await api.get(`/employees/${id}`);
    openModal(`
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">${e.first_name} ${e.last_name}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
            <div class="emp-avatar" style="width:56px;height:56px;font-size:20px">${e.first_name[0]}${e.last_name[0]}</div>
            <div>
              <div style="font-size:18px;font-weight:600">${e.first_name} ${e.last_name}</div>
              <div style="color:var(--text-secondary)">${e.emp_id} · ${e.designation} · ${e.department}</div>
            </div>
          </div>
          <div class="form-grid">
            ${infoRow('Email', e.email)} ${infoRow('Phone', e.phone || '—')}
            ${infoRow('Join Date', e.join_date)} ${infoRow('Gender', e.gender || '—')}
            ${infoRow('Basic Salary', '₹'+Number(e.basic_salary).toLocaleString('en-IN'))}
            ${infoRow('Gross Salary', '₹'+Number(e.gross_salary).toLocaleString('en-IN'))}
            ${infoRow('HRA', e.hra_percent+'%')} ${infoRow('Allowances', '₹'+(e.other_allowances||0))}
            ${infoRow('Bank Account', e.bank_account || '—')} ${infoRow('IFSC', e.ifsc_code || '—')}
            ${infoRow('PAN', e.pan_number || '—')} ${infoRow('Address', e.address || '—')}
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Close</button></div>
      </div>`);
  };

  window.editEmployee = async (id) => {
    const e = await api.get(`/employees/${id}`);
    openModal(`
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">Edit Employee</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">First Name</label><input class="form-control" id="ef-fn" value="${e.first_name}"></div>
            <div class="form-group"><label class="form-label">Last Name</label><input class="form-control" id="ef-ln" value="${e.last_name}"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="ef-ph" value="${e.phone||''}"></div>
            <div class="form-group"><label class="form-label">Department</label><input class="form-control" id="ef-dept" value="${e.department}"></div>
            <div class="form-group"><label class="form-label">Designation</label><input class="form-control" id="ef-des" value="${e.designation}"></div>
            <div class="form-group"><label class="form-label">Basic Salary (₹)</label><input class="form-control" id="ef-bs" type="number" value="${e.basic_salary}"></div>
            <div class="form-group"><label class="form-label">HRA %</label><input class="form-control" id="ef-hra" type="number" value="${e.hra_percent}"></div>
            <div class="form-group"><label class="form-label">Other Allowances (₹)</label><input class="form-control" id="ef-oa" type="number" value="${e.other_allowances||0}"></div>
          </div>
          <div class="form-group"><label class="form-label">Address</label><textarea class="form-control" id="ef-addr">${e.address||''}</textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveEmployee(${id})">Save Changes</button>
        </div>
      </div>`);
  };

  window.saveEmployee = async (id) => {
    const body = {
      first_name: document.getElementById('ef-fn').value,
      last_name:  document.getElementById('ef-ln').value,
      phone:      document.getElementById('ef-ph').value || null,
      department: document.getElementById('ef-dept').value,
      designation:document.getElementById('ef-des').value,
      basic_salary: parseFloat(document.getElementById('ef-bs').value),
      hra_percent:  parseFloat(document.getElementById('ef-hra').value),
      other_allowances: parseFloat(document.getElementById('ef-oa').value),
      address:    document.getElementById('ef-addr').value || null,
    };
    try {
      await api.put(`/employees/${id}`, body);
      toast('Employee updated', 'success');
      closeModal();
      await render();
    } catch(err) { toast(err.message, 'error'); }
  };

  window.addEmployee = () => {
    openModal(`
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">Add New Employee</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">First Name *</label><input class="form-control" id="ae-fn" placeholder="John"></div>
            <div class="form-group"><label class="form-label">Last Name *</label><input class="form-control" id="ae-ln" placeholder="Doe"></div>
            <div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="ae-email" type="email" placeholder="john@company.com"></div>
            <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="ae-ph" placeholder="+91 9800000000"></div>
            <div class="form-group"><label class="form-label">Department *</label><input class="form-control" id="ae-dept" placeholder="Engineering"></div>
            <div class="form-group"><label class="form-label">Designation *</label><input class="form-control" id="ae-des" placeholder="Software Engineer"></div>
            <div class="form-group"><label class="form-label">Join Date *</label><input class="form-control" id="ae-jd" type="date"></div>
            <div class="form-group"><label class="form-label">Gender</label>
              <select class="form-control" id="ae-gender">
                <option value="">Select</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Basic Salary (₹) *</label><input class="form-control" id="ae-bs" type="number" placeholder="50000"></div>
            <div class="form-group"><label class="form-label">HRA %</label><input class="form-control" id="ae-hra" type="number" value="40"></div>
            <div class="form-group"><label class="form-label">Other Allowances (₹)</label><input class="form-control" id="ae-oa" type="number" value="0"></div>
            <div class="form-group"><label class="form-label">Login Password *</label><input class="form-control" id="ae-pw" type="password" value="Employee@123"></div>
          </div>
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Bank Account</label><input class="form-control" id="ae-bank" placeholder="Account number"></div>
            <div class="form-group"><label class="form-label">IFSC Code</label><input class="form-control" id="ae-ifsc" placeholder="SBIN0001234"></div>
            <div class="form-group"><label class="form-label">PAN Number</label><input class="form-control" id="ae-pan" placeholder="ABCDE1234F"></div>
            <div class="form-group"><label class="form-label">Date of Birth</label><input class="form-control" id="ae-dob" type="date"></div>
          </div>
          <div class="form-group"><label class="form-label">Address</label><textarea class="form-control" id="ae-addr" rows="2"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="createEmployee()">Create Employee</button>
        </div>
      </div>`);
  };

  window.createEmployee = async () => {
    const required = { 'ae-fn': 'First Name', 'ae-ln': 'Last Name', 'ae-email': 'Email', 'ae-dept': 'Department', 'ae-des': 'Designation', 'ae-jd': 'Join Date', 'ae-bs': 'Basic Salary' };
    for (const [id, label] of Object.entries(required)) {
      if (!document.getElementById(id).value.trim()) {
        toast(`${label} is required`, 'error');
        document.getElementById(id).focus();
        return;
      }
    }
    const body = {
      first_name:   document.getElementById('ae-fn').value,
      last_name:    document.getElementById('ae-ln').value,
      email:        document.getElementById('ae-email').value,
      phone:        document.getElementById('ae-ph').value || null,
      department:   document.getElementById('ae-dept').value,
      designation:  document.getElementById('ae-des').value,
      join_date:    document.getElementById('ae-jd').value,
      gender:       document.getElementById('ae-gender').value || null,
      basic_salary: parseFloat(document.getElementById('ae-bs').value),
      hra_percent:  parseFloat(document.getElementById('ae-hra').value),
      other_allowances: parseFloat(document.getElementById('ae-oa').value) || 0,
      password:     document.getElementById('ae-pw').value,
      bank_account: document.getElementById('ae-bank').value || null,
      ifsc_code:    document.getElementById('ae-ifsc').value || null,
      pan_number:   document.getElementById('ae-pan').value || null,
      date_of_birth:document.getElementById('ae-dob').value || null,
      address:      document.getElementById('ae-addr').value || null,
    };
    const btn = document.querySelector('.modal-footer .btn-primary');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating…';
    try {
      await api.post('/employees', body);
      toast('Employee created successfully', 'success');
      closeModal();
      await render();
    } catch(err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = origText;
    }
  };
};

Views.directory = async function(container) {
  document.getElementById('page-title').textContent = 'Employee Directory';
  document.getElementById('page-subtitle').textContent = 'Browse the team';

  const emps = await api.get('/employees?is_active=true');

  container.innerHTML = `
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input class="form-control" id="dir-search" placeholder="Search…" oninput="dirFilter()">
      </div>
    </div>
    <div id="dir-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
      ${emps.map(e => `
        <div class="card" style="text-align:center;padding:28px 20px;cursor:pointer;transition:transform 0.18s,box-shadow 0.18s" onclick="viewEmployee(${e.id})" onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 28px rgba(0,0,0,0.4)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
          <div class="emp-avatar" style="width:56px;height:56px;font-size:20px;margin:0 auto 12px">${e.first_name[0]}${e.last_name[0]}</div>
          <div style="font-weight:600">${e.first_name} ${e.last_name}</div>
          <div style="color:var(--text-secondary);font-size:12px;margin:4px 0">${e.designation}</div>
          <span class="badge badge-primary">${e.department}</span>
          <div style="margin-top:10px;font-size:12px;color:var(--text-secondary)">${e.email}</div>
        </div>`).join('')}
    </div>`;

  window.dirFilter = () => {
    const q = document.getElementById('dir-search').value.toLowerCase();
    document.querySelectorAll('#dir-grid .card').forEach((card, i) => {
      const emp = emps[i];
      card.style.display = (!q || emp.first_name.toLowerCase().includes(q) || emp.last_name.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q)) ? '' : 'none';
    });
  };
};

function infoRow(label, value) {
  return `<div class="form-group">
    <div class="form-label">${label}</div>
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">${value}</div>
  </div>`;
}
