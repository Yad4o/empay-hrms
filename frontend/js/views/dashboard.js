const Views = Views || {};

Views.dashboard = async function(container) {
  const data = await api.get('/reports/dashboard');

  const role = Auth.role;
  const isAdmin   = role === 'admin';
  const isHR      = role === 'hr_officer';
  const isPayroll = role === 'payroll_officer';
  const isEmp     = role === 'employee';

  // Stat cards
  const stats = [
    { icon: '👥', label: 'Total Employees', value: data.total_employees, color: 'var(--primary)' },
    { icon: '✅', label: 'Present Today',   value: data.present_today,   color: 'var(--success)' },
    { icon: '📤', label: 'Pending Leave Requests', value: data.pending_leaves, color: 'var(--warning)' },
    { icon: '💼', label: 'Last Payrun', value: data.last_payrun || '—', color: 'var(--info)', isText: true },
  ];

  const statsHtml = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.color}22;">
        <span style="font-size:22px">${s.icon}</span>
      </div>
      <div>
        <div class="stat-value" style="color:${s.color}">${s.isText ? s.value : s.value}</div>
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
    const rows = data.recent_payrolls.map(p => `
      <tr>
        <td>${p.period}</td>
        <td>₹${Number(p.total).toLocaleString('en-IN')}</td>
        <td><span class="badge ${p.status === 'paid' ? 'badge-success' : p.status === 'processed' ? 'badge-info' : 'badge-muted'}">${p.status}</span></td>
        <td><button class="btn btn-outline btn-sm" onclick="navigate('payroll')">View</button></td>
      </tr>`).join('');
    payrollTable = `
      <div class="card" style="margin-top:24px">
        <div class="section-header"><span class="section-title">Recent Payruns</span></div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Period</th><th>Total Net</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" class="empty-state">No payruns yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  container.innerHTML = `
    <div>
      <div class="stat-grid">${statsHtml}</div>
      ${chartsHtml}
      ${payrollTable}
    </div>`;

  document.getElementById('page-title').textContent = 'Dashboard';
  document.getElementById('page-subtitle').textContent = `Welcome back, ${Auth.email}`;

  if (!isEmp && data.attendance_trend?.length) {
    const labels = data.attendance_trend.map(r => r.date.slice(8));
    const present = data.attendance_trend.map(r => r.present);
    renderChart('chart-att', 'line', {
      labels,
      datasets: [{
        label: 'Present',
        data: present,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124,58,237,0.1)',
        fill: true,
        tension: 0.4,
      }],
    });
  }

  if ((isAdmin || isHR) && data.department_distribution?.length) {
    const depts = data.department_distribution;
    renderChart('chart-dept', 'doughnut', {
      labels: depts.map(d => d.department),
      datasets: [{
        data: depts.map(d => d.count),
        backgroundColor: ['#7c3aed','#ec4899','#3b82f6','#10b981','#f59e0b','#ef4444'],
        borderWidth: 0,
      }],
    });
  }
};

function renderChart(id, type, chartData) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (window.Chart) {
    new Chart(canvas, {
      type,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b949e', font: { size: 11 } } },
        },
        scales: type === 'line' ? {
          x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
          y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
        } : undefined,
      },
    });
  }
}
