Views.help = function(container) {
  document.getElementById('page-title').textContent = 'Help & Guide';
  document.getElementById('page-subtitle').textContent = 'Everything you can do in EmPay';

  localStorage.setItem(`empay_help_seen_${Auth.email}`, '1');

  const role = Auth.role;

  const ROLE_META = {
    admin: {
      label: 'Administrator',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.08)',
      border: 'rgba(220,38,38,0.2)',
      desc: 'You have full access to every part of the system — employees, payroll, attendance, leaves, reports, and user management.',
    },
    hr_officer: {
      label: 'HR Officer',
      color: '#0284c7',
      bg: 'rgba(2,132,199,0.08)',
      border: 'rgba(2,132,199,0.2)',
      desc: 'You manage the employee lifecycle — onboarding, attendance oversight, leave approvals, and HR reports.',
    },
    payroll_officer: {
      label: 'Payroll Officer',
      color: '#d97706',
      bg: 'rgba(217,119,6,0.08)',
      border: 'rgba(217,119,6,0.2)',
      desc: 'You handle all payroll operations — generating payruns, processing salaries, marking payments, and viewing payslips.',
    },
    employee: {
      label: 'Employee',
      color: '#0d9488',
      bg: 'rgba(13,148,136,0.08)',
      border: 'rgba(13,148,136,0.2)',
      desc: 'You can manage your own attendance, apply for leaves, view your payslips, and update your personal profile.',
    },
  };

  const FEATURES = {
    admin: [
      {
        icon: IC.dashboard, color: '#0d9488',
        title: 'Dashboard Overview',
        desc: 'See real-time stats — total employees, today\'s attendance, pending leaves, and last payrun. Charts show attendance trends and department distribution.',
      },
      {
        icon: IC.users, color: '#0284c7',
        title: 'Employee Management',
        desc: 'Add new employees with full details (salary, bank, PAN). Edit department, designation, allowances. Deactivate employees when they leave.',
      },
      {
        icon: IC.calendar, color: '#16a34a',
        title: 'Attendance Tracking',
        desc: 'View attendance for all employees across any month. Filter by department. See present/absent/on-leave counts with a monthly summary strip.',
      },
      {
        icon: IC.umbrella, color: '#d97706',
        title: 'Leave Management',
        desc: 'Approve or reject leave requests from any employee. Add a rejection reason. Allocate annual, sick, or casual leave days per employee per year.',
      },
      {
        icon: IC.payroll, color: '#7c3aed',
        title: 'Payroll Processing',
        desc: 'Generate monthly payruns for all active employees. PF, professional tax, and LOP are calculated automatically. Process and mark payruns as paid.',
      },
      {
        icon: IC.chart, color: '#dc2626',
        title: 'Reports & Export',
        desc: 'Attendance summary by employee with totals. Leave report for the full year. Filter by department. Download CSV export for payroll software.',
      },
      {
        icon: IC.sliders, color: '#0284c7',
        title: 'User & Role Management',
        desc: 'Add login accounts for new users. Assign roles (Admin, HR, Payroll, Employee). Disable accounts without deleting them.',
      },
      {
        icon: IC.book, color: '#16a34a',
        title: 'Employee Directory',
        desc: 'Browse the full team in a card layout. Search by name or department. Click any card to view that employee\'s full profile.',
      },
    ],
    hr_officer: [
      {
        icon: IC.users, color: '#0284c7',
        title: 'Add & Edit Employees',
        desc: 'Create new employee records including salary, bank details, and PAN. Edit department, designation, phone, address, and allowances at any time.',
      },
      {
        icon: IC.calendar, color: '#16a34a',
        title: 'Attendance Overview',
        desc: 'Monitor attendance for all employees. Filter by month, year, and department. Monthly summary shows present/absent rates per person.',
      },
      {
        icon: IC.umbrella, color: '#d97706',
        title: 'Leave Approvals',
        desc: 'Review pending leave requests from all employees. Approve with one click or reject with a written reason. Allocate leave balances for the year.',
      },
      {
        icon: IC.chart, color: '#dc2626',
        title: 'HR Reports',
        desc: 'Attendance summary report filterable by department. Leave report showing all requests for the year. Export attendance data as CSV.',
      },
      {
        icon: IC.book, color: '#0d9488',
        title: 'Employee Directory',
        desc: 'View the full company directory. Search by name, department, or role. Click any employee card to see their detailed profile.',
      },
      {
        icon: IC.dashboard, color: '#7c3aed',
        title: 'Dashboard',
        desc: 'At-a-glance view of total headcount, today\'s attendance, pending leave requests, and a breakdown of leaves by status (pending/approved/rejected).',
      },
    ],
    payroll_officer: [
      {
        icon: IC.payroll, color: '#d97706',
        title: 'Generate Payruns',
        desc: 'Create a new payrun for any month. The system automatically calculates gross pay, PF (12% employee + 12% employer), professional tax, and LOP deductions.',
      },
      {
        icon: IC.zap, color: '#0d9488',
        title: 'Process & Finalize',
        desc: 'Move a draft payrun to "Processed" once reviewed. Then mark it as "Paid" after bank transfers are done. Each state is tracked with a timestamp.',
      },
      {
        icon: IC.doc, color: '#0284c7',
        title: 'Employee Payslips',
        desc: 'Open any employee\'s payslip from inside a payrun. Payslips show full earnings breakdown, deductions, attendance details, and net pay. Print-ready.',
      },
      {
        icon: IC.calendar, color: '#16a34a',
        title: 'Attendance Reference',
        desc: 'View all employee attendance records to verify working days and LOP before running payroll. Filter by month and department.',
      },
      {
        icon: IC.users, color: '#7c3aed',
        title: 'Employee List',
        desc: 'Browse all active employees to verify salary details (basic, HRA, allowances). Use this to spot-check before generating a payrun.',
      },
      {
        icon: IC.dashboard, color: '#dc2626',
        title: 'Dashboard',
        desc: 'Dashboard shows last payrun status, pending leave count, and today\'s attendance. Recent payruns table shows period, total net pay, and status.',
      },
    ],
    employee: [
      {
        icon: IC.clock, color: '#0d9488',
        title: 'Mark Attendance',
        desc: 'Go to Attendance and click "Check In" at the start of your day. Click again to "Check Out". Today\'s status (marked/unmarked) is shown at the top.',
      },
      {
        icon: IC.calendar, color: '#16a34a',
        title: 'View Attendance History',
        desc: 'See your full attendance record filtered by month and year. The summary strip shows how many days you were present, absent, or on leave this month.',
      },
      {
        icon: IC.umbrella, color: '#d97706',
        title: 'Apply for Leave',
        desc: 'Click "Apply Leave" in the Time Off section. Choose type (annual, sick, casual, or unpaid), pick dates, and add a reason. Your balance is shown in the form.',
      },
      {
        icon: IC.userCheck, color: '#0284c7',
        title: 'Track Leave Balance',
        desc: 'Your leave balance cards show remaining days per type with a progress bar. Annual=12 days, Sick=6 days, Casual=6 days allocated at the start of each year.',
      },
      {
        icon: IC.payroll, color: '#7c3aed',
        title: 'View Payslips',
        desc: 'When your payroll is processed, open any payrun and click "Payslip" next to your name. It shows gross pay, all deductions, and net salary. Printable.',
      },
      {
        icon: IC.user, color: '#dc2626',
        title: 'Manage Your Profile',
        desc: 'Update your phone number and address in "My Profile". You can also change your password here. Salary and bank details are managed by HR.',
      },
      {
        icon: IC.book, color: '#16a34a',
        title: 'Employee Directory',
        desc: 'Browse your team in the Directory. Search by name or department to find contact details. Click any card to see that person\'s role and designation.',
      },
      {
        icon: IC.dashboard, color: '#0d9488',
        title: 'Dashboard',
        desc: 'Your dashboard shows the total headcount, today\'s presence, leave status, and the last payrun date — a quick daily overview when you log in.',
      },
    ],
  };

  const QUICK_ACTIONS = {
    admin: [
      { label: 'Add Employee',    view: 'employees',  icon: IC.plus,    color: '#0d9488' },
      { label: 'Approve Leaves',  view: 'leaves',     icon: IC.check,   color: '#16a34a' },
      { label: 'Generate Payrun', view: 'payroll',    icon: IC.zap,     color: '#d97706' },
      { label: 'View Reports',    view: 'reports',    icon: IC.chart,   color: '#0284c7' },
      { label: 'Manage Users',    view: 'settings',   icon: IC.sliders, color: '#dc2626' },
    ],
    hr_officer: [
      { label: 'Add Employee',    view: 'employees',  icon: IC.plus,    color: '#0d9488' },
      { label: 'Approve Leaves',  view: 'leaves',     icon: IC.check,   color: '#16a34a' },
      { label: 'Attendance Report', view: 'reports',  icon: IC.chart,   color: '#0284c7' },
      { label: 'Team Directory',  view: 'directory',  icon: IC.book,    color: '#d97706' },
    ],
    payroll_officer: [
      { label: 'Generate Payrun', view: 'payroll',    icon: IC.zap,     color: '#d97706' },
      { label: 'View Attendance', view: 'attendance', icon: IC.calendar,color: '#0d9488' },
      { label: 'Employee List',   view: 'employees',  icon: IC.users,   color: '#0284c7' },
    ],
    employee: [
      { label: 'Check In / Out',  view: 'attendance', icon: IC.clock,   color: '#0d9488' },
      { label: 'Apply Leave',     view: 'leaves',     icon: IC.umbrella,color: '#d97706' },
      { label: 'My Profile',      view: 'profile',    icon: IC.user,    color: '#0284c7' },
      { label: 'Team Directory',  view: 'directory',  icon: IC.book,    color: '#16a34a' },
    ],
  };

  const SHORTCUTS = [
    { keys: ['/', 'focus'], label: 'Focus the search box on the current page' },
    { keys: ['Esc'],        label: 'Close any open modal or dialog' },
    { keys: ['← →'],       label: 'Browser back / forward between pages' },
  ];

  const FAQ = {
    admin: [
      { q: 'How do I add a new employee?', a: 'Go to Employees → click "Add Employee". Fill in name, email, department, salary, and a login password. A leave balance is automatically created for the current year.' },
      { q: 'How is payroll calculated?', a: 'Gross = Basic + HRA + Allowances. Deductions: employee PF (12% of basic), employer PF (tracked separately), professional tax (based on gross slab), and LOP deduction for absent days beyond leave balance.' },
      { q: 'How do I disable a user without deleting them?', a: 'Go to Settings → find the user → click "Disable". Their login will stop working but all records are preserved. You can re-enable at any time.' },
      { q: 'Can I export attendance data?', a: 'Yes — go to Reports → Attendance Summary → click "Export CSV". The file includes all employees with present/absent/leave counts and attendance percentage for the selected month.' },
    ],
    hr_officer: [
      { q: 'How do I allocate leave to an employee?', a: 'Go to Time Off → click "Allocate Leave". Select the employee, leave type (annual/sick/casual), year, and number of days. This sets their balance for the selected year.' },
      { q: 'What happens when I reject a leave request?', a: 'You must provide a rejection reason. The employee can see this reason in their Time Off tab. Rejected leaves do not deduct from their balance.' },
      { q: 'Can I see which employees are on leave today?', a: 'Go to Attendance and filter to today\'s date. The "On Leave" column in the attendance report will show everyone with an approved leave for today.' },
      { q: 'How do I update an employee\'s department or salary?', a: 'Go to Employees → click "Edit" next to the employee. You can update department, designation, basic salary, HRA%, and allowances. Changes take effect in the next payrun.' },
    ],
    payroll_officer: [
      { q: 'When should I generate a payrun?', a: 'At the end of each month. Go to Payroll → "Generate Payrun". Select the pay period (e.g. "May 2025") and date range. The system pulls attendance and approved leaves automatically.' },
      { q: 'What is LOP and how is it calculated?', a: 'LOP (Loss of Pay) = absent days beyond approved leave balance. If an employee has 0 leave balance and takes a day off, that day is deducted from their gross salary proportionally.' },
      { q: 'Can I re-generate a payrun after changes?', a: 'Only draft payruns can be re-generated. Once a payrun is "Processed" or "Paid", it is locked. Create a new payrun for the same period if corrections are needed.' },
      { q: 'What does "Processing" a payrun do?', a: 'It transitions the payrun from "Draft" to "Processed" state, indicating all entries have been reviewed. Mark it "Paid" after the bank transfers go through.' },
    ],
    employee: [
      { q: 'My attendance wasn\'t marked — what do I do?', a: 'Contact your HR officer to manually update your attendance record. You cannot edit past attendance yourself, but HR can correct it from the Attendance management view.' },
      { q: 'How many leave days do I have?', a: 'Go to Time Off — your balance cards are shown at the top. Annual = 12 days, Sick = 6 days, Casual = 6 days per year by default. HR can adjust your allocation.' },
      { q: 'When will my payslip be available?', a: 'Your payslip appears after payroll is processed for the month. Go to the Payroll section → open the relevant month → click "Payslip" next to your name.' },
      { q: 'Can I update my salary details?', a: 'No — salary, HRA, and bank details are managed by HR and Payroll. You can update your phone number and address in My Profile.' },
    ],
  };

  const meta = ROLE_META[role] || ROLE_META.employee;
  const features = FEATURES[role] || [];
  const actions = QUICK_ACTIONS[role] || [];
  const faqs = FAQ[role] || [];

  const featureCards = features.map(f => `
    <div class="card" style="padding:20px;display:flex;gap:14px;align-items:flex-start">
      <div style="width:40px;height:40px;border-radius:10px;background:${f.color}1a;color:${f.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${f.icon}
      </div>
      <div>
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:var(--text)">${f.title}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">${f.desc}</div>
      </div>
    </div>`).join('');

  const actionButtons = actions.map(a => `
    <button onclick="navigate('${a.view}')" style="display:flex;align-items:center;gap:10px;padding:13px 18px;background:var(--surface);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s;text-align:left;width:100%" onmouseenter="this.style.borderColor='${a.color}';this.style.background='${a.color}1a'" onmouseleave="this.style.borderColor='';this.style.background=''">
      <div style="width:34px;height:34px;border-radius:8px;background:${a.color}1a;color:${a.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${a.icon}</div>
      <span style="font-size:13px;font-weight:600;color:var(--text)">${a.label}</span>
      <span style="margin-left:auto;color:var(--text-muted)">${IC.arrowRight}</span>
    </button>`).join('');

  const shortcutRows = SHORTCUTS.map(s => `
    <div style="display:flex;align-items:center;gap:16px;padding:11px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${s.keys.map(k => `<kbd style="background:var(--surface2);border:1px solid var(--border-light);border-radius:5px;padding:3px 8px;font-size:11px;font-weight:700;font-family:monospace;color:var(--text)">${k}</kbd>`).join('<span style="color:var(--text-muted);font-size:11px">then</span>')}
      </div>
      <div style="font-size:13px;color:var(--text-secondary)">${s.label}</div>
    </div>`).join('');

  const faqItems = faqs.map((f, i) => `
    <div style="border-bottom:1px solid var(--border)">
      <button onclick="toggleFaq(${i})" style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:14px 0;background:none;border:none;cursor:pointer;text-align:left">
        <span style="font-size:13px;font-weight:600;color:var(--text)">${f.q}</span>
        <span id="faq-icon-${i}" style="color:var(--text-muted);flex-shrink:0;transition:transform 0.2s">${IC.arrowRight}</span>
      </button>
      <div id="faq-body-${i}" style="display:none;padding-bottom:14px;font-size:13px;color:var(--text-secondary);line-height:1.7">${f.a}</div>
    </div>`).join('');

  container.innerHTML = `
    <div style="max-width:860px;margin:0 auto">

      <!-- Hero -->
      <div style="background:${meta.bg};border:1px solid ${meta.border};border-radius:16px;padding:28px 32px;margin-bottom:28px;display:flex;align-items:center;gap:20px">
        <div style="width:56px;height:56px;border-radius:14px;background:${meta.color}22;color:${meta.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${IC.help.replace('18" height="18"', '26" height="26"')}
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${meta.color};margin-bottom:4px">${meta.label}</div>
          <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px">Welcome to EmPay HRMS</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;max-width:540px">${meta.desc}</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="margin-bottom:28px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:7px">${IC.zap} Quick Actions</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
          ${actionButtons}
        </div>
      </div>

      <!-- Feature Cards -->
      <div style="margin-bottom:28px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:7px">${IC.star} What You Can Do</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px">
          ${featureCards}
        </div>
      </div>

      <!-- Shortcuts + FAQ side by side -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">

        <div class="card">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:7px">${IC.key} Keyboard Shortcuts</div>
          ${shortcutRows}
          <div style="margin-top:14px;font-size:12px;color:var(--text-muted)">Tip: these work anywhere in the app unless you're inside a text field.</div>
        </div>

        <div class="card">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px;display:flex;align-items:center;gap:7px">${IC.info} Frequently Asked Questions</div>
          ${faqItems}
        </div>

      </div>

      <!-- Footer note -->
      <div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted)">
        EmPay HRMS · Questions? Contact your system administrator.
      </div>

    </div>`;

  window.toggleFaq = (i) => {
    const body = document.getElementById(`faq-body-${i}`);
    const icon = document.getElementById(`faq-icon-${i}`);
    const open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    icon.style.transform = open ? 'rotate(90deg)' : '';
  };
};
