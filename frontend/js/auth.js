const Auth = {
  get token()  { return localStorage.getItem('empay_token'); },
  get role()   { return localStorage.getItem('empay_role'); },
  get userId() { return localStorage.getItem('empay_user_id'); },
  get email()  { return localStorage.getItem('empay_email'); },

  isLoggedIn() { return !!this.token; },

  save(data) {
    localStorage.setItem('empay_token',   data.access_token);
    localStorage.setItem('empay_role',    data.role);
    localStorage.setItem('empay_user_id', data.user_id);
    localStorage.setItem('empay_email',   data.email);
  },

  logout() {
    localStorage.clear();
    window.location.href = '/index.html';
  },

  hasAnyRole(...roles) {
    return roles.includes(this.role);
  },

  initials(email) {
    return (email || '??').slice(0, 2).toUpperCase();
  },

  roleLabel() {
    const labels = {
      admin:            'Administrator',
      hr_officer:       'HR Officer',
      payroll_officer:  'Payroll Officer',
      employee:         'Employee',
    };
    return labels[this.role] || this.role;
  },
};
