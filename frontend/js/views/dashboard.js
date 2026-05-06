Views.dashboard = async function(container) {
  const data = await api.get('/reports/dashboard');

  const role = Auth.role;
  const isAdmin   = role === 'admin';
  const isHR      = role === 'hr_officer';
  const isPayroll = role === 'payroll_officer';
  const isEmp     = role === 'employee';

  const stats = [
    { icon: IC.people,    label: 'Total Employees',  value: data.total_employees,    color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
    { icon: IC.userCheck, label: 'Present Today',     value: data.present_today,      color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    { icon: IC.umbrella,  label: 'Pending Leaves',    value: data.pending_leaves,     color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    { icon: IC.payroll,   label: 'Last Payrun',       value: data.last_payrun || '—', color: '#0284c7', bg: 'rgba(2,132,199,0.1)', isText: true },
  ];

  const statsHtml = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.bg};color:${s.color}">
        ${s.icon}
      </div>
      <div>
        <div class="stat-value" style="color:${s.color};font-size:${s.isText?'20px':'26px'}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>`).join('');

  let chartsHtml = '';
  if (!isEmp) {
    chartsHtml = `
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-top:24px">
        <div class="card">
          <div class="section-header"><span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.chart} Attendance Trend (This Month)</span></div>
          <div class="chart-container"><canvas id="chart-att"></canvas></div>
        </div>
        <div class="card">
          <div class="section-header"><span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.people} Department Split</span></div>
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
        <div class="section-header"><span class="section-title" style="display:inline-flex;align-items:center;gap:8px">${IC.payroll} Recent Payruns</span></div>
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
      { label: 'Pending',  count: ls.pending || 0,  color: '#d97706', bg: 'rgba(217,119,6,0.08)',  icon: IC.clock },
      { label: 'Approved', count: ls.approved || 0, color: '#16a34a', bg: 'rgba(22,163,74,0.08)', icon: IC.check },
      { label: 'Rejected', count: ls.rejected || 0, color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: IC.x },
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

  const helpKey = `empay_help_seen_${Auth.email}`;
  const helpBanner = !localStorage.getItem(helpKey) ? `
    <div style="display:flex;align-items:center;gap:14px;background:rgba(13,148,136,0.07);border:1px solid rgba(13,148,136,0.2);border-radius:12px;padding:14px 18px;margin-bottom:20px">
      <div style="color:#0d9488;flex-shrink:0">${IC.help}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">New here? Check the Help guide</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">See everything your role can do, quick actions, and FAQs tailored for you.</div>
      </div>
      <button onclick="navigate('help')" style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:#0d9488;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Open Guide ${IC.arrowRight}</button>
      <button onclick="localStorage.setItem('${helpKey}','1');this.closest('[style]').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;line-height:1;font-size:18px" title="Dismiss">✕</button>
    </div>` : '';

  container.innerHTML = `
    <div>
      ${helpBanner}
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
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13,148,136,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#0d9488',
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
            backgroundColor: ['#0d9488','#0284c7','#8b5cf6','#16a34a','#f59e0b','#ef4444'],
            borderWidth: 2,
            borderColor: '#ffffff',
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
        legend: { labels: { color: '#475569', font: { size: 11 }, boxWidth: 12 } },
      },
      scales: type === 'line' ? {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#e2e8f0' } },
        y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#e2e8f0' }, beginAtZero: true },
      } : undefined,
    },
  });
}
