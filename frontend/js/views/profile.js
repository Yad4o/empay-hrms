Views.profile = async function(container) {
  document.getElementById('page-title').textContent = 'My Profile';
  document.getElementById('page-subtitle').textContent = 'View and update your information';

  async function render() {
    let emp;
    try { emp = await api.get('/employees/me'); } catch(_) { emp = null; }

    const me = { email: Auth.email, role: Auth.roleLabel() };

    container.innerHTML = `
      <div style="max-width:700px;margin:0 auto">
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:20px">
            <div class="emp-avatar" style="width:72px;height:72px;font-size:26px">
              ${emp ? emp.first_name[0]+emp.last_name[0] : me.email.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style="font-size:20px;font-weight:700">${emp ? emp.first_name+' '+emp.last_name : me.email}</div>
              <div style="color:var(--text-secondary);margin-top:4px">${me.role} ${emp ? '· '+emp.emp_id : ''}</div>
              ${emp ? `<div style="margin-top:6px"><span class="badge badge-primary">${emp.department}</span> <span style="font-size:12px;color:var(--text-secondary);margin-left:6px">${emp.designation}</span></div>` : ''}
            </div>
          </div>
        </div>

        ${emp ? `
        <div class="card" style="margin-bottom:20px">
          <div class="section-header">
            <span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.user} Personal Details</span>
            <button class="btn btn-outline btn-sm" onclick="editProfile()" style="display:inline-flex;align-items:center;gap:5px">${IC.edit} Edit</button>
          </div>
          <div class="form-grid" style="margin-top:12px">
            ${infoRow('Email', emp.email)} ${infoRow('Phone', emp.phone||'—')}
            ${infoRow('Join Date', emp.join_date)} ${infoRow('Gender', emp.gender||'—')}
            ${infoRow('Date of Birth', emp.date_of_birth||'—')} ${infoRow('Address', emp.address||'—')}
          </div>
        </div>
        <div class="card" style="margin-bottom:20px">
          <div class="section-header"><span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.dollar} Salary Information</span></div>
          <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:20px;margin-top:12px">
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">Basic Salary</div>
            <div style="font-size:28px;font-weight:700;color:var(--primary)">₹${Number(emp.basic_salary).toLocaleString('en-IN')}</div>
            <div style="margin-top:12px;display:flex;gap:24px;font-size:13px">
              <div><div style="color:var(--text-secondary)">HRA (${emp.hra_percent}%)</div><div style="font-weight:600">₹${Number(emp.basic_salary*emp.hra_percent/100).toLocaleString('en-IN')}</div></div>
              <div><div style="color:var(--text-secondary)">Allowances</div><div style="font-weight:600">₹${Number(emp.other_allowances||0).toLocaleString('en-IN')}</div></div>
              <div><div style="color:var(--text-secondary)">Gross</div><div style="font-weight:600;color:var(--success)">₹${Number(emp.gross_salary).toLocaleString('en-IN')}</div></div>
            </div>
          </div>
        </div>
        <div class="card" style="margin-bottom:20px">
          <div class="section-header"><span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.shield} Bank & Tax Details</span></div>
          <div class="form-grid" style="margin-top:12px">
            ${infoRow('Bank Account', emp.bank_account||'—')} ${infoRow('IFSC Code', emp.ifsc_code||'—')}
            ${infoRow('PAN Number', emp.pan_number||'—')}
          </div>
        </div>` : `<div class="card"><div class="empty-state"><div class="empty-icon">👤</div><h3>No employee profile linked</h3><p>Contact HR to set up your profile</p></div></div>`}

        <div class="card" style="margin-bottom:20px">
          <div class="section-header"><span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.calendar} Recent Attendance</span></div>
          <div id="profile-att-table" style="margin-top:8px"><div style="color:var(--text-muted);font-size:13px">Loading…</div></div>
        </div>

        <div class="card">
          <div class="section-header"><span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.shield} Change Password</span></div>
          <div style="margin-top:12px;max-width:360px">
            <div class="form-group"><label class="form-label">Current Password</label><input class="form-control" id="cp-cur" type="password"></div>
            <div class="form-group"><label class="form-label">New Password</label><input class="form-control" id="cp-new" type="password"></div>
            <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
          </div>
        </div>
      </div>`;

    api.get('/attendance/my').then(records => {
      const recent = records.slice(0, 10);
      const statusColors = { present: 'badge-success', absent: 'badge-danger', late: 'badge-warning', half_day: 'badge-info', on_leave: 'badge-primary', holiday: 'badge-muted' };
      const attHtml = recent.length ? `<div class="table-wrapper"><table>
        <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Hours</th></tr></thead>
        <tbody>${recent.map(r => `<tr>
          <td>${r.date}</td>
          <td><span class="badge ${statusColors[r.status]||'badge-muted'}">${r.status.replace('_',' ')}</span></td>
          <td>${r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
          <td>${r.total_hours ? r.total_hours+'h' : '—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No attendance records yet.</div>';
      const el = document.getElementById('profile-att-table');
      if (el) el.innerHTML = attHtml;
    }).catch(() => {});

    window.changePassword = async () => {
      try {
        await api.post('/auth/change-password', {
          current_password: document.getElementById('cp-cur').value,
          new_password:     document.getElementById('cp-new').value,
        });
        toast('Password changed successfully', 'success');
        document.getElementById('cp-cur').value = '';
        document.getElementById('cp-new').value = '';
      } catch(err) { toast(err.message, 'error'); }
    };

    window.editProfile = () => {
      if (!emp) return;
      openModal(`
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Edit Profile</h3>
            <button class="modal-close" onclick="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="ep-ph" value="${emp.phone||''}"></div>
            <div class="form-group"><label class="form-label">Address</label><textarea class="form-control" id="ep-addr" rows="3">${emp.address||''}</textarea></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveProfile(${emp.id})">Save</button>
          </div>
        </div>`);
    };

    window.saveProfile = async (id) => {
      try {
        await api.put(`/employees/${id}`, {
          phone:   document.getElementById('ep-ph').value || null,
          address: document.getElementById('ep-addr').value || null,
        });
        toast('Profile updated', 'success'); closeModal(); await render();
      } catch(err) { toast(err.message, 'error'); }
    };
  }

  await render();
};

function infoRow(label, value) {
  return `<div class="form-group">
    <div class="form-label">${label}</div>
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">${value}</div>
  </div>`;
}
