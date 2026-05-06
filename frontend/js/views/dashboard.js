Views.dashboard = async function(container) {
  const data = await api.get('/reports/dashboard');

  const role = Auth.role;
  const isAdmin   = role === 'admin';
  const isHR      = role === 'hr_officer';
  const isPayroll = role === 'payroll_officer';
  const isEmp     = role === 'employee';

  const stats = [
    { icon: IC.people,    label: 'Total Employees',       value: data.total_employees,    color: '#a5b4fc', bg: 'rgba(99,102,241,0.15)' },
    { icon: IC.userCheck, label: 'Present Today',          value: data.present_today,      color: '#34d399', bg: 'rgba(16,185,129,0.15)' },
    { icon: IC.umbrella,  label: 'Pending Leaves',         value: data.pending_leaves,     color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
    { icon: IC.payroll,   label: 'Last Payrun',            value: data.last_payrun || '—', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', isText: true },
  ];

  const statsHtml = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.bg};color:${s.color}">
        ${s.icon}
      </div>
      <div>
        <div class="stat-value" style="color:${s.color}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>`).join('');

  let chartsHtml = '';
  if (!isEmp) {
    chartsHtml = `
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-top:24px">
        <div class="card">
          <div class="section-header"><span class="section-title">Attendance Trend (This Month)</span></div>
          <div class="chart-container"><canvas id="chart-att"></canvas></div>
        </div>
        <div class="card">
          <div class="section-header"><span class="section-title">Department Split</span></div>
          <div class="chart-container"><canvas id="chart-dept"></canvas></div>
        </div>
      </div>`;
  }

  let payrollTable = '';
  if (isAdmin || isPayroll) {
    const rows = (data.recent_payrolls || []).map(p => `
      <tr>
        <td><strong>${p.period}</strong></td>
        <td>₹${Number(p.total).toLocaleString('en-IN')}</td>
        <td><span class="badge ${p.status === 'paid' ? 'badge-success' : p.status === 'processed' ? 'badge-info' : 'badge-warning'}">${p.status}</span></td>
        <td><button class="btn btn-outline btn-sm" onclick="navigate('payroll')" style="display:inline-flex;align-items:center;gap:5px">${IC.eye} View</button></td>
      </tr>`).join('');
    payrollTable = `
      <div class="card" style="margin-top:24px">
        <div class="section-header"><span class="section-title">Recent Payruns</span></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Period</th><th>Total Net</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted)">No payruns yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  let leaveStatHtml = '';
  if (!isEmp) {
    const ls = data.leave_stats || {};
    const lsCards = [
      { label: 'Pending',  count: ls.pending || 0,  color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  icon: IC.clock },
      { label: 'Approved', count: ls.approved || 0, color: '#34d399', bg: 'rgba(16,185,129,0.12)', icon: IC.check },
      { label: 'Rejected', count: ls.rejected || 0, color: '#f87171', bg: 'rgba(239,68,68,0.12)',  icon: IC.x },
    ];
    leaveStatHtml = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px">
        ${lsCards.map(c => `
        <div class="card" style="display:flex;align-items:center;gap:16px;padding:18px">
          <div style="width:46px;height:46px;border-radius:12px;background:${c.bg};color:${c.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${c.icon}</div>
          <div>
            <div style="font-size:26px;font-weight:800;color:${c.color};line-height:1">${c.count}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:3px">${c.label} Leaves</div>
          </div>
        </div>`).join('')}
      </div>`;
  }

  container.innerHTML = `
    <div>
      <div class="stat-grid">${statsHtml}</div>
      ${chartsHtml}
      ${leaveStatHtml}
      ${payrollTable}
    </div>`;

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const name = Auth.email ? Auth.email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
  document.getElementById('page-title').textContent = `${greeting}${name ? ', '+name : ''}`;
  document.getElementById('page-subtitle').textContent = `${Auth.roleLabel()} · ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}`;


  // Render charts after DOM is ready
  if (!isEmp) {
    const trend = data.attendance_trend || [];
    if (trend.length) {
      renderDashChart('chart-att', 'line', {
        labels: trend.map(r => r.date.slice(5)),
        datasets: [{
          label: 'Present',
          data: trend.map(r => r.present),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        }],
      });
    } else {
      const canvas = document.getElementById('chart-att');
      if (canvas) canvas.parentElement.innerHTML = '<div style="height:260px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">No attendance data this month</div>';
    }

    if (isAdmin || isHR) {
      const depts = data.department_distribution || [];
      if (depts.length) {
        renderDashChart('chart-dept', 'doughnut', {
          labels: depts.map(d => d.department),
          datasets: [{
            data: depts.map(d => d.count),
            backgroundColor: ['#6366f1','#ec4899','#38bdf8','#10b981','#f59e0b','#ef4444'],
            borderWidth: 2,
            borderColor: '#0f1520',
          }],
        });
      } else {
        const canvas = document.getElementById('chart-dept');
        if (canvas) canvas.parentElement.innerHTML = '<div style="height:260px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px">No departments found</div>';
      }
    }
  }
};

function renderDashChart(id, type, chartData) {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  new window.Chart(canvas, {
    type,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 12 } },
      },
      scales: type === 'line' ? {
        x: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: '#30363d' } },
        y: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: '#30363d' }, beginAtZero: true },
      } : undefined,
    },
  });
}
