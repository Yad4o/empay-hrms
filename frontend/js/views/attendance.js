Views.attendance = async function(container) {
  document.getElementById('page-title').textContent = 'Attendance';
  document.getElementById('page-subtitle').textContent = 'Track daily attendance records';

  const isEmp = Auth.role === 'employee';
  const today = new Date().toISOString().slice(0, 10);
  const [yStr, mStr] = today.split('-');

  async function render(month = mStr, year = yStr) {
    let records, todayStatus = null;
    if (isEmp) {
      [records, todayStatus] = await Promise.all([
        api.get(`/attendance/my?month=${month}&year=${year}`),
        api.get('/attendance/today'),
      ]);
    } else {
      records = await api.get(`/attendance?month=${month}&year=${year}`);
    }

    const statusBadge = s => {
      const map = { present:'badge-success', late:'badge-warning', half_day:'badge-info', absent:'badge-danger', on_leave:'badge-accent', holiday:'badge-muted' };
      return `<span class="badge ${map[s]||'badge-muted'}">${s.replace('_',' ')}</span>`;
    };

    const cols = isEmp
      ? ['Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Remarks']
      : ['Employee', 'Date', 'Department', 'Check In', 'Check Out', 'Hours', 'Status'];

    const rows = records.map(r => {
      const ci = r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : '—';
      const co = r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : '—';
      if (isEmp) return `<tr><td>${r.date}</td><td>${ci}</td><td>${co}</td><td>${r.total_hours || '—'}</td><td>${statusBadge(r.status)}</td><td>${r.remarks||'—'}</td></tr>`;
      return `<tr>
        <td><div class="emp-cell"><div class="emp-avatar">${(r.employee_name||'?')[0]}</div><div><div class="emp-name">${r.employee_name||'—'}</div><div class="emp-id">${r.emp_id||''}</div></div></div></td>
        <td>${r.date}</td><td><span class="badge badge-primary">${r.department||'—'}</span></td>
        <td>${ci}</td><td>${co}</td><td>${r.total_hours||'—'}</td><td>${statusBadge(r.status)}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="${cols.length}"><div class="empty-state"><div class="empty-icon">📅</div><h3>No records</h3></div></td></tr>`;

    const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentCount  = records.filter(r => r.status === 'absent').length;
    const leaveCount   = records.filter(r => r.status === 'on_leave').length;
    const totalRecords = records.length;
    const attRate = totalRecords ? Math.round((presentCount / totalRecords) * 100) : 0;

    const summaryStrip = records.length ? `
      <div style="display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap">
        <div class="card" style="flex:1;min-width:120px;padding:14px 18px;border-left:3px solid var(--success)">
          <div style="font-size:22px;font-weight:800;color:var(--success)">${presentCount}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Present</div>
        </div>
        <div class="card" style="flex:1;min-width:120px;padding:14px 18px;border-left:3px solid var(--danger)">
          <div style="font-size:22px;font-weight:800;color:var(--danger)">${absentCount}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Absent</div>
        </div>
        <div class="card" style="flex:1;min-width:120px;padding:14px 18px;border-left:3px solid var(--info)">
          <div style="font-size:22px;font-weight:800;color:var(--info)">${leaveCount}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">On Leave</div>
        </div>
        <div class="card" style="flex:2;min-width:180px;padding:14px 18px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:11px;color:var(--text-muted)">Attendance Rate</div>
            <div style="font-size:15px;font-weight:800;color:${attRate>=80?'var(--success)':attRate>=60?'var(--warning)':'var(--danger)'}">${attRate}%</div>
          </div>
          <div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden">
            <div style="background:${attRate>=80?'var(--success)':attRate>=60?'var(--warning)':'var(--danger)'};height:100%;width:${attRate}%;border-radius:4px;transition:width 0.4s"></div>
          </div>
        </div>
      </div>` : '';

    const markBtn = isEmp ? `
      <div class="card" style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px">
        <div>
          <div style="font-weight:600">Today's Attendance</div>
          <div style="color:var(--text-secondary);font-size:12px;margin-top:2px">${today}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${todayStatus?.marked ? `<span class="badge badge-success">✓ Marked — ${todayStatus.status}</span>` : '<span class="badge badge-warning">Not marked</span>'}
          <button class="btn btn-primary" onclick="markAttendance()" style="display:inline-flex;align-items:center;gap:6px">${IC.clock} ${todayStatus?.marked ? 'Check Out' : 'Check In'}</button>
        </div>
      </div>` : '';

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthOpts = months.map((m,i) => `<option value="${String(i+1).padStart(2,'0')}" ${String(i+1).padStart(2,'0')===month?'selected':''}>${m}</option>`).join('');

    const depts = !isEmp ? [...new Set(records.map(r => r.department).filter(Boolean))] : [];
    const deptFilter = !isEmp && depts.length ? `
      <select class="form-control" id="att-dept" style="width:160px" onchange="filterByDept()">
        <option value="">All Departments</option>
        ${depts.map(d => `<option>${d}</option>`).join('')}
      </select>` : '';

    container.innerHTML = `
      ${markBtn}
      ${summaryStrip}
      <div class="card" style="padding:0">
        <div class="toolbar" style="padding:16px 16px 0">
          <div class="toolbar-left">
            <select class="form-control" id="att-month" style="width:150px" onchange="filterAtt()">${monthOpts}</select>
            <input class="form-control" id="att-year" type="number" value="${year}" style="width:90px" onchange="filterAtt()">
            ${deptFilter}
          </div>
          <div class="toolbar-right">
            <span style="font-size:13px;color:var(--text-secondary)" id="att-count">${records.length} records</span>
          </div>
        </div>
        <div class="table-wrapper" style="margin-top:12px">
          <table>
            <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
            ${records.length ? `<tfoot><tr>
              <td colspan="${cols.length - 2}" style="padding:10px 16px;color:var(--text-secondary);font-size:12px">
                ${records.filter(r => r.status === 'present' || r.status === 'late').length} present,
                ${records.filter(r => r.status === 'absent').length} absent,
                ${records.filter(r => r.status === 'on_leave').length} on leave
              </td>
              <td colspan="2" style="padding:10px 16px;text-align:right;font-weight:600;font-size:13px">
                Total: ${records.reduce((s,r) => s + (r.total_hours||0), 0).toFixed(1)}h
              </td>
            </tr></tfoot>` : ''}
          </table>
        </div>
      </div>`;

    window.filterAtt = () => render(
      document.getElementById('att-month').value,
      document.getElementById('att-year').value,
    );
    window.filterByDept = () => {
      const dept = document.getElementById('att-dept').value.toLowerCase();
      const rows = document.querySelectorAll('tbody tr');
      let visible = 0;
      rows.forEach(tr => {
        const show = !dept || tr.textContent.toLowerCase().includes(dept);
        tr.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      const el = document.getElementById('att-count');
      if (el) el.textContent = `${visible} records`;
    };
    window.markAttendance = async () => {
      try {
        await api.post('/attendance/mark', { status: 'present' });
        toast(todayStatus?.marked ? 'Checked out' : 'Checked in successfully', 'success');
        await render(month, year);
      } catch(err) { toast(err.message, 'error'); }
    };
  }

  await render();
};
