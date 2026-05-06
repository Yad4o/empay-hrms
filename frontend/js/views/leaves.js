Views.leaves = async function(container) {
  document.getElementById('page-title').textContent = 'Time Off';
  document.getElementById('page-subtitle').textContent = 'Leave requests and approvals';

  const role = Auth.role;
  const isEmp = role === 'employee';
  const canApprove = ['admin','hr_officer','payroll_officer'].includes(role);

  async function render(statusFilter = '') {
    let url = '/leaves';
    if (statusFilter) url += `?status=${statusFilter}`;
    const [leaves, balance] = await Promise.all([
      api.get(url),
      isEmp ? api.get('/leaves/balance') : Promise.resolve([]),
    ]);

    const statusBadge = s => {
      const m = { approved:'badge-success', rejected:'badge-danger', pending:'badge-warning', cancelled:'badge-muted' };
      return `<span class="badge ${m[s]||'badge-muted'}">${s}</span>`;
    };

    const typeBadge = t => {
      const m = { annual:'badge-info', sick:'badge-accent', casual:'badge-primary', unpaid:'badge-muted' };
      return `<span class="badge ${m[t]||'badge-muted'}">${t}</span>`;
    };

    const leaveTypeColor = { annual: '#0d9488', sick: '#dc2626', casual: '#0284c7', unpaid: '#94a3b8' };
    const balanceHtml = isEmp && balance.length ? `
      <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
        ${balance.map(b => {
          const pct = Math.min(100, b.allocated_days ? (b.remaining_days / b.allocated_days) * 100 : 0);
          const color = leaveTypeColor[b.leave_type] || '#0d9488';
          const used = b.allocated_days - b.remaining_days;
          return `
          <div class="card" style="flex:1;min-width:150px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:10px">${b.leave_type.replace('_',' ')} Leave</div>
            <div style="font-size:28px;font-weight:800;color:${color};line-height:1">${b.remaining_days}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${used} used · ${b.allocated_days} total</div>
            <div style="margin-top:10px;background:var(--surface2);border-radius:4px;height:5px;overflow:hidden">
              <div style="background:${color};border-radius:4px;height:100%;width:${pct}%;transition:width 0.3s"></div>
            </div>
          </div>`;
        }).join('')}
      </div>` : '';

    const rows = leaves.map(l => `
      <tr>
        ${!isEmp ? `<td><div class="emp-cell"><div class="emp-avatar">${(l.employee_name||'?')[0]}</div><div><div class="emp-name">${l.employee_name}</div><div class="emp-id">${l.emp_id||''}</div></div></div></td>` : ''}
        <td>${typeBadge(l.leave_type)}</td>
        <td>${l.start_date}</td>
        <td>${l.end_date}</td>
        <td><strong>${l.total_days}</strong> day${l.total_days!==1?'s':''}</td>
        <td style="max-width:200px"><span title="${l.reason}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${l.reason}</span></td>
        <td>${statusBadge(l.status)}</td>
        <td>
          ${canApprove && l.status === 'pending' ? `
            <div style="display:flex;gap:4px">
              <button class="btn btn-success btn-sm" onclick="approveLeave(${l.id})" style="display:inline-flex;align-items:center;gap:5px">${IC.check} Approve</button>
              <button class="btn btn-danger btn-sm" onclick="rejectLeave(${l.id})" style="display:inline-flex;align-items:center;gap:5px">${IC.x} Reject</button>
            </div>` : (l.rejection_reason ? `<span style="font-size:11px;color:var(--danger)">${l.rejection_reason}</span>` : '—')}
        </td>
      </tr>`).join('') || `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🏖️</div><h3>No leave requests</h3></div></td></tr>`;

    const cols = isEmp ? ['Type','From','To','Days','Reason','Status','Action'] : ['Employee','Type','From','To','Days','Reason','Status','Action'];

    const statusTabs = ['', 'pending', 'approved', 'rejected'].map(s => `
      <button class="tab-btn ${statusFilter===s?'active':''}" onclick="filterLeaves('${s}')">${s||'All'}</button>`).join('');

    container.innerHTML = `
      ${balanceHtml}
      <div class="card" style="padding:0">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <div class="tab-list" style="margin:0;border:none">${statusTabs}</div>
          <div style="display:flex;gap:8px">
            ${canApprove && !isEmp ? `<button class="btn btn-outline btn-sm" onclick="allocateLeave()" style="display:inline-flex;align-items:center;gap:5px">${IC.plus} Allocate Leave</button>` : ''}
            ${isEmp ? `<button class="btn btn-primary" onclick="applyLeave()" style="display:inline-flex;align-items:center;gap:6px">${IC.plus} Apply Leave</button>` : ''}
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

    window.filterLeaves = (s) => render(s);
    window.approveLeave = async (id) => {
      try { await api.put(`/leaves/${id}/approve`, {}); toast('Leave approved','success'); await render(statusFilter); }
      catch(err) { toast(err.message,'error'); }
    };
    window.rejectLeave = (id) => {
      openModal(`<div class="modal"><div class="modal-header"><h3 class="modal-title">Reject Leave</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Reason for Rejection</label><textarea class="form-control" id="rej-reason" rows="3" placeholder="Explain why…"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-danger" onclick="confirmReject(${id})">Reject</button>
        </div>
      </div>`);
    };
    window.confirmReject = async (id) => {
      try {
        await api.put(`/leaves/${id}/reject`, { rejection_reason: document.getElementById('rej-reason').value });
        toast('Leave rejected','success'); closeModal(); await render(statusFilter);
      } catch(err) { toast(err.message,'error'); }
    };
  }

  window.applyLeave = async () => {
    const myBalance = isEmp ? await api.get('/leaves/balance').catch(() => []) : [];
    const balMap = {};
    myBalance.forEach(b => { balMap[b.leave_type] = b.remaining_days; });

    const balanceHint = (type) => balMap[type] !== undefined
      ? `<span style="float:right;color:var(--info);font-size:11px">${balMap[type]} days remaining</span>`
      : '';

    openModal(`<div class="modal"><div class="modal-header"><h3 class="modal-title">Apply for Leave</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Leave Type <span id="al-bal-hint"></span></label>
          <select class="form-control" id="al-type" onchange="document.getElementById('al-bal-hint').innerHTML = ${JSON.stringify(balMap)} ? (${JSON.stringify(balMap)}[this.value] !== undefined ? '<span style=\\'color:var(--info);font-size:11px\\'>' + ${JSON.stringify(balMap)}[this.value] + ' days remaining</span>' : '') : ''">
            <option value="annual">Annual ${balMap.annual !== undefined ? '('+balMap.annual+'d left)' : ''}</option>
            <option value="sick">Sick ${balMap.sick !== undefined ? '('+balMap.sick+'d left)' : ''}</option>
            <option value="casual">Casual ${balMap.casual !== undefined ? '('+balMap.casual+'d left)' : ''}</option>
            <option value="unpaid">Unpaid (no deduction from balance)</option>
          </select>
        </div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">From Date</label><input class="form-control" id="al-start" type="date"></div>
          <div class="form-group"><label class="form-label">To Date</label><input class="form-control" id="al-end" type="date"></div>
        </div>
        <div class="form-group"><label class="form-label">Reason *</label><textarea class="form-control" id="al-reason" rows="3" placeholder="Briefly explain your reason…"></textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitLeave()">Submit Application</button>
      </div>
    </div>`);
  };

  window.submitLeave = async () => {
    const start = document.getElementById('al-start').value;
    const end   = document.getElementById('al-end').value;
    const reason = document.getElementById('al-reason').value.trim();
    if (!start || !end) { toast('Please select start and end dates', 'error'); return; }
    if (!reason) { toast('Please provide a reason for the leave', 'error'); return; }
    const body = { leave_type: document.getElementById('al-type').value, start_date: start, end_date: end, reason };
    const btn = document.querySelector('.modal-footer .btn-primary');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      await api.post('/leaves/apply', body);
      toast('Leave application submitted','success'); closeModal(); await render();
    } catch(err) {
      toast(err.message,'error');
      btn.disabled = false;
      btn.textContent = origText;
    }
  };

  window.allocateLeave = async () => {
    const emps = await api.get('/employees?is_active=true');
    const empOpts = emps.map(e => `<option value="${e.id}">${e.first_name} ${e.last_name} (${e.emp_id})</option>`).join('');
    openModal(`<div class="modal"><div class="modal-header"><h3 class="modal-title">Allocate Leave</h3><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Employee</label><select class="form-control" id="la-emp">${empOpts}</select></div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Leave Type</label>
            <select class="form-control" id="la-type"><option value="annual">Annual</option><option value="sick">Sick</option><option value="casual">Casual</option></select>
          </div>
          <div class="form-group"><label class="form-label">Year</label><input class="form-control" id="la-year" type="number" value="${new Date().getFullYear()}"></div>
        </div>
        <div class="form-group"><label class="form-label">Allocated Days</label><input class="form-control" id="la-days" type="number" value="12"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmAllocate()">Allocate</button>
      </div>
    </div>`);
  };

  window.confirmAllocate = async () => {
    const body = {
      employee_id:    parseInt(document.getElementById('la-emp').value),
      leave_type:     document.getElementById('la-type').value,
      year:           parseInt(document.getElementById('la-year').value),
      allocated_days: parseFloat(document.getElementById('la-days').value),
    };
    try {
      await api.post('/leaves/allocate', body);
      toast('Leave allocated','success'); closeModal();
    } catch(err) { toast(err.message,'error'); }
  };

  await render();
};
