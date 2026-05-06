Views.payroll = async function(container) {
  document.getElementById('page-title').textContent = 'Payroll';
  document.getElementById('page-subtitle').textContent = 'Manage payruns and payslips';

  async function render() {
    const payruns = await api.get('/payroll');

    const statusBadge = s => {
      const m = { draft:'badge-warning', processed:'badge-info', paid:'badge-success' };
      return `<span class="badge ${m[s]||'badge-muted'}">${s}</span>`;
    };

    const rows = payruns.map(p => `
      <tr>
        <td><strong>${p.pay_period}</strong></td>
        <td>${p.pay_period_start} → ${p.pay_period_end}</td>
        <td>${p.total_employees}</td>
        <td><strong>₹${Number(p.total_net).toLocaleString('en-IN')}</strong></td>
        <td>${statusBadge(p.status)}</td>
        <td>${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="viewPayrun(${p.id})" style="display:inline-flex;align-items:center;gap:5px">${IC.eye} View</button>
            ${p.status === 'draft' ? `<button class="btn btn-primary btn-sm" onclick="processPayrun(${p.id})" style="display:inline-flex;align-items:center;gap:5px">${IC.zap} Process</button>` : ''}
            ${p.status === 'processed' ? `<button class="btn btn-success btn-sm" onclick="markPaid(${p.id})" style="display:inline-flex;align-items:center;gap:5px">${IC.check} Mark Paid</button>` : ''}
          </div>
        </td>
      </tr>`).join('') || `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">💰</div><h3>No payruns yet</h3><p>Generate your first payrun below</p></div></td></tr>`;

    container.innerHTML = `
      <div class="toolbar">
        <div></div>
        <button class="btn btn-primary" onclick="createPayrun()" style="display:inline-flex;align-items:center;gap:6px">${IC.zap} Generate Payrun</button>
      </div>
      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Period</th><th>Date Range</th><th>Employees</th><th>Total Net Pay</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

    window.processPayrun = async (id) => {
      if (!confirm('Process this payrun? This marks all entries as approved.')) return;
      try { await api.post(`/payroll/${id}/process`, {}); toast('Payrun processed','success'); await render(); }
      catch(err) { toast(err.message,'error'); }
    };

    window.markPaid = async (id) => {
      if (!confirm('Mark this payrun as paid?')) return;
      try { await api.post(`/payroll/${id}/mark-paid`, {}); toast('Marked as paid','success'); await render(); }
      catch(err) { toast(err.message,'error'); }
    };

    window.viewPayrun = async (id) => {
      const [payrun, entries] = await Promise.all([
        api.get(`/payroll/${id}`),
        api.get(`/payroll/${id}/entries`),
      ]);

      const entryRows = entries.map(e => `
        <tr>
          <td><div class="emp-cell"><div class="emp-avatar">${(e.employee_name||'?')[0]}</div><div><div class="emp-name">${e.employee_name}</div><div class="emp-id">${e.emp_id}</div></div></div></td>
          <td>${e.department}</td>
          <td>${e.present_days} / ${e.working_days}</td>
          <td>${e.lop_days}</td>
          <td>₹${Number(e.gross_salary).toLocaleString('en-IN')}</td>
          <td style="color:var(--danger)">-₹${Number(e.total_deductions).toLocaleString('en-IN')}</td>
          <td><strong style="color:var(--success)">₹${Number(e.net_salary).toLocaleString('en-IN')}</strong></td>
          <td><button class="btn btn-ghost btn-sm" onclick="openPayslip(${e.id})" style="display:inline-flex;align-items:center;gap:5px">${IC.doc} Payslip</button></td>
        </tr>`).join('');

      const totalNet = entries.reduce((s,e) => s + e.net_salary, 0);

      openModal(`
        <div class="modal modal-xl">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">${payrun.pay_period}</h3>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${payrun.pay_period_start} to ${payrun.pay_period_end}</div>
            </div>
            <button class="modal-close" onclick="closeModal()">✕</button>
          </div>
          <div class="modal-body" style="padding:0">
            <div style="display:flex;gap:20px;padding:20px;background:var(--surface2);border-bottom:1px solid var(--border)">
              <div class="stat-card" style="flex:1;padding:12px 16px">
                <div class="stat-icon" style="background:var(--primary-light)"><span>👥</span></div>
                <div><div class="stat-value">${entries.length}</div><div class="stat-label">Employees</div></div>
              </div>
              <div class="stat-card" style="flex:1;padding:12px 16px">
                <div class="stat-icon" style="background:var(--success-light)"><span>💰</span></div>
                <div><div class="stat-value" style="color:var(--success)">₹${Number(totalNet).toLocaleString('en-IN')}</div><div class="stat-label">Total Net Pay</div></div>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Employee</th><th>Dept</th><th>Present/Working</th><th>LOP Days</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Payslip</th></tr></thead>
                <tbody>${entryRows}</tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Close</button></div>
        </div>`);

      window.openPayslip = (entryId) => {
        window.open(`/payslip.html?entry=${entryId}`, '_blank');
      };
    };
  }

  window.createPayrun = () => {
    const now = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthName = months[prevMonth];
    const daysInMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const startStr = `${prevYear}-${String(prevMonth+1).padStart(2,'0')}-01`;
    const endStr   = `${prevYear}-${String(prevMonth+1).padStart(2,'0')}-${daysInMonth}`;

    openModal(`
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Generate Payrun</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Pay Period *</label>
            <input class="form-control" id="pr-period" value="${monthName} ${prevYear}" placeholder="May 2025">
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Format: Month YYYY (e.g. May 2025)</div>
          </div>
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Period Start</label><input class="form-control" id="pr-start" type="date" value="${startStr}"></div>
            <div class="form-group"><label class="form-label">Period End</label><input class="form-control" id="pr-end" type="date" value="${endStr}"></div>
          </div>
          <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="pr-notes" rows="2" placeholder="Optional notes…"></textarea></div>
          <div style="background:var(--warning-light);border:1px solid var(--warning);border-radius:var(--radius-sm);padding:12px;font-size:12px;color:var(--warning);margin-top:8px">
            ⚠️ Payroll will be calculated for all active employees based on their attendance and approved leaves.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitPayrun()">Generate</button>
        </div>
      </div>`);
  };

  window.submitPayrun = async () => {
    const body = {
      pay_period:       document.getElementById('pr-period').value,
      pay_period_start: document.getElementById('pr-start').value,
      pay_period_end:   document.getElementById('pr-end').value,
      notes:            document.getElementById('pr-notes').value || null,
    };
    try {
      await api.post('/payroll', body);
      toast('Payrun generated successfully','success');
      closeModal();
      await render();
    } catch(err) { toast(err.message,'error'); }
  };

  await render();
};
