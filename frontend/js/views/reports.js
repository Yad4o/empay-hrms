Views.reports = async function(container) {
  document.getElementById('page-title').textContent = 'Reports';
  document.getElementById('page-subtitle').textContent = 'Analytics and summaries';

  const tabs = [
    { id: 'attendance', label: 'Attendance Summary' },
    { id: 'leaves',     label: 'Leave Report' },
  ];

  function tabBar(active) {
    return `<div class="tab-list">${tabs.map(t =>
      `<button class="tab-btn ${t.id===active?'active':''}" onclick="reportTab('${t.id}')">${t.label}</button>`
    ).join('')}</div>`;
  }

  window.reportTab = async (tab) => {
    const today = new Date();

    if (tab === 'attendance') {
      container.innerHTML = tabBar('attendance') + '<div id="report-content"><div style="text-align:center;padding:40px;color:var(--text-muted)">Loading…</div></div>';

      async function loadAtt(month, year) {
        const data = await api.get(`/reports/attendance-summary?month=${month}&year=${year}`);
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const monthOpts = months.map((m,i) => `<option value="${i+1}" ${i+1===parseInt(month)?'selected':''}>${m}</option>`).join('');

        const depts = [...new Set(data.map(r => r.department).filter(Boolean))].sort();
        const deptOpts = ['', ...depts].map(d => `<option value="${d}">${d || 'All Departments'}</option>`).join('');

        const totals = data.reduce((acc, r) => {
          acc.present  += r.present  || 0;
          acc.half_day += r.half_day || 0;
          acc.on_leave += r.on_leave || 0;
          acc.absent   += r.absent   || 0;
          return acc;
        }, { present:0, half_day:0, on_leave:0, absent:0 });

        const rows = data.map(r => `
          <tr>
            <td><div class="emp-cell"><div class="emp-avatar">${r.name[0]}</div><div><div class="emp-name">${r.name}</div><div class="emp-id">${r.emp_id}</div></div></div></td>
            <td><span class="badge badge-primary">${r.department}</span></td>
            <td style="color:var(--success);font-weight:600">${r.present}</td>
            <td style="color:var(--warning)">${r.half_day}</td>
            <td style="color:var(--info)">${r.on_leave}</td>
            <td style="color:var(--danger)">${r.absent}</td>
          </tr>`).join('') || `<tr><td colspan="6"><div class="empty-state"><p>No data</p></div></td></tr>`;

        document.getElementById('report-content').innerHTML = `
          <div class="toolbar" style="margin-bottom:16px">
            <div class="toolbar-left">
              <select class="form-control" id="att-m" style="width:150px" onchange="reloadAtt()">${monthOpts}</select>
              <input class="form-control" id="att-y" type="number" value="${year}" style="width:90px" onchange="reloadAtt()">
              <select class="form-control" id="att-dept-r" style="width:160px" onchange="filterAttReport()">${deptOpts}</select>
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.print()" style="display:inline-flex;align-items:center;gap:6px">${IC.print} Print</button>
          </div>
          <div class="card" style="padding:0">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Employee</th><th>Department</th><th>Present</th><th>Half Day</th><th>On Leave</th><th>Absent</th></tr></thead>
                <tbody>${rows}</tbody>
                ${data.length ? `<tfoot><tr>
                  <td colspan="2" style="font-weight:700;color:var(--text)">Totals (${data.length} employees)</td>
                  <td style="color:var(--success);font-weight:700">${totals.present}</td>
                  <td style="color:var(--warning);font-weight:700">${totals.half_day}</td>
                  <td style="color:var(--info);font-weight:700">${totals.on_leave}</td>
                  <td style="color:var(--danger);font-weight:700">${totals.absent}</td>
                </tr></tfoot>` : ''}
              </table>
            </div>
          </div>`;
        window.reloadAtt = () => loadAtt(document.getElementById('att-m').value, document.getElementById('att-y').value);
        window.filterAttReport = () => {
          const dept = document.getElementById('att-dept-r').value.toLowerCase();
          document.querySelectorAll('tbody tr').forEach(tr => {
            tr.style.display = !dept || tr.textContent.toLowerCase().includes(dept) ? '' : 'none';
          });
        };
      }
      await loadAtt(today.getMonth() + 1, today.getFullYear());

    } else if (tab === 'leaves') {
      container.innerHTML = tabBar('leaves') + '<div id="report-content"><div style="text-align:center;padding:40px;color:var(--text-muted)">Loading…</div></div>';

      async function loadLeaves(year) {
        const data = await api.get(`/reports/leave-report?year=${year}`);

        const statusBadge = s => {
          const m = { approved:'badge-success', rejected:'badge-danger', pending:'badge-warning', cancelled:'badge-muted' };
          return `<span class="badge ${m[s]||'badge-muted'}">${s}</span>`;
        };

        const rows = data.map(r => `
          <tr>
            <td>${r.emp_id}</td>
            <td>${r.name}</td>
            <td><span class="badge badge-primary">${r.department}</span></td>
            <td><span class="badge badge-info">${r.leave_type}</span></td>
            <td>${r.start_date}</td>
            <td>${r.end_date}</td>
            <td><strong>${r.total_days}</strong></td>
            <td>${statusBadge(r.status)}</td>
          </tr>`).join('') || `<tr><td colspan="8"><div class="empty-state"><p>No leave data</p></div></td></tr>`;

        document.getElementById('report-content').innerHTML = `
          <div class="toolbar" style="margin-bottom:16px">
            <div class="toolbar-left">
              <input class="form-control" id="lr-y" type="number" value="${year}" style="width:100px" onchange="reloadLeaves()">
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.print()" style="display:inline-flex;align-items:center;gap:6px">${IC.print} Print</button>
          </div>
          <div class="card" style="padding:0">
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Emp ID</th><th>Name</th><th>Department</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
        window.reloadLeaves = () => loadLeaves(document.getElementById('lr-y').value);
      }
      await loadLeaves(today.getFullYear());
    }
  };

  await window.reportTab('attendance');
};
